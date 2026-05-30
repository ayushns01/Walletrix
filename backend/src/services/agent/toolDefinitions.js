import { SchemaType } from '@google/generative-ai';

export const AGENT_TOOL_DECLARATIONS = [
  {
    name: 'get_balance',
    description:
      "Get the current native (ETH) balance of the user's Telegram bot wallet. Use when the user asks how much they have, their balance, or their funds.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'list_recipients',
    description:
      "List the user's saved recipients (address book) with their names and addresses. Use before a transfer when the user names a person instead of pasting an address, or when they ask who is saved.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'prepare_transfer',
    description:
      'Validate and stage a transfer for the user to confirm. Does NOT send funds — it resolves the recipient, checks the amount, and returns a human-readable summary the user must approve by replying YES. Call this whenever the user wants to send/transfer/pay crypto.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        amount: {
          type: SchemaType.NUMBER,
          description: 'Amount to send, must be greater than 0.',
        },
        token: {
          type: SchemaType.STRING,
          description: 'Token symbol, e.g. ETH or USDC. Defaults to ETH if the user did not specify.',
        },
        recipient: {
          type: SchemaType.STRING,
          description: 'Recipient: a 0x address, an ENS name (*.eth), or the name of a saved recipient.',
        },
        chain: {
          type: SchemaType.STRING,
          description: 'Optional chain name (e.g. sepolia). Omit to use the default chain.',
        },
      },
      required: ['amount', 'recipient'],
    },
  },
  {
    name: 'get_tx_status',
    description:
      'Look up the status of a recent transfer. Optionally accepts a specific transaction hash; otherwise reports the most recent one. Use when the user asks about a pending/last transaction.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        tx_hash: {
          type: SchemaType.STRING,
          description: 'Optional 0x transaction hash to look up. Omit for the latest transfer.',
        },
      },
    },
  },
];

export const AGENT_TOOL_NAMES = AGENT_TOOL_DECLARATIONS.map((d) => d.name);
