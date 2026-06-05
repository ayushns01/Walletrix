export const STEALTH_CLAIM_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Same session column as pendingTransferStore, distinguished by `kind`.
const SESSION_FIELD = 'pendingIntent';
const KIND = 'agentStealthClaim';

export function createStealthClaimStore(deps) {
  const {
    loadConversationSession,
    saveConversationSession,
    getStealthClaimPreviewForUser,
    now = () => Date.now(),
  } = deps;

  async function prepare(args, ctx) {
    const issueId = String(args?.issue_id || '').trim();
    if (!issueId) {
      return { status: 'error', error: 'Missing issue_id — cannot look up stealth claim.' };
    }

    const { preview } = await getStealthClaimPreviewForUser(ctx.user.id, issueId);

    if (!preview.canClaim) {
      if (BigInt(preview.balanceWei || '0') === 0n) {
        return { status: 'error', error: 'No funds detected on this stealth address yet.' };
      }
      return { status: 'error', error: 'The stealth address has funds, but not enough ETH to cover sweep gas.' };
    }

    const pending = {
      kind: KIND,
      issueId,
      claimableEth: preview.claimableEth,
      estimatedFeeEth: preview.estimatedFeeEth,
      destinationAddress: preview.destinationAddress,
      walletLabel: preview.walletLabel,
      expiresAt: now() + STEALTH_CLAIM_TTL_MS,
    };

    const session = (await loadConversationSession(ctx.telegramId)) || {};
    await saveConversationSession(ctx.telegramId, { ...session, [SESSION_FIELD]: pending });

    return {
      status: 'awaiting_confirmation',
      summary: `Claim ~${preview.claimableEth} ETH from stealth address → ${preview.walletLabel}. Gas ~${preview.estimatedFeeEth} ETH. Reply YES to confirm or NO to cancel.`,
      pending,
    };
  }

  async function peekPending(ctx) {
    const session = (await loadConversationSession(ctx.telegramId)) || {};
    const value = session[SESSION_FIELD];
    return value && value.kind === KIND ? value : null;
  }

  async function clearPending(ctx) {
    const session = (await loadConversationSession(ctx.telegramId)) || {};
    const value = session[SESSION_FIELD];
    if (!value || value.kind !== KIND) return;
    await saveConversationSession(ctx.telegramId, { ...session, [SESSION_FIELD]: null });
  }

  async function takePending(ctx) {
    const pending = await peekPending(ctx);
    await clearPending(ctx);
    if (!pending) return null;
    if (typeof pending.expiresAt === 'number' && now() > pending.expiresAt) return null;
    return pending;
  }

  return { prepare, peekPending, takePending, clearPending };
}
