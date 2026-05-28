import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ElevenLabsService } from '../src/services/elevenlabsService.js';

describe('ElevenLabs Text-to-Speech Integration', () => {
  const service = new ElevenLabsService();

  it('returns mock audio indicator when API key missing', async () => {
    const result = await service.generateSpeech('Hello world');
    assert.equal(result.mock, true);
  });
});
