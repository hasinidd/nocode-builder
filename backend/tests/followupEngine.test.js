import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FollowupEngineService } from '../src/services/followupEngineService.js';

describe('Followup Drip Engine Service', () => {
  const service = new FollowupEngineService();

  it('instantiates service properly', () => {
    assert.ok(service);
    assert.equal(typeof service.processPendingFollowups, 'function');
  });
});
