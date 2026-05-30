export const PENDING_TRANSFER_TTL_MS = 2 * 60 * 1000; // 2 minutes

const KEY = 'agentPendingTransfer';

export function createPendingTransferStore(deps) {
  const {
    loadConversationSession,
    saveConversationSession,
    resolveSavedRecipientFromText,
    isAddress,
    now = () => Date.now(),
  } = deps;

  async function resolveRecipient(userId, recipient) {
    const raw = String(recipient || '').trim();
    if (!raw) return null;
    if (isAddress(raw) || /\.eth$/i.test(raw)) return raw;
    const saved = await resolveSavedRecipientFromText(userId, raw);
    return saved?.address || null;
  }

  async function prepare(args, ctx) {
    const amount = Number(args?.amount);
    const token = String(args?.token || 'ETH').trim().toUpperCase();
    const chain = args?.chain ? String(args.chain).trim().toLowerCase() : null;

    if (!Number.isFinite(amount) || amount <= 0) {
      return { status: 'error', error: 'Invalid amount — it must be greater than 0.' };
    }

    const recipientAddress = await resolveRecipient(ctx.user.id, args?.recipient);
    if (!recipientAddress) {
      return { status: 'error', error: `Could not resolve recipient "${args?.recipient}". Use a 0x address, an ENS name, or a saved recipient.` };
    }

    const pending = {
      amount,
      token,
      recipientAddress,
      recipientLabel: isAddress(args?.recipient) ? null : String(args?.recipient || '').trim() || null,
      chain,
      expiresAt: now() + PENDING_TRANSFER_TTL_MS,
    };

    const session = (await loadConversationSession(ctx.telegramId)) || {};
    await saveConversationSession(ctx.telegramId, { ...session, [KEY]: pending });

    const who = pending.recipientLabel ? `${pending.recipientLabel} (${recipientAddress})` : recipientAddress;
    return {
      status: 'awaiting_confirmation',
      summary: `Send ${amount} ${token} to ${who}${chain ? ` on ${chain}` : ''}. Reply YES to confirm or NO to cancel.`,
      pending,
    };
  }

  async function peekPending(ctx) {
    const session = (await loadConversationSession(ctx.telegramId)) || {};
    return session[KEY] || null;
  }

  async function clearPending(ctx) {
    const session = (await loadConversationSession(ctx.telegramId)) || {};
    if (session[KEY] == null) return;
    await saveConversationSession(ctx.telegramId, { ...session, [KEY]: null });
  }

  // Two separate session reads (peek + clear). Telegram delivers messages
  // serially per user so concurrent writes are not expected in practice.
  async function takePending(ctx) {
    const pending = await peekPending(ctx);
    await clearPending(ctx);
    if (!pending) return null;
    if (typeof pending.expiresAt === 'number' && now() > pending.expiresAt) return null;
    return pending;
  }

  return { prepare, peekPending, takePending, clearPending };
}
