/**
 * Tool handlers that proxy to the Walletrix MCP server instead of calling
 * services in-process. Same handler signature (args, ctx) → result as
 * createToolHandlers, so the agent loop is unchanged — only the transport moves.
 */
import { AGENT_TOOL_NAMES } from './toolDefinitions.js';

export function createMcpToolHandlers({ client }) {
  const handlers = {};
  for (const name of AGENT_TOOL_NAMES) {
    handlers[name] = async (args, ctx) => {
      const result = await client.callTool({
        name,
        arguments: { telegram_id: String(ctx.telegramId), ...(args || {}) },
      });
      return result.structuredContent ?? result;
    };
  }
  return handlers;
}
