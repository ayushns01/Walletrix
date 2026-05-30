const AFFIRM_RE = /^(?:yes|y|yeah|yep|yup|sure|ok|okay|confirm|confirmed|go|do it|send it|proceed|approve)\s*[.!]?$/i;
const NEGATIVE_RE = /^(?:no|n|nope|cancel|stop|abort|wait|nevermind|never mind)\s*[.!]?$/i;

export function isAffirmative(text) {
  return AFFIRM_RE.test(String(text || '').trim());
}

export function isNegative(text) {
  return NEGATIVE_RE.test(String(text || '').trim());
}

export function createConfirmationFlow(deps) {
  const { takePending, executeTransfer, clearPending } = deps;

  async function handle(text, ctx) {
    if (isNegative(text)) {
      if (clearPending) await clearPending(ctx);
      return { handled: true, text: 'Okay, cancelled. Nothing was sent.' };
    }

    if (!isAffirmative(text)) {
      return { handled: false };
    }

    const pending = await takePending(ctx);
    if (!pending) {
      return { handled: true, text: 'There is nothing to confirm — the transfer may have expired. Start again when ready.' };
    }

    try {
      const result = await executeTransfer(
        {
          details: {
            tokenSymbol: pending.token,
            amount: pending.amount,
            recipientAddress: pending.recipientAddress,
            chain: pending.chain || null,
          },
        },
        ctx.user
      );
      return {
        handled: true,
        text: `✅ Sent ${result.amount} ${result.token} to \`${result.to}\`\n\nTx: \`${result.txHash}\``,
      };
    } catch (error) {
      return { handled: true, text: `❌ Transfer failed: ${error.message}` };
    }
  }

  return { handle };
}
