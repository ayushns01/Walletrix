const AFFIRM_RE = /^(?:yes|y|yeah|yep|yup|sure|ok|okay|confirm|confirmed|go|do it|send it|proceed|approve)\s*[.!]?$/i;
const NEGATIVE_RE = /^(?:no|n|nope|cancel|stop|abort|wait|nevermind|never mind)\s*[.!]?$/i;

export function isAffirmative(text) {
  return AFFIRM_RE.test(String(text || '').trim());
}

export function isNegative(text) {
  return NEGATIVE_RE.test(String(text || '').trim());
}

export function createConfirmationFlow(deps) {
  const { takePendingAny, clearPendingAny, executeTransfer, executeStealthClaim } = deps;

  async function handle(text, ctx) {
    if (isNegative(text)) {
      if (clearPendingAny) await clearPendingAny(ctx);
      return { handled: true, text: 'Okay, cancelled. Nothing was sent.' };
    }

    if (!isAffirmative(text)) {
      return { handled: false };
    }

    const pending = await takePendingAny(ctx);
    if (!pending) {
      return { handled: true, text: 'There is nothing to confirm — the transfer may have expired. Start again when ready.' };
    }

    if (pending.kind === 'agentTransfer') {
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
        return { handled: true, text: `❌ Failed: ${error.message}` };
      }
    }

    if (pending.kind === 'agentStealthClaim') {
      try {
        const result = await executeStealthClaim(ctx.user.id, pending.issueId);
        return {
          handled: true,
          text: `✅ Claimed ~${pending.claimableEth} ETH from stealth address\n\nTx: \`${result.txHash}\``,
        };
      } catch (error) {
        return { handled: true, text: `❌ Failed: ${error.message}` };
      }
    }

    return { handled: true, text: 'Unknown pending action — nothing was executed.' };
  }

  return { handle };
}
