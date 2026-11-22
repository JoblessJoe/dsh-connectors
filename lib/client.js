// dsh-connectors client bundle (esbuild CJS + __ModuleLoader__ banner). Do not edit.
window.__ModuleLoader__.load({id:"dsh-connectors",factory:Pt=>{
var module={exports:{}},exports=module.exports,require=Pt;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = require("react");
var import_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
var import_jsx_runtime = require("react/jsx-runtime");
var ROUTE = "/api/dsh-connectors";
var PANEL_ID = "dsh-connectors";
async function api(body) {
  const res = await fetch(ROUTE, body === void 0 ? { headers: { accept: "application/json" } } : { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}
var store = {
  rows: null,
  error: "",
  listeners: /* @__PURE__ */ new Set(),
  timer: void 0,
  emit() {
    for (const l of this.listeners) l();
  },
  async refresh() {
    try {
      const data = await api();
      this.rows = data.servers;
      this.error = "";
      for (const r of data.servers) {
        const local = signIns.get(r.spec.id);
        if ((local == null ? void 0 : local.url) && !r.status.signingIn) signIns.delete(r.spec.id);
      }
    } catch (e) {
      this.error = e.message;
    }
    this.emit();
  },
  subscribe(l) {
    this.listeners.add(l);
    if (!this.timer) {
      void this.refresh();
      this.timer = setInterval(() => {
        if (!document.hidden) void this.refresh();
      }, 2e3);
    }
    return () => {
      this.listeners.delete(l);
      if (!this.listeners.size) {
        clearInterval(this.timer);
        this.timer = void 0;
      }
    };
  }
};
function useStore() {
  const [, force] = (0, import_react.useState)(0);
  (0, import_react.useEffect)(() => store.subscribe(() => force((n) => n + 1)), []);
  return store;
}
var signIns = /* @__PURE__ */ new Map();
async function startSignIn(id) {
  const tab = window.open("", "_blank");
  signIns.set(id, {});
  store.emit();
  try {
    const { url } = await api({ op: "login", id });
    if (!url) {
      tab == null ? void 0 : tab.close();
      signIns.delete(id);
    } else {
      signIns.set(id, { url });
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      }
    }
  } catch (e) {
    tab == null ? void 0 : tab.close();
    signIns.set(id, { error: e.message });
  }
  void store.refresh();
}
var CSS = `
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
`;
function ensureStyles() {
  if (document.getElementById("dsh-connectors-css")) return;
  const style = document.createElement("style");
  style.id = "dsh-connectors-css";
  style.textContent = CSS;
  document.head.appendChild(style);
}
var STATE = {
  connected: { text: "Connected", tone: "success" },
  connecting: { text: "Connecting", tone: "info" },
  retrying: { text: "Reconnecting", tone: "warning" },
  "needs-login": { text: "Sign-in needed", tone: "warning" },
  error: { text: "Error", tone: "danger" },
  off: { text: "Off", tone: "neutral" }
};
var lines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);
var dictFrom = (text, sep) => Object.fromEntries(lines(text).map((l) => {
  const m = l.match(sep);
  return m ? [l.slice(0, m.index).trim(), l.slice(m.index + m[0].length).trim()] : [l, ""];
}));
var dictText = (d, sep) => Object.entries(d != null ? d : {}).map(([k, v]) => `${k}${sep}${v}`).join("\n");
var slug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[^a-z]+|-+$/g, "").slice(0, 32).replace(/-+$/, "");
function Field({ label, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dcx-field", children: [
    label,
    children
  ] });
}
function EditorDialog({ row, onClose }) {
  var _a, _b, _c, _d, _e, _f, _g, _h, _i, _j, _k;
  const s = (_a = row == null ? void 0 : row.spec) != null ? _a : {};
  const [label, setLabel] = (0, import_react.useState)((_b = s.label) != null ? _b : "");
  const [id, setId] = (0, import_react.useState)((_c = s.id) != null ? _c : "");
  const [idTouched, setIdTouched] = (0, import_react.useState)(!!row);
  const [transport, setTransport] = (0, import_react.useState)((_d = s.transport) != null ? _d : "http");
  const [url, setUrl] = (0, import_react.useState)((_e = s.url) != null ? _e : "");
  const [authMode, setAuthMode] = (0, import_react.useState)((_f = s.auth) != null ? _f : "oauth");
  const [bearer, setBearer] = (0, import_react.useState)("");
  const [headers, setHeaders] = (0, import_react.useState)(dictText(s.headers, ": "));
  const [scope, setScope] = (0, import_react.useState)((_g = s.scope) != null ? _g : "");
  const [clientId, setClientId] = (0, import_react.useState)((_h = s.clientId) != null ? _h : "");
  const [clientSecret, setClientSecret] = (0, import_react.useState)("");
  const [command, setCommand] = (0, import_react.useState)((_i = s.command) != null ? _i : "");
  const [args, setArgs] = (0, import_react.useState)(((_j = s.args) != null ? _j : []).join("\n"));
  const [cwd, setCwd] = (0, import_react.useState)((_k = s.cwd) != null ? _k : "");
  const [env, setEnv] = (0, import_react.useState)(dictText(s.env, "="));
  const [timeout, setTimeoutS] = (0, import_react.useState)(s.timeoutMs ? String(s.timeoutMs / 1e3) : "");
  const [more, setMore] = (0, import_react.useState)(!!(s.headers || s.scope || s.clientId || s.timeoutMs || s.cwd || s.env));
  const [busy, setBusy] = (0, import_react.useState)(false);
  const [error, setError] = (0, import_react.useState)("");
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const spec = { ...s, id, label: label || id, transport, enabled: s.enabled !== false };
      if (timeout) spec.timeoutMs = Number(timeout) * 1e3;
      else delete spec.timeoutMs;
      if (transport === "http") {
        Object.assign(spec, { url, auth: authMode, headers: dictFrom(headers, /:\s*/), scope, clientId });
        delete spec.command;
        delete spec.args;
        delete spec.cwd;
        delete spec.env;
      } else {
        Object.assign(spec, { command, args: lines(args), cwd, env: dictFrom(env, /=/) });
        delete spec.url;
        delete spec.auth;
        delete spec.headers;
        delete spec.scope;
        delete spec.clientId;
      }
      const res = await api({ op: row ? "edit" : "add", spec, bearer, clientSecret });
      if (!row && transport === "http" && authMode === "oauth") void startSignIn(res.id);
      void store.refresh();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const footer = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-row", style: { justifyContent: "flex-end" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", onClick: onClose, children: "Cancel" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", disabled: busy || !id || (transport === "http" ? !url : !command), onClick: save, children: row ? "Save" : "Add connector" })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_dsh_client_ui_primitives.Modal,
    {
      open: true,
      className: "dcx-dialog",
      onClose,
      title: row ? `Edit ${s.label}` : "Add connector",
      closeLabel: "Close",
      description: row ? void 0 : "Any MCP server: a hosted one you sign in to, or a program on this machine.",
      footer,
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          import_dsh_client_ui_primitives.SegmentedControl,
          {
            id: "dcx-transport",
            label: "Connector type",
            value: transport,
            onChange: setTransport,
            options: [{ value: "http", label: "Remote URL" }, { value: "stdio", label: "Local command" }]
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Name", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: label, placeholder: "e.g. Linear", autoFocus: true, onChange: (e) => {
            setLabel(e.target.value);
            if (!idTouched) setId(slug(e.target.value));
          } }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Id (tools appear as mcp__id__\u2026)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: id, disabled: !!row, onChange: (e) => {
            setIdTouched(true);
            setId(e.target.value);
          } }) })
        ] }),
        transport === "http" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Server URL", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: url, placeholder: "https://example.com/mcp", onChange: (e) => setUrl(e.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Authentication", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: authMode, onChange: (e) => setAuthMode(e.target.value), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "oauth", children: "Sign in (OAuth) \u2014 most hosted connectors" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "bearer", children: "Token / API key" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "none", children: "None" })
          ] }) }),
          authMode === "bearer" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Token", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "off", value: bearer, placeholder: (row == null ? void 0 : row.secrets.bearer) ? "Saved. Leave empty to keep it." : "Paste the token", onChange: (e) => setBearer(e.target.value) }) })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Command", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: command, placeholder: "npx, uvx, docker or a full path", onChange: (e) => setCommand(e.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Arguments, one per line", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: args, placeholder: "-y\n@modelcontextprotocol/server-filesystem\n/home/me/notes", onChange: (e) => setArgs(e.target.value) }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { type: "button", className: "dcx-link", onClick: () => setMore(!more), children: [
          more ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 }),
          " Advanced"
        ] }),
        more && (transport === "http" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Extra headers (Name: value)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: headers, onChange: (e) => setHeaders(e.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-form", style: { minWidth: 0, gap: 12 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "OAuth scope", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: scope, placeholder: "Server default", onChange: (e) => setScope(e.target.value) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Timeout per call (seconds)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: timeout, inputMode: "numeric", placeholder: "120", onChange: (e) => setTimeoutS(e.target.value) }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "OAuth client id (optional)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: clientId, onChange: (e) => setClientId(e.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "OAuth client secret", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "off", value: clientSecret, placeholder: (row == null ? void 0 : row.secrets.clientSecret) ? "Saved. Leave empty to keep it." : "", onChange: (e) => setClientSecret(e.target.value) }) })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-grid", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Environment (KEY=value)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: env, onChange: (e) => setEnv(e.target.value) }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-form", style: { minWidth: 0, gap: 12 }, children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Working folder", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: cwd, onChange: (e) => setCwd(e.target.value) }) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "Timeout per call (seconds)", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: timeout, inputMode: "numeric", placeholder: "120", onChange: (e) => setTimeoutS(e.target.value) }) })
          ] })
        ] })),
        error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-msg dcx-err", children: error })
      ] })
    }
  );
}
function ImportDialog({ onClose }) {
  const [text, setText] = (0, import_react.useState)("");
  const [msg, setMsg] = (0, import_react.useState)("");
  const [err, setErr] = (0, import_react.useState)(false);
  const run = async () => {
    try {
      const r = await api({ op: "import", text });
      setErr(false);
      setMsg(`Added ${r.added.join(", ") || "nothing"}.`);
      void store.refresh();
      setTimeout(onClose, 900);
    } catch (e) {
      setErr(true);
      setMsg(e.message);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    import_dsh_client_ui_primitives.Modal,
    {
      open: true,
      className: "dcx-dialog",
      onClose,
      title: "Import connectors",
      closeLabel: "Close",
      description: "Paste an mcpServers block from Claude Desktop, Cursor, VS Code or a server's README. Tokens in an Authorization header go to dsh's credential store.",
      footer: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-row", style: { justifyContent: "flex-end" }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", onClick: onClose, children: "Cancel" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", disabled: !text.trim(), onClick: run, children: "Import" })
      ] }),
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-form", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, { label: "JSON", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "textarea",
          {
            style: { minHeight: 180 },
            autoFocus: true,
            value: text,
            onChange: (e) => setText(e.target.value),
            placeholder: '{\n  "mcpServers": {\n    "linear": { "url": "https://mcp.linear.app/mcp" },\n    "files": { "command": "npx", "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"] }\n  }\n}'
          }
        ) }),
        msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-msg" + (err ? " dcx-err" : ""), children: msg })
      ] })
    }
  );
}
function SignInCallout({ id }) {
  var _a;
  const info = (_a = signIns.get(id)) != null ? _a : {};
  const [text, setText] = (0, import_react.useState)("");
  const [err, setErr] = (0, import_react.useState)("");
  const finish = async () => {
    try {
      await api({ op: "finish", text });
      signIns.delete(id);
      void store.refresh();
    } catch (e) {
      setErr(e.message);
    }
  };
  const cancel = async () => {
    signIns.delete(id);
    store.emit();
    await api({ op: "cancel", id }).catch(() => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-callout", children: [
    info.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-err", children: info.error }) : !info.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Starting sign-in\u2026" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          "Sign in on the page that just opened. No tab? ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { href: info.url, target: "_blank", rel: "noreferrer", children: "Open it here" }),
          "."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "If dsh runs on this computer, that's it. This updates by itself." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          "If dsh runs on a server, the last page shows an error at ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "127.0.0.1" }),
          ". That's expected. Copy that page's full address and paste it below."
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Input, { className: "dcx-grow", value: text, placeholder: "http://127.0.0.1:\u2026/callback?code=\u2026", onChange: (e) => {
          setText(e.target.value);
          setErr("");
        } }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", size: "sm", disabled: !text.includes("code="), onClick: finish, children: "Finish" })
      ] }),
      err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-err", children: err })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", onClick: cancel, children: "Cancel sign-in" }) })
  ] });
}
function ConnectorItem({ row, onEdit }) {
  var _a;
  const { spec, status } = row;
  const [showTools, setShowTools] = (0, import_react.useState)(false);
  const [msg, setMsg] = (0, import_react.useState)("");
  const act = async (body) => {
    setMsg("");
    try {
      await api(body);
    } catch (e) {
      setMsg(e.message);
    }
    void store.refresh();
  };
  const oauth = spec.transport === "http" && spec.auth === "oauth";
  const where = spec.transport === "stdio" ? [spec.command, ...(_a = spec.args) != null ? _a : []].join(" ") : spec.url;
  const on = status.tools.filter((t) => t.enabled).length;
  const retryIn = status.retryAt ? Math.max(0, Math.round((status.retryAt - Date.now()) / 1e3)) : 0;
  const signingIn = signIns.has(spec.id);
  const st = STATE[status.state];
  const detail = status.state === "connected" ? `${on} of ${status.tools.length} tools on` : status.state === "retrying" ? `Next try in ${retryIn}s \xB7 ${status.message}` : status.message && status.message !== st.text ? status.message : "";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-item", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-ico", children: spec.transport === "stdio" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconCodeOutlineRegular, { size: 16 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconGlobeOutlineRegular, { size: 16 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-grow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-name", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: spec.label }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Tag, { tone: st.tone, children: st.text })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-meta", title: where, children: where })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Switch, { checked: spec.enabled, label: `Turn ${spec.label} ${spec.enabled ? "off" : "on"}`, onChange: (next) => act({ op: "enable", id: spec.id, enabled: next }) })
    ] }),
    detail && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-msg" + (status.state === "error" || status.state === "retrying" ? " dcx-err" : ""), style: { paddingLeft: 42 }, children: detail }),
    signingIn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignInCallout, { id: spec.id }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-row dcx-wrap", style: { paddingLeft: 42 }, children: [
      oauth && spec.enabled && !signingIn && (status.state === "needs-login" || !row.secrets.signedIn) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", size: "sm", onClick: () => startSignIn(spec.id), children: "Sign in" }),
      status.tools.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", size: "sm", icon: showTools ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronDownOutlineRegular, { size: 14 }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconChevronRightOutlineRegular, { size: 14 }), onClick: () => setShowTools(!showTools), children: "Tools" }),
      spec.enabled && status.state !== "needs-login" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconRefreshOutlineRegular, { size: 14 }), onClick: () => act({ op: "reconnect", id: spec.id }), children: "Reconnect" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconEditOutlineRegular, { size: 14 }), onClick: onEdit, children: "Edit" }),
      oauth && row.secrets.signedIn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", onClick: () => act({ op: "logout", id: spec.id }), children: "Sign out" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "ghost", size: "sm", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconTrashOutlineRegular, { size: 14 }), onClick: () => {
        if (confirm(`Remove ${spec.label}? Its saved sign-in is deleted too.`)) void act({ op: "remove", id: spec.id });
      }, children: "Remove" })
    ] }),
    msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-msg dcx-err", style: { paddingLeft: 42 }, children: msg }),
    showTools && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-tools", children: status.tools.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-tool", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Checkbox, { checked: t.enabled, label: t.title || t.name, onChange: (next) => act({ op: "tool", id: spec.id, tool: t.name, enabled: next }) }),
      t.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t.description.length > 220 ? t.description.slice(0, 220) + "\u2026" : t.description })
    ] }, t.name)) })
  ] });
}
function Manager() {
  var _a;
  const s = useStore();
  const [dialog, setDialog] = (0, import_react.useState)(null);
  const rows = s.rows;
  const editing = dialog && typeof dialog === "object" ? rows == null ? void 0 : rows.find((r) => r.spec.id === dialog.edit) : void 0;
  const close = (0, import_react.useCallback)(() => setDialog(null), []);
  const connected = (_a = rows == null ? void 0 : rows.filter((r) => r.status.state === "connected").length) != null ? _a : 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "dcx-title", children: "Connectors" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "dcx-sub", children: [
          "Give your agents tools from any MCP server. Changes apply right away.",
          rows && rows.length > 0 && ` ${connected} of ${rows.length} connected.`
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "outline", onClick: () => setDialog("import"), children: "Import" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.Button, { variant: "primary", icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconPlusOutlineRegular, { size: 16 }), onClick: () => setDialog("add"), children: "Add connector" })
      ] })
    ] }),
    s.error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-msg dcx-err", children: s.error }),
    rows === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-empty", children: "Loading\u2026" }) : rows.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-list", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dcx-empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-ico", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconLinkOutlineRegular, { size: 18 }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        "No connectors yet.",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
        "Add a server, or import your Claude Desktop config."
      ] })
    ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dcx-list", children: rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectorItem, { row: r, onEdit: () => setDialog({ edit: r.spec.id }) }, r.spec.id)) }),
    dialog === "add" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorDialog, { onClose: close }),
    dialog === "import" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ImportDialog, { onClose: close }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EditorDialog, { row: editing, onClose: close })
  ] });
}
function ConnectorsPanel() {
  const ref = (0, import_react.useRef)(null);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref, className: "dcx-page", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Manager, {}) });
}
function ConnectorsNavIcon({ size }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_dsh_client_ui_primitives.IconLinkOutlineRegular, { size });
}
var en = { nav: "Connectors" };
var zh = { nav: "\u8FDE\u63A5\u5668" };
var inject = ["slots", "locale"];
function apply(ctx) {
  ensureStyles();
  const t = ctx.locale.bind("connectors");
  ctx.effect(() => {
    ctx.locale.register("connectors", { en, zh });
  }, "dsh-connectors: locales");
  ctx.effect(() => ctx.slots.inject("sidebar.panellist", () => ctx.slots.register(
    { name: "sidebar.panellist", id: PANEL_ID, order: 21, label: () => t("nav"), locale: "connectors" },
    ConnectorsNavIcon
  )), "dsh-connectors: sidebar");
  ctx.effect(() => ctx.slots.inject("main", () => ctx.slots.register(
    { name: "main", key: PANEL_ID, locale: "connectors" },
    ConnectorsPanel
  )), "dsh-connectors: panel");
  ctx.effect(() => ctx.slots.inject("settings.section", () => ctx.slots.register(
    { name: "settings.section", id: "dsh-connectors", order: 25, label: () => t("nav"), locale: "connectors" },
    Manager
  )), "dsh-connectors: settings");
}

return module.exports;
}});
