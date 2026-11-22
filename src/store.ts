/**
 * The connector list: plain, non-secret server settings in one JSON file.
 * Secrets (bearer tokens, client secrets, OAuth grants) never land here —
 * they live in dsh's credential store, see secrets.ts.
 */
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

export type Transport = 'http' | 'stdio'
export type AuthMode = 'oauth' | 'bearer' | 'none'

export interface ServerSpec {
  /** Stable id: tool names become `mcp__<id>__<tool>`; also the credential id. */
  id: string
  /** Display name. */
  label: string
  enabled: boolean
  transport: Transport
  // --- http ---
  url?: string
  auth?: AuthMode
  /** Extra non-secret headers. */
  headers?: Record<string, string>
  /** OAuth scope to ask for; empty = whatever the server advertises. */
  scope?: string
  /** Pre-registered OAuth client id, for servers without dynamic registration. */
  clientId?: string
  // --- stdio ---
  command?: string
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  // --- both ---
  /** Per-call timeout in ms. */
  timeoutMs?: number
  /** Server tool names the agent must not see. */
  disabledTools?: string[]
}

export const ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/

/** Turn any name into a valid id (`My Notes!` → `my-notes`). */
export function slugify(value: string): string {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[^a-z]+|-+$/g, '').slice(0, 32).replace(/-+$/, '')
  return slug || 'server'
}

const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const strDict = (v: unknown): Record<string, string> | undefined => {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return undefined
  const out: Record<string, string> = {}
  for (const [k, val] of Object.entries(v)) if (k.trim() && val != null) out[k.trim()] = String(val)
  return Object.keys(out).length ? out : undefined
}

/**
 * Validate untrusted input (from the settings page or the file) into a spec.
 * Throws a message the settings page can show as-is.
 */
export function normalize(input: any): ServerSpec {
  const id = str(input?.id)
  if (!ID_PATTERN.test(id)) throw new Error('Id must start with a letter and use only a-z, 0-9 and "-" (max 32).')
  const transport: Transport = input?.transport === 'stdio' ? 'stdio' : 'http'
  const spec: ServerSpec = {
    id,
    label: str(input?.label) || id,
    enabled: input?.enabled !== false,
    transport,
  }
  const timeout = Number(input?.timeoutMs)
  if (Number.isFinite(timeout) && timeout >= 1000) spec.timeoutMs = Math.min(Math.round(timeout), 30 * 60_000)
  if (Array.isArray(input?.disabledTools)) spec.disabledTools = input.disabledTools.map(String).filter(Boolean)
  if (transport === 'stdio') {
    spec.command = str(input?.command)
    if (!spec.command) throw new Error('A stdio server needs a command.')
    spec.args = Array.isArray(input?.args) ? input.args.map(String) : []
    if (str(input?.cwd)) spec.cwd = str(input.cwd)
    const env = strDict(input?.env)
    if (env) spec.env = env
    return spec
  }
  let url: URL
  try { url = new URL(str(input?.url)) } catch { throw new Error('Enter the full server URL, e.g. https://example.com/mcp.') }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error('The URL must start with https:// or http://.')
  spec.url = url.href
  spec.auth = input?.auth === 'bearer' || input?.auth === 'none' ? input.auth : 'oauth'
  const headers = strDict(input?.headers)
  if (headers) {
    // An Authorization header here would sit in a plain file; force the secret path.
    for (const k of Object.keys(headers)) if (k.toLowerCase() === 'authorization') throw new Error('Put tokens in the Bearer token field, not in headers.')
    spec.headers = headers
  }
  if (str(input?.scope)) spec.scope = str(input.scope)
  if (str(input?.clientId)) spec.clientId = str(input.clientId)
  return spec
}

/** Reads and atomically rewrites the JSON file; serializes its own writes. */
export class ServerStore {
  private chain: Promise<unknown> = Promise.resolve()
  constructor(readonly file: string) {}

  async list(): Promise<ServerSpec[]> {
    let raw: string
    try { raw = await readFile(this.file, 'utf8') } catch (e: any) {
      if (e?.code === 'ENOENT') return []
      throw e
    }
    const data = JSON.parse(raw)
    const rows: unknown[] = Array.isArray(data?.servers) ? data.servers : []
    const out: ServerSpec[] = []
    for (const row of rows) {
      try { out.push(normalize(row)) } catch { /* a hand-edited bad row is skipped, not fatal */ }
    }
    return out
  }

  /** Apply `edit` to the current list and save; returns the new list. */
  update(edit: (servers: ServerSpec[]) => ServerSpec[]): Promise<ServerSpec[]> {
    const run = this.chain.then(async () => {
      const next = edit(await this.list())
      await mkdir(dirname(this.file), { recursive: true })
      const tmp = `${this.file}.${process.pid}.tmp`
      await writeFile(tmp, JSON.stringify({ version: 1, servers: next }, null, 2) + '\n', { mode: 0o600 })
      await rename(tmp, this.file)
      return next
    })
    this.chain = run.catch(() => undefined)
    return run
  }
}

/**
 * Parse a Claude Desktop / Cursor / VS Code style `mcpServers` JSON blob into
 * specs. Secret-looking values come back separately so they go to the
 * credential store, not the plain file.
 */
export function parseImport(text: string): Array<{ spec: ServerSpec; bearer?: string }> {
  let data: any
  try { data = JSON.parse(text) } catch { throw new Error('That is not valid JSON.') }
  const table = data?.mcpServers ?? data?.servers ?? data
  if (!table || typeof table !== 'object' || Array.isArray(table)) throw new Error('Expected an object like {"mcpServers": {"name": {...}}}.')
  const out: Array<{ spec: ServerSpec; bearer?: string }> = []
  for (const [name, row] of Object.entries<any>(table)) {
    if (!row || typeof row !== 'object') continue
    const id = slugify(name)
    if (row.command) {
      out.push({ spec: normalize({ id, label: name, transport: 'stdio', command: row.command, args: row.args, cwd: row.cwd, env: row.env }) })
      continue
    }
    const url = row.url ?? row.serverUrl
    if (!url) continue
    const headers = { ...(row.headers ?? {}) }
    let bearer: string | undefined
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() !== 'authorization') continue
      bearer = String(headers[k]).replace(/^Bearer\s+/i, '')
      delete headers[k]
    }
    out.push({ spec: normalize({ id, label: name, transport: 'http', url, headers, auth: bearer ? 'bearer' : 'oauth' }), bearer })
  }
  if (!out.length) throw new Error('No servers found in that JSON.')
  return out
}
