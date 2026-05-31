/**
 * Stdio entry for the Walletrix wallet MCP server.
 * Run standalone so an MCP client (Claude Desktop, Cursor, or the bot's
 * own MCP client in Task 8) can spawn it as a subprocess.
 *
 * Usage: node src/mcp/start.js
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ethers } from 'ethers';
import prisma from '../lib/prisma.js';
import { DEFAULT_CHAIN_ID } from '../config/tokens.js';
import { loadConversationSession, saveConversationSession } from '../services/conversationSessionService.js';
import { listSavedRecipients, resolveSavedRecipientFromText } from '../services/savedRecipientService.js';
import { lookupTelegramTransferStatus, buildTransferStatusMessage } from '../services/telegramTxStatusService.js';
import { getBotWalletBalance } from '../services/telegramExecutionService.js';
import { createToolHandlers } from '../services/agent/toolHandlers.js';
import { createPendingTransferStore } from '../services/agent/pendingTransferStore.js';
import { buildWalletMcpServer } from './walletMcpServer.js';

const pendingStore = createPendingTransferStore({
  loadConversationSession,
  saveConversationSession,
  resolveSavedRecipientFromText,
  isAddress: (a) => ethers.isAddress(a),
});

const handlers = createToolHandlers({
  getBotWalletBalance,
  listSavedRecipients,
  lookupTelegramTransferStatus,
  buildTransferStatusMessage,
  preparePendingTransfer: (args, ctx) => pendingStore.prepare(args, ctx),
  defaultChainId: DEFAULT_CHAIN_ID,
});

async function resolveContext({ telegram_id }) {
  const user = await prisma.user.findUnique({ where: { telegramId: String(telegram_id) } });
  if (!user) throw new Error(`Unknown telegram_id ${telegram_id} — user not linked.`);
  return { user, telegramId: String(telegram_id) };
}

const server = buildWalletMcpServer({ handlers, resolveContext });
await server.connect(new StdioServerTransport());
