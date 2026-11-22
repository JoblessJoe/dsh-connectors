/**
 * One live MCP server: connects, publishes its tools to dsh, and keeps them
 * working through drops (backoff reconnect) and token expiry (SDK refresh).
 *
 * Tools stay registered while the server reconnects, so an agent mid-task
 * doesn't see them vanish; a call during an outage waits briefly for the
 * connection instead of failing at once.
 */
import { createHash } from 'node:crypto'
import { Client, SSEClientTransport, StreamableHTTPClientTransport, UnauthorizedError } from '@modelcontextprotocol/client'
import { StdioClientTransport } from '@modelcontextprotocol/client/stdio'
import { ConnectorOAuth, NeedsLogin, type Secrets } from './auth.ts'
import type { ServerSpec } from './store.ts'

export type State = 'off' | 'connecting' | 'connected' | 'retrying' | 'needs-login' | 'error'

export interface ToolInfo { name: string; title?: string; description: string; enabled: boolean }

export interface Status {
  state: State
  message: string
  tools: ToolInfo[]
  /** Epoch ms of the next reconnect attempt while `retrying`. */
  retryAt?: number
  serverName?: string
  serverVersion?: string
  since: number
}

const VERSION = '0.1.0'
const MAX_TOOL_NAME = 64
const MAX_TEXT = 48_000
const DEFAULT_TIMEOUT_MS = 120_000
const CALL_WAIT_MS = 15_000
const BACKOFF_MIN_MS = 1_000
const BACKOFF_MAX_MS = 5 * 60_000
const STDERR_TAIL = 2_000

export interface Deps {
  tools: { register(def: any): () => void }
  secrets: Secrets
  redirect: string
  log: (level: 'info' | 'warn', msg: string) => void
  /** The SDK wants a browser sign-in (refresh failed or no tokens). */
  onNeedsLogin: (id: string) => void
}

/** `mcp__<id>__<tool>`, the same shape dsh's own MCP client uses; hashed if too long. */
export function toolName(id: string, raw: string): string {
  const name = `mcp__${id}__${raw}`.replace(/[^A-Za-z0-9_-]/g, '_')
  if (name.length <= MAX_TOOL_NAME) return name
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 6)
  return `${name.slice(0, MAX_TOOL_NAME - 7)}_${hash}`
}

/** Model-facing text for MCP content blocks, capped so one call can't flood the context. */
export function contentText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const block of content as any[]) {
    if (block?.type === 'text') parts.push(String(block.text ?? ''))
    else if (block?.type === 'image' || block?.type === 'audio') parts.push(`[${block.type}: ${block.mimeType ?? 'binary'}, ${Math.round((block.data?.length ?? 0) * 0.75)} bytes]`)
    else if (block?.type === 'resource') parts.push(block.resource?.text ?? `[resource: ${block.resource?.uri ?? ''}]`)
    else if (block?.type === 'resource_link') parts.push(`[link: ${block.name ?? ''} ${block.uri ?? ''}]`.trim())
  }
  const text = parts.join('\n')
  return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT)}\n… (cut at ${MAX_TEXT} characters; ask for less, e.g. a page range or a narrower query)`
}

function isAuthError(error: unknown): boolean {
  if (error instanceof UnauthorizedError || error instanceof NeedsLogin) return true
  const msg = error instanceof Error ? error.message : String(error)
  return /\b401\b|unauthori[sz]ed|invalid_token|invalid_grant/i.test(msg)
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export class Connector {
  status: Status = { state: 'off', message: '', tools: [], since: Date.now() }
  private client?: Client
  private generation = 0
  private attempt = 0
  private retryTimer?: ReturnType<typeof setTimeout>
  private disposers = new Map<string, () => void>()
  private waiters: Array<() => void> = []
  private stderr = ''

  constructor(public spec: ServerSpec, private deps: Deps) {}

  start() {
    if (!this.spec.enabled) { this.set('off', 'Turned off'); return }
    void this.connect()
  }

  /** Disconnect and withdraw every tool. */
  async stop(state: State = 'off', message = '') {
    this.generation++
    clearTimeout(this.retryTimer)
    this.unpublish()
    this.status.tools = []
    const client = this.client
    this.client = undefined
    this.set(state, message)
    if (client) await client.close().catch(() => undefined)
  }

  async restart() {
    await this.stop('connecting')
    this.attempt = 0
    this.start()
  }

  /** Apply new settings: reconnect only when something connection-relevant changed. */
  async update(spec: ServerSpec) {
    const { disabledTools: _a, label: _b, ...before } = this.spec
    const { disabledTools: _c, label: _d, ...after } = spec
    this.spec = spec
    if (JSON.stringify(before) !== JSON.stringify(after)) return this.restart()
    if (this.client) await this.sync(this.client, this.generation)
  }

  /** Try now instead of waiting for the backoff timer. */
  kick() {
    if (this.status.state === 'retrying') { clearTimeout(this.retryTimer); void this.connect() }
  }

  private set(state: State, message = '') {
    if (state !== this.status.state) this.status.since = Date.now()
    this.status.state = state
    this.status.message = message
    if (state !== 'retrying') delete this.status.retryAt
    if (state === 'connected' || state === 'off' || state === 'needs-login' || state === 'error') {
      for (const wake of this.waiters.splice(0)) wake()
    }
  }

  private async transport(useSse = false) {
    const spec = this.spec
    if (spec.transport === 'stdio') {
      this.stderr = ''
      const t = new StdioClientTransport({
        command: spec.command!,
        args: spec.args ?? [],
        ...(spec.cwd ? { cwd: spec.cwd } : {}),
        // Keep PATH/HOME etc. so `npx`, `uvx`, `docker` resolve like in a shell.
        env: { ...(process.env as Record<string, string>), ...(spec.env ?? {}) },
        stderr: 'pipe',
      })
      // Keep the end of stderr: it is usually the only clue when a server dies.
      t.stderr?.on('data', (chunk: Buffer) => { this.stderr = (this.stderr + chunk.toString()).slice(-STDERR_TAIL) })
      return t
    }
    const secret = await this.deps.secrets.read(spec.id)
    const headers: Record<string, string> = { ...(spec.headers ?? {}) }
    let authProvider: any
    if (spec.auth === 'bearer') {
      if (!secret.bearer) throw new Error('No bearer token saved. Edit the connector and add one.')
      headers.Authorization = `Bearer ${secret.bearer}`
    } else if (spec.auth === 'oauth') {
      if (!secret.tokens) throw new NeedsLogin('Not signed in yet')
      authProvider = new ConnectorOAuth(spec, this.deps.secrets, this.deps.redirect, () => this.deps.onNeedsLogin(spec.id))
    }
    const opts = { ...(authProvider ? { authProvider } : {}), requestInit: { headers } }
    return useSse ? new SSEClientTransport(new URL(spec.url!), opts) : new StreamableHTTPClientTransport(new URL(spec.url!), opts)
  }

  private async open(gen: number, useSse: boolean): Promise<Client> {
    const client = new Client({ name: 'dsh-connectors', version: VERSION }, {
      capabilities: {},
      listChanged: {
        tools: {
          autoRefresh: false,
          debounceMs: 300,
          onChanged: () => { if (this.client === client) void this.sync(client, gen).catch((e) => this.deps.log('warn', `${this.spec.id}: tool refresh failed: ${errorText(e)}`)) },
        },
      },
    } as any)
    client.onclose = () => { if (this.client === client && gen === this.generation) this.down('Connection lost') }
    await client.connect(await this.transport(useSse))
    return client
  }

  private async connect() {
    const gen = ++this.generation
    this.set('connecting')
    let client: Client
    try {
      try {
        client = await this.open(gen, false)
      } catch (first) {
        // Older servers only speak the 2024 HTTP+SSE transport.
        if (this.spec.transport !== 'http' || isAuthError(first) || gen !== this.generation) throw first
        try { client = await this.open(gen, true) } catch { throw first }
      }
    } catch (error) {
      if (gen !== this.generation) return
      if (isAuthError(error)) {
        this.unpublish()
        this.status.tools = []
        this.set('needs-login', error instanceof NeedsLogin ? error.message : 'Sign-in expired. Sign in again.')
        return
      }
      this.down(errorText(error) + (this.stderr ? `\n${this.stderr.trim().split('\n').slice(-3).join('\n')}` : ''))
      return
    }
    if (gen !== this.generation) { await client.close().catch(() => undefined); return }
    this.client = client
    try {
      await this.sync(client, gen)
    } catch (error) {
      if (gen === this.generation) this.down(`Listing tools failed: ${errorText(error)}`)
      return
    }
    this.attempt = 0
    const info = client.getServerVersion?.()
    this.status.serverName = info?.name
    this.status.serverVersion = info?.version
    this.set('connected', `${this.status.tools.filter((t) => t.enabled).length} tools`)
    this.deps.log('info', `${this.spec.id}: connected, ${this.status.tools.length} tools`)
  }

  /** Connection dropped or failed: keep tools, retry with exponential backoff + jitter. */
  private down(message: string) {
    const client = this.client
    this.client = undefined
    if (client) void client.close().catch(() => undefined)
    clearTimeout(this.retryTimer)
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** this.attempt++)
    const delay = Math.round(base * (0.75 + Math.random() * 0.5))
    this.set('retrying', message)
    this.status.retryAt = Date.now() + delay
    this.deps.log('warn', `${this.spec.id}: ${message.split('\n')[0]} — retrying in ${Math.round(delay / 1000)}s`)
    const gen = this.generation
    this.retryTimer = setTimeout(() => { if (gen === this.generation) void this.connect() }, delay)
    this.retryTimer.unref?.()
  }

  /** List every tool page and swap the published set in one go. */
  private async sync(client: Client, gen: number) {
    const listed: any[] = []
    let cursor: string | undefined
    do {
      const page: any = await client.listTools(cursor ? { cursor } : undefined)
      listed.push(...(page.tools ?? []))
      cursor = page.nextCursor
    } while (cursor)
    if (gen !== this.generation) return
    const disabled = new Set(this.spec.disabledTools ?? [])
    this.status.tools = listed.map((t) => ({ name: t.name, title: t.title ?? t.annotations?.title, description: t.description ?? '', enabled: !disabled.has(t.name) }))
    // Old set out first: the registry is keyed by name, so a new tool can't
    // coexist with its previous generation.
    this.unpublish()
    try {
      for (const tool of listed) {
        if (disabled.has(tool.name)) continue
        this.disposers.set(tool.name, this.deps.tools.register(this.definition(tool)))
      }
    } catch (error) {
      this.unpublish()
      throw error
    }
    const next = this.disposers
    if (this.status.state === 'connected') this.status.message = `${next.size} tools`
  }

  private unpublish() {
    for (const dispose of this.disposers.values()) {
      try { dispose() } catch { /* already gone */ }
    }
    this.disposers.clear()
  }

  /** Wait (briefly) for a usable connection, nudging a pending retry. */
  private async ready(signal?: AbortSignal): Promise<Client> {
    if (this.client && this.status.state === 'connected') return this.client
    if (this.status.state === 'needs-login') throw new Error(`${this.spec.label} needs a sign-in: open Settings → Connectors and click Sign in.`)
    if (this.status.state === 'off') throw new Error(`${this.spec.label} is turned off in Settings → Connectors.`)
    this.kick()
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, CALL_WAIT_MS)
      this.waiters.push(() => { clearTimeout(timer); resolve() })
      signal?.addEventListener('abort', () => { clearTimeout(timer); resolve() }, { once: true })
    })
    signal?.throwIfAborted()
    if (this.client && this.status.state === 'connected') return this.client
    throw new Error(`${this.spec.label} is not reachable right now (${this.status.message || this.status.state}). Try again later.`)
  }

  private definition(tool: any) {
    const raw = tool.name as string
    const label = this.spec.label
    return {
      name: toolName(this.spec.id, raw),
      description: (tool.description || `Tool "${raw}" from the ${label} MCP server.`).slice(0, 4000),
      parameters: tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : { type: 'object', properties: {} },
      output: {
        schema: {
          type: 'object',
          properties: { content: { type: 'array', items: {} }, structuredContent: {} },
          required: ['content'],
          additionalProperties: false,
        },
        render: (_args: unknown, value: any) => {
          const text = contentText(value?.content)
          if (text) return [{ type: 'text', text }]
          if (value?.structuredContent !== undefined) return [{ type: 'text', text: JSON.stringify(value.structuredContent).slice(0, MAX_TEXT) }]
          return [{ type: 'text', text: `(${raw} returned nothing)` }]
        },
      },
      execute: async (args: unknown, exec: any) => {
        const call = async () => {
          const client = await this.ready(exec?.signal)
          return client.callTool(
            { name: raw, arguments: args && typeof args === 'object' ? args as Record<string, unknown> : {} },
            { signal: exec?.signal, timeout: this.spec.timeoutMs ?? DEFAULT_TIMEOUT_MS, resetTimeoutOnProgress: true } as any,
          )
        }
        let result: any
        try {
          result = await call()
        } catch (error) {
          if (exec?.signal?.aborted) throw error
          if (isAuthError(error)) {
            void this.stop('needs-login', 'Sign-in expired. Sign in again.')
            this.deps.onNeedsLogin(this.spec.id)
            throw new Error(`${label} needs a new sign-in: open Settings → Connectors and click Sign in.`)
          }
          // A dead connection shows up as a failed call before onclose fires: reconnect and retry once.
          if (/closed|ECONNRESET|EPIPE|not connected|fetch failed|socket/i.test(errorText(error)) && this.client) {
            this.down('Connection lost during a call')
            result = await call()
          } else throw error
        }
        if (result?.isError) throw new Error(contentText(result.content) || `${raw} failed`)
        return {
          content: Array.isArray(result?.content) ? result.content : [],
          ...(result?.structuredContent !== undefined ? { structuredContent: result.structuredContent } : {}),
        }
      },
    }
  }
}
