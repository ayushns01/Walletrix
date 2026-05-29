jest.mock('../src/config/telegram.js', () => ({
  __esModule: true,
  default: {
    BOT_TOKEN: 'test-token',
    WEBHOOK_SECRET: 'test-secret',
  },
}));

jest.mock('../src/services/loggerService.js', () => ({
  __esModule: true,
  default: {
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

import { captureWebhookReply, sendPlainMessage } from '../src/services/telegramService.js';

describe('telegramService webhook replies', () => {
  it('serializes reply_markup before returning a webhook response method payload', async () => {
    const replyMarkup = { remove_keyboard: true };

    const reply = await captureWebhookReply(async () => {
      await sendPlainMessage(12345, 'hello', { reply_markup: replyMarkup });
    });

    expect(reply).toEqual({
      method: 'sendMessage',
      chat_id: 12345,
      text: 'hello',
      reply_markup: JSON.stringify(replyMarkup),
    });
  });
});
