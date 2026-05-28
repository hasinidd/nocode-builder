import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ClaimAgentService } from '../src/services/claimAgentService.js';

describe('Claim Pending Agent Service', () => {
  const service = new ClaimAgentService();

  it('throws error for non-existent claim token', async () => {
    await assert.rejects(
      async () => service.claimPendingAgent('invalid_token', 'usr_123'),
      /Invalid or expired/i
    );
  });
});
