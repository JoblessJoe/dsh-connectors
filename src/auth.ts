/**
 * Secrets and sign-in.
 *
 * Secrets: one record per connector in dsh's own credential store
 * (`dsh-connectors/<id>`), never in the plain server list. The store does the
 * file locking, so a token refresh from two places can't corrupt it.
 *
 * Sign-in: the MCP SDK runs the OAuth 2.1 dance (discovery, dynamic client
 * registration, PKCE, refresh); this file only supplies storage and the
 * redirect. The redirect goes back to the address the user opened dsh at
 * (`<origin>/plugins/dsh-connectors/callback`, a plain web-server route, since
 * dsh's /api routes refuse cross-site requests by design), so it finishes by
 * itself on any device. Fallback: a loopback listener on the dsh machine plus
 * "paste the address", for providers that refuse that redirect.
 */
import { createServer, type Server } from 'node:http'
import { randomBytes } from 'node:crypto'
import { auth, type OAuthClientProvider } from '@modelcontextprotocol/client'
import type { ServerSpec } from './store.ts'

export interface Secret {
  bearer?: string
  clientSecret?: string
  client?: Record<string, unknown>
  tokens?: Record<string, unknown>
}

export class Secrets {
  constructor(private credentials: any) {}

  private key(id: string) { return `dsh-connectors/${id}` }

  async read(id: string): Promise<Secret> {
    const record = await this.credentials.readRecord(this.key(id))
    return record?.kind === 'grant' && record.payload && typeof record.payload === 'object' ? record.payload : {}
  }

  async patch(id: string, edit: (current: Secret) => Secret): Promise<void> {
    await this.credentials.modifyRecord(this.key(id), async (current: any) => {
      const previous: Secret = current?.kind === 'grant' && current.payload ? current.payload : {}
      const next = JSON.parse(JSON.stringify(edit({ ...previous })))
      return { kind: 'grant', payload: next }
    })
  }

  async clear(id: string): Promise<void> {
    await this.credentials.deleteRecord(this.key(id))
  }
}

/** Raised when a server wants a (new) browser sign-in. */
export class NeedsLogin extends Error {
  constructor(message = 'Sign-in needed') { super(message) }
}

/**
 * OAuth storage for one connector, backed by its credential record.
 * `onRedirect` fires when the SDK decides a browser sign-in is unavoidable.
 */
export class ConnectorOAuth implements OAuthClientProvider {
  private verifier?: string
  private nextState?: string

  constructor(
    private spec: ServerSpec,
    private secrets: Secrets,
    private redirect: string,
    private onRedirect: (url: URL, state: string | undefined) => void,
    /** Sign-in mode: only reuse a client registered for this exact redirect. */
    private strict = false,
  ) {}

  get redirectUrl() { return this.redirect }

  get clientMetadata() {
    return {
      client_name: 'DeepSeek Harness (dsh-connectors)',
      client_uri: 'https://github.com/JoblessJoe/dsh-connectors',
      redirect_uris: [this.redirect],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      ...(this.spec.scope ? { scope: this.spec.scope } : {}),
    } as any
  }

  state() {
    this.nextState = randomBytes(24).toString('base64url')
    return this.nextState
  }

  async clientInformation() {
    const secret = await this.secrets.read(this.spec.id)
    if (this.spec.clientId) {
      return { client_id: this.spec.clientId, ...(secret.clientSecret ? { client_secret: secret.clientSecret } : {}) } as any
    }
    const client: any = secret.client
    // A registration is bound to its redirect URIs; a changed port needs a new one.
    // A registration is bound to its redirect URIs, so a sign-in through another
    // address registers anew. Refreshing keeps whatever client issued the tokens.
    if (client?.client_id && (!this.strict || !Array.isArray(client.redirect_uris) || client.redirect_uris.includes(this.redirect))) return client
    return undefined
  }

  async saveClientInformation(info: any) {
    await this.secrets.patch(this.spec.id, (s) => ({ ...s, client: info }))
  }

  async tokens() {
    return (await this.secrets.read(this.spec.id)).tokens as any
  }

  async saveTokens(tokens: any) {
    await this.secrets.patch(this.spec.id, (s) => ({ ...s, tokens }))
  }

  redirectToAuthorization(url: URL) {
    this.onRedirect(url, this.nextState)
  }

  saveCodeVerifier(verifier: string) { this.verifier = verifier }

  codeVerifier() {
    if (!this.verifier) throw new NeedsLogin('Sign-in expired. Start it again.')
    return this.verifier
  }

  async invalidateCredentials(scope: 'all' | 'client' | 'tokens' | 'verifier' | 'discovery') {
    if (scope === 'verifier' || scope === 'discovery') {
      if (scope === 'verifier') this.verifier = undefined
      return
    }
    await this.secrets.patch(this.spec.id, (s) => {
      if (scope === 'all' || scope === 'client') delete s.client
      if (scope === 'all' || scope === 'tokens') delete s.tokens
      return s
    })
  }
}

interface Pending {
  id: string
  provider: ConnectorOAuth
  serverUrl: string
  scope?: string
  expires: number
  done: (error?: Error) => void
}

const LOGIN_TTL_MS = 15 * 60_000

/**
 * Runs browser sign-ins: hands out the authorization URL, then finishes the
 * attempt from either the loopback listener or a pasted redirect address.
 */
export class LoginDesk {
  private pending = new Map<string, Pending>()
  private server?: Server
  readonly redirect: string

  constructor(private port: number, private log: (msg: string) => void) {
    this.redirect = `http://127.0.0.1:${port}/callback`
  }

  /**
   * Start a sign-in for one connector. Resolves with the URL to open, or
   * `undefined` when stored tokens were still good (no browser needed).
   */
  async start(spec: ServerSpec, secrets: Secrets, onFinished: (error?: Error) => void, redirect = this.redirect): Promise<string | undefined> {
    this.sweep()
    for (const [state, p] of this.pending) if (p.id === spec.id) this.pending.delete(state)
    let url: URL | undefined
    let state: string | undefined
    const provider = new ConnectorOAuth(spec, secrets, redirect, (u, s) => { url = u; state = s }, true)
    const result = await auth(provider, { serverUrl: spec.url!, ...(spec.scope ? { scope: spec.scope } : {}) })
    if (result === 'AUTHORIZED') return undefined
    if (!url || !state) throw new Error('The server did not start a sign-in.')
    if (redirect === this.redirect) await this.listen()
    this.pending.set(state, { id: spec.id, provider, serverUrl: spec.url!, scope: spec.scope, expires: Date.now() + LOGIN_TTL_MS, done: onFinished })
    return url.href
  }

  /** Finish from a pasted address (or anything containing `code=` and `state=`). */
  async finishFromText(text: string): Promise<string> {
    const raw = text.trim()
    let params: URLSearchParams
    try { params = new URL(raw).searchParams } catch { params = new URLSearchParams(raw.replace(/^[^?]*\?/, '')) }
    return this.finish(params)
  }

  /** Cancel the pending sign-in of one connector, if any. */
  cancel(id: string) {
    for (const [state, p] of this.pending) if (p.id === id) this.pending.delete(state)
    this.idle()
  }

  hasPending(id: string) {
    this.sweep()
    return [...this.pending.values()].some((p) => p.id === id)
  }

  async close() {
    this.pending.clear()
    await this.stopListening()
  }

  /** Finish from the redirect's query string (dsh's own callback route or the loopback listener). */
  async finish(params: URLSearchParams): Promise<string> {
    this.sweep()
    const state = params.get('state') ?? ''
    const pending = this.pending.get(state)
    if (!pending) throw new Error('No sign-in is waiting for this address. It may have expired; start it again.')
    this.pending.delete(state)
    this.idle()
    const error = params.get('error')
    if (error) {
      const failure = new Error(`The server refused the sign-in: ${params.get('error_description') || error}`)
      pending.done(failure)
      throw failure
    }
    const code = params.get('code')
    if (!code) throw new Error('That address has no sign-in code in it.')
    try {
      const result = await auth(pending.provider, { serverUrl: pending.serverUrl, authorizationCode: code, ...(pending.scope ? { scope: pending.scope } : {}) })
      if (result !== 'AUTHORIZED') throw new Error('The server did not accept the sign-in code.')
    } catch (e) {
      pending.done(e as Error)
      throw e
    }
    pending.done()
    return pending.id
  }

  private sweep() {
    const now = Date.now()
    for (const [state, p] of this.pending) if (p.expires < now) this.pending.delete(state)
    this.idle()
  }

  /** The listener only runs while a sign-in waits. */
  private idle() {
    if (!this.pending.size) void this.stopListening()
  }

  private async listen() {
    if (this.server) return
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? '/', this.redirect)
      if (url.pathname !== '/callback') { res.writeHead(404).end(); return }
      this.finish(url.searchParams).then(
        () => page(res, 200, 'Signed in', 'You can close this tab and go back to DeepSeek Harness.'),
        (e) => page(res, 400, 'Sign-in failed', e instanceof Error ? e.message : String(e)),
      )
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', (e: any) => reject(e?.code === 'EADDRINUSE'
        ? new Error(`Port ${this.port} is busy. Set another callbackPort for dsh-connectors.`)
        : e))
      server.listen(this.port, '127.0.0.1', () => resolve())
    })
    this.server = server
    this.log(`sign-in listener on ${this.redirect}`)
  }

  private async stopListening() {
    const server = this.server
    this.server = undefined
    if (!server) return
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

export const escape = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)
export function page(res: any, status: number, title: string, text: string, close = false) {
  res.writeHead(status, { 'content-type': 'text/html; charset=utf-8' }).end(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title>` +
    `<body style="font:16px/1.5 system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center"><h1 style="font-size:1.25rem">${escape(title)}</h1><p>${escape(text)}</p>${close ? '<script>setTimeout(() => window.close(), 1500)</script>' : ''}</body>`,
  )
}
