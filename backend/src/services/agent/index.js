import { ethers } from 'ethers';
import { DEFAULT_CHAIN_ID } from '../../config/tokens.js';
import {
  loadConversationSession,
  saveConversationSession,
} from '../conversationSessionService.js';
import {
  listSavedRecipients,
  resolveSavedRecipientFromText,
  saveSavedRecipient,
  removeSavedRecipientByName,
} from '../savedRecipientService.js';
import {
  lookupTelegramTransferStatus,
  buildTransferStatusMessage,
} from '../telegramTxStatusService.js';
import {
  getRecentTelegramTransfers,
  getLastTelegramTransfer,
  buildRecentTransfersMessage,
  buildLastTransferMessage,
} from '../telegramHistoryService.js';
import {
  executeTransfer,
  getBotWalletBalance,
} from '../telegramExecutionService.js';
import { createToolHandlers } from './toolHandlers.js';
import { createPendingTransferStore } from './pendingTransferStore.js';
import { createConfirmationFlow } from './confirmationFlow.js';
import { runAgentTurn } from './agentLoopService.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import telegramConfig from '../../config/telegram.js';
import { createMcpToolHandlers } from './mcpToolHandlers.js';

export function createAgentMessageHandler({ confirmationFlow, runAgentTurn: runTurn, handlers }) {
  return async function handle(text, ctx) {
    const confirmResult = await confirmationFlow.handle(text, ctx);
    if (confirmResult.handled) {
      return { text: confirmResult.text };
    }
    return runTurn({ text, ctx, handlers });
  };
}

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
  getRecentTelegramTransfers,
  getLastTelegramTransfer,
  buildRecentTransfersMessage,
  buildLastTransferMessage,
  saveSavedRecipient,
  removeSavedRecipientByName,
});

const confirmationFlow = createConfirmationFlow({
  takePending: (ctx) => pendingStore.takePending(ctx),
  clearPending: (ctx) => pendingStore.clearPending(ctx),
  executeTransfer,
});

const agentMessageHandler = createAgentMessageHandler({ confirmationFlow, runAgentTurn, handlers });

// ── MCP client (lazy, singleton) ────────────────────────────────────────────
let mcpHandlersPromise = null;

async function getMcpHandlers() {
  if (!mcpHandlersPromise) {
    mcpHandlersPromise = (async () => {
      const client = new Client({ name: 'walletrix-bot', version: '0.1.0' });
      const transport = new StdioClientTransport({
        command: 'node',
        args: ['src/mcp/start.js'],
      });
      await client.connect(transport);
      return createMcpToolHandlers({ client });
    })();
  }
  return mcpHandlersPromise;
}

async function selectHandlers() {
  if (telegramConfig.TELEGRAM_AGENT_USE_MCP) {
    return getMcpHandlers();
  }
  return handlers; // in-process handlers (Phase 1 default)
}

export async function handleAgentMessage(text, ctx) {
  const activeHandlers = await selectHandlers();
  const handler = createAgentMessageHandler({ confirmationFlow, runAgentTurn, handlers: activeHandlers });
  return handler(text, ctx);
}
