const SCENE_ALLOWED_STEPS = {
  idle: new Set(['ready']),
  onboarding: new Set(['start']),
  balance: new Set(['requested', 'fetching']),
  help: new Set(['shown']),
  conversation: new Set(['understanding', 'smalltalk', 'fallback']),
  stealth: new Set(['select_wallet', 'select_network', 'claim_select_issue', 'claim_confirm']),
  transfer: new Set([
    'collecting_amount',
    'collecting_recipientAddress',
    'collecting_tokenSymbol',
    'confirm',
    'executing',
    'failed',
  ]),
};

const SCENE_ALLOWED_TRANSITIONS = {
  idle: new Set(['idle', 'onboarding', 'balance', 'help', 'conversation', 'transfer']),
  onboarding: new Set(['onboarding', 'idle', 'conversation']),
  balance: new Set(['balance', 'idle', 'conversation', 'help']),
  help: new Set(['help', 'idle', 'conversation', 'transfer', 'balance']),
  conversation: new Set(['conversation', 'idle', 'transfer', 'balance', 'help', 'onboarding', 'stealth']),
  stealth: new Set(['stealth', 'idle', 'conversation', 'help', 'balance']),
  transfer: new Set(['transfer', 'idle', 'conversation', 'help', 'balance', 'stealth']),
};

function normalizeTransferStep(currentStep) {
  if (currentStep === 'collecting_recipient') return 'collecting_recipientAddress';
  return currentStep;
}

function getDefaultStepForScene(scene) {
  const defaults = {
    idle: 'ready',
    onboarding: 'start',
    balance: 'requested',
    help: 'shown',
    conversation: 'understanding',
    stealth: 'select_wallet',
    transfer: 'collecting_amount',
  };
  return defaults[scene] || 'ready';
}

function isKnownScene(scene) {
  return Boolean(scene && SCENE_ALLOWED_STEPS[scene]);
}

function isAllowedSceneStep(scene, currentStep) {
  if (!isKnownScene(scene)) return false;
  const normalizedStep = scene === 'transfer' ? normalizeTransferStep(currentStep) : currentStep;
  return SCENE_ALLOWED_STEPS[scene].has(normalizedStep);
}

function canTransitionScene(fromScene, toScene) {
  if (!isKnownScene(toScene)) return false;
  if (!isKnownScene(fromScene)) return true;
  return SCENE_ALLOWED_TRANSITIONS[fromScene]?.has(toScene) || false;
}

function buildStepSeededTransferDraft(context, currentStep) {
  const step = String(currentStep || '').replace('collecting_', '');
  const draftDetails = context?.draftDetails || {};
  const details = {
    tokenSymbol: draftDetails.tokenSymbol || context?.lastTokenSymbol || 'ETH',
    amount: draftDetails.amount ?? context?.lastAmount ?? null,
    recipientAddress: draftDetails.recipientAddress || context?.lastRecipientAddress || null,
    chain: draftDetails.chain || null,
  };

  if (step === 'amount') details.amount = null;
  if (step === 'recipientAddress') details.recipientAddress = null;
  if (step === 'tokenSymbol') details.tokenSymbol = null;

  return {
    intent: {
      intent: 'transfer',
      details,
      confidence: 0.7,
    },
    expiresAt: Date.now() + 2 * 60 * 1000,
  };
}

function isRecoverableTransferStep(currentStep) {
  const normalizedStep = normalizeTransferStep(currentStep);
  return typeof normalizedStep === 'string' && normalizedStep.startsWith('collecting_');
}

function isConfirmationReply(text) {
  return /^(yes|y|confirm|no|n|cancel)$/i.test(String(text || '').trim());
}

export function createSceneStateHandlers(deps) {
  const {
    logger,
    getContext,
    updateContext,
    setContextRaw,
    hasTransferDraft,
    hasPendingIntent,
    getTransferDraft,
    getPendingIntent,
    setTransferDraft,
    setPendingIntent,
    sendBotPlain,
    sendBotMessage,
    getMissingTransferFields,
    buildMissingFieldPrompt,
  } = deps;

  function sanitizeSceneState(telegramId, { persist = true } = {}) {
    const key = String(telegramId);
    const context = getContext(key);
    if (!context) return;

    const hasDraft = hasTransferDraft(key);
    const hasPending = hasPendingIntent(key);
    const next = { ...context };
    let changed = false;

    if (!isKnownScene(next.scene)) {
      next.scene = 'conversation';
      next.currentStep = 'understanding';
      next.recoveryReason = 'unknown_scene';
      changed = true;
    }

    if (next.scene === 'transfer' && !hasDraft && !hasPending && !isRecoverableTransferStep(next.currentStep)) {
      next.scene = 'idle';
      next.currentStep = 'ready';
      next.recoveryReason = 'orphan_transfer_scene';
      changed = true;
    }

    if (!isAllowedSceneStep(next.scene, next.currentStep)) {
      next.currentStep = getDefaultStepForScene(next.scene);
      next.recoveryReason = next.recoveryReason || 'invalid_scene_step';
      changed = true;
    }

    if (next.scene === 'transfer') {
      const normalizedStep = normalizeTransferStep(next.currentStep);
      if (normalizedStep !== next.currentStep) {
        next.currentStep = normalizedStep;
        changed = true;
      }
    }

    if (changed) {
      next.lastInteractionAt = Date.now();
      next.expiresAt = Date.now() + 24 * 60 * 60 * 1000;
      setContextRaw(key, next, { persist });
    }
  }

  function setScene(telegramId, scene, currentStep = 'idle', extra = {}) {
    const key = String(telegramId);
    const context = getContext(key) || {};
    const fromScene = context.scene;

    let nextScene = scene;
    let nextStep = scene === 'transfer' ? normalizeTransferStep(currentStep) : currentStep;

    if (!canTransitionScene(fromScene, nextScene)) {
      logger.warn('[TelegramBot] Invalid scene transition, recovering', {
        telegramId: key,
        fromScene: fromScene || 'none',
        requestedScene: nextScene,
        requestedStep: nextStep,
      });
      nextScene = 'conversation';
      nextStep = 'understanding';
      extra = { ...extra, recoveryReason: 'invalid_transition', recoveredFromScene: fromScene || null };
    }

    if (!isAllowedSceneStep(nextScene, nextStep)) {
      logger.warn('[TelegramBot] Invalid scene step, using default', {
        telegramId: key,
        scene: nextScene,
        requestedStep: nextStep,
      });
      nextStep = getDefaultStepForScene(nextScene);
    }

    logger.info?.('[TelegramBot] Scene transition', {
      telegramId: key,
      fromScene: fromScene || null,
      toScene: nextScene,
      toStep: nextStep,
      recoveryReason: extra?.recoveryReason || null,
    });

    updateContext(telegramId, {
      scene: nextScene,
      currentStep: nextStep,
      lastInteractionAt: Date.now(),
      ...extra,
    });
  }

  function enterScene(telegramId, scene, currentStep, extra = {}) {
    const context = getContext(telegramId) || {};
    setScene(telegramId, scene, currentStep, {
      previousScene: context.scene || null,
      sceneEnteredAt: Date.now(),
      ...extra,
    });
  }

  function exitScene(telegramId, toScene = 'idle', toStep = 'ready', extra = {}) {
    const context = getContext(telegramId) || {};
    setScene(telegramId, toScene, toStep, {
      lastScene: context.scene || null,
      sceneExitedAt: Date.now(),
      ...extra,
    });
  }

  async function routeByActiveScene(chatId, telegramId, user, text) {
    const context = getContext(telegramId) || {};
    const scene = isKnownScene(context.scene) ? context.scene : 'idle';
    const step = scene === 'transfer'
      ? normalizeTransferStep(context.currentStep || getDefaultStepForScene('transfer'))
      : (context.currentStep || getDefaultStepForScene(scene));

    if (scene !== 'transfer') {
      return null;
    }

    const pending = getPendingIntent(telegramId);
    const draft = getTransferDraft(telegramId);

    if (step === 'confirm' && !pending) {
      if (draft) {
        const missing = getMissingTransferFields(draft.intent?.details || {});
        if (missing.length === 0) {
          setTransferDraft(telegramId, null);
          setPendingIntent(telegramId, {
            intent: draft.intent,
            expiresAt: Date.now() + 2 * 60 * 1000,
          });
          enterScene(telegramId, 'transfer', 'confirm', { recoveryReason: 'rehydrated_confirm_from_draft' });

          if (isConfirmationReply(text)) {
            return null;
          }

          const { amount, tokenSymbol, recipientAddress } = draft.intent.details;
          return sendBotMessage(chatId, telegramId,
            `📤 *Confirm Transaction*\n\nI'll send *${amount} ${tokenSymbol.toUpperCase()}* to:\n\`${recipientAddress}\`\n\nReply *yes* to confirm or *no* to cancel.\n\n⚠️ This will be sent from your bot wallet.`
          );
        }
      }

      exitScene(telegramId, 'conversation', 'understanding', { recoveryReason: 'confirm_without_pending' });
      return sendBotPlain(chatId, telegramId, 'I had an incomplete confirmation state, so I reset to normal chat. Tell me the transfer again and I will continue.');
    }

    if (typeof step === 'string' && step.startsWith('collecting_') && !draft) {
      const seededDraft = buildStepSeededTransferDraft(context, step);
      setTransferDraft(telegramId, seededDraft);
      const missing = getMissingTransferFields(seededDraft.intent.details);
      enterScene(telegramId, 'transfer', `collecting_${missing[0] || 'amount'}`, {
        recoveryReason: 'rehydrated_collecting_step',
      });
      return null;
    }

    if (scene === 'transfer' && !pending && !draft && isConfirmationReply(text)) {
      exitScene(telegramId, 'conversation', 'understanding', { recoveryReason: 'confirmation_without_transfer_state' });
      return sendBotPlain(chatId, telegramId, 'There is no pending transfer right now. Tell me what you want to send and I will prepare it.');
    }

    if (!user) {
      exitScene(telegramId, 'onboarding', 'start', { recoveryReason: 'scene_requires_link' });
    }

    return null;
  }

  return {
    sanitizeSceneState,
    setScene,
    enterScene,
    exitScene,
    routeByActiveScene,
    isKnownScene,
    getDefaultStepForScene,
    normalizeTransferStep,
  };
}
