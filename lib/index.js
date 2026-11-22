// src/index.ts
import { homedir } from "node:os";
import { join } from "node:path";

// src/auth.ts
import { createServer } from "node:http";
import { randomBytes } from "node:crypto";
import { auth } from "@modelcontextprotocol/client";
var Secrets = class {
  constructor(credentials) {
    this.credentials = credentials;
  }
  credentials;
  key(id) {
    return `dsh-connectors/${id}`;
  }
  async read(id) {
    const record = await this.credentials.readRecord(this.key(id));
    return record?.kind === "grant" && record.payload && typeof record.payload === "object" ? record.payload : {};
  }
  async patch(id, edit) {
    await this.credentials.modifyRecord(this.key(id), async (current) => {
      const previous = current?.kind === "grant" && current.payload ? current.payload : {};
      const next = JSON.parse(JSON.stringify(edit({ ...previous })));
      return { kind: "grant", payload: next };
    });
  }
  async clear(id) {
    await this.credentials.deleteRecord(this.key(id));
  }
};
var NeedsLogin = class extends Error {
  constructor(message = "Sign-in needed") {
    super(message);
  }
};
var ConnectorOAuth = class {
  constructor(spec, secrets, redirect, onRedirect, strict = false) {
    this.spec = spec;
    this.secrets = secrets;
    this.redirect = redirect;
    this.onRedirect = onRedirect;
    this.strict = strict;
  }
  spec;
  secrets;
  redirect;
  onRedirect;
  strict;
  verifier;
  nextState;
  get redirectUrl() {
    return this.redirect;
  }
  get clientMetadata() {
    return {
      client_name: "DeepSeek Harness (dsh-connectors)",
      client_uri: "https://github.com/JoblessJoe/dsh-connectors",
      redirect_uris: [this.redirect],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      token_endpoint_auth_method: "none",
      ...this.spec.scope ? { scope: this.spec.scope } : {}
    };
  }
  state() {
    this.nextState = randomBytes(24).toString("base64url");
    return this.nextState;
  }
  async clientInformation() {
    const secret = await this.secrets.read(this.spec.id);
    if (this.spec.clientId) {
      return { client_id: this.spec.clientId, ...secret.clientSecret ? { client_secret: secret.clientSecret } : {} };
    }
    const client = secret.client;
    if (client?.client_id && (!this.strict || !Array.isArray(client.redirect_uris) || client.redirect_uris.includes(this.redirect))) return client;
    return void 0;
  }
  async saveClientInformation(info) {
    await this.secrets.patch(this.spec.id, (s) => ({ ...s, client: info }));
  }
  async tokens() {
    return (await this.secrets.read(this.spec.id)).tokens;
  }
  async saveTokens(tokens) {
    await this.secrets.patch(this.spec.id, (s) => ({ ...s, tokens }));
  }
  redirectToAuthorization(url) {
    this.onRedirect(url, this.nextState);
  }
  saveCodeVerifier(verifier) {
    this.verifier = verifier;
  }
  codeVerifier() {
    if (!this.verifier) throw new NeedsLogin("Sign-in expired. Start it again.");
    return this.verifier;
  }
  async invalidateCredentials(scope) {
    if (scope === "verifier" || scope === "discovery") {
      if (scope === "verifier") this.verifier = void 0;
      return;
    }
    await this.secrets.patch(this.spec.id, (s) => {
      if (scope === "all" || scope === "client") delete s.client;
      if (scope === "all" || scope === "tokens") delete s.tokens;
      return s;
    });
  }
};
var LOGIN_TTL_MS = 15 * 6e4;
var LoginDesk = class {
  constructor(port, log) {
    this.port = port;
    this.log = log;
    this.redirect = `http://127.0.0.1:${port}/callback`;
  }
  port;
  log;
  pending = /* @__PURE__ */ new Map();
  server;
  redirect;
  /**
   * Start a sign-in for one connector. Resolves with the URL to open, or
   * `undefined` when stored tokens were still good (no browser needed).
   */
  async start(spec, secrets, onFinished, redirect = this.redirect) {
    this.sweep();
    for (const [state2, p] of this.pending) if (p.id === spec.id) this.pending.delete(state2);
    let url;
    let state;
    const provider = new ConnectorOAuth(spec, secrets, redirect, (u, s) => {
      url = u;
      state = s;
    }, true);
    const result = await auth(provider, { serverUrl: spec.url, ...spec.scope ? { scope: spec.scope } : {} });
    if (result === "AUTHORIZED") return void 0;
    if (!url || !state) throw new Error("The server did not start a sign-in.");
    if (redirect === this.redirect) await this.listen();
    this.pending.set(state, { id: spec.id, provider, serverUrl: spec.url, scope: spec.scope, expires: Date.now() + LOGIN_TTL_MS, done: onFinished });
    return url.href;
  }
  /** Finish from a pasted address (or anything containing `code=` and `state=`). */
  async finishFromText(text) {
    const raw = text.trim();
    let params;
    try {
      params = new URL(raw).searchParams;
    } catch {
      params = new URLSearchParams(raw.replace(/^[^?]*\?/, ""));
    }
    return this.finish(params);
  }
  /** Cancel the pending sign-in of one connector, if any. */
  cancel(id) {
    for (const [state, p] of this.pending) if (p.id === id) this.pending.delete(state);
    this.idle();
  }
  hasPending(id) {
    this.sweep();
    return [...this.pending.values()].some((p) => p.id === id);
  }
  async close() {
    this.pending.clear();
    await this.stopListening();
  }
  /** Finish from the redirect's query string (dsh's own callback route or the loopback listener). */
  async finish(params) {
    this.sweep();
    const state = params.get("state") ?? "";
    const pending = this.pending.get(state);
    if (!pending) throw new Error("No sign-in is waiting for this address. It may have expired; start it again.");
    this.pending.delete(state);
    this.idle();
    const error = params.get("error");
    if (error) {
      const failure = new Error(`The server refused the sign-in: ${params.get("error_description") || error}`);
      pending.done(failure);
      throw failure;
    }
    const code = params.get("code");
    if (!code) throw new Error("That address has no sign-in code in it.");
    try {
      const result = await auth(pending.provider, { serverUrl: pending.serverUrl, authorizationCode: code, ...pending.scope ? { scope: pending.scope } : {} });
      if (result !== "AUTHORIZED") throw new Error("The server did not accept the sign-in code.");
    } catch (e) {
      pending.done(e);
      throw e;
    }
    pending.done();
    return pending.id;
  }
  sweep() {
    const now = Date.now();
    for (const [state, p] of this.pending) if (p.expires < now) this.pending.delete(state);
    this.idle();
  }
  /** The listener only runs while a sign-in waits. */
  idle() {
    if (!this.pending.size) void this.stopListening();
  }
  async listen() {
    if (this.server) return;
    const server = createServer((req, res) => {
      const url = new URL(req.url ?? "/", this.redirect);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      this.finish(url.searchParams).then(
        () => page(res, 200, "Signed in", "You can close this tab and go back to DeepSeek Harness."),
        (e) => page(res, 400, "Sign-in failed", e instanceof Error ? e.message : String(e))
      );
    });
    await new Promise((resolve, reject) => {
      server.once("error", (e) => reject(e?.code === "EADDRINUSE" ? new Error(`Port ${this.port} is busy. Set another callbackPort for dsh-connectors.`) : e));
      server.listen(this.port, "127.0.0.1", () => resolve());
    });
    this.server = server;
    this.log(`sign-in listener on ${this.redirect}`);
  }
  async stopListening() {
    const server = this.server;
    this.server = void 0;
    if (!server) return;
    server.closeAllConnections();
    await new Promise((resolve) => server.close(() => resolve()));
  }
};
var escape = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
function page(res, status, title, text, close = false) {
  res.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(title)}</title><body style="font:16px/1.5 system-ui;max-width:32rem;margin:4rem auto;padding:0 1rem;text-align:center"><h1 style="font-size:1.25rem">${escape(title)}</h1><p>${escape(text)}</p>${close ? "<script>setTimeout(() => window.close(), 1500)</script>" : ""}</body>`
  );
}

// src/connector.ts
import { createHash } from "node:crypto";
import { Client, SSEClientTransport, StreamableHTTPClientTransport, UnauthorizedError } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
var VERSION = "0.1.0";
var MAX_TOOL_NAME = 64;
var MAX_TEXT = 48e3;
var DEFAULT_TIMEOUT_MS = 12e4;
var CALL_WAIT_MS = 15e3;
var BACKOFF_MIN_MS = 1e3;
var BACKOFF_MAX_MS = 5 * 6e4;
var STDERR_TAIL = 2e3;
function toolName(id, raw) {
  const name2 = `mcp__${id}__${raw}`.replace(/[^A-Za-z0-9_-]/g, "_");
  if (name2.length <= MAX_TOOL_NAME) return name2;
  const hash = createHash("sha256").update(raw).digest("hex").slice(0, 6);
  return `${name2.slice(0, MAX_TOOL_NAME - 7)}_${hash}`;
}
function contentText(content) {
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const block of content) {
    if (block?.type === "text") parts.push(String(block.text ?? ""));
    else if (block?.type === "image" || block?.type === "audio") parts.push(`[${block.type}: ${block.mimeType ?? "binary"}, ${Math.round((block.data?.length ?? 0) * 0.75)} bytes]`);
    else if (block?.type === "resource") parts.push(block.resource?.text ?? `[resource: ${block.resource?.uri ?? ""}]`);
    else if (block?.type === "resource_link") parts.push(`[link: ${block.name ?? ""} ${block.uri ?? ""}]`.trim());
  }
  const text = parts.join("\n");
  return text.length <= MAX_TEXT ? text : `${text.slice(0, MAX_TEXT)}
\u2026 (cut at ${MAX_TEXT} characters; ask for less, e.g. a page range or a narrower query)`;
}
function isAuthError(error) {
  if (error instanceof UnauthorizedError || error instanceof NeedsLogin) return true;
  const msg = error instanceof Error ? error.message : String(error);
  return /\b401\b|unauthori[sz]ed|invalid_token|invalid_grant/i.test(msg);
}
function errorText(error) {
  return error instanceof Error ? error.message : String(error);
}
var Connector = class {
  constructor(spec, deps) {
    this.spec = spec;
    this.deps = deps;
  }
  spec;
  deps;
  status = { state: "off", message: "", tools: [], since: Date.now() };
  client;
  generation = 0;
  attempt = 0;
  retryTimer;
  disposers = /* @__PURE__ */ new Map();
  waiters = [];
  stderr = "";
  start() {
    if (!this.spec.enabled) {
      this.set("off", "Turned off");
      return;
    }
    void this.connect();
  }
  /** Disconnect and withdraw every tool. */
  async stop(state = "off", message = "") {
    this.generation++;
    clearTimeout(this.retryTimer);
    this.unpublish();
    this.status.tools = [];
    const client = this.client;
    this.client = void 0;
    this.set(state, message);
    if (client) await client.close().catch(() => void 0);
  }
  async restart() {
    await this.stop("connecting");
    this.attempt = 0;
    this.start();
  }
  /** Apply new settings: reconnect only when something connection-relevant changed. */
  async update(spec) {
    const { disabledTools: _a, label: _b, ...before } = this.spec;
    const { disabledTools: _c, label: _d, ...after } = spec;
    this.spec = spec;
    if (JSON.stringify(before) !== JSON.stringify(after)) return this.restart();
    if (this.client) await this.sync(this.client, this.generation);
  }
  /** Try now instead of waiting for the backoff timer. */
  kick() {
    if (this.status.state === "retrying") {
      clearTimeout(this.retryTimer);
      void this.connect();
    }
  }
  set(state, message = "") {
    if (state !== this.status.state) this.status.since = Date.now();
    this.status.state = state;
    this.status.message = message;
    if (state !== "retrying") delete this.status.retryAt;
    if (state === "connected" || state === "off" || state === "needs-login" || state === "error") {
      for (const wake of this.waiters.splice(0)) wake();
    }
  }
  async transport(useSse = false) {
    const spec = this.spec;
    if (spec.transport === "stdio") {
      this.stderr = "";
      const t = new StdioClientTransport({
        command: spec.command,
        args: spec.args ?? [],
        ...spec.cwd ? { cwd: spec.cwd } : {},
        // Keep PATH/HOME etc. so `npx`, `uvx`, `docker` resolve like in a shell.
        env: { ...process.env, ...spec.env ?? {} },
        stderr: "pipe"
      });
      t.stderr?.on("data", (chunk) => {
        this.stderr = (this.stderr + chunk.toString()).slice(-STDERR_TAIL);
      });
      return t;
    }
    const secret = await this.deps.secrets.read(spec.id);
    const headers = { ...spec.headers ?? {} };
    let authProvider;
    if (spec.auth === "bearer") {
      if (!secret.bearer) throw new Error("No bearer token saved. Edit the connector and add one.");
      headers.Authorization = `Bearer ${secret.bearer}`;
    } else if (spec.auth === "oauth") {
      if (!secret.tokens) throw new NeedsLogin("Not signed in yet");
      authProvider = new ConnectorOAuth(spec, this.deps.secrets, this.deps.redirect, () => this.deps.onNeedsLogin(spec.id));
    }
    const opts = { ...authProvider ? { authProvider } : {}, requestInit: { headers } };
    return useSse ? new SSEClientTransport(new URL(spec.url), opts) : new StreamableHTTPClientTransport(new URL(spec.url), opts);
  }
  async open(gen, useSse) {
    const client = new Client({ name: "dsh-connectors", version: VERSION }, {
      capabilities: {},
      listChanged: {
        tools: {
          autoRefresh: false,
          debounceMs: 300,
          onChanged: () => {
            if (this.client === client) void this.sync(client, gen).catch((e) => this.deps.log("warn", `${this.spec.id}: tool refresh failed: ${errorText(e)}`));
          }
        }
      }
    });
    client.onclose = () => {
      if (this.client === client && gen === this.generation) this.down("Connection lost");
    };
    await client.connect(await this.transport(useSse));
    return client;
  }
  async connect() {
    const gen = ++this.generation;
    this.set("connecting");
    let client;
    try {
      try {
        client = await this.open(gen, false);
      } catch (first) {
        if (this.spec.transport !== "http" || isAuthError(first) || gen !== this.generation) throw first;
        try {
          client = await this.open(gen, true);
        } catch {
          throw first;
        }
      }
    } catch (error) {
      if (gen !== this.generation) return;
      if (isAuthError(error)) {
        this.unpublish();
        this.status.tools = [];
        this.set("needs-login", error instanceof NeedsLogin ? error.message : "Sign-in expired. Sign in again.");
        return;
      }
      this.down(errorText(error) + (this.stderr ? `
${this.stderr.trim().split("\n").slice(-3).join("\n")}` : ""));
      return;
    }
    if (gen !== this.generation) {
      await client.close().catch(() => void 0);
      return;
    }
    this.client = client;
    try {
      await this.sync(client, gen);
    } catch (error) {
      if (gen === this.generation) this.down(`Listing tools failed: ${errorText(error)}`);
      return;
    }
    this.attempt = 0;
    const info = client.getServerVersion?.();
    this.status.serverName = info?.name;
    this.status.serverVersion = info?.version;
    this.set("connected", `${this.status.tools.filter((t) => t.enabled).length} tools`);
    this.deps.log("info", `${this.spec.id}: connected, ${this.status.tools.length} tools`);
  }
  /** Connection dropped or failed: keep tools, retry with exponential backoff + jitter. */
  down(message) {
    const client = this.client;
    this.client = void 0;
    if (client) void client.close().catch(() => void 0);
    clearTimeout(this.retryTimer);
    const base = Math.min(BACKOFF_MAX_MS, BACKOFF_MIN_MS * 2 ** this.attempt++);
    const delay = Math.round(base * (0.75 + Math.random() * 0.5));
    this.set("retrying", message);
    this.status.retryAt = Date.now() + delay;
    this.deps.log("warn", `${this.spec.id}: ${message.split("\n")[0]} \u2014 retrying in ${Math.round(delay / 1e3)}s`);
    const gen = this.generation;
    this.retryTimer = setTimeout(() => {
      if (gen === this.generation) void this.connect();
    }, delay);
    this.retryTimer.unref?.();
  }
  /** List every tool page and swap the published set in one go. */
  async sync(client, gen) {
    const listed = [];
    let cursor;
    do {
      const page2 = await client.listTools(cursor ? { cursor } : void 0);
      listed.push(...page2.tools ?? []);
      cursor = page2.nextCursor;
    } while (cursor);
    if (gen !== this.generation) return;
    const disabled = new Set(this.spec.disabledTools ?? []);
    this.status.tools = listed.map((t) => ({ name: t.name, title: t.title ?? t.annotations?.title, description: t.description ?? "", enabled: !disabled.has(t.name) }));
    this.unpublish();
    try {
      for (const tool of listed) {
        if (disabled.has(tool.name)) continue;
        this.disposers.set(tool.name, this.deps.tools.register(this.definition(tool)));
      }
    } catch (error) {
      this.unpublish();
      throw error;
    }
    const next = this.disposers;
    if (this.status.state === "connected") this.status.message = `${next.size} tools`;
  }
  unpublish() {
    for (const dispose of this.disposers.values()) {
      try {
        dispose();
      } catch {
      }
    }
    this.disposers.clear();
  }
  /** Wait (briefly) for a usable connection, nudging a pending retry. */
  async ready(signal) {
    if (this.client && this.status.state === "connected") return this.client;
    if (this.status.state === "needs-login") throw new Error(`${this.spec.label} needs a sign-in: open Settings \u2192 Connectors and click Sign in.`);
    if (this.status.state === "off") throw new Error(`${this.spec.label} is turned off in Settings \u2192 Connectors.`);
    this.kick();
    await new Promise((resolve) => {
      const timer = setTimeout(resolve, CALL_WAIT_MS);
      this.waiters.push(() => {
        clearTimeout(timer);
        resolve();
      });
      signal?.addEventListener("abort", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
    });
    signal?.throwIfAborted();
    if (this.client && this.status.state === "connected") return this.client;
    throw new Error(`${this.spec.label} is not reachable right now (${this.status.message || this.status.state}). Try again later.`);
  }
  definition(tool) {
    const raw = tool.name;
    const label = this.spec.label;
    return {
      name: toolName(this.spec.id, raw),
      description: (tool.description || `Tool "${raw}" from the ${label} MCP server.`).slice(0, 4e3),
      parameters: tool.inputSchema && typeof tool.inputSchema === "object" ? tool.inputSchema : { type: "object", properties: {} },
      output: {
        schema: {
          type: "object",
          properties: { content: { type: "array", items: {} }, structuredContent: {} },
          required: ["content"],
          additionalProperties: false
        },
        render: (_args, value) => {
          const text = contentText(value?.content);
          if (text) return [{ type: "text", text }];
          if (value?.structuredContent !== void 0) return [{ type: "text", text: JSON.stringify(value.structuredContent).slice(0, MAX_TEXT) }];
          return [{ type: "text", text: `(${raw} returned nothing)` }];
        }
      },
      execute: async (args, exec) => {
        const call = async () => {
          const client = await this.ready(exec?.signal);
          return client.callTool(
            { name: raw, arguments: args && typeof args === "object" ? args : {} },
            { signal: exec?.signal, timeout: this.spec.timeoutMs ?? DEFAULT_TIMEOUT_MS, resetTimeoutOnProgress: true }
          );
        };
        let result;
        try {
          result = await call();
        } catch (error) {
          if (exec?.signal?.aborted) throw error;
          if (isAuthError(error)) {
            void this.stop("needs-login", "Sign-in expired. Sign in again.");
            this.deps.onNeedsLogin(this.spec.id);
            throw new Error(`${label} needs a new sign-in: open Settings \u2192 Connectors and click Sign in.`);
          }
          if (/closed|ECONNRESET|EPIPE|not connected|fetch failed|socket/i.test(errorText(error)) && this.client) {
            this.down("Connection lost during a call");
            result = await call();
          } else throw error;
        }
        if (result?.isError) throw new Error(contentText(result.content) || `${raw} failed`);
        return {
          content: Array.isArray(result?.content) ? result.content : [],
          ...result?.structuredContent !== void 0 ? { structuredContent: result.structuredContent } : {}
        };
      }
    };
  }
};

// src/store.ts
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
var ID_PATTERN = /^[a-z][a-z0-9-]{0,31}$/;
function slugify(value) {
  const slug = value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^[^a-z]+|-+$/g, "").slice(0, 32).replace(/-+$/, "");
  return slug || "server";
}
var str = (v) => typeof v === "string" ? v.trim() : "";
var strDict = (v) => {
  if (!v || typeof v !== "object" || Array.isArray(v)) return void 0;
  const out = {};
  for (const [k, val] of Object.entries(v)) if (k.trim() && val != null) out[k.trim()] = String(val);
  return Object.keys(out).length ? out : void 0;
};
function normalize(input) {
  const id = str(input?.id);
  if (!ID_PATTERN.test(id)) throw new Error('Id must start with a letter and use only a-z, 0-9 and "-" (max 32).');
  const transport = input?.transport === "stdio" ? "stdio" : "http";
  const spec = {
    id,
    label: str(input?.label) || id,
    enabled: input?.enabled !== false,
    transport
  };
  const timeout = Number(input?.timeoutMs);
  if (Number.isFinite(timeout) && timeout >= 1e3) spec.timeoutMs = Math.min(Math.round(timeout), 30 * 6e4);
  if (Array.isArray(input?.disabledTools)) spec.disabledTools = input.disabledTools.map(String).filter(Boolean);
  if (transport === "stdio") {
    spec.command = str(input?.command);
    if (!spec.command) throw new Error("A stdio server needs a command.");
    spec.args = Array.isArray(input?.args) ? input.args.map(String) : [];
    if (str(input?.cwd)) spec.cwd = str(input.cwd);
    const env = strDict(input?.env);
    if (env) spec.env = env;
    return spec;
  }
  let url;
  try {
    url = new URL(str(input?.url));
  } catch {
    throw new Error("Enter the full server URL, e.g. https://example.com/mcp.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error("The URL must start with https:// or http://.");
  spec.url = url.href;
  spec.auth = input?.auth === "bearer" || input?.auth === "none" ? input.auth : "oauth";
  const headers = strDict(input?.headers);
  if (headers) {
    for (const k of Object.keys(headers)) if (k.toLowerCase() === "authorization") throw new Error("Put tokens in the Bearer token field, not in headers.");
    spec.headers = headers;
  }
  if (str(input?.scope)) spec.scope = str(input.scope);
  if (str(input?.clientId)) spec.clientId = str(input.clientId);
  return spec;
}
var ServerStore = class {
  constructor(file) {
    this.file = file;
  }
  file;
  chain = Promise.resolve();
  async list() {
    let raw;
    try {
      raw = await readFile(this.file, "utf8");
    } catch (e) {
      if (e?.code === "ENOENT") return [];
      throw e;
    }
    const data = JSON.parse(raw);
    const rows = Array.isArray(data?.servers) ? data.servers : [];
    const out = [];
    for (const row of rows) {
      try {
        out.push(normalize(row));
      } catch {
      }
    }
    return out;
  }
  /** Apply `edit` to the current list and save; returns the new list. */
  update(edit) {
    const run = this.chain.then(async () => {
      const next = edit(await this.list());
      await mkdir(dirname(this.file), { recursive: true });
      const tmp = `${this.file}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify({ version: 1, servers: next }, null, 2) + "\n", { mode: 384 });
      await rename(tmp, this.file);
      return next;
    });
    this.chain = run.catch(() => void 0);
    return run;
  }
};
function parseImport(text) {
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That is not valid JSON.");
  }
  const table = data?.mcpServers ?? data?.servers ?? data;
  if (!table || typeof table !== "object" || Array.isArray(table)) throw new Error('Expected an object like {"mcpServers": {"name": {...}}}.');
  const out = [];
  for (const [name2, row] of Object.entries(table)) {
    if (!row || typeof row !== "object") continue;
    const id = slugify(name2);
    if (row.command) {
      out.push({ spec: normalize({ id, label: name2, transport: "stdio", command: row.command, args: row.args, cwd: row.cwd, env: row.env }) });
      continue;
    }
    const url = row.url ?? row.serverUrl;
    if (!url) continue;
    const headers = { ...row.headers ?? {} };
    let bearer;
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() !== "authorization") continue;
      bearer = String(headers[k]).replace(/^Bearer\s+/i, "");
      delete headers[k];
    }
    out.push({ spec: normalize({ id, label: name2, transport: "http", url, headers, auth: bearer ? "bearer" : "oauth" }), bearer });
  }
  if (!out.length) throw new Error("No servers found in that JSON.");
  return out;
}

// src/index.ts
var name = "dsh-connectors";
var inject = ["tools", "connection", "credentials", "webServer"];
var ROUTE = "/api/dsh-connectors";
var CALLBACK = "/plugins/dsh-connectors/callback";
function originOf(value) {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : void 0;
  } catch {
    return void 0;
  }
}
function json(value, status = 200) {
  return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
function apply(ctx, config = {}) {
  const logger = ctx.logger?.("dsh-connectors");
  const log = (level, msg) => logger?.[level] ? logger[level](msg) : console[level === "warn" ? "warn" : "log"](`dsh-connectors: ${msg}`);
  const home = process.env.DSH_HOME || join(homedir(), ".dsh");
  const store = new ServerStore(config.file || join(home, "connectors.json"));
  const secrets = new Secrets(ctx.credentials);
  const desk = new LoginDesk(config.callbackPort || 47391, (m) => log("info", m));
  const connectors = /* @__PURE__ */ new Map();
  let disposed = false;
  const make = (spec) => new Connector(spec, {
    tools: ctx.tools,
    secrets,
    redirect: desk.redirect,
    log,
    onNeedsLogin: (id) => {
      const c = connectors.get(id);
      if (c && c.status.state !== "needs-login") void c.stop("needs-login", "Sign-in expired. Sign in again.");
    }
  });
  const boot = (async () => {
    for (const spec of await store.list()) {
      if (disposed) return;
      const c = make(spec);
      connectors.set(spec.id, c);
      c.start();
    }
  })().catch((e) => log("warn", `could not read the connector list: ${e?.message ?? e}`));
  async function view() {
    await boot;
    const servers = [];
    for (const c of connectors.values()) {
      const s = await secrets.read(c.spec.id).catch(() => ({}));
      servers.push({
        spec: c.spec,
        status: { ...c.status, signingIn: desk.hasPending(c.spec.id) },
        // Flags only. Secret values never leave the host.
        secrets: { bearer: !!s.bearer, clientSecret: !!s.clientSecret, signedIn: !!s.tokens }
      });
    }
    return { servers, redirect: desk.redirect };
  }
  const get = (id) => {
    const c = connectors.get(String(id));
    if (!c) throw new Error("No connector with that id.");
    return c;
  };
  async function save(input, isNew) {
    const spec = normalize(input?.spec);
    if (isNew && connectors.has(spec.id)) throw new Error(`A connector named "${spec.id}" already exists. Pick another id.`);
    if (!isNew) get(spec.id);
    const bearer = typeof input?.bearer === "string" ? input.bearer.trim() : "";
    const clientSecret = typeof input?.clientSecret === "string" ? input.clientSecret.trim() : "";
    if (bearer || clientSecret || isNew) {
      await secrets.patch(spec.id, (s) => {
        if (isNew) s = {};
        if (bearer) s.bearer = bearer.replace(/^Bearer\s+/i, "");
        if (clientSecret) s.clientSecret = clientSecret;
        return s;
      });
    }
    await store.update((list) => isNew ? [...list, spec] : list.map((s) => s.id === spec.id ? spec : s));
    const existing = connectors.get(spec.id);
    if (existing) {
      if (bearer || clientSecret) {
        existing.spec = spec;
        await existing.restart();
      } else await existing.update(spec);
    } else {
      const c = make(spec);
      connectors.set(spec.id, c);
      c.start();
    }
    return spec.id;
  }
  async function op(body) {
    await boot;
    switch (body?.op) {
      case "add":
        return { id: await save(body, true) };
      case "edit":
        return { id: await save(body, false) };
      case "remove": {
        const c = get(body.id);
        desk.cancel(c.spec.id);
        await c.stop();
        connectors.delete(c.spec.id);
        await store.update((list) => list.filter((s) => s.id !== c.spec.id));
        await secrets.clear(c.spec.id);
        return {};
      }
      case "enable": {
        const c = get(body.id);
        const spec = { ...c.spec, enabled: body.enabled === true };
        await store.update((list) => list.map((s) => s.id === spec.id ? spec : s));
        c.spec = spec;
        if (spec.enabled) await c.restart();
        else {
          desk.cancel(spec.id);
          await c.stop("off", "Turned off");
        }
        return {};
      }
      case "tool": {
        const c = get(body.id);
        const off = new Set(c.spec.disabledTools ?? []);
        if (body.enabled === true) off.delete(String(body.tool));
        else off.add(String(body.tool));
        const spec = { ...c.spec, disabledTools: [...off] };
        await store.update((list) => list.map((s) => s.id === spec.id ? spec : s));
        await c.update(spec);
        return {};
      }
      case "reconnect":
        await get(body.id).restart();
        return {};
      case "login": {
        const c = get(body.id);
        if (c.spec.transport !== "http" || c.spec.auth !== "oauth") throw new Error("This connector does not use a sign-in.");
        const done = (error) => {
          if (disposed) return;
          if (error) log("warn", `${c.spec.id}: sign-in failed: ${error.message}`);
          else {
            log("info", `${c.spec.id}: signed in`);
            void c.restart();
          }
        };
        const origin = body.loopback ? void 0 : originOf(body.origin);
        const url = await desk.start(c.spec, secrets, done, origin ? origin + CALLBACK : desk.redirect);
        if (!url) await c.restart();
        return { url: url ?? null };
      }
      case "finish":
        return { id: await desk.finishFromText(String(body.text ?? "")) };
      case "cancel":
        desk.cancel(String(body.id));
        return {};
      case "logout": {
        const c = get(body.id);
        await secrets.patch(c.spec.id, (s) => {
          delete s.tokens;
          return s;
        });
        await c.stop("needs-login", "Signed out");
        return {};
      }
      case "import": {
        const rows = parseImport(String(body.text ?? ""));
        const added = [];
        const skipped = [];
        for (const row of rows) {
          let id = row.spec.id;
          for (let n = 2; connectors.has(id); n++) id = `${row.spec.id.slice(0, 29)}-${n}`;
          if (id !== row.spec.id && body.skipExisting) {
            skipped.push(row.spec.id);
            continue;
          }
          await save({ spec: { ...row.spec, id }, bearer: row.bearer }, true);
          added.push(id);
        }
        return { added, skipped };
      }
      default:
        throw new Error(`Unknown operation: ${body?.op}`);
    }
  }
  ctx.effect(() => ctx.connection.fetch.register({
    path: ROUTE,
    methods: ["GET", "POST"],
    requestBody: "buffered",
    fetch: async (request) => {
      try {
        if (request.method === "GET") return json({ ok: true, ...await view() });
        let body = {};
        try {
          body = await request.json();
        } catch {
        }
        return json({ ok: true, ...await op(body) });
      } catch (error) {
        return json({ ok: false, error: error instanceof Error ? error.message : String(error) }, 400);
      }
    }
  }), "dsh-connectors.route");
  ctx.effect(() => ctx.webServer.register({
    kind: "exact",
    path: CALLBACK,
    handler: async (req, res) => {
      if (req.method !== "GET") {
        res.writeHead(405).end();
        return;
      }
      const params = new URL(req.url ?? "/", "http://x").searchParams;
      try {
        await desk.finish(params);
        page(res, 200, "Signed in", "You can close this tab. The connector is connecting in DeepSeek Harness.", true);
      } catch (e) {
        page(res, 400, "Sign-in failed", e instanceof Error ? e.message : String(e));
      }
    }
  }), "dsh-connectors.callback");
  ctx.effect(() => () => {
    disposed = true;
    void desk.close();
    for (const c of connectors.values()) void c.stop();
    connectors.clear();
  }, "dsh-connectors.connectors");
}
export {
  apply,
  inject,
  name,
  parseImport
};
