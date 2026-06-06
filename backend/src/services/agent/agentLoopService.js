import { GoogleGenerativeAI } from '@google/generative-ai';
import telegramConfig from '../../config/telegram.js';
import logger from '../loggerService.js';
import { AGENT_TOOL_DECLARATIONS } from './toolDefinitions.js';

const MODEL_NAME = 'gemini-2.5-flash';

const AGENT_SYSTEM_PROMPT = `You are Walletrix, a crypto wallet assistant inside Telegram.

You can help the user with:
- Balance: check their bot wallet ETH balance
- Recipients: list, save, or delete saved addresses
- Transfers: send crypto (prepare + YES confirm), view recent transfers, last transfer, tx status
- Stealth addresses: issue a private receive address, list issued addresses, preview or claim funded ones

Rules — follow these exactly:
1. Always call a tool when the user asks for data or an action. Never invent balances, addresses, or results.
2. After every tool call, ALWAYS write a friendly text reply presenting the result to the user. Never respond with nothing or a blank message.
3. For balance: show the ETH amount clearly, e.g. "Your balance is 0.05 ETH."
4. For recipients: list them by name and address.
5. For transfer history: format and show the entries. If empty, say so.
6. To send crypto: call prepare_transfer (stages only, does NOT send). Tell the user to reply YES to confirm or NO to cancel. Never proceed without confirmation.
7. For stealth claims: call prepare_stealth_claim to stage it, then tell the user to reply YES to confirm.
8. Default network is Sepolia (testnet) unless the user says otherwise.
9. Be concise, warm, and clear. Ask if an amount or recipient is missing.`;

let genAI = null;

function defaultStartChat() {
  if (!genAI) {
    if (!telegramConfig.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');
    genAI = new GoogleGenerativeAI(telegramConfig.GEMINI_API_KEY);
  }
  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: AGENT_SYSTEM_PROMPT,
    tools: [{ functionDeclarations: AGENT_TOOL_DECLARATIONS }],
    toolConfig: { functionCallingConfig: { mode: 'AUTO' } },
  });
  return model.startChat();
}

export async function runAgentTurn({
  text,
  ctx,
  handlers,
  startChat = defaultStartChat,
  maxIterations = 6,
}) {
  const chat = startChat();
  let response = (await chat.sendMessage(text)).response;
  let lastToolMessage = null; // fallback if model returns empty text

  for (let i = 0; i < maxIterations; i += 1) {
    const calls = response.functionCalls?.() || [];
    if (!calls.length) {
      const finalText = response.text?.() || '';
      // If Gemini returned no text after a tool call, use the tool's own message field
      return { text: finalText || lastToolMessage || 'Done.' };
    }

    const functionResponses = [];
    for (const call of calls) {
      const handler = handlers[call.name];
      let out;
      try {
        out = handler
          ? await handler(call.args || {}, ctx)
          : { error: `Unknown tool: ${call.name}` };
      } catch (error) {
        logger.error('[Agent] tool handler threw', { tool: call.name, error: error.message });
        out = { error: error.message };
      }
      // Short-circuit: pending confirmation means we must show the summary now.
      if (out?.status === 'awaiting_confirmation' && out?.summary) {
        return { text: out.summary };
      }
      // Capture tool message as fallback in case model returns empty text.
      if (out?.message) lastToolMessage = out.message;
      functionResponses.push({ functionResponse: { name: call.name, response: out } });
    }

    response = (await chat.sendMessage(functionResponses)).response;
  }

  return { text: 'I could not complete that — please try again.' };
}
