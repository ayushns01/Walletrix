export function createToolHandlers(deps) {
  const {
    getBotWalletBalance,
    listSavedRecipients,
    lookupTelegramTransferStatus,
    buildTransferStatusMessage,
    preparePendingTransfer,
    defaultChainId,
    // history
    getRecentTelegramTransfers,
    getLastTelegramTransfer,
    buildRecentTransfersMessage,
    buildLastTransferMessage,
    // address book mutations
    saveSavedRecipient,
    removeSavedRecipientByName,
  } = deps;

  return {
    async get_balance(_args, ctx) {
      return getBotWalletBalance(ctx.user.id, defaultChainId);
    },

    async list_recipients(_args, ctx) {
      const recipients = await listSavedRecipients(ctx.user.id);
      return {
        recipients: recipients.map((r) => ({ name: r.name, address: r.address })),
      };
    },

    async get_tx_status(args, ctx) {
      const txHash = args?.tx_hash || null;
      const result = await lookupTelegramTransferStatus(ctx.user.id, { txHash });
      return { message: buildTransferStatusMessage(result) };
    },

    async prepare_transfer(args, ctx) {
      return preparePendingTransfer(args, ctx);
    },

    async get_recent_transfers(args, ctx) {
      const limit = Math.min(Number(args?.limit) || 5, 10);
      const transfers = await getRecentTelegramTransfers(ctx.user.id, { limit });
      return { message: buildRecentTransfersMessage(transfers), transfers };
    },

    async get_last_transfer(_args, ctx) {
      const entry = await getLastTelegramTransfer(ctx.user.id);
      return { message: buildLastTransferMessage(entry), transfer: entry };
    },

    async save_recipient(args, ctx) {
      const { name, address } = args;
      const result = await saveSavedRecipient(ctx.user.id, { name, address });
      const action = result.created ? '✅ Saved' : '✏️ Updated';
      return {
        message: `${action} *${result.recipient.name}* → \`${result.recipient.address}\``,
        recipient: result.recipient,
        created: result.created,
      };
    },

    async delete_recipient(args, ctx) {
      const { name } = args;
      const deleted = await removeSavedRecipientByName(ctx.user.id, name);
      if (!deleted) {
        return {
          message: `No saved recipient named "${name}" found.`,
          deleted: false,
        };
      }
      return {
        message: `🗑️ Deleted *${deleted.name}* from your address book.`,
        deleted: true,
        name: deleted.name,
      };
    },
  };
}
