/**
 * dsh-connectors — host half.
 *
 * Claude-style connectors for DeepSeek Harness: add any MCP server (remote
 * with OAuth sign-in, bearer token or no auth; or a local stdio command) from
 * Settings → Connectors, without editing YAML or restarting dsh.
 */
import { homedir } from 'node:os'
import { join } from 'node:path'
import { LoginDesk, page, Secrets } from './auth.ts'
import { Connector } from './connector.ts'
import { normalize, parseImport, ServerStore, type ServerSpec } from './store.ts'

export { parseImport } from './store.ts'

export const name = 'dsh-connectors'
export const inject = ['tools', 'connection', 'credentials', 'webServer']

export interface Config {
  /** Where the (non-secret) connector list lives. Default: `$DSH_HOME/connectors.json`. */
  file?: string
  /** Loopback port for the OAuth redirect. Keep it fixed: client registrations are bound to it. */
  callbackPort?: number
}

const ROUTE = '/api/dsh-connectors'
const CALLBACK = '/plugins/dsh-connectors/callback'

/** `https://host[:port]` the browser opened dsh at, or undefined if it isn't one. */
function originOf(value: unknown): string | undefined {
  try {
    const url = new URL(String(value))
    return (url.protocol === 'https:' || url.protocol === 'http:') ? url.origin : undefined
  } catch { return undefined }
}

function json(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

export function apply(ctx: any, config: Config = {}) {
  const logger = ctx.logger?.('dsh-connectors')
  const log = (level: 'info' | 'warn', msg: string) => (logger?.[level] ? logger[level](msg) : console[level === 'warn' ? 'warn' : 'log'](`dsh-connectors: ${msg}`))
  const home = process.env.DSH_HOME || join(homedir(), '.dsh')
  const store = new ServerStore(config.file || join(home, 'connectors.json'))
  const secrets = new Secrets(ctx.credentials)
  const desk = new LoginDesk(config.callbackPort || 47391, (m) => log('info', m))
  const connectors = new Map<string, Connector>()
  let disposed = false

  const make = (spec: ServerSpec) => new Connector(spec, {
    tools: ctx.tools,
    secrets,
    redirect: desk.redirect,
    log,
    onNeedsLogin: (id) => {
      const c = connectors.get(id)
      if (c && c.status.state !== 'needs-login') void c.stop('needs-login', 'Sign-in expired. Sign in again.')
    },
  })

  const boot = (async () => {
    for (const spec of await store.list()) {
      if (disposed) return
      const c = make(spec)
      connectors.set(spec.id, c)
      c.start()
    }
  })().catch((e) => log('warn', `could not read the connector list: ${e?.message ?? e}`))

  async function view() {
    await boot
    const servers = []
    for (const c of connectors.values()) {
      const s = await secrets.read(c.spec.id).catch(() => ({} as any))
      servers.push({
        spec: c.spec,
        status: { ...c.status, signingIn: desk.hasPending(c.spec.id) },
        // Flags only. Secret values never leave the host.
        secrets: { bearer: !!s.bearer, clientSecret: !!s.clientSecret, signedIn: !!s.tokens },
      })
    }
    return { servers, redirect: desk.redirect }
  }

  const get = (id: unknown) => {
    const c = connectors.get(String(id))
    if (!c) throw new Error('No connector with that id.')
    return c
  }

  async function save(input: any, isNew: boolean) {
    const spec = normalize(input?.spec)
    if (isNew && connectors.has(spec.id)) throw new Error(`A connector named "${spec.id}" already exists. Pick another id.`)
    if (!isNew) get(spec.id)
    const bearer = typeof input?.bearer === 'string' ? input.bearer.trim() : ''
    const clientSecret = typeof input?.clientSecret === 'string' ? input.clientSecret.trim() : ''
    if (bearer || clientSecret || isNew) {
      await secrets.patch(spec.id, (s) => {
        if (isNew) s = {}
        if (bearer) s.bearer = bearer.replace(/^Bearer\s+/i, '')
        if (clientSecret) s.clientSecret = clientSecret
        return s
      })
    }
    await store.update((list) => isNew ? [...list, spec] : list.map((s) => (s.id === spec.id ? spec : s)))
    const existing = connectors.get(spec.id)
    if (existing) {
      // A new token only takes effect on a fresh connection.
      if (bearer || clientSecret) { existing.spec = spec; await existing.restart() } else await existing.update(spec)
    } else {
      const c = make(spec)
      connectors.set(spec.id, c)
      c.start()
    }
    return spec.id
  }

  async function op(body: any): Promise<unknown> {
    await boot
    switch (body?.op) {
      case 'add': return { id: await save(body, true) }
      case 'edit': return { id: await save(body, false) }
      case 'remove': {
        const c = get(body.id)
        desk.cancel(c.spec.id)
        await c.stop()
        connectors.delete(c.spec.id)
        await store.update((list) => list.filter((s) => s.id !== c.spec.id))
        await secrets.clear(c.spec.id)
        return {}
      }
      case 'enable': {
        const c = get(body.id)
        const spec = { ...c.spec, enabled: body.enabled === true }
        await store.update((list) => list.map((s) => (s.id === spec.id ? spec : s)))
        c.spec = spec
        if (spec.enabled) await c.restart()
        else { desk.cancel(spec.id); await c.stop('off', 'Turned off') }
        return {}
      }
      case 'tool': {
        const c = get(body.id)
        const off = new Set(c.spec.disabledTools ?? [])
        if (body.enabled === true) off.delete(String(body.tool)); else off.add(String(body.tool))
        const spec = { ...c.spec, disabledTools: [...off] }
        await store.update((list) => list.map((s) => (s.id === spec.id ? spec : s)))
        await c.update(spec)
        return {}
      }
      case 'reconnect': await get(body.id).restart(); return {}
      case 'login': {
        const c = get(body.id)
        if (c.spec.transport !== 'http' || c.spec.auth !== 'oauth') throw new Error('This connector does not use a sign-in.')
        const done = (error?: Error) => {
          if (disposed) return
          if (error) log('warn', `${c.spec.id}: sign-in failed: ${error.message}`)
          else { log('info', `${c.spec.id}: signed in`); void c.restart() }
        }
        // Back to the address this browser uses for dsh, so it finishes by itself.
        // `loopback: true` (or no origin) uses the paste-the-address fallback.
        const origin = body.loopback ? undefined : originOf(body.origin)
        const url = await desk.start(c.spec, secrets, done, origin ? origin + CALLBACK : desk.redirect)
        if (!url) await c.restart() // stored tokens were still good
        return { url: url ?? null }
      }
      case 'finish': return { id: await desk.finishFromText(String(body.text ?? '')) }
      case 'cancel': desk.cancel(String(body.id)); return {}
      case 'logout': {
        const c = get(body.id)
        await secrets.patch(c.spec.id, (s) => { delete s.tokens; return s })
        await c.stop('needs-login', 'Signed out')
        return {}
      }
      case 'import': {
        const rows = parseImport(String(body.text ?? ''))
        const added: string[] = []
        const skipped: string[] = []
        for (const row of rows) {
          let id = row.spec.id
          for (let n = 2; connectors.has(id); n++) id = `${row.spec.id.slice(0, 29)}-${n}`
          if (id !== row.spec.id && body.skipExisting) { skipped.push(row.spec.id); continue }
          await save({ spec: { ...row.spec, id }, bearer: row.bearer }, true)
          added.push(id)
        }
        return { added, skipped }
      }
      default: throw new Error(`Unknown operation: ${body?.op}`)
    }
  }

  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE,
    methods: ['GET', 'POST'],
    requestBody: 'buffered',
    fetch: async (request: Request) => {
      try {
        if (request.method === 'GET') return json({ ok: true, ...(await view()) })
        let body: any = {}
        try { body = await request.json() } catch { /* empty body */ }
        return json({ ok: true, ...((await op(body)) as object) })
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400)
      }
    },
  }), 'dsh-connectors.route')

  // The OAuth redirect lands here. It is a plain web-server route, outside the
  // /api fence, because it must accept a cross-site navigation from the
  // provider. The one-time `state` and PKCE verifier are what protect it.
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: CALLBACK,
    handler: async (req: any, res: any) => {
      if (req.method !== 'GET') { res.writeHead(405).end(); return }
      const params = new URL(req.url ?? '/', 'http://x').searchParams
      try {
        await desk.finish(params)
        page(res, 200, 'Signed in', 'You can close this tab. The connector is connecting in DeepSeek Harness.', true)
      } catch (e) {
        page(res, 400, 'Sign-in failed', e instanceof Error ? e.message : String(e))
      }
    },
  }), 'dsh-connectors.callback')

  ctx.effect(() => () => {
    disposed = true
    void desk.close()
    for (const c of connectors.values()) void c.stop()
    connectors.clear()
  }, 'dsh-connectors.connectors')
}
