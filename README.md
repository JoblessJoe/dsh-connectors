<p align="center">
  <img src="https://raw.githubusercontent.com/JoblessJoe/dsh-connectors/main/.github/assets/banner.svg" alt="dsh-connectors: Claude-style connectors for DeepSeek Harness, plug any MCP server into your agents" width="100%">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/dsh-connectors"><img src="https://img.shields.io/npm/v/dsh-connectors?color=34d399&label=npm" alt="npm version"></a>
  <a href="https://www.npmjs.com/package/dsh-connectors"><img src="https://img.shields.io/npm/dm/dsh-connectors?color=34d399" alt="npm downloads"></a>
  <img src="https://img.shields.io/badge/MCP-OAuth%202.1%20%2B%20PKCE-34d399" alt="MCP OAuth 2.1 with PKCE">
  <a href="LICENSE"><img src="https://img.shields.io/github/license/JoblessJoe/dsh-connectors?color=34d399" alt="MIT license"></a>
  <a href="https://github.com/awesome-dsh-plugin/awesome-dsh-plugin"><img src="https://img.shields.io/badge/awesome-dsh--plugin-fc60a8" alt="awesome-dsh-plugin"></a>
</p>

A [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (dsh) plugin that brings **Claude-style connectors** to your agents: add any MCP server from a page in the sidebar, sign in once, and its tools show up in every chat. Hosted servers with an OAuth login, servers that want a token, and local programs all work the same way. No YAML, no restart per server.

```bash
npx @deepseek-ai/dsh plugin --profile web add dsh-connectors
```

Reload the browser tab. **Connectors** appears in the sidebar, right below Projects. Full details under [Install](#install).

<p align="center">
  <img src="https://raw.githubusercontent.com/JoblessJoe/dsh-connectors/main/.github/assets/connectors-panel.png" alt="The Connectors page: a connected Linear server with its tool list, Notion waiting for sign-in, a local filesystem server" width="100%">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/JoblessJoe/dsh-connectors/main/.github/assets/add-dialog.png" alt="The Add connector dialog" width="520">
  <br><sub>Add a connector: paste the URL, pick how it signs in. A new OAuth connector opens its sign-in page right away.</sub>
</p>

## What it does

- **Any MCP server.** Remote (Streamable HTTP, with automatic fallback to the older SSE transport) or a local command over stdio (`npx`, `uvx`, `docker`, anything).
- **Real sign-in.** OAuth 2.1 with PKCE, server discovery (RFC 9728 / RFC 8414) and dynamic client registration, done by the official MCP SDK. Works with hosted connectors like Linear, Notion, Sentry or your own FastMCP server behind GitHub login.
- **Sign-in finishes by itself, anywhere.** The provider sends you back to the dsh address you're using, so it works on a headless server too. No setup. See [Signing in](#signing-in).
- **Stays signed in.** Tokens live in dsh's own credential store, survive restarts and refresh on their own.
- **Heals itself.** Dropped connections reconnect with backoff. A tool call during a hiccup waits a few seconds for the server instead of failing.
- **You decide what agents see.** Turn a whole connector off, or switch single tools off (say, `delete_issue`).
- **Import.** Paste an `mcpServers` block from Claude Desktop, Cursor, VS Code or a server's README. Tokens in an `Authorization` header move to the credential store.
- **Fits in.** Built from dsh's own buttons, switches, tags and dialogs, so it follows your theme in light and dark mode.

Tools appear as `mcp__<id>__<tool>`, the same names dsh's built-in MCP client uses.

## Where it shows up

- **Sidebar → Connectors**, just below Projects. It is a normal dsh panel, so the shell's **More** menu can hide or show it.
- **Settings → Connectors**: the same page, for people who look there first.

Nothing in dsh is patched. Both entries are registered by the plugin through dsh's slot system.

## Signing in

1. Click **Sign in** on a connector. The provider's login page opens in a new tab.
2. Log in and accept. The provider sends you back to dsh at `<your dsh address>/plugins/dsh-connectors/callback`, the tab closes, and the connector turns **Connected**. That's it, on any device, whether dsh runs on your laptop or a server.

No setup and no fixed address: the plugin uses whatever address your browser opened dsh at (`http://localhost:3080`, `https://dsh.example.com`, a LAN IP). If you open dsh at a new address, the next sign-in registers it by itself.

**Fallback:** a few providers only accept `localhost` return addresses. For those, click *Try the paste method*: the tab then ends on an error page at `http://127.0.0.1:47391/callback?code=…`; copy that address into the box and click **Finish**.

## Install

Into your dsh **web profile** (`web` below is the profile name; use the one that backs your web GUI). From a source checkout, use `pnpm dsh` instead of `npx @deepseek-ai/dsh`:

```bash
npx @deepseek-ai/dsh plugin --profile web add dsh-connectors
```

This installs the package and adds it to `dsh.profile.bundles`. If **Connectors** doesn't show up after a browser reload, restart dsh once. After that, adding, editing and removing connectors never needs a restart.

Requires dsh `0.2.2-rc.1` or newer and Node 20+.

## Configuration

Everything is done on the Connectors page. Two optional settings for the plugin entry in `cordis.patch.yml`:

| Key | Default | What it does |
| --- | ------- | ------------ |
| `file` | `$DSH_HOME/connectors.json` | Where the connector list (no secrets) is saved |
| `callbackPort` | `47391` | Port of the paste-method fallback listener |

## Security

- **Secrets never touch the connector list.** Tokens, client secrets and OAuth grants go to dsh's credential store (`dsh-connectors/<id>` records). The list file is written with mode `600` anyway.
- **Secrets never reach the browser.** The page only learns *whether* a token is saved.
- **The sign-in return route** (`/plugins/dsh-connectors/callback`) has to accept a cross-site redirect from the provider, so it sits outside dsh's `/api` fence. It only completes a sign-in that dsh itself started: a one-time random `state` plus the PKCE verifier, unused sign-ins expire after 15 minutes. If your dsh sits behind a login proxy, your browser's proxy session covers it.
- **The fallback listener only runs while a paste-method sign-in waits**, binds to `127.0.0.1` and stops afterwards.
- **The management route sits behind dsh's own login** and trust checks, like every other `/api` route.
- **Local commands run as your user**, like any MCP server you'd add by hand. Only add commands you trust.

## Building from source

```bash
git clone https://github.com/JoblessJoe/dsh-connectors.git
cd dsh-connectors
npm install
npm test        # builds lib/, then runs end-to-end tests against a real MCP server (stdio + HTTP)
```

`node scripts/build.mjs` alone emits `lib/index.js` (host) and `lib/client.js` (web).

## Credits

Ideas from two earlier dsh MCP plugins: the settings-page approach of [dsh-mcp-oauth-client](https://github.com/fangzaozao/dsh-mcp-oauth-client) and the credential-store and output-cap ideas of [dsh-mcp-oauth](https://github.com/k0ndrateff/dsh-plugins). Both MIT.

## License

MIT

> **中文简介** · DeepSeek Harness (dsh) 插件：像 Claude 一样的「连接器」。在侧边栏的 Connectors 页面添加任意 MCP 服务器（远程 OAuth 登录、令牌或本地命令），工具立即出现在所有对话中，无需 YAML、无需重启。支持 OAuth 2.1 + PKCE、令牌自动刷新、断线自动重连、按工具开关、从 Claude Desktop 配置导入；dsh 运行在服务器上时同样可以登录。<br>安装：`npx @deepseek-ai/dsh plugin --profile web add dsh-connectors`
