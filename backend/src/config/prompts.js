/**
 * System prompts for Gemini intent parsing.
 */

export const INTENT_SYSTEM_PROMPT = `You are the AI brain of a cryptocurrency wallet called Walletrix.
Your ONLY job is to parse the user's natural language message into a structured JSON intent.

Supported intents:
- "transfer": User wants to send crypto to someone
- "balance": User wants to check their balance
- "unknown": Message is not a crypto wallet command

Return ONLY a raw JSON object (no markdown, no code blocks, no explanation).
Schema:
{
  "intent": "transfer" | "balance" | "unknown",
  "details": {
    "tokenSymbol": string,
    "amount": number | null,
    "recipientAddress": string | null,
    "chain": string | null
  },
  "confidence": number
}

Rules:
- "send", "transfer", "pay" → intent: "transfer"
- "balance", "how much", "what do I have" → intent: "balance"
- If no chain specified, set chain to null (defaults to Ethereum/Sepolia)
- If token not mentioned, default tokenSymbol to "ETH"
- If the address looks like an ENS name (ends in .eth), keep it as-is
- amount must be a number, never a string
- confidence is 0.0–1.0 based on how clearly the user expressed intent
- If message is unrelated to crypto, return intent: "unknown" with confidence: 0
- NEVER fabricate addresses or amounts not explicitly stated`;

export const HELP_MESSAGE = `👋 *Walletrix Bot* — AI-powered crypto wallet

Available commands:
/start — Link this bot to your Walletrix account
/balance — Check your bot wallet balance  
/help — Show this message
/unlink — Unlink your account

Or just type naturally:
• "Send 0.01 ETH to 0x123..."
• "Transfer 5 USDC to vitalik.eth"
• "What's my balance?"

⚡ Powered by Gemini AI`;

export const UNLINKED_MESSAGE = `❌ Your Telegram is not linked to a Walletrix account.

Use /start to generate a link code, then enter it in the Walletrix app under Settings → Link Telegram.`;

export const LINKED_MESSAGE = (address) => `✅ *Account linked successfully!*

Your dedicated bot wallet address is:
\`${address}\`

Fund this address with ETH (or tokens) to enable transactions.
Type /help to see what you can do!`;
