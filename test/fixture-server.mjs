// Tiny MCP server for tests. `node fixture-server.mjs stdio` or `... http <port> [token]`.
import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node'
import * as z from 'zod'

function build() {
  const server = new McpServer({ name: 'fixture', version: '1.0.0' })
  server.registerTool('echo', { description: 'Echo text back', inputSchema: z.object({ text: z.string() }) },
    async ({ text }) => ({ content: [{ type: 'text', text: `echo: ${text}` }] }))
  server.registerTool('fail', { description: 'Always fails', inputSchema: z.object({}) },
    async () => ({ isError: true, content: [{ type: 'text', text: 'boom' }] }))
  return server
}

const [mode, port, token] = process.argv.slice(2)
if (mode === 'stdio') {
  await build().connect(new StdioServerTransport())
} else {
  const sessions = new Map()
  const stateful = process.env.STATEFUL === '1'
  createServer(async (req, res) => {
    if (token && req.headers.authorization !== `Bearer ${token}`) { res.writeHead(401).end('unauthorized'); return }
    if (stateful) {
      // Like most hosted servers: sessions live in memory, so a restart forgets them.
      const id = req.headers['mcp-session-id']
      let transport = id && sessions.get(id)
      if (id && !transport) { res.writeHead(404, { 'content-type': 'application/json' }).end('{"jsonrpc":"2.0","id":null,"error":{"code":-32600,"message":"Session not found"}}'); return }
      if (!transport) {
        transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: randomUUID, onsessioninitialized: (sid) => sessions.set(sid, transport) })
        await build().connect(transport)
      }
      await transport.handleRequest(req, res)
      return
    }
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined })
    const server = build()
    res.on('close', () => { void transport.close(); void server.close() })
    await server.connect(transport)
    await transport.handleRequest(req, res)
  }).listen(Number(port), '127.0.0.1', () => console.log('ready'))
}
