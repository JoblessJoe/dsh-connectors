// dsh-connectors client.
//
// One manager view, shown in two places:
//   - a sidebar entry "Connectors" (main panel, sits next to Projects)
//   - Settings → Connectors
// Built from dsh's own primitives (Button, Switch, Tag, StateDot, Modal,
// SegmentedControl, Checkbox, icons) and theme tokens, so it looks like the
// rest of dsh in light and dark mode. Everything is registered from this
// plugin through slots; nothing in dsh is patched.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type { MainPanelId } from '@deepseek-ai/dsh-client-ui-layout/client'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import {
  Button, Switch, Tag, Modal, SegmentedControl, Checkbox, Input,
  IconLinkOutlineRegular as LinkIcon,
  IconPlusOutlineRegular as PlusIcon,
  IconRefreshOutlineRegular as RefreshIcon,
  IconEditOutlineRegular as EditIcon,
  IconTrashOutlineRegular as TrashIcon,
  IconGlobeOutlineRegular as GlobeIcon,
  IconCodeOutlineRegular as CodeIcon,
  IconChevronDownOutlineRegular as ChevronDownIcon,
  IconChevronRightOutlineRegular as ChevronRightIcon,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type {} from '@deepseek-ai/dsh-client-ui-sidebar/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

const ROUTE = '/api/dsh-connectors'
const PANEL_ID = 'dsh-connectors' as MainPanelId

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

// ---------------------------------------------------------------------------
// Shared store: one poller, many views (sidebar panel + settings page).
// ---------------------------------------------------------------------------
const store = {
  rows: null as Row[] | null,
  error: '',
  listeners: new Set<() => void>(),
  timer: undefined as ReturnType<typeof setInterval> | undefined,
  emit() { for (const l of this.listeners) l() },
  async refresh() {
    try {
      const data = await api()
      this.rows = data.servers
      this.error = ''
      for (const r of data.servers as Row[]) {
        const local = signIns.get(r.spec.id)
        if (local?.url && !r.status.signingIn) signIns.delete(r.spec.id)
      }
    } catch (e: any) { this.error = e.message }
    this.emit()
  },
  subscribe(l: () => void) {
    this.listeners.add(l)
    if (!this.timer) {
      void this.refresh()
      this.timer = setInterval(() => { if (!document.hidden) void this.refresh() }, 2000)
    }
    return () => {
      this.listeners.delete(l)
      if (!this.listeners.size) { clearInterval(this.timer); this.timer = undefined }
    }
  },
}

function useStore() {
  const [, force] = useState(0)
  useEffect(() => store.subscribe(() => force((n) => n + 1)), [])
  return store
}

// Sign-in attempts live outside React so "Add" can start one for a new row.
const signIns = new Map<string, { url?: string; error?: string; loopback?: boolean }>()

async function startSignIn(id: string, loopback = false) {
  // Open the tab inside the click, or popup blockers eat it; aim it once the URL is known.
  const tab = window.open('', '_blank')
  signIns.set(id, { loopback }); store.emit()
  try {
    // The provider sends the browser back to this same dsh address, so it finishes by itself.
    const { url } = await api({ op: 'login', id, origin: window.location.origin, loopback })
    if (!url) { tab?.close(); signIns.delete(id) } else {
      signIns.set(id, { url, loopback })
      if (tab) { tab.opener = null; tab.location.href = url }
    }
  } catch (e: any) {
    tab?.close()
    signIns.set(id, { error: e.message })
  }
  void store.refresh()
}

// ---------------------------------------------------------------------------
// Styles: layout only. Colors, radii and type come from dsh tokens.
// ---------------------------------------------------------------------------
const CSS = `
.dcx{box-sizing:border-box;width:100%;max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:16px;color:var(--dsw-alias-label-primary);font-size:14px}
.dcx-page{height:100%;overflow:auto;padding:28px 24px 48px;box-sizing:border-box}
@media (max-width:640px){.dcx-page{padding:16px 12px 40px}}
.dcx-head{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap}
.dcx-title{font-size:20px;font-weight:600;margin:0;line-height:1.3}
.dcx-sub{color:var(--dsw-alias-label-caption);font-size:13px;margin:4px 0 0;line-height:1.5}
.dcx-actions{display:flex;gap:8px;flex-wrap:wrap}
.dcx-list{display:flex;flex-direction:column;background:var(--dsw-alias-settings-card-fill);border:1px solid var(--dsw-alias-settings-card-stroke);border-radius:var(--dsw-radius-xl,12px);overflow:hidden}
.dcx-item{display:flex;flex-direction:column;gap:10px;padding:14px 16px;border-top:1px solid var(--dsw-alias-border-l4)}
.dcx-item:first-child{border-top:0}
.dcx-row{display:flex;gap:10px;align-items:center;min-width:0}
.dcx-wrap{flex-wrap:wrap}
.dcx-grow{flex:1;min-width:0}
.dcx-ico{width:32px;height:32px;border-radius:8px;flex:none;display:flex;align-items:center;justify-content:center;background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}
.dcx-name{font-weight:600;display:flex;align-items:center;gap:8px;min-width:0}
.dcx-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dcx-meta{color:var(--dsw-alias-label-caption);font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.dcx-msg{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:1.5;white-space:pre-wrap;word-break:break-word}
.dcx-err{color:var(--dsw-alias-state-error-primary)}
.dcx-link{border:0;background:none;padding:0;font:inherit;font-size:12px;color:var(--dsw-alias-label-secondary);cursor:pointer;display:inline-flex;align-items:center;gap:4px}
.dcx-link:hover{color:var(--dsw-alias-label-primary)}
.dcx-tools{display:flex;flex-direction:column;gap:2px;padding:4px 0 0 42px;max-height:340px;overflow:auto}
.dcx-tool{display:flex;flex-direction:column;gap:1px;padding:4px 0}
.dcx-tool small{color:var(--dsw-alias-label-caption);font-size:12px;line-height:1.4;padding-left:26px}
.dcx-callout{margin-left:42px;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;font-size:13px;line-height:1.5;background:var(--dsw-alias-bg-base)}
.dcx-callout ol{margin:0;padding-left:18px;display:flex;flex-direction:column;gap:4px}
.dcx-callout a{color:inherit;text-decoration:underline}
.dcx-empty{display:flex;flex-direction:column;align-items:center;gap:10px;text-align:center;padding:40px 16px;color:var(--dsw-alias-label-caption);font-size:13px}
.dcx-form{display:flex;flex-direction:column;gap:14px;min-width:0}
.dcx-dialog{width:min(580px,calc(100vw - 32px))!important;max-width:none!important}
.dcx-dialog *{box-sizing:border-box}
.dcx-field{display:flex;flex-direction:column;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary)}
.dcx-field > input,.dcx-field > textarea,.dcx-field > select{font:inherit;font-size:13px;color:var(--dsw-alias-label-primary);background:transparent;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;padding:7px 10px;min-width:0;outline:none}
.dcx-field > input:focus,.dcx-field > textarea:focus,.dcx-field > select:focus{border-color:var(--dsw-alias-border-l1,var(--dsw-alias-label-tertiary))}
.dcx-field > textarea{font-family:var(--ds-font-family-code,ui-monospace,monospace);font-size:12px;min-height:72px;resize:vertical}
.dcx-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
@media (max-width:640px){.dcx-grid{grid-template-columns:1fr}.dcx-tools,.dcx-callout{padding-left:0;margin-left:0}}
`

function ensureStyles() {
  if (document.getElementById('dsh-connectors-css')) return
  const style = document.createElement('style')
  style.id = 'dsh-connectors-css'
  style.textContent = CSS
  document.head.appendChild(style)
}

const STATE: Record<State, { text: string; tone: 'success' | 'warning' | 'danger' | 'neutral' | 'info' }> = {
  connected: { text: 'Connected', tone: 'success' },
  connecting: { text: 'Connecting', tone: 'info' },
  retrying: { text: 'Reconnecting', tone: 'warning' },
  'needs-login': { text: 'Sign-in needed', tone: 'warning' },
  error: { text: 'Error', tone: 'danger' },
  off: { text: 'Off', tone: 'neutral' },
}

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)
const dictFrom = (text: string, sep: RegExp) => Object.fromEntries(lines(text).map((l) => {
  const m = l.match(sep)
  return m ? [l.slice(0, m.index).trim(), l.slice(m.index! + m[0].length).trim()] : [l, '']
}))
const dictText = (d: Record<string, string> | undefined, sep: string) => Object.entries(d ?? {}).map(([k, v]) => `${k}${sep}${v}`).join('\n')
const slug = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^[^a-z]+|-+$/g, '').slice(0, 32).replace(/-+$/, '')

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="dcx-field">{label}{children}</label>
}

// ---------------------------------------------------------------------------
// Add / edit dialog
// ---------------------------------------------------------------------------
function EditorDialog({ row, onClose }: { row?: Row; onClose: () => void }) {
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
      if (!row && transport === 'http' && authMode === 'oauth') void startSignIn(res.id)
      void store.refresh()
      onClose()
    } catch (e: any) { setError(e.message) } finally { setBusy(false) }
  }

  const footer = (
    <div className="dcx-row" style={{ justifyContent: 'flex-end' }}>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button variant="primary" disabled={busy || !id || (transport === 'http' ? !url : !command)} onClick={save}>{row ? 'Save' : 'Add connector'}</Button>
    </div>
  )

  return (
    <Modal open className="dcx-dialog" onClose={onClose} title={row ? `Edit ${s.label}` : 'Add connector'} closeLabel="Close"
      description={row ? undefined : 'Any MCP server: a hosted one you sign in to, or a program on this machine.'} footer={footer}>
      <div className="dcx-form">
        <SegmentedControl id="dcx-transport" label="Connector type" value={transport} onChange={setTransport}
          options={[{ value: 'http', label: 'Remote URL' }, { value: 'stdio', label: 'Local command' }]} />
        <div className="dcx-grid">
          <Field label="Name">
            <input value={label} placeholder="e.g. Linear" autoFocus onChange={(e) => { setLabel(e.target.value); if (!idTouched) setId(slug(e.target.value)) }} />
          </Field>
          <Field label="Id (tools appear as mcp__id__…)">
            <input value={id} disabled={!!row} onChange={(e) => { setIdTouched(true); setId(e.target.value) }} />
          </Field>
        </div>
        {transport === 'http' ? (
          <>
            <Field label="Server URL"><input value={url} placeholder="https://example.com/mcp" onChange={(e) => setUrl(e.target.value)} /></Field>
            <Field label="Authentication">
              <select value={authMode} onChange={(e) => setAuthMode(e.target.value)}>
                <option value="oauth">Sign in (OAuth) — most hosted connectors</option>
                <option value="bearer">Token / API key</option>
                <option value="none">None</option>
              </select>
            </Field>
            {authMode === 'bearer' && (
              <Field label="Token">
                <input type="password" autoComplete="off" value={bearer} placeholder={row?.secrets.bearer ? 'Saved. Leave empty to keep it.' : 'Paste the token'} onChange={(e) => setBearer(e.target.value)} />
              </Field>
            )}
          </>
        ) : (
          <>
            <Field label="Command"><input value={command} placeholder="npx, uvx, docker or a full path" onChange={(e) => setCommand(e.target.value)} /></Field>
            <Field label="Arguments, one per line">
              <textarea value={args} placeholder={'-y\n@modelcontextprotocol/server-filesystem\n/home/me/notes'} onChange={(e) => setArgs(e.target.value)} />
            </Field>
          </>
        )}
        <button type="button" className="dcx-link" onClick={() => setMore(!more)}>
          {more ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />} Advanced
        </button>
        {more && (transport === 'http' ? (
          <div className="dcx-grid">
            <Field label="Extra headers (Name: value)"><textarea value={headers} onChange={(e) => setHeaders(e.target.value)} /></Field>
            <div className="dcx-form" style={{ minWidth: 0, gap: 12 }}>
              <Field label="OAuth scope"><input value={scope} placeholder="Server default" onChange={(e) => setScope(e.target.value)} /></Field>
              <Field label="Timeout per call (seconds)"><input value={timeout} inputMode="numeric" placeholder="120" onChange={(e) => setTimeoutS(e.target.value)} /></Field>
            </div>
            <Field label="OAuth client id (optional)"><input value={clientId} onChange={(e) => setClientId(e.target.value)} /></Field>
            <Field label="OAuth client secret">
              <input type="password" autoComplete="off" value={clientSecret} placeholder={row?.secrets.clientSecret ? 'Saved. Leave empty to keep it.' : ''} onChange={(e) => setClientSecret(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="dcx-grid">
            <Field label="Environment (KEY=value)"><textarea value={env} onChange={(e) => setEnv(e.target.value)} /></Field>
            <div className="dcx-form" style={{ minWidth: 0, gap: 12 }}>
              <Field label="Working folder"><input value={cwd} onChange={(e) => setCwd(e.target.value)} /></Field>
              <Field label="Timeout per call (seconds)"><input value={timeout} inputMode="numeric" placeholder="120" onChange={(e) => setTimeoutS(e.target.value)} /></Field>
            </div>
          </div>
        ))}
        {error && <div className="dcx-msg dcx-err">{error}</div>}
      </div>
    </Modal>
  )
}

function ImportDialog({ onClose }: { onClose: () => void }) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState(false)
  const run = async () => {
    try {
      const r = await api({ op: 'import', text })
      setErr(false); setMsg(`Added ${r.added.join(', ') || 'nothing'}.`)
      void store.refresh()
      setTimeout(onClose, 900)
    } catch (e: any) { setErr(true); setMsg(e.message) }
  }
  return (
    <Modal open className="dcx-dialog" onClose={onClose} title="Import connectors" closeLabel="Close"
      description="Paste an mcpServers block from Claude Desktop, Cursor, VS Code or a server's README. Tokens in an Authorization header go to dsh's credential store."
      footer={<div className="dcx-row" style={{ justifyContent: 'flex-end' }}><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" disabled={!text.trim()} onClick={run}>Import</Button></div>}>
      <div className="dcx-form">
        <Field label="JSON">
          <textarea style={{ minHeight: 180 }} autoFocus value={text} onChange={(e) => setText(e.target.value)}
            placeholder={'{\n  "mcpServers": {\n    "linear": { "url": "https://mcp.linear.app/mcp" },\n    "files": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] }\n  }\n}'} />
        </Field>
        {msg && <div className={'dcx-msg' + (err ? ' dcx-err' : '')}>{msg}</div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// One connector row
// ---------------------------------------------------------------------------
function SignInCallout({ id }: { id: string }) {
  const info = signIns.get(id) ?? {}
  const [text, setText] = useState('')
  const [err, setErr] = useState('')
  const finish = async () => {
    try { await api({ op: 'finish', text }); signIns.delete(id); void store.refresh() } catch (e: any) { setErr(e.message) }
  }
  const cancel = async () => { signIns.delete(id); store.emit(); await api({ op: 'cancel', id }).catch(() => {}) }
  return (
    <div className="dcx-callout">
      {info.error ? <div className="dcx-err">{info.error}</div> : !info.url ? <div>Starting sign-in…</div> : (
        <>
          {!info.loopback ? (
            <div>Finish signing in on the page that just opened. This updates by itself. No tab? <a href={info.url} target="_blank" rel="noreferrer">Open it here</a>.</div>
          ) : (
            <>
              <div>Sign in on the page that just opened (<a href={info.url} target="_blank" rel="noreferrer">open it here</a>). It ends on an error page at <code>127.0.0.1</code>; that's expected. Copy that page's full address and paste it here.</div>
              <div className="dcx-row">
                <Input className="dcx-grow" value={text} placeholder="http://127.0.0.1:…/callback?code=…" onChange={(e) => { setText(e.target.value); setErr('') }} />
                <Button variant="primary" size="sm" disabled={!text.includes('code=')} onClick={finish}>Finish</Button>
              </div>
            </>
          )}
          {err && <div className="dcx-err">{err}</div>}
        </>
      )}
      <div className="dcx-row dcx-wrap">
        <Button variant="ghost" size="sm" onClick={cancel}>Cancel sign-in</Button>
        {!info.loopback && info.url && (
          <button type="button" className="dcx-link" title="For providers that refuse to send you back to this address" onClick={() => startSignIn(id, true)}>Provider shows a redirect error? Try the paste method</button>
        )}
      </div>
    </div>
  )
}

function ConnectorItem({ row, onEdit }: { row: Row; onEdit: () => void }) {
  const { spec, status } = row
  const [showTools, setShowTools] = useState(false)
  const [msg, setMsg] = useState('')
  const act = async (body: any) => { setMsg(''); try { await api(body) } catch (e: any) { setMsg(e.message) } void store.refresh() }
  const oauth = spec.transport === 'http' && spec.auth === 'oauth'
  const where = spec.transport === 'stdio' ? [spec.command, ...(spec.args ?? [])].join(' ') : spec.url
  const on = status.tools.filter((t) => t.enabled).length
  const retryIn = status.retryAt ? Math.max(0, Math.round((status.retryAt - Date.now()) / 1000)) : 0
  const signingIn = signIns.has(spec.id)
  const st = STATE[status.state]
  const detail = status.state === 'connected' ? `${on} of ${status.tools.length} tools on`
    : status.state === 'retrying' ? `Next try in ${retryIn}s · ${status.message}`
    : status.message && status.message !== st.text ? status.message : ''

  return (
    <div className="dcx-item">
      <div className="dcx-row">
        <div className="dcx-ico">{spec.transport === 'stdio' ? <CodeIcon size={16} /> : <GlobeIcon size={16} />}</div>
        <div className="dcx-grow">
          <div className="dcx-name"><span>{spec.label}</span><Tag tone={st.tone}>{st.text}</Tag></div>
          <div className="dcx-meta" title={where}>{where}</div>
        </div>
        <Switch checked={spec.enabled} label={`Turn ${spec.label} ${spec.enabled ? 'off' : 'on'}`} onChange={(next) => act({ op: 'enable', id: spec.id, enabled: next })} />
      </div>
      {detail && <div className={'dcx-msg' + (status.state === 'error' || status.state === 'retrying' ? ' dcx-err' : '')} style={{ paddingLeft: 42 }}>{detail}</div>}
      {signingIn && <SignInCallout id={spec.id} />}
      <div className="dcx-row dcx-wrap" style={{ paddingLeft: 42 }}>
        {oauth && spec.enabled && !signingIn && (status.state === 'needs-login' || !row.secrets.signedIn) && (
          <Button variant="primary" size="sm" onClick={() => startSignIn(spec.id)}>Sign in</Button>
        )}
        {status.tools.length > 0 && (
          <Button variant="outline" size="sm" icon={showTools ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />} onClick={() => setShowTools(!showTools)}>Tools</Button>
        )}
        {spec.enabled && status.state !== 'needs-login' && <Button variant="ghost" size="sm" icon={<RefreshIcon size={14} />} onClick={() => act({ op: 'reconnect', id: spec.id })}>Reconnect</Button>}
        <Button variant="ghost" size="sm" icon={<EditIcon size={14} />} onClick={onEdit}>Edit</Button>
        {oauth && row.secrets.signedIn && <Button variant="ghost" size="sm" onClick={() => act({ op: 'logout', id: spec.id })}>Sign out</Button>}
        <Button variant="ghost" size="sm" icon={<TrashIcon size={14} />} onClick={() => { if (confirm(`Remove ${spec.label}? Its saved sign-in is deleted too.`)) void act({ op: 'remove', id: spec.id }) }}>Remove</Button>
      </div>
      {msg && <div className="dcx-msg dcx-err" style={{ paddingLeft: 42 }}>{msg}</div>}
      {showTools && (
        <div className="dcx-tools">
          {status.tools.map((t) => (
            <div key={t.name} className="dcx-tool">
              <Checkbox checked={t.enabled} label={t.title || t.name} onChange={(next) => act({ op: 'tool', id: spec.id, tool: t.name, enabled: next })} />
              {t.description && <small>{t.description.length > 220 ? t.description.slice(0, 220) + '…' : t.description}</small>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// The manager view
// ---------------------------------------------------------------------------
function Manager() {
  const s = useStore()
  const [dialog, setDialog] = useState<null | 'add' | 'import' | { edit: string }>(null)
  const rows = s.rows
  const editing = dialog && typeof dialog === 'object' ? rows?.find((r) => r.spec.id === dialog.edit) : undefined
  const close = useCallback(() => setDialog(null), [])
  const connected = rows?.filter((r) => r.status.state === 'connected').length ?? 0

  return (
    <div className="dcx">
      <div className="dcx-head">
        <div>
          <h2 className="dcx-title">Connectors</h2>
          <p className="dcx-sub">
            Give your agents tools from any MCP server. Changes apply right away.
            {rows && rows.length > 0 && ` ${connected} of ${rows.length} connected.`}
          </p>
        </div>
        <div className="dcx-actions">
          <Button variant="outline" onClick={() => setDialog('import')}>Import</Button>
          <Button variant="primary" icon={<PlusIcon size={16} />} onClick={() => setDialog('add')}>Add connector</Button>
        </div>
      </div>
      {s.error && <div className="dcx-msg dcx-err">{s.error}</div>}
      {rows === null ? <div className="dcx-empty">Loading…</div>
        : rows.length === 0 ? (
          <div className="dcx-list"><div className="dcx-empty">
            <div className="dcx-ico"><LinkIcon size={18} /></div>
            <div>No connectors yet.<br />Add a server, or import your Claude Desktop config.</div>
          </div></div>
        ) : (
          <div className="dcx-list">
            {rows.map((r) => <ConnectorItem key={r.spec.id} row={r} onEdit={() => setDialog({ edit: r.spec.id })} />)}
          </div>
        )}
      {dialog === 'add' && <EditorDialog onClose={close} />}
      {dialog === 'import' && <ImportDialog onClose={close} />}
      {editing && <EditorDialog row={editing} onClose={close} />}
    </div>
  )
}

function ConnectorsPanel() {
  const ref = useRef<HTMLDivElement>(null)
  return <div ref={ref} className="dcx-page"><Manager /></div>
}

function ConnectorsNavIcon({ size }: PropsRuntime<'sidebar.panellist'>): ReactNode {
  return <LinkIcon size={size} />
}

const en = { nav: 'Connectors' }
const zh = { nav: '连接器' }

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap { connectors: keyof typeof en }
}

export const inject = ['slots', 'locale']

export function apply(ctx: ClientContext): void {
  ensureStyles()
  const t = ctx.locale.bind('connectors')
  ctx.effect(() => { ctx.locale.register('connectors', { en, zh }) }, 'dsh-connectors: locales')

  // Sidebar entry. Projects uses order 20, so 21 lands right below it; the
  // shell's own pin menu can hide or show it like any other panel.
  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
    { name: 'sidebar.panellist', id: PANEL_ID, order: 21, label: () => t('nav'), locale: 'connectors' } as any,
    ConnectorsNavIcon as any,
  )), 'dsh-connectors: sidebar')
  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register(
    { name: 'main', key: PANEL_ID, locale: 'connectors' } as any,
    ConnectorsPanel as any,
  )), 'dsh-connectors: panel')

  // Same manager in Settings.
  ctx.effect(() => ctx.slots.inject('settings.section', () => ctx.slots.register(
    { name: 'settings.section', id: 'dsh-connectors', order: 25, label: () => t('nav'), locale: 'connectors' } as any,
    Manager as any,
  )), 'dsh-connectors: settings')
}
