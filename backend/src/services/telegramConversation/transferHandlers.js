function buildTransferConfirmMessage(details) {
  const recipientSummary = details.recipientLabel
    ? `*${details.recipientLabel}*\n\`${details.recipientAddress}\``
    : `\`${details.recipientAddress}\``;

  return `📤 *Confirm Transaction*\n\nI'll send *${details.amount} ${details.tokenSymbol.toUpperCase()}* to:\n${recipientSummary}\n\nReply *yes* to confirm or *no* to cancel.\n\n⚠️ This will be sent from your bot wallet.`;
}

export function buildTransferExecutionFailureReason(message = '') {
  const msg = String(message || '');

  if (msg.includes('insufficient funds')) {
    return '❌ Insufficient funds.\n\nYour bot wallet does not have enough ETH to cover the amount + gas fees.\n\nCheck your balance with /balance and top up the wallet first.';
  }
  if (msg.includes('Bot wallet not found')) {
    return '❌ Bot wallet not found. Try /unlink and re-link your account.';
  }
  if (msg.includes('nonce')) {
    return '❌ Nonce conflict — please wait a moment and try again.';
  }
  if (msg.includes('gas')) {
    return '❌ Gas estimation failed — the transaction parameters may be invalid.';
  }
  if (msg.includes('network') || msg.includes('could not detect') || msg.includes('RPC')) {
    return '❌ Network error — could not reach the blockchain RPC. Please try again.';
  }
  if (msg.includes('invalid address') || msg.includes('bad address')) {
    return '❌ Invalid recipient address. Please double-check and try again.';
  }
  if (msg.includes('not supported') || msg.includes('not available')) {
    return `❌ ${msg.split('(')[0].trim()}`;
  }

  return `❌ Transaction failed: ${msg.split('(')[0].trim()}`;
}

export function createTransferConversationHandlers(deps) {
  const {
    executeTransfer,
    logger,
    sendBotPlain,
    sendBotMessage,
    setPendingIntent,
    setTransferDraft,
    setScene,
    updateContext,
    getContext,
    resolvePreviousRecipientAddress,
    detectPreviousAmountReference,
    detectPreviousTokenReference,
    detectPreviousRecipientReference,
    resolveSavedRecipientFromText,
    extractSavedRecipientAliasCandidate,
    extractTransferFields,
    getMissingTransferFields,
    buildMissingFieldPrompt,
    getPrimaryQuickReplyMarkup,
    getAmountCollectionQuickReplyMarkup,
    getRecipientCollectionQuickReplyMarkup,
    getTokenCollectionQuickReplyMarkup,
    getConfirmQuickReplyMarkup,
    getRecipientQuickReplyNames,
    touchSavedRecipientById,
    recordTelegramTransferEvent,
  } = deps;

  async function handlePendingConfirmation({ chatId, telegramId, text, pending, user }) {
    if (!pending) return null;

    const answer = String(text || '').trim().toLowerCase();
    if (answer === 'yes' || answer === 'y' || answer === 'confirm') {
      setPendingIntent(telegramId, null);
      setScene(telegramId, 'transfer', 'executing');
      await sendBotPlain(chatId, telegramId, '⏳ Executing transaction...');

      try {
        const result = await executeTransfer(pending.intent, user);
        updateContext(telegramId, {
          lastRecipientAddress: result.to,
          lastRecipientLabel: pending.intent.details?.recipientLabel || null,
          lastAmount: parseFloat(result.amount),
          lastTokenSymbol: result.token,
        });
        await recordTelegramTransferEvent(user.id, {
          status: 'confirmed',
          txHash: result.txHash,
          fromAddress: result.from,
          toAddress: result.to,
          amount: result.amount,
          tokenSymbol: result.token,
          recipientLabel: pending.intent.details?.recipientLabel || null,
          chainId: result.chainId || null,
        });
        setScene(telegramId, 'idle', 'ready', { lastIntent: 'transfer' });
        return sendBotMessage(chatId, telegramId,
          `✅ *Transaction Sent!*\n\nAmount: ${result.amount} ${result.token}\nTo: \`${result.to}\`\nHash: \`${result.txHash}\``,
          getPrimaryQuickReplyMarkup()
        );
      } catch (error) {
        logger.error('[TelegramBot] executeTransfer failed', { telegramId, error: error.message });
        await recordTelegramTransferEvent(user.id, {
          status: 'failed',
          toAddress: pending.intent.details?.recipientAddress || null,
          amount: pending.intent.details?.amount ?? null,
          tokenSymbol: pending.intent.details?.tokenSymbol || null,
          recipientLabel: pending.intent.details?.recipientLabel || null,
          chainId: pending.intent.details?.chain || null,
          errorMessage: error.message || 'Transfer failed',
        });
        const reason = buildTransferExecutionFailureReason(error.message || '');
        setScene(telegramId, 'transfer', 'failed');
        return sendBotPlain(chatId, telegramId, reason, getPrimaryQuickReplyMarkup());
      }
    }

    if (answer === 'no' || answer === 'n' || answer === 'cancel') {
      setPendingIntent(telegramId, null);
      setScene(telegramId, 'idle', 'ready');
      return sendBotPlain(chatId, telegramId, '❌ Transaction cancelled.', getPrimaryQuickReplyMarkup());
    }

    return sendBotPlain(chatId, telegramId,
      '⏳ You have a pending transaction confirmation.\n\nReply with:\n• yes (to send)\n• no (to cancel)',
      getConfirmQuickReplyMarkup()
    );
  }

  async function handleTransferDraftCollection({ chatId, telegramId, text, draft, user }) {
    if (!draft) return null;

    const lowered = String(text || '').trim().toLowerCase();
    if (lowered === 'cancel' || lowered === 'stop' || lowered === 'nevermind') {
      setTransferDraft(telegramId, null);
      setScene(telegramId, 'idle', 'ready');
      return sendBotPlain(chatId, telegramId, '✅ Transfer draft cancelled.', getPrimaryQuickReplyMarkup());
    }

    const extracted = extractTransferFields(text);
    const currentStep = String(getContext(telegramId)?.currentStep || '');
    const savedRecipient = !extracted.recipientAddress
      ? await resolveSavedRecipientFromText(user.id, text, {
          allowBareName: currentStep === 'collecting_recipientAddress',
        })
      : null;
    const aliasCandidate = !savedRecipient
      ? extractSavedRecipientAliasCandidate(text, {
          allowBareName: currentStep === 'collecting_recipientAddress',
        })
      : null;

    if (extracted.amount && extracted.amount > 0) draft.intent.details.amount = extracted.amount;
    if (extracted.tokenSymbol) draft.intent.details.tokenSymbol = extracted.tokenSymbol;
    if (extracted.recipientAddress) {
      draft.intent.details.recipientAddress = extracted.recipientAddress;
      draft.intent.details.recipientLabel = null;
    } else if (savedRecipient) {
      draft.intent.details.recipientAddress = savedRecipient.address;
      draft.intent.details.recipientLabel = savedRecipient.name;
      await touchSavedRecipientById(user.id, savedRecipient.id);
    }

    const context = getContext(telegramId);
    if (!draft.intent.details.amount && detectPreviousAmountReference(text) && context?.lastAmount) {
      draft.intent.details.amount = context.lastAmount;
    }
    if (!draft.intent.details.tokenSymbol && detectPreviousTokenReference(text) && context?.lastTokenSymbol) {
      draft.intent.details.tokenSymbol = context.lastTokenSymbol;
    }

    if (!draft.intent.details.recipientAddress && detectPreviousRecipientReference(text)) {
      const lastRecipient = await resolvePreviousRecipientAddress(user.id, telegramId);
      if (lastRecipient) {
        draft.intent.details.recipientAddress = lastRecipient;
        draft.intent.details.recipientLabel = context?.lastRecipientLabel || null;
      } else {
        setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
        setScene(telegramId, 'transfer', 'collecting_recipientAddress');
        const suggestedNames = await getRecipientQuickReplyNames(user.id);
        return sendBotPlain(chatId, telegramId, 'I could not find a previous recipient address. Please send a 0x... address.', getRecipientCollectionQuickReplyMarkup({
          hasPreviousRecipient: false,
          savedRecipientNames: suggestedNames,
        }));
      }
    }

    if (!draft.intent.details.recipientAddress && currentStep === 'collecting_recipientAddress' && aliasCandidate) {
      setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
      setScene(telegramId, 'transfer', 'collecting_recipientAddress');
      const suggestedNames = await getRecipientQuickReplyNames(user.id);
      return sendBotPlain(chatId, telegramId, `I could not find "${aliasCandidate}" in your address list. Send a wallet address, or save it first with "save 0x... as ${aliasCandidate}".`, getRecipientCollectionQuickReplyMarkup({
        hasPreviousRecipient: false,
        savedRecipientNames: suggestedNames,
      }));
    }

    if (!draft.intent.details.tokenSymbol) {
      draft.intent.details.tokenSymbol = 'ETH';
    }

    const missing = getMissingTransferFields(draft.intent.details);
    if (missing.length > 0) {
      setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
      setScene(telegramId, 'transfer', `collecting_${missing[0]}`);
      const step = missing[0];
      const suggestedNames = step === 'recipientAddress' ? await getRecipientQuickReplyNames(user.id) : [];
      const quickReplyMarkup = step === 'recipientAddress'
        ? getRecipientCollectionQuickReplyMarkup({
            hasPreviousRecipient: Boolean(context?.lastRecipientAddress),
            savedRecipientNames: suggestedNames,
          })
        : step === 'tokenSymbol'
          ? getTokenCollectionQuickReplyMarkup()
          : getAmountCollectionQuickReplyMarkup();
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing), quickReplyMarkup);
    }

    setTransferDraft(telegramId, null);
    setPendingIntent(telegramId, {
      intent: draft.intent,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
    setScene(telegramId, 'transfer', 'confirm');

    const { amount, tokenSymbol, recipientAddress, recipientLabel } = draft.intent.details;
    return sendBotMessage(chatId, telegramId, buildTransferConfirmMessage({
      amount,
      tokenSymbol,
      recipientAddress,
      recipientLabel,
    }), getConfirmQuickReplyMarkup());
  }

  async function handleTransferCollectionGuardrails({ chatId, telegramId, text }) {
    const context = getContext(telegramId) || {};
    if (!(context.scene === 'transfer' && typeof context.currentStep === 'string' && context.currentStep.startsWith('collecting_'))) {
      return null;
    }

    const step = context.currentStep.replace('collecting_', '');
    const extracted = extractTransferFields(text);

    if (step === 'amount' && !(extracted.amount && extracted.amount > 0) && !detectPreviousAmountReference(text)) {
      setTransferDraft(telegramId, {
        intent: {
          intent: 'transfer',
          details: { tokenSymbol: context?.lastTokenSymbol || 'ETH', amount: null, recipientAddress: null, chain: null },
          confidence: 0.7,
        },
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['amount']), getAmountCollectionQuickReplyMarkup());
    }

    if (step === 'recipientAddress' && !extracted.recipientAddress && !detectPreviousRecipientReference(text)) {
      setTransferDraft(telegramId, {
        intent: {
          intent: 'transfer',
          details: { tokenSymbol: context?.lastTokenSymbol || 'ETH', amount: context?.lastAmount || null, recipientAddress: null, chain: null },
          confidence: 0.7,
        },
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      const userId = context?.userId || null;
      const suggestedNames = userId ? await getRecipientQuickReplyNames(userId) : [];
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['recipientAddress']), getRecipientCollectionQuickReplyMarkup({
        hasPreviousRecipient: Boolean(context?.lastRecipientAddress),
        savedRecipientNames: suggestedNames,
      }));
    }

    if (step === 'tokenSymbol' && !extracted.tokenSymbol && !detectPreviousTokenReference(text)) {
      setTransferDraft(telegramId, {
        intent: {
          intent: 'transfer',
          details: { tokenSymbol: null, amount: context?.lastAmount || null, recipientAddress: context?.lastRecipientAddress || null, chain: null },
          confidence: 0.7,
        },
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['tokenSymbol']), getTokenCollectionQuickReplyMarkup());
    }

    return null;
  }

  async function handlePreparedTransferAction({ chatId, telegramId, action, intentConfidence }) {
    if (!action || action.type !== 'prepare_transfer') return null;

    const details = {
      tokenSymbol: action.details.tokenSymbol || 'ETH',
      amount: action.details.amount || null,
      recipientAddress: action.details.recipientAddress || null,
      recipientLabel: action.details.recipientLabel || null,
      chain: action.details.chain || null,
    };
    const missing = Array.isArray(action.missing) ? action.missing : getMissingTransferFields(details);

    if (missing.length > 0) {
      setTransferDraft(telegramId, {
        intent: {
          intent: 'transfer',
          details,
          confidence: intentConfidence || 0.7,
        },
        expiresAt: Date.now() + 2 * 60 * 1000,
      });
      setScene(telegramId, 'transfer', `collecting_${missing[0]}`);
      const step = missing[0];
      const userId = getContext(telegramId)?.userId || null;
      const suggestedNames = step === 'recipientAddress' && userId
        ? await getRecipientQuickReplyNames(userId)
        : [];
      const quickReplyMarkup = step === 'recipientAddress'
        ? getRecipientCollectionQuickReplyMarkup({
            hasPreviousRecipient: Boolean(getContext(telegramId)?.lastRecipientAddress),
            savedRecipientNames: suggestedNames,
          })
        : step === 'tokenSymbol'
          ? getTokenCollectionQuickReplyMarkup()
          : getAmountCollectionQuickReplyMarkup();
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing), quickReplyMarkup);
    }

    setPendingIntent(telegramId, {
      intent: {
        intent: 'transfer',
        details,
        confidence: intentConfidence || 0.7,
      },
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
    setScene(telegramId, 'transfer', 'confirm');
    return sendBotMessage(chatId, telegramId, buildTransferConfirmMessage(details), getConfirmQuickReplyMarkup());
  }

  return {
    handlePendingConfirmation,
    handleTransferDraftCollection,
    handleTransferCollectionGuardrails,
    handlePreparedTransferAction,
  };
}
