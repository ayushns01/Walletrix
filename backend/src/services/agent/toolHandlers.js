export function createToolHandlers(deps) {
  const {
    getBotWalletBalance,
    listSavedRecipients,
    lookupTelegramTransferStatus,
    buildTransferStatusMessage,
    preparePendingTransfer,
    defaultChainId,
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
  };
}
