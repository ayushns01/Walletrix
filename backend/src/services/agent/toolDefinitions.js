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
  {
    name: 'get_recent_transfers',
    description:
      "List the user's recent Telegram transfer history. Use when the user asks about recent transfers, history, or what they sent. Returns up to 5 entries by default.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        limit: {
          type: SchemaType.NUMBER,
          description: 'How many entries to return (default 5, max 10).',
        },
      },
    },
  },
  {
    name: 'get_last_transfer',
    description:
      "Get the details of the user's most recent Telegram transfer. Use when the user asks about their last transfer, most recent send, or latest transaction.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'save_recipient',
    description:
      "Save or update a recipient in the user's address book under a friendly name. Use when the user says 'save X as Alice', 'add Alice with address 0x…', etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'Friendly name for the recipient (e.g. "Alice", "Mom").',
        },
        address: {
          type: SchemaType.STRING,
          description: 'Ethereum address (0x…) to save under that name.',
        },
      },
      required: ['name', 'address'],
    },
  },
  {
    name: 'delete_recipient',
    description:
      "Remove a saved recipient from the user's address book by name. Use when the user says 'delete Alice', 'remove Bob', etc.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        name: {
          type: SchemaType.STRING,
          description: 'The name of the saved recipient to remove.',
        },
      },
      required: ['name'],
    },
  },
];

export const AGENT_TOOL_NAMES = AGENT_TOOL_DECLARATIONS.map((d) => d.name);
