import {
  buildTransferConfirmedMessage,
  buildTransferSubmittedMessage,
} from '../telegramNotificationService.js';

function buildTransferConfirmMessage(details) {
  const recipientSummary = details.recipientLabel
    ? `*${details.recipientLabel}*\n\`${details.recipientAddress}\``
    : `\`${details.recipientAddress}\``;

  return `📤 *Confirm Transaction*\n\nI'll send *${details.amount} ${details.tokenSymbol.toUpperCase()}* to:\n${recipientSummary}\n\nReply *yes* to confirm or *no* to cancel.\nYou can also say things like "change amount to 0.2" or "use USDC instead".\n\n⚠️ This will be sent from your bot wallet.`;
}

const BARE_AMOUNT_RE = /^\d+(?:\.\d+)?$/;
const BARE_TOKEN_RE = /^(ETH|USDC|USDT|DAI|WETH|BTC|MATIC|BNB|AVAX)$/i;

function formatEditedFieldList(fields) {
  if (fields.length === 1) return fields[0];
  if (fields.length === 2) return `${fields[0]} and ${fields[1]}`;
  return `${fields.slice(0, -1).join(', ')}, and ${fields[fields.length - 1]}`;
}

function buildTransferUpdatedMessage(changedFields, details) {
  const prefix = changedFields.length > 0
    ? `✏️ Updated ${formatEditedFieldList(changedFields)}.\n\n`
    : '';

  return `${prefix}${buildTransferConfirmMessage(details)}`;
}

async function applyPendingTransferEdits({
  chatId,
  telegramId,
  text,
  pending,
  user,
  deps,
}) {
  const {
    sendBotPlain,
    sendBotMessage,
    setPendingIntent,
    setTransferDraft,
    setScene,
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
    touchSavedRecipientById,
  } = deps;

  const trimmed = String(text || '').trim();
  if (!trimmed) return null;

  const extracted = extractTransferFields(text);
  const rawBareAliasCandidate = extractSavedRecipientAliasCandidate(text, { allowBareName: true });
  const bareAmount = BARE_AMOUNT_RE.test(trimmed);
  const bareToken = BARE_TOKEN_RE.test(trimmed);
  const bareAliasCandidate = (!extracted.amount && !extracted.tokenSymbol)
    ? rawBareAliasCandidate
    : null;
  const amountEditRequested = bareAmount
    || /\b(?:amount|make|set|update|adjust)\b/i.test(trimmed)
    || detectPreviousAmountReference(text);
  const tokenEditRequested = bareToken
    || /\b(?:token|coin|switch|use)\b/i.test(trimmed)
    || detectPreviousTokenReference(text);
  const recipientEditRequested = detectPreviousRecipientReference(text)
    || Boolean(extracted.recipientAddress)
    || Boolean(bareAliasCandidate)
    || /\b(?:recipient|address)\b/i.test(trimmed);
  const hasEditSignal = /\b(?:actually|instead|change|make|set|update|use|switch|adjust)\b/i.test(trimmed)
    || bareAmount
    || bareToken
    || amountEditRequested
    || tokenEditRequested
    || recipientEditRequested;

  if (!hasEditSignal) return null;

  const context = getContext(telegramId) || {};
  const details = {
    ...pending.intent?.details,
  };
  const changedFields = [];
  const changedFieldSet = new Set();
  const missingRequested = [];
  const missingRequestedSet = new Set();

  const markChanged = (field) => {
    if (!changedFieldSet.has(field)) {
      changedFieldSet.add(field);
      changedFields.push(field);
    }
  };
  const markMissing = (field) => {
    if (!missingRequestedSet.has(field)) {
      missingRequestedSet.add(field);
      missingRequested.push(field);
    }
  };

  if (detectPreviousAmountReference(text) && context?.lastAmount) {
    details.amount = context.lastAmount;
    markChanged('amount');
  } else if (extracted.amount && extracted.amount > 0) {
    if (amountEditRequested || /\b(?:actually|instead|change|make|set|update|adjust)\b/i.test(trimmed)) {
      details.amount = extracted.amount;
      markChanged('amount');
    }
  } else if (amountEditRequested && !detectPreviousAmountReference(text)) {
    details.amount = null;
    markMissing('amount');
  }

  if (detectPreviousTokenReference(text) && context?.lastTokenSymbol) {
    details.tokenSymbol = context.lastTokenSymbol;
    markChanged('token');
  } else if (extracted.tokenSymbol) {
    if (tokenEditRequested || /\b(?:actually|instead|change|make|set|update|adjust)\b/i.test(trimmed)) {
      details.tokenSymbol = extracted.tokenSymbol;
      markChanged('token');
    }
  } else if (tokenEditRequested && !detectPreviousTokenReference(text) && /\b(?:token|coin|switch)\b/i.test(trimmed)) {
    details.tokenSymbol = null;
    markMissing('tokenSymbol');
  }

  let resolvedSavedRecipient = null;
  let aliasCandidate = null;
  const shouldTrySavedRecipientResolution = !extracted.recipientAddress && (
    recipientEditRequested
    || (!extracted.amount && !extracted.tokenSymbol)
  );

  if (shouldTrySavedRecipientResolution) {
    resolvedSavedRecipient = await resolveSavedRecipientFromText(user.id, text, { allowBareName: true });
    aliasCandidate = resolvedSavedRecipient
      ? null
      : bareAliasCandidate;
  }

  if (detectPreviousRecipientReference(text)) {
    const previousRecipient = await resolvePreviousRecipientAddress(user.id, telegramId);
    if (previousRecipient) {
      details.recipientAddress = previousRecipient;
      details.recipientLabel = context?.lastRecipientLabel || null;
      markChanged('recipient');
    } else {
      return sendBotPlain(chatId, telegramId, 'I could not find a previous recipient address. Please send a 0x... address or a name from your address list.');
    }
  } else if (extracted.recipientAddress) {
    details.recipientAddress = extracted.recipientAddress;
    details.recipientLabel = null;
    markChanged('recipient');
  } else if (resolvedSavedRecipient) {
    details.recipientAddress = resolvedSavedRecipient.address;
    details.recipientLabel = resolvedSavedRecipient.name;
    await touchSavedRecipientById(user.id, resolvedSavedRecipient.id);
    markChanged('recipient');
  } else if (recipientEditRequested && aliasCandidate) {
    return sendBotPlain(chatId, telegramId, `I could not find "${aliasCandidate}" in your address list. Send a wallet address, or save it first with "save 0x... as ${aliasCandidate}".`);
  } else if (recipientEditRequested) {
    details.recipientAddress = null;
    details.recipientLabel = null;
    markMissing('recipientAddress');
  }

  if (changedFields.length === 0 && missingRequested.length === 0) {
    return null;
  }

  const missing = missingRequested.length > 0
    ? missingRequested
    : getMissingTransferFields(details);

  if (missing.length > 0) {
    setPendingIntent(telegramId, null);
    setTransferDraft(telegramId, {
      intent: {
        ...pending.intent,
        details,
      },
      expiresAt: Date.now() + 2 * 60 * 1000,
    });
    setScene(telegramId, 'transfer', `collecting_${missing[0]}`);
    return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
  }

  setPendingIntent(telegramId, {
    ...pending,
    intent: {
      ...pending.intent,
      details,
    },
    expiresAt: Date.now() + 2 * 60 * 1000,
  });
  setScene(telegramId, 'transfer', 'confirm');
  return sendBotMessage(chatId, telegramId, buildTransferUpdatedMessage(changedFields, details));
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
        const result = await executeTransfer(pending.intent, user, {
          onBroadcast: async (broadcast) => {
            await sendBotPlain(chatId, telegramId, buildTransferSubmittedMessage({
              amount: broadcast.amount,
              token: broadcast.token,
              to: broadcast.to,
              txHash: broadcast.txHash,
            }));
          },
        });
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
        return sendBotPlain(chatId, telegramId, buildTransferConfirmedMessage({
          amount: result.amount,
          token: result.token,
          to: result.to,
          txHash: result.txHash,
        }));
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
        return sendBotPlain(chatId, telegramId, reason);
      }
    }

    if (answer === 'no' || answer === 'n' || answer === 'cancel') {
      setPendingIntent(telegramId, null);
      setScene(telegramId, 'idle', 'ready');
      return sendBotPlain(chatId, telegramId, '❌ Transaction cancelled.');
    }

    const editResponse = await applyPendingTransferEdits({
      chatId,
      telegramId,
      text,
      pending,
      user,
      deps,
    });
    if (editResponse) {
      return editResponse;
    }

    return sendBotPlain(chatId, telegramId,
      '⏳ You have a pending transaction confirmation.\n\nReply with:\n• yes (to send)\n• no (to cancel)'
    );
  }

  async function handleTransferDraftCollection({ chatId, telegramId, text, draft, user }) {
    if (!draft) return null;

    const lowered = String(text || '').trim().toLowerCase();
    if (lowered === 'cancel' || lowered === 'stop' || lowered === 'nevermind') {
      setTransferDraft(telegramId, null);
      setScene(telegramId, 'idle', 'ready');
      return sendBotPlain(chatId, telegramId, '✅ Transfer draft cancelled.');
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
        return sendBotPlain(chatId, telegramId, 'I could not find a previous recipient address. Please send a 0x... address.');
      }
    }

    if (!draft.intent.details.recipientAddress && currentStep === 'collecting_recipientAddress' && aliasCandidate) {
      setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
      setScene(telegramId, 'transfer', 'collecting_recipientAddress');
      return sendBotPlain(chatId, telegramId, `I could not find "${aliasCandidate}" in your address list. Send a wallet address, or save it first with "save 0x... as ${aliasCandidate}".`);
    }

    if (!draft.intent.details.tokenSymbol) {
      draft.intent.details.tokenSymbol = 'ETH';
    }

    const missing = getMissingTransferFields(draft.intent.details);
    if (missing.length > 0) {
      setTransferDraft(telegramId, { ...draft, expiresAt: Date.now() + 2 * 60 * 1000 });
      setScene(telegramId, 'transfer', `collecting_${missing[0]}`);
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
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
    }));
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
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['amount']));
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
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['recipientAddress']));
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
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(['tokenSymbol']));
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
      return sendBotPlain(chatId, telegramId, buildMissingFieldPrompt(missing));
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
    return sendBotMessage(chatId, telegramId, buildTransferConfirmMessage(details));
  }

  return {
    handlePendingConfirmation,
    handleTransferDraftCollection,
    handleTransferCollectionGuardrails,
    handlePreparedTransferAction,
  };
}
