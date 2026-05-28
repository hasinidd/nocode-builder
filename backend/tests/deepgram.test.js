import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DeepgramService } from '../src/services/deepgramService.js';

describe('Deepgram Speech-to-Text Integration', () => {
  const service = new DeepgramService();

  it('returns mock token in development mode when key not present', async () => {
    const data = await service.getTemporaryToken();
    assert.ok(data.token);
  });
});
