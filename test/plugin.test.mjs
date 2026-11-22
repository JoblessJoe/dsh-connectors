import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { apply, parseImport } from '../lib/index.js'

const here = dirname(fileURLToPath(import.meta.url))
const fixture = join(here, 'fixture-server.mjs')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** Just enough of a dsh host context. */
function fakeHost() {
  const tools = new Map()
  const records = new Map()
  const disposers = []
  let route
  const web = new Map()
  const ctx = {
    webServer: { register(r) { web.set(r.path, r.handler); return () => web.delete(r.path) } },
    tools: { register(def) { tools.set(def.name, def); return () => tools.delete(def.name) } },
    connection: { fetch: { register(r) { route = r; return async () => {} } } },
    credentials: {
      async readRecord(k) { return records.get(k) },
      async modifyRecord(k, fn) { const next = await fn(records.get(k)); if (next) records.set(k, next); return next },
      async deleteRecord(k) { records.delete(k) },
    },
    effect(fn) { const d = fn(); if (typeof d === 'function') disposers.push(d) },
  }
  const dir = mkdtempSync(join(tmpdir(), 'dshc-'))
  const file = join(dir, 'connectors.json')
  apply(ctx, { file, callbackPort: 47000 + Math.floor(Math.random() * 900) })
  const call = async (body) => {
    const res = await route.fetch(new Request('http://x/api/dsh-connectors', body ? { method: 'POST', body: JSON.stringify(body) } : {}))
    return res.json()
  }
  const until = async (id, state, ms = 10000) => {
    const end = Date.now() + ms
    for (;;) {
      const s = (await call()).servers.find((x) => x.spec.id === id)?.status
      if (s?.state === state) return s
      if (Date.now() > end) throw new Error(`${id}: wanted ${state}, got ${s?.state} ${s?.message}`)
      await sleep(100)
    }
  }
    const hit = (path) => new Promise((resolve) => {
    const res = { status: 0, body: '', writeHead(code) { this.status = code; return this }, end(b = '') { this.body = String(b); resolve(this) } }
    web.get(path.split('?')[0])({ method: 'GET', url: path }, res)
  })
  return { tools, records, call, until, file, hit, dispose: () => disposers.forEach((d) => d()) }
}

function httpFixture(port, token, env = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, [fixture, 'http', String(port), ...(token ? [token] : [])], { stdio: ['ignore', 'pipe', 'inherit'], env: { ...process.env, ...env } })
    p.stdout.once('data', () => resolve(p))
  })
}

test('stdio server: tools publish, run, switch off, and go away on remove', async () => {
  const h = fakeHost()
  const r = await h.call({ op: 'add', spec: { id: 'fx', label: 'Fixture', transport: 'stdio', command: process.execPath, args: [fixture, 'stdio'] } })
  assert.equal(r.ok, true, r.error)
  await h.until('fx', 'connected')
  assert.ok(h.tools.has('mcp__fx__echo'))
  const out = await h.tools.get('mcp__fx__echo').execute({ text: 'hi' }, {})
  assert.equal(h.tools.get('mcp__fx__echo').output.render({}, out)[0].text, 'echo: hi')
  await assert.rejects(h.tools.get('mcp__fx__fail').execute({}, {}), /boom/)
  assert.equal((await h.call({ op: 'tool', id: 'fx', tool: 'fail', enabled: false })).ok, true)
  assert.ok(!h.tools.has('mcp__fx__fail'))
  assert.ok(h.tools.has('mcp__fx__echo'))
  assert.deepEqual(JSON.parse(readFileSync(h.file, 'utf8')).servers[0].disabledTools, ['fail'])
  assert.equal((await h.call({ op: 'remove', id: 'fx' })).ok, true)
  assert.equal(h.tools.size, 0)
  h.dispose()
})

test('http + bearer: token stays out of the file, wrong token = needs sign-in, recovers after server restart', async () => {
  const port = 46000 + Math.floor(Math.random() * 900)
  let server = await httpFixture(port, 's3cret')
  const h = fakeHost()
  const r = await h.call({ op: 'add', spec: { id: 'web', transport: 'http', url: `http://127.0.0.1:${port}/mcp`, auth: 'bearer' }, bearer: 'Bearer s3cret' })
  assert.equal(r.ok, true, r.error)
  await h.until('web', 'connected')
  assert.ok(!readFileSync(h.file, 'utf8').includes('s3cret'))
  const view = await h.call()
  assert.equal(JSON.stringify(view).includes('s3cret'), false)
  assert.equal(view.servers[0].secrets.bearer, true)

  // Server goes away and comes back: the next call reconnects instead of failing.
  server.kill(); await sleep(300)
  server = await httpFixture(port, 's3cret')
  const out = await h.tools.get('mcp__web__echo').execute({ text: 'back' }, {})
  assert.equal(out.content[0].text, 'echo: back')

  await h.call({ op: 'edit', spec: { id: 'web', transport: 'http', url: `http://127.0.0.1:${port}/mcp`, auth: 'bearer' }, bearer: 'wrong' })
  await h.until('web', 'needs-login')
  server.kill()
  h.dispose()
})

test('oauth without tokens asks for sign-in; bad input is refused with a readable message', async () => {
  const h = fakeHost()
  await h.call({ op: 'add', spec: { id: 'remote', transport: 'http', url: 'https://example.invalid/mcp' } })
  await h.until('remote', 'needs-login')
  const bad = await h.call({ op: 'add', spec: { id: '1bad', transport: 'http', url: 'x' } })
  assert.equal(bad.ok, false)
  assert.match(bad.error, /Id must start/)
  const dup = await h.call({ op: 'add', spec: { id: 'remote', transport: 'http', url: 'https://a.b/mcp' } })
  assert.match(dup.error, /already exists/)
  const fin = await h.call({ op: 'finish', text: 'http://127.0.0.1:1/callback?code=x&state=nope' })
  assert.match(fin.error, /No sign-in is waiting/)
  // The OAuth return route on dsh's own address refuses a made-up state.
  const page = await h.hit('/plugins/dsh-connectors/callback?code=x&state=forged')
  assert.equal(page.status, 400)
  assert.match(page.body, /No sign-in is waiting/)
  h.dispose()
})

test('import Claude Desktop JSON: stdio + http, Authorization header becomes a secret', () => {
  const rows = parseImport(JSON.stringify({ mcpServers: {
    'My Files': { command: 'npx', args: ['-y', 'server-filesystem', '/tmp'] },
    linear: { url: 'https://mcp.linear.app/mcp' },
    internal: { type: 'http', url: 'https://x.test/mcp', headers: { Authorization: 'Bearer abc', 'X-Team': 't1' } },
  } }))
  assert.deepEqual(rows.map((r) => r.spec.id), ['my-files', 'linear', 'internal'])
  assert.equal(rows[0].spec.transport, 'stdio')
  assert.equal(rows[1].spec.auth, 'oauth')
  assert.equal(rows[2].bearer, 'abc')
  assert.deepEqual(rows[2].spec.headers, { 'X-Team': 't1' })
})

test('stateful server restarts: "Session not found" reconnects and the call still succeeds', async () => {
  const port = 45000 + Math.floor(Math.random() * 900)
  let server = await httpFixture(port, '', { STATEFUL: '1' })
  const h = fakeHost()
  await h.call({ op: 'add', spec: { id: 'st', transport: 'http', url: `http://127.0.0.1:${port}/mcp`, auth: 'none' } })
  await h.until('st', 'connected')
  assert.equal((await h.tools.get('mcp__st__echo').execute({ text: 'one' }, {})).content[0].text, 'echo: one')
  server.kill(); await sleep(300)
  server = await httpFixture(port, '', { STATEFUL: '1' })
  // Still "connected" from the plugin's view; the old session id is now unknown to the server.
  const out = await h.tools.get('mcp__st__echo').execute({ text: 'two' }, {})
  assert.equal(out.content[0].text, 'echo: two')
  server.kill()
  h.dispose()
})

/** A fake MCP server + authorization server that publishes only the given AS metadata. */
function fakeAuthServer(asMeta) {
  return new Promise((resolve) => {
    const srv = createServer((req, res) => {
      const base = `http://127.0.0.1:${srv.address().port}`
      const json = (o) => res.writeHead(200, { 'content-type': 'application/json' }).end(JSON.stringify(o))
      if (req.url.startsWith('/.well-known/oauth-protected-resource')) return json({ resource: `${base}/mcp`, authorization_servers: [base] })
      if (req.url.startsWith('/.well-known/oauth-authorization-server')) return json({ issuer: base, authorization_endpoint: `${base}/authorize`, token_endpoint: `${base}/token`, response_types_supported: ['code'], code_challenge_methods_supported: ['S256'], ...asMeta(base) })
      res.writeHead(401, { 'www-authenticate': `Bearer resource_metadata="${base}/.well-known/oauth-protected-resource"` }).end()
    })
    srv.listen(0, '127.0.0.1', () => resolve(srv))
  })
}

test('sign-in picks the client identity: published identity (CIMD) with loopback, or a clear error', async () => {
  const cimd = await fakeAuthServer(() => ({ client_id_metadata_document_supported: true }))
  const h = fakeHost()
  await h.call({ op: 'add', spec: { id: 'cimd', transport: 'http', url: `http://127.0.0.1:${cimd.address().port}/mcp` } })
  const r = await h.call({ op: 'login', id: 'cimd', origin: 'https://dsh.example.com' })
  assert.equal(r.ok, true, r.error)
  assert.equal(r.loopback, true)
  const u = new URL(r.url)
  assert.equal(u.searchParams.get('client_id'), 'https://joblessjoe.github.io/dsh-connectors/client-metadata.json')
  assert.match(u.searchParams.get('redirect_uri'), /^http:\/\/127\.0\.0\.1:\d+\/callback$/)
  assert.equal(u.searchParams.get('code_challenge_method'), 'S256')
  await h.call({ op: 'cancel', id: 'cimd' })

  const none = await fakeAuthServer(() => ({}))
  await h.call({ op: 'add', spec: { id: 'manual', transport: 'http', url: `http://127.0.0.1:${none.address().port}/mcp` } })
  const m = await h.call({ op: 'login', id: 'manual', origin: 'https://dsh.example.com' })
  assert.match(m.error, /register yourself.*https:\/\/dsh\.example\.com\/plugins\/dsh-connectors\/callback/)
  cimd.close(); none.close()
  h.dispose()
})
