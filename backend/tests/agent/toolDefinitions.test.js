// backend/tests/agent/toolDefinitions.test.js
import { AGENT_TOOL_DECLARATIONS, AGENT_TOOL_NAMES } from '../../src/services/agent/toolDefinitions.js';

describe('AGENT_TOOL_DECLARATIONS', () => {
  it('exposes all read/write/prepare tools (no execute/spend)', () => {
    expect(AGENT_TOOL_NAMES.sort()).toEqual(
      [
        'delete_recipient',
        'get_balance',
        'get_last_transfer',
        'get_recent_transfers',
        'get_tx_status',
        'list_recipients',
        'prepare_transfer',
        'save_recipient',
      ].sort()
    );
  });

  it('never exposes an execute/spend tool to the model', () => {
    expect(AGENT_TOOL_NAMES).not.toContain('execute_transfer');
    expect(AGENT_TOOL_NAMES.some((n) => /execute|send_now|sign/i.test(n))).toBe(false);
  });

  it('declares prepare_transfer with required amount + recipient', () => {
    const prepare = AGENT_TOOL_DECLARATIONS.find((d) => d.name === 'prepare_transfer');
    expect(prepare.parameters.required).toEqual(expect.arrayContaining(['amount', 'recipient']));
  });

  it('gives every tool a non-empty description (the model routes on these)', () => {
    for (const d of AGENT_TOOL_DECLARATIONS) {
      expect(typeof d.description).toBe('string');
      expect(d.description.length).toBeGreaterThan(20);
    }
  });
});
