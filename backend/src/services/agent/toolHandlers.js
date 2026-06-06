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
    // stealth tools
    listSelectableStealthWallets,
    issueStealthReceiveAddress,
    listStealthIssuesForAuthenticatedUser,
    getStealthClaimPreviewForUser,
    prepareStealthClaim,
  } = deps;

  return {
    async get_balance(_args, ctx) {
      const result = await getBotWalletBalance(ctx.user.id, defaultChainId);
      const eth = result?.ethBalance ?? '0';
      const addr = result?.address ?? '';
      return {
        ...result,
        message: `💰 Your balance is *${eth} ETH*\n\nAddress: \`${addr}\``,
      };
    },

    async list_recipients(_args, ctx) {
      const recipients = await listSavedRecipients(ctx.user.id);
      const mapped = recipients.map((r) => ({ name: r.name, address: r.address }));
      const body = mapped.length
        ? mapped.map((r) => `• *${r.name}* — \`${r.address}\``).join('\n')
        : 'No saved recipients yet. Add one with "save 0x… as Alice".';
      return {
        recipients: mapped,
        message: mapped.length ? `📋 *Saved Recipients*\n\n${body}` : body,
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

    async issue_stealth_address(args, ctx) {
      const walletTypeArg = String(args?.wallet_type || 'bot').toLowerCase().trim();
      const network = String(args?.network || 'sepolia').toUpperCase().trim() === 'ETHEREUM' ? 'ETHEREUM' : 'SEPOLIA';

      const options = await listSelectableStealthWallets(ctx.user.id);
      let option = walletTypeArg === 'account'
        ? options.find((o) => o.walletType === 'ACCOUNT_WALLET')
        : options.find((o) => o.walletType === 'TELEGRAM_BOT_WALLET');

      if (!option) option = options[0]; // fallback to first available
      if (!option) {
        return { status: 'error', error: 'No wallet found to link the stealth address to.' };
      }

      const issued = await issueStealthReceiveAddress(ctx.user.id, option, network);
      return {
        message: `🕶️ Stealth address ready on *${issued.networkLabel}*\n\nSend to:\n\`${issued.stealthAddress}\`\n\nFunds will sweep to: *${issued.walletLabel}*`,
        issueId: issued.issueId,
        stealthAddress: issued.stealthAddress,
        network: issued.network,
        networkLabel: issued.networkLabel,
        walletLabel: issued.walletLabel,
        destinationAddress: issued.destinationAddress,
      };
    },

    async list_stealth_addresses(args, ctx) {
      const statusArg = String(args?.status || 'all').toLowerCase().trim();
      const STATUS_MAP = { active: ['ACTIVE'], funded: ['FUNDED'], claimed: ['CLAIMED'] };
      const statuses = STATUS_MAP[statusArg] || [];

      const issues = await listStealthIssuesForAuthenticatedUser(ctx.user.id, { statuses });
      if (!issues.length) {
        return { message: 'No stealth addresses found.', issues: [] };
      }

      const lines = issues.map((iss) =>
        `• *${iss.walletLabel}* (${iss.networkLabel}) — ${iss.status} — \`${iss.stealthAddress.slice(0, 10)}…\` — ${iss.lastObservedBalanceEth} ETH`
      );
      return {
        message: `🕶️ *Stealth Addresses*\n\n${lines.join('\n')}`,
        issues: issues.map((iss) => ({
          issueId: iss.id,
          stealthAddress: iss.stealthAddress,
          status: iss.status,
          balanceEth: iss.lastObservedBalanceEth,
          network: iss.network,
          walletLabel: iss.walletLabel,
        })),
      };
    },

    async preview_stealth_claim(args, ctx) {
      const issueId = String(args?.issue_id || '').trim().replace(/[.,;:!?]+$/, '');
      const { preview } = await getStealthClaimPreviewForUser(ctx.user.id, issueId);
      return {
        message: `🕶️ *Stealth Claim Preview*\n\nBalance: ${preview.balanceEth} ETH\nGas: ~${preview.estimatedFeeEth} ETH\nClaimable: ~${preview.claimableEth} ETH\nTo: *${preview.walletLabel}*\n\nUse prepare_stealth_claim to proceed.`,
        canClaim: preview.canClaim,
        balanceEth: preview.balanceEth,
        claimableEth: preview.claimableEth,
        estimatedFeeEth: preview.estimatedFeeEth,
        destinationAddress: preview.destinationAddress,
        walletLabel: preview.walletLabel,
      };
    },

    async prepare_stealth_claim(args, ctx) {
      return prepareStealthClaim(args, ctx);
    },
  };
}
