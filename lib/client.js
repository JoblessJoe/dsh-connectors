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
var import_jsx_runtime = require("react/jsx-runtime");
var ROUTE = "/api/dsh-connectors";
async function api(body) {
  const res = await fetch(ROUTE, body === void 0 ? { headers: { accept: "application/json" } } : { method: "POST", headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({ ok: false, error: `HTTP ${res.status}` }));
  if (!data.ok) throw new Error(data.error || "Request failed");
  return data;
}
var CSS = `
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
`;
function ensureStyles() {
  if (document.getElementById("dsh-connectors-css")) return;
  const style = document.createElement("style");
  style.id = "dsh-connectors-css";
  style.textContent = CSS;
  document.head.appendChild(style);
}
var STATE_TEXT = {
  off: "Off",
  connecting: "Connecting\u2026",
  connected: "Connected",
  retrying: "Reconnecting",
  "needs-login": "Sign-in needed",
  error: "Error"
};
var lines = (text) => text.split("\n").map((l) => l.trim()).filter(Boolean);
var dictFrom = (text, sep) => Object.fromEntries(lines(text).map((l) => {
  const m = l.match(sep);
  return m ? [l.slice(0, m.index).trim(), l.slice(m.index + m[0].length).trim()] : [l, ""];
}));
var dictText = (d, sep) => Object.entries(d != null ? d : {}).map(([k, v]) => `${k}${sep}${v}`).join("\n");
var slug = (v) => v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[^a-z]+|-+$/g, "").slice(0, 32).replace(/-+$/, "");
function Editor({ row, onDone }) {
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
      if (!row && transport === "http" && authMode === "oauth") startSignIn(res.id);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-name", children: row ? `Edit ${s.label}` : "Add a connector" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-seg", role: "group", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-pressed": transport === "http", onClick: () => setTransport("http"), children: "Remote (URL)" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-pressed": transport === "stdio", onClick: () => setTransport("stdio"), children: "Local command" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Name",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: label, placeholder: "e.g. Linear", onChange: (e) => {
          setLabel(e.target.value);
          if (!idTouched) setId(slug(e.target.value));
        } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Id (tools become mcp__id__\u2026)",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: id, disabled: !!row, onChange: (e) => {
          setIdTouched(true);
          setId(e.target.value);
        } })
      ] })
    ] }),
    transport === "http" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Server URL",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: url, placeholder: "https://example.com/mcp", onChange: (e) => setUrl(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Authentication",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: authMode, onChange: (e) => setAuthMode(e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "oauth", children: "Sign in (OAuth) \u2014 most hosted connectors" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "bearer", children: "Bearer token / API key" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "none", children: "None" })
        ] })
      ] }),
      authMode === "bearer" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Token",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "off", value: bearer, placeholder: (row == null ? void 0 : row.secrets.bearer) ? "Saved \u2014 leave empty to keep it" : "Paste the token", onChange: (e) => setBearer(e.target.value) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Command",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: command, placeholder: "npx, uvx, docker, /path/to/server", onChange: (e) => setCommand(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Arguments (one per line)",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: args, placeholder: "-y\n@modelcontextprotocol/server-filesystem\n/home/me/notes", onChange: (e) => setArgs(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm", style: { alignSelf: "flex-start" }, onClick: () => setMore(!more), children: more ? "Fewer options" : "More options" }),
    more && (transport === "http" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Extra headers (Name: value per line)",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: headers, onChange: (e) => setHeaders(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
          "OAuth scope (optional)",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: scope, onChange: (e) => setScope(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
          "Timeout per call, seconds",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: timeout, inputMode: "numeric", placeholder: "120", onChange: (e) => setTimeoutS(e.target.value) })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "OAuth client id (only if the server has no self-registration)",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: clientId, onChange: (e) => setClientId(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "OAuth client secret",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "password", autoComplete: "off", value: clientSecret, placeholder: (row == null ? void 0 : row.secrets.clientSecret) ? "Saved \u2014 leave empty to keep it" : "", onChange: (e) => setClientSecret(e.target.value) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-grid", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
        "Environment (KEY=value per line)",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: env, onChange: (e) => setEnv(e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { style: { display: "flex", flexDirection: "column", gap: 10 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
          "Working folder",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: cwd, onChange: (e) => setCwd(e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-field", children: [
          "Timeout per call, seconds",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: timeout, inputMode: "numeric", placeholder: "120", onChange: (e) => setTimeoutS(e.target.value) })
        ] })
      ] })
    ] })),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-msg err", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn primary", disabled: busy || !id, onClick: save, children: row ? "Save" : "Add" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn", onClick: onDone, children: "Cancel" })
    ] })
  ] });
}
function Importer({ onDone }) {
  const [text, setText] = (0, import_react.useState)("");
  const [msg, setMsg] = (0, import_react.useState)("");
  const [err, setErr] = (0, import_react.useState)(false);
  const run = async () => {
    try {
      const r = await api({ op: "import", text });
      setErr(false);
      setMsg(`Added ${r.added.join(", ") || "nothing"}.`);
      setTimeout(onDone, 1200);
    } catch (e) {
      setErr(true);
      setMsg(e.message);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-name", children: "Import from JSON" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-sub", style: { marginTop: -6 }, children: [
      "Paste an ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "mcpServers" }),
      " block from Claude Desktop, Cursor, VS Code or a server's README. Tokens in an Authorization header go to dsh's credential store."
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dc-field", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { style: { minHeight: 140 }, value: text, placeholder: '{\n  "mcpServers": {\n    "linear": { "url": "https://mcp.linear.app/mcp" }\n  }\n}', onChange: (e) => setText(e.target.value) }) }),
    msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-msg" + (err ? " err" : ""), children: msg }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn primary", disabled: !text.trim(), onClick: run, children: "Import" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn", onClick: onDone, children: "Cancel" })
    ] })
  ] });
}
var signIns = /* @__PURE__ */ new Map();
var notify = () => {
};
async function startSignIn(id) {
  const tab = window.open("", "_blank");
  signIns.set(id, {});
  notify();
  try {
    const { url } = await api({ op: "login", id });
    if (!url) {
      tab == null ? void 0 : tab.close();
      signIns.delete(id);
      notify();
      return;
    }
    signIns.set(id, { url });
    notify();
    if (tab) {
      tab.opener = null;
      tab.location.href = url;
    }
  } catch (e) {
    tab == null ? void 0 : tab.close();
    signIns.set(id, { error: e.message });
    notify();
  }
}
function SignIn({ row }) {
  var _a;
  const id = row.spec.id;
  const info = (_a = signIns.get(id)) != null ? _a : {};
  const [text, setText] = (0, import_react.useState)("");
  const [err, setErr] = (0, import_react.useState)("");
  const finish = async () => {
    try {
      await api({ op: "finish", text });
      signIns.delete(id);
      notify();
    } catch (e) {
      setErr(e.message);
    }
  };
  const cancel = async () => {
    signIns.delete(id);
    notify();
    await api({ op: "cancel", id }).catch(() => {
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-signin", children: [
    info.error ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-msg err", children: info.error }) : !info.url ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Starting sign-in\u2026" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("ol", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          "Sign in on the page that opened (or ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", { className: "dc-link", href: info.url, target: "_blank", rel: "noreferrer", children: "open it here" }),
          ")."
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: "On the same computer as dsh this finishes by itself." }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", { children: [
          "dsh on a server: the last page shows an error at ",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("code", { children: "127.0.0.1" }),
          ". That's expected. Copy its full address and paste it here."
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", { className: "dc-field dc-grow", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: text, placeholder: "http://127.0.0.1:\u2026/callback?code=\u2026", onChange: (e) => {
          setText(e.target.value);
          setErr("");
        } }) }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn primary", disabled: !text.includes("code="), onClick: finish, children: "Finish" })
      ] }),
      err && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-msg err", children: err })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm", onClick: cancel, children: "Cancel sign-in" }) })
  ] });
}
function ServerCard({ row, onEdit, refresh }) {
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
    refresh();
  };
  const oauth = spec.transport === "http" && spec.auth === "oauth";
  const where = spec.transport === "stdio" ? [spec.command, ...(_a = spec.args) != null ? _a : []].join(" ") : spec.url;
  const enabledCount = status.tools.filter((t) => t.enabled).length;
  const retryIn = status.retryAt ? Math.max(0, Math.round((status.retryAt - Date.now()) / 1e3)) : 0;
  const signingIn = signIns.has(spec.id);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-card", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-row", style: { flexWrap: "nowrap" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dc-dot " + status.state, title: STATE_TEXT[status.state] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-grow", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-name", children: spec.label }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-meta", title: where, children: where })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "dc-switch", type: "checkbox", checked: spec.enabled, title: spec.enabled ? "Turn off" : "Turn on", onChange: (e) => act({ op: "enable", id: spec.id, enabled: e.target.checked }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-msg", children: [
      STATE_TEXT[status.state],
      status.state === "connected" && ` \xB7 ${enabledCount}/${status.tools.length} tools`,
      status.state === "retrying" && ` in ${retryIn}s`,
      status.state !== "connected" && status.message && status.message !== STATE_TEXT[status.state] ? ` \xB7 ${status.message}` : ""
    ] }),
    signingIn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SignIn, { row }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-row", children: [
      oauth && spec.enabled && !signingIn && (status.state === "needs-login" || !row.secrets.signedIn) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm primary", onClick: () => startSignIn(spec.id), children: "Sign in" }),
      spec.enabled && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm", onClick: () => act({ op: "reconnect", id: spec.id }), children: "Reconnect" }),
      status.tools.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm", onClick: () => setShowTools(!showTools), children: showTools ? "Hide tools" : "Tools" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm", onClick: onEdit, children: "Edit" }),
      oauth && row.secrets.signedIn && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm", onClick: () => act({ op: "logout", id: spec.id }), children: "Sign out" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn sm danger", onClick: () => {
        if (confirm(`Remove ${spec.label}? Its saved sign-in and tokens are deleted too.`)) void act({ op: "remove", id: spec.id });
      }, children: "Remove" })
    ] }),
    msg && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-msg err", children: msg }),
    showTools && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-tools", children: status.tools.map((t) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "dc-tool", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: t.enabled, onChange: (e) => act({ op: "tool", id: spec.id, tool: t.name, enabled: e.target.checked }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
        t.title || t.name,
        t.description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: t.description.slice(0, 200) })
      ] })
    ] }, t.name)) })
  ] });
}
function ConnectorsSection() {
  const [rows, setRows] = (0, import_react.useState)(null);
  const [error, setError] = (0, import_react.useState)("");
  const [mode, setMode] = (0, import_react.useState)("list");
  const [, force] = (0, import_react.useState)(0);
  const alive = (0, import_react.useRef)(true);
  const refresh = (0, import_react.useCallback)(async () => {
    try {
      const data = await api();
      if (!alive.current) return;
      setRows(data.servers);
      setError("");
      for (const r of data.servers) {
        const local = signIns.get(r.spec.id);
        if ((local == null ? void 0 : local.url) && !r.status.signingIn) signIns.delete(r.spec.id);
      }
    } catch (e) {
      if (alive.current) setError(e.message);
    }
  }, []);
  (0, import_react.useEffect)(() => {
    alive.current = true;
    notify = () => {
      force((n) => n + 1);
      void refresh();
    };
    void refresh();
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 2e3);
    return () => {
      alive.current = false;
      clearInterval(timer);
      notify = () => {
      };
    };
  }, [refresh]);
  const done = () => {
    setMode("list");
    void refresh();
  };
  const editing = typeof mode === "object" ? rows == null ? void 0 : rows.find((r) => r.spec.id === mode.edit) : void 0;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { className: "dc-h", children: "Connectors" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "dc-sub", children: "Give your agents tools from any MCP server. Changes apply right away, no restart." })
      ] }),
      mode === "list" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dc-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn", onClick: () => setMode("import"), children: "Import JSON" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dc-btn primary", onClick: () => setMode("add"), children: "Add connector" })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-msg err", children: error }),
    mode === "add" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Editor, { onDone: done }),
    mode === "import" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Importer, { onDone: done }),
    editing && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Editor, { row: editing, onDone: done }),
    rows === null ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-empty", children: "Loading\u2026" }) : rows.length === 0 && mode === "list" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dc-card dc-empty", children: "No connectors yet. Add one, or import your Claude Desktop config." }) : rows.map((r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ServerCard, { row: r, refresh, onEdit: () => setMode({ edit: r.spec.id }) }, r.spec.id))
  ] });
}
var inject = ["slots"];
function apply(ctx) {
  ensureStyles();
  ctx.slots.inject("settings.section", () => ctx.slots.register({
    name: "settings.section",
    id: "dsh-connectors",
    order: 25,
    label: () => "Connectors"
  }, ConnectorsSection));
}

return module.exports;
}});
