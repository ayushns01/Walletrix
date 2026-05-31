/**
 * Model Context Protocol server exposing Walletrix's read/prepare wallet tools.
 *
 * The handlers are the SAME ones the in-process agent loop uses (Phase 1) — this
 * file only adapts them to MCP's tool interface. MCP tools are stateless per call,
 * so each tool takes a `telegram_id` argument that `resolveContext` turns into the
 * { user, telegramId } ctx the handlers expect.
 *
 * SECURITY: read/prepare only. No execute/sign tool is registered — ever.
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { AGENT_TOOL_DECLARATIONS } from '../services/agent/toolDefinitions.js';

const TOOL_ZOD_SCHEMAS = {
  get_balance: { telegram_id: z.string() },
  list_recipients: { telegram_id: z.string() },
  get_tx_status: { telegram_id: z.string(), tx_hash: z.string().optional() },
  prepare_transfer: {
    telegram_id: z.string(),
    amount: z.number().positive(),
    recipient: z.string(),
    token: z.string().optional(),
    chain: z.string().optional(),
  },
};

export function buildWalletMcpServer({ handlers, resolveContext }) {
  const server = new McpServer({ name: 'walletrix-wallet', version: '0.1.0' });
  const registered = new Map();

  for (const decl of AGENT_TOOL_DECLARATIONS) {
    const handler = handlers[decl.name];
    if (!handler) continue;

    const schema = TOOL_ZOD_SCHEMAS[decl.name];
    if (!schema) continue;

    const run = async (args) => {
      const { telegram_id, ...toolArgs } = args;
      const ctx = await resolveContext({ telegram_id });
      const out = await handler(toolArgs, ctx);
      return {
        content: [{ type: 'text', text: JSON.stringify(out) }],
        structuredContent: out,
      };
    };

    server.registerTool(
      decl.name,
      { description: decl.description, inputSchema: schema },
      run
    );
    registered.set(decl.name, run);
  }

  // Test-only shim — invoke a tool directly without a transport.
  server.__invokeForTest = (name, args) => {
    const fn = registered.get(name);
    if (!fn) throw new Error(`Tool not registered: ${name}`);
    return fn(args);
  };
  server.__registeredNames = [...registered.keys()];
  return server;
}

export function listRegisteredToolNames(server) {
  return server.__registeredNames || [];
}
