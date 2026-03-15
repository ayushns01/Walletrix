import {
  decideConversationAction,
  extractHeuristicTransferFields,
  shouldAttemptTransferSlotExtraction,
} from '../../src/services/telegramConversation/orchestrator.js';

describe('telegram conversation orchestrator', () => {
  it('routes high-confidence balance intent to request_balance', () => {
    const action = decideConversationAction({
      text: 'check my balance',
      intent: 'balance',
      confidence: 0.92,
      details: { tokenSymbol: 'ETH', amount: null, recipientAddress: null, chain: null },
      extracted: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
    });

    expect(action).toEqual({ type: 'request_balance' });
  });

  it('routes high-confidence transfer intent to prepare_transfer', () => {
    const action = decideConversationAction({
      text: 'send 0.01 eth to 0x1111111111111111111111111111111111111111',
      intent: 'transfer',
      confidence: 0.95,
      details: {
        tokenSymbol: 'ETH',
        amount: 0.01,
        recipientAddress: '0x1111111111111111111111111111111111111111',
        chain: null,
      },
      extracted: { tokenSymbol: 'ETH', amount: 0.01, recipientAddress: null, chain: null },
    });

    expect(action.type).toBe('prepare_transfer');
    expect(action.missing).toEqual([]);
    expect(action.details.amount).toBe(0.01);
  });

  it('uses transfer heuristics when intent confidence is low', () => {
    const action = decideConversationAction({
      text: 'send eth to 0x1111111111111111111111111111111111111111',
      intent: 'unknown',
      confidence: 0.2,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted: {
        tokenSymbol: 'ETH',
        amount: null,
        recipientAddress: '0x1111111111111111111111111111111111111111',
        chain: null,
      },
    });

    expect(action.type).toBe('prepare_transfer');
    expect(action.missing).toEqual(['amount']);
    expect(action.details.tokenSymbol).toBe('ETH');
  });

  it('falls back to chat when no wallet signal exists', () => {
    const action = decideConversationAction({
      text: 'what is your favorite movie',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
    });

    expect(action).toEqual({ type: 'fallback_chat' });
  });

  it('does not treat token-only chat as transfer intent', () => {
    const extracted = extractHeuristicTransferFields('what is ETH?');
    const action = decideConversationAction({
      text: 'what is ETH?',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted,
    });

    expect(action).toEqual({ type: 'fallback_chat' });
  });

  it('does not treat number-only chat as transfer intent', () => {
    const extracted = extractHeuristicTransferFields('i have 2 questions');
    const action = decideConversationAction({
      text: 'i have 2 questions',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted,
    });

    expect(action).toEqual({ type: 'fallback_chat' });
  });

  it('does not treat bare address sharing as transfer intent', () => {
    const extracted = extractHeuristicTransferFields('my address is 0x1111111111111111111111111111111111111111');
    const action = decideConversationAction({
      text: 'my address is 0x1111111111111111111111111111111111111111',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted,
    });

    expect(action).toEqual({ type: 'fallback_chat' });
  });

  it('treats amount+recipient with "to" as likely transfer even without send verb', () => {
    const extracted = extractHeuristicTransferFields('0.5 usdc to 0x1111111111111111111111111111111111111111');
    const action = decideConversationAction({
      text: '0.5 usdc to 0x1111111111111111111111111111111111111111',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted,
    });

    expect(action.type).toBe('prepare_transfer');
    expect(action.missing).toEqual([]);
  });

  it('treats compact amount+token+recipient syntax as transfer', () => {
    const extracted = extractHeuristicTransferFields('0.5 eth 0x1111111111111111111111111111111111111111');
    const action = decideConversationAction({
      text: '0.5 eth 0x1111111111111111111111111111111111111111',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted,
    });

    expect(action.type).toBe('prepare_transfer');
    expect(action.missing).toEqual([]);
  });

  it('treats compact token+recipient syntax as transfer', () => {
    const extracted = extractHeuristicTransferFields('usdc 0x1111111111111111111111111111111111111111');
    const action = decideConversationAction({
      text: 'usdc 0x1111111111111111111111111111111111111111',
      intent: 'unknown',
      confidence: 0,
      details: { tokenSymbol: null, amount: null, recipientAddress: null, chain: null },
      extracted,
    });

    expect(action.type).toBe('prepare_transfer');
    expect(action.missing).toEqual(['amount']);
  });

  it('attempts slot extraction only for likely transfer text', () => {
    expect(shouldAttemptTransferSlotExtraction('what is ETH?')).toBe(false);
    expect(shouldAttemptTransferSlotExtraction('i have 2 questions')).toBe(false);
    expect(shouldAttemptTransferSlotExtraction('my address is 0x1111111111111111111111111111111111111111')).toBe(false);
    expect(shouldAttemptTransferSlotExtraction('0x1111111111111111111111111111111111111111')).toBe(false);
    expect(shouldAttemptTransferSlotExtraction('send eth')).toBe(true);
    expect(shouldAttemptTransferSlotExtraction('0.25 eth to 0x1111111111111111111111111111111111111111')).toBe(true);
    expect(shouldAttemptTransferSlotExtraction('0.25 eth 0x1111111111111111111111111111111111111111')).toBe(true);
    expect(shouldAttemptTransferSlotExtraction('usdc 0x1111111111111111111111111111111111111111')).toBe(true);
  });

  it('extracts ENS as recipient in heuristic extractor', () => {
    const extracted = extractHeuristicTransferFields('send 2 usdc to vitalik.eth');
    expect(extracted.tokenSymbol).toBe('USDC');
    expect(extracted.amount).toBe(2);
    expect(extracted.recipientAddress).toBe('vitalik.eth');
  });
});
