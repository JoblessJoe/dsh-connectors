// dsh-connectors client: Settings → Connectors.
//
// One list of MCP servers with live status, sign-in, per-tool switches, an
// add/edit form and a JSON import. Talks to the host over one route
// (/api/dsh-connectors). Styled with dsh's theme tokens, so it follows light
// and dark mode. Polls every 2 s while the page is open.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'

const ROUTE = '/api/dsh-connectors'

type State = 'off' | 'connecting' | 'connected' | 'retrying' | 'needs-login' | 'error'
interface Tool { name: string; title?: string; description: string; enabled: boolean }
interface Row {
  spec: any
  status: { state: State; message: string; tools: Tool[]; retryAt?: number; signingIn?: boolean; serverName?: string; serverVersion?: string }
  secrets: { bearer: boolean; clientSecret: boolean; signedIn: boolean }
}

async function api(body?: unknown): Promise<any> {
  const res = await fetch(ROUTE, body === undefined
    ? { headers: { accept: 'application/json' } }
    : { method: 'POST', headers: { accept: 'application/json', 'content-type': 'application/json' }, body: JSON.stringify(body) })
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }))
  if (!data.ok) throw new Error(data.error || 'Request failed')
  return data
}

const CSS = `
.dc{display:flex;flex-direction:column;gap:16px;max-width:720px;color:var(--dsw-alias-label-primary);font-size:14px}
.dc-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dc-h{font-size:18px;font-weight:600;margin:0}
.dc-sub{color:var(--dsw-alias-label-tertiary);font-size:13px;margin:4px 0 0;line-height:1.45}
.dc-card{background:var(--dsw-alias-settings-card-fill);border:1px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl,12px);padding:14px 16px;display:flex;flex-direction:column;gap:12px}
.dc-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.dc-grow{flex:1;min-width:0}
.dc-name{font-weight:600;font-size:14px}
.dc-meta{color:var(--dsw-alias-label-tertiary);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dc-msg{color:var(--dsw-alias-label-secondary);font-size:12px;white-space:pre-wrap;word-break:break-word}
.dc-msg.err{color:var(--dsw-alias-state-error-primary)}
.dc-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-label-tertiary)}
.dc-dot.connected{background:var(--dsw-alias-state-success-primary,#2da44e)}
.dc-dot.connecting,.dc-dot.retrying{background:#d4a72c}
.dc-dot.needs-login,.dc-dot.error{background:var(--dsw-alias-state-error-primary)}
.dc-btn{font:inherit;font-size:13px;border-radius:8px;padding:6px 12px;cursor:pointer;border:1px solid var(--dsw-alias-border-l2);background:transparent;color:var(--dsw-alias-label-primary);white-space:nowrap}
.dc-btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}
.dc-btn:disabled{opacity:.5;cursor:default}
.dc-btn.sm{padding:3px 9px;font-size:12px}
.dc-btn.primary{background:var(--dsw-alias-button-primary-fill);border-color:transparent;color:var(--dsw-alias-label-primary-foreground,#fff)}
.dc-btn.danger{color:var(--dsw-alias-state-error-primary)}
.dc-field{display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dc-field input,.dc-field textarea,.dc-field select{font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-1,transparent);border:1px solid var(--dsw-alias-border-l3);border-radius:8px;padding:7px 9px;min-width:0}
.dc-field textarea{font-family:var(--ds-font-family-code,monospace);font-size:12px;min-height:64px;resize:vertical}
.dc-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
@media (max-width:560px){.dc-grid{grid-template-columns:1fr}}
.dc-seg{display:inline-flex;align-self:flex-start;border:1px solid var(--dsw-alias-border-l3);border-radius:999px;padding:3px}
.dc-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary);font:inherit;font-size:13px;padding:4px 14px;border-radius:999px;cursor:pointer}
.dc-seg button[aria-pressed=true]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-primary);font-weight:600}
.dc-tools{display:flex;flex-direction:column;border-top:1px solid var(--dsw-alias-border-l4);padding-top:8px;max-height:320px;overflow:auto}
.dc-tool{display:flex;gap:10px;align-items:flex-start;padding:5px 0;font-size:13px;cursor:pointer}
.dc-tool small{display:block;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.4}
.dc-signin{border:1px dashed var(--dsw-alias-border-l2);border-radius:10px;padding:10px 12px;display:flex;flex-direction:column;gap:8px;font-size:13px;line-height:1.45}
.dc-signin ol{margin:0;padding-left:18px}
.dc-link{color:var(--dsw-alias-label-link,var(--dsw-alias-button-primary-fill));word-break:break-all}
.dc-empty{color:var(--dsw-alias-label-tertiary);font-size:13px;text-align:center;padding:24px 0}
.dc-switch{appearance:none;width:30px;height:18px;border-radius:999px;background:var(--dsw-alias-border-l2);position:relative;cursor:pointer;flex:none;margin:0}
.dc-switch::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .15s}
.dc-switch:checked{background:var(--dsw-alias-button-primary-fill)}
.dc-switch:checked::after{left:14px}
`

function ensureStyles() {
  if (document.getElementById('dsh-connectors-css')) return
  const style = document.createElement('style')
  style.id = 'dsh-connectors-css'
  style.textContent = CSS
  document.head.appendChild(style)
}

const STATE_TEXT: Record<State, string> = {
  off: 'Off', connecting: 'Connecting…', connected: 'Connected', retrying: 'Reconnecting', 'needs-login': 'Sign-in needed', error: 'Error',
}

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const dictFrom = (text: string, sep: RegExp) => Object.fromEntries(lines(text).map((l) => {
  const m = l.match(sep)
  return m ? [l.slice(0, m.index).trim(), l.slice(m.index! + m[0].length).trim()] : [l, '']
}))
const dictText = (d: Record<string, string> | undefined, sep: string) => Object.entries(d ?? {}).map(([k, v]) => `${k}${sep}${v}`).join('\n')
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[^a-z]+|-+$/g, '').slice(0, 32).replace(/-+$/, '')

// ---------------------------------------------------------------------------

function Editor({ row, onDone }: { row?: Row; onDone: () => void }) {
  const s = row?.spec ?? {}
  const [label, setLabel] = useState<string>(s.label ?? '')
  const [id, setId] = useState<string>(s.id ?? '')
  const [idTouched, setIdTouched] = useState(!!row)
  const [transport, setTransport] = useState<'http' | 'stdio'>(s.transport ?? 'http')
  const [url, setUrl] = useState<string>(s.url ?? '')
  const [authMode, setAuthMode] = useState<string>(s.auth ?? 'oauth')
  const [bearer, setBearer] = useState('')
  const [headers, setHeaders] = useState(dictText(s.headers, ': '))
  const [scope, setScope] = useState<string>(s.scope ?? '')
  const [clientId, setClientId] = useState<string>(s.clientId ?? '')
  const [clientSecret, setClientSecret] = useState('')
  const [command, setCommand] = useState<string>(s.command ?? '')
  const [args, setArgs] = useState<string>((s.args ?? []).join('\n'))
  const [cwd, setCwd] = useState<string>(s.cwd ?? '')
  const [env, setEnv] = useState(dictText(s.env, '='))
  const [timeout, setTimeoutS] = useState<string>(s.timeoutMs ? String(s.timeoutMs / 1000) : '')
  const [more, setMore] = useState(!!(s.headers || s.scope || s.clientId || s.timeoutMs || s.cwd || s.env))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setBusy(true); setError('')
    try {
      const spec: any = { ...s, id, label: label || id, transport, enabled: s.enabled !== false }
      if (timeout) spec.timeoutMs = Number(timeout) * 1000; else delete spec.timeoutMs
      if (transport === 'http') {
        Object.assign(spec, { url, auth: authMode, headers: dictFrom(headers, /:\s*/), scope, clientId })
        delete spec.command; delete spec.args; delete spec.cwd; delete spec.env
      } else {
        Object.assign(spec, { command, args: lines(args), cwd, env: dictFrom(env, /=/) })
        delete spec.url; delete spec.auth; delete spec.headers; delete spec.scope; delete spec.clientId
      }
      const res = await api({ op: row ? 'edit' : 'add', spec, bearer, clientSecret })
      // A new OAuth connector: go straight to sign-in.
      if (!row && transport === 'http' && authMode === 'oauth') startSignIn(res.id)
      onDone()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  return (
    <div className="dc-card">
      <div className="dc-name">{row ? `Edit ${s.label}` : 'Add a connector'}</div>
      <div className="dc-seg" role="group">
        <button type="button" aria-pressed={transport === 'http'} onClick={() => setTransport('http')}>Remote (URL)</button>
        <button type="button" aria-pressed={transport === 'stdio'} onClick={() => setTransport('stdio')}>Local command</button>
      </div>
      <div className="dc-grid">
        <label className="dc-field">Name
          <input value={label} placeholder="e.g. Linear" onChange={(e) => { setLabel(e.target.value); if (!idTouched) setId(slug(e.target.value)) }} />
        </label>
        <label className="dc-field">Id (tools become mcp__id__…)
          <input value={id} disabled={!!row} onChange={(e) => { setIdTouched(true); setId(e.target.value) }} />
        </label>
      </div>
      {transport === 'http' ? (
        <>
          <label className="dc-field">Server URL
            <input value={url} placeholder="https://example.com/mcp" onChange={(e) => setUrl(e.target.value)} />
          </label>
          <label className="dc-field">Authentication
            <select value={authMode} onChange={(e) => setAuthMode(e.target.value)}>
              <option value="oauth">Sign in (OAuth) — most hosted connectors</option>
              <option value="bearer">Bearer token / API key</option>
              <option value="none">None</option>
            </select>
          </label>
          {authMode === 'bearer' && (
            <label className="dc-field">Token
              <input type="password" autoComplete="off" value={bearer} placeholder={row?.secrets.bearer ? 'Saved — leave empty to keep it' : 'Paste the token'} onChange={(e) => setBearer(e.target.value)} />
            </label>
          )}
        </>
      ) : (
        <>
          <label className="dc-field">Command
            <input value={command} placeholder="npx, uvx, docker, /path/to/server" onChange={(e) => setCommand(e.target.value)} />
          </label>
          <label className="dc-field">Arguments (one per line)
            <textarea value={args} placeholder={'-y\n@modelcontextprotocol/server-filesystem\n/home/me/notes'} onChange={(e) => setArgs(e.target.value)} />
          </label>
        </>
      )}
      <button type="button" className="dc-btn sm" style={{ alignSelf: 'flex-start' }} onClick={() => setMore(!more)}>{more ? 'Fewer options' : 'More options'}</button>
      {more && (transport === 'http' ? (
        <div className="dc-grid">
          <label className="dc-field">Extra headers (Name: value per line)
            <textarea value={headers} onChange={(e) => setHeaders(e.target.value)} />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="dc-field">OAuth scope (optional)<input value={scope} onChange={(e) => setScope(e.target.value)} /></label>
            <label className="dc-field">Timeout per call, seconds<input value={timeout} inputMode="numeric" placeholder="120" onChange={(e) => setTimeoutS(e.target.value)} /></label>
          </div>
          <label className="dc-field">OAuth client id (only if the server has no self-registration)<input value={clientId} onChange={(e) => setClientId(e.target.value)} /></label>
          <label className="dc-field">OAuth client secret
            <input type="password" autoComplete="off" value={clientSecret} placeholder={row?.secrets.clientSecret ? 'Saved — leave empty to keep it' : ''} onChange={(e) => setClientSecret(e.target.value)} />
          </label>
        </div>
      ) : (
        <div className="dc-grid">
          <label className="dc-field">Environment (KEY=value per line)
            <textarea value={env} onChange={(e) => setEnv(e.target.value)} />
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label className="dc-field">Working folder<input value={cwd} onChange={(e) => setCwd(e.target.value)} /></label>
            <label className="dc-field">Timeout per call, seconds<input value={timeout} inputMode="numeric" placeholder="120" onChange={(e) => setTimeoutS(e.target.value)} /></label>
          </div>
        </div>
      ))}
      {error && <div className="dc-msg err">{error}</div>}
      <div className="dc-row">
        <button type="button" className="dc-btn primary" disabled={busy || !id} onClick={save}>{row ? 'Save' : 'Add'}</button>
        <button type="button" className="dc-btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

function Importer({ onDone }: { onDone: () => void }) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState(false)
  const run = async () => {
    try {
      const r = await api({ op: 'import', text })
      setErr(false); setMsg(`Added ${r.added.join(', ') || 'nothing'}.`)
      setTimeout(onDone, 1200)
    } catch (e: any) { setErr(true); setMsg(e.message) }
  }
  return (
    <div className="dc-card">
      <div className="dc-name">Import from JSON</div>
      <div className="dc-sub" style={{ marginTop: -6 }}>Paste an <code>mcpServers</code> block from Claude Desktop, Cursor, VS Code or a server's README. Tokens in an Authorization header go to dsh's credential store.</div>
      <label className="dc-field"><textarea style={{ minHeight: 140 }} value={text} placeholder={'{\n  "mcpServers": {\n    "linear": { "url": "https://mcp.linear.app/mcp" }\n  }\n}'} onChange={(e) => setText(e.target.value)} /></label>
      {msg && <div className={'dc-msg' + (err ? ' err' : '')}>{msg}</div>}
      <div className="dc-row">
        <button type="button" className="dc-btn primary" disabled={!text.trim()} onClick={run}>Import</button>
        <button type="button" className="dc-btn" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

// Sign-in state lives outside React so "Add" can kick it off for the new row.
const signIns = new Map<string, { url?: string; error?: string }>()
let notify = () => {}

async function startSignIn(id: string) {
  // Open the tab inside the click, or popup blockers eat it; point it at the URL once known.
  const tab = window.open('', '_blank')
  signIns.set(id, {}); notify()
  try {
    const { url } = await api({ op: 'login', id })
    if (!url) { tab?.close(); signIns.delete(id); notify(); return }
    signIns.set(id, { url }); notify()
    if (tab) { tab.opener = null; tab.location.href = url }
  } catch (e: any) {
    tab?.close()
    signIns.set(id, { error: e.message }); notify()
  }
}

function SignIn({ row }: { row: Row }) {
  const id = row.spec.id
  const info = signIns.get(id) ?? {}
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const finish = async () => {
    try { await api({ op: 'finish', text }); signIns.delete(id); notify() } catch (e: any) { setErr(e.message) }
  }
  const cancel = async () => { signIns.delete(id); notify(); await api({ op: 'cancel', id }).catch(() => {}) }
  return (
    <div className="dc-signin">
      {info.error ? <div className="dc-msg err">{info.error}</div> : !info.url ? <div>Starting sign-in…</div> : (
        <>
          <ol>
            <li>Sign in on the page that opened (or <a className="dc-link" href={info.url} target="_blank" rel="noreferrer">open it here</a>).</li>
            <li>On the same computer as dsh this finishes by itself.</li>
            <li>dsh on a server: the last page shows an error at <code>127.0.0.1</code>. That's expected. Copy its full address and paste it here.</li>
          </ol>
          <div className="dc-row">
            <label className="dc-field dc-grow"><input value={text} placeholder="http://127.0.0.1:…/callback?code=…" onChange={(e) => { setText(e.target.value); setErr('') }} /></label>
            <button type="button" className="dc-btn primary" disabled={!text.includes('code=')} onClick={finish}>Finish</button>
          </div>
          {err && <div className="dc-msg err">{err}</div>}
        </>
      )}
      <div><button type="button" className="dc-btn sm" onClick={cancel}>Cancel sign-in</button></div>
    </div>
  )
}

function ServerCard({ row, onEdit, refresh }: { row: Row; onEdit: () => void; refresh: () => void }) {
  const { spec, status } = row
  const [showTools, setShowTools] = useState(false)
  const [msg, setMsg] = useState('')
  const act = async (body: any) => { setMsg(''); try { await api(body) } catch (e: any) { setMsg(e.message) } refresh() }
  const oauth = spec.transport === 'http' && spec.auth === 'oauth'
  const where = spec.transport === 'stdio' ? [spec.command, ...(spec.args ?? [])].join(' ') : spec.url
  const enabledCount = status.tools.filter((t) => t.enabled).length
  const retryIn = status.retryAt ? Math.max(0, Math.round((status.retryAt - Date.now()) / 1000)) : 0
  const signingIn = signIns.has(spec.id)
  return (
    <div className="dc-card">
      <div className="dc-row" style={{ flexWrap: 'nowrap' }}>
        <span className={'dc-dot ' + status.state} title={STATE_TEXT[status.state]} />
        <div className="dc-grow">
          <div className="dc-name">{spec.label}</div>
          <div className="dc-meta" title={where}>{where}</div>
        </div>
        <input className="dc-switch" type="checkbox" checked={spec.enabled} title={spec.enabled ? 'Turn off' : 'Turn on'} onChange={(e) => act({ op: 'enable', id: spec.id, enabled: e.target.checked })} />
      </div>
      <div className="dc-msg">
        {STATE_TEXT[status.state]}
        {status.state === 'connected' && ` · ${enabledCount}/${status.tools.length} tools`}
        {status.state === 'retrying' && ` in ${retryIn}s`}
        {status.state !== 'connected' && status.message && status.message !== STATE_TEXT[status.state] ? ` · ${status.message}` : ''}
      </div>
      {signingIn && <SignIn row={row} />}
      <div className="dc-row">
        {oauth && spec.enabled && !signingIn && (status.state === 'needs-login' || !row.secrets.signedIn) && (
          <button type="button" className="dc-btn sm primary" onClick={() => startSignIn(spec.id)}>Sign in</button>
        )}
        {spec.enabled && <button type="button" className="dc-btn sm" onClick={() => act({ op: 'reconnect', id: spec.id })}>Reconnect</button>}
        {status.tools.length > 0 && <button type="button" className="dc-btn sm" onClick={() => setShowTools(!showTools)}>{showTools ? 'Hide tools' : 'Tools'}</button>}
        <button type="button" className="dc-btn sm" onClick={onEdit}>Edit</button>
        {oauth && row.secrets.signedIn && <button type="button" className="dc-btn sm" onClick={() => act({ op: 'logout', id: spec.id })}>Sign out</button>}
        <button type="button" className="dc-btn sm danger" onClick={() => { if (confirm(`Remove ${spec.label}? Its saved sign-in and tokens are deleted too.`)) void act({ op: 'remove', id: spec.id }) }}>Remove</button>
      </div>
      {msg && <div className="dc-msg err">{msg}</div>}
      {showTools && (
        <div className="dc-tools">
          {status.tools.map((t) => (
            <label key={t.name} className="dc-tool">
              <input type="checkbox" checked={t.enabled} onChange={(e) => act({ op: 'tool', id: spec.id, tool: t.name, enabled: e.target.checked })} />
              <span>{t.title || t.name}{t.description && <small>{t.description.slice(0, 200)}</small>}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

function ConnectorsSection() {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'list' | 'add' | 'import' | { edit: string }>('list')
  const [, force] = useState(0)
  const alive = useRef(true)

  const refresh = useCallback(async () => {
    try {
      const data = await api()
      if (!alive.current) return
      setRows(data.servers); setError('')
      // Drop local sign-in panels the host finished (listener or another tab).
      for (const r of data.servers as Row[]) {
        const local = signIns.get(r.spec.id)
        if (local?.url && !r.status.signingIn) signIns.delete(r.spec.id)
      }
    } catch (e: any) { if (alive.current) setError(e.message) }
  }, [])

  useEffect(() => {
    alive.current = true
    notify = () => { force((n) => n + 1); void refresh() }
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 2000)
    return () => { alive.current = false; clearInterval(timer); notify = () => {} }
  }, [refresh])

  const done = () => { setMode('list'); void refresh() }
  const editing = typeof mode === 'object' ? rows?.find((r) => r.spec.id === mode.edit) : undefined

  return (
    <div className="dc">
      <div className="dc-head">
        <div>
          <h2 className="dc-h">Connectors</h2>
          <p className="dc-sub">Give your agents tools from any MCP server. Changes apply right away, no restart.</p>
        </div>
        {mode === 'list' && (
          <div className="dc-row">
            <button type="button" className="dc-btn" onClick={() => setMode('import')}>Import JSON</button>
            <button type="button" className="dc-btn primary" onClick={() => setMode('add')}>Add connector</button>
          </div>
        )}
      </div>
      {error && <div className="dc-msg err">{error}</div>}
      {mode === 'add' && <Editor onDone={done} />}
      {mode === 'import' && <Importer onDone={done} />}
      {editing && <Editor row={editing} onDone={done} />}
      {rows === null ? <div className="dc-empty">Loading…</div>
        : rows.length === 0 && mode === 'list' ? <div className="dc-card dc-empty">No connectors yet. Add one, or import your Claude Desktop config.</div>
        : rows.map((r) => <ServerCard key={r.spec.id} row={r} refresh={refresh} onEdit={() => setMode({ edit: r.spec.id })} />)}
    </div>
  )
}

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ensureStyles()
  ctx.slots.inject('settings.section', () => ctx.slots.register({
    name: 'settings.section',
    id: 'dsh-connectors',
    order: 25,
    label: () => 'Connectors',
  } as any, ConnectorsSection as any))
}
