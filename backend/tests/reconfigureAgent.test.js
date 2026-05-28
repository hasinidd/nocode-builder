import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ReconfigureAgentService } from '../src/services/reconfigureAgentService.js';

describe('Reconfigure Agent Service', () => {
  const service = new ReconfigureAgentService();

  it('instantiates service properly', () => {
    assert.ok(service);
    assert.equal(typeof service.reconfigure, 'function');
  });
});
