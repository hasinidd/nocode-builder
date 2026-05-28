import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { WhatsAppService } from '../src/services/whatsappService.js';

describe('WhatsApp Cloud API Integration', () => {
  const service = new WhatsAppService();

  it('handles missing token gracefully in dev mode', async () => {
    const result = await service.sendMessage('+94771234567', 'Hello from test');
    assert.equal(result.success, false);
    assert.equal(result.mock, true);
  });

  it('parses empty inbound webhook payload returning null', async () => {
    const result = await service.handleInboundWebhook({});
    assert.equal(result, null);
  });
});
