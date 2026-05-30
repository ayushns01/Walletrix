import { GoogleGenerativeAI } from '@google/generative-ai';
import telegramConfig from '../../config/telegram.js';
import logger from '../loggerService.js';
import { AGENT_TOOL_DECLARATIONS } from './toolDefinitions.js';

const MODEL_NAME = 'gemini-2.5-flash';

const AGENT_SYSTEM_PROMPT = `You are Walletrix, a crypto wallet assistant inside Telegram.
You help the user check their balance, view saved recipients, send crypto, and check transfer status.
Always use a tool when the user wants an action — never invent balances, addresses, or results.
To send crypto you MUST call prepare_transfer; it only stages the transfer. Then tell the user to reply YES to confirm. You can never send funds yourself.
Be concise and friendly. If you are missing an amount or recipient, ask for it.`;

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

  for (let i = 0; i < maxIterations; i += 1) {
    const calls = response.functionCalls?.() || [];
    if (!calls.length) {
      const finalText = response.text?.() || '';
      return { text: finalText || 'Done.' };
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
      functionResponses.push({ functionResponse: { name: call.name, response: out } });
    }

    response = (await chat.sendMessage(functionResponses)).response;
  }

  return { text: 'I could not complete that — please try again.' };
}
