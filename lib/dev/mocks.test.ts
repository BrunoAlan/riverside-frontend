import { describe, expect, it } from 'vitest';
import { UiCommand } from '@/lib/agent-ui/commands';
import { SYNC_EXPERIENCES_MOCKS } from './mocks';

describe('SYNC_EXPERIENCES_MOCKS', () => {
  it('every mock command parses against the UiCommand schema', () => {
    for (const mock of SYNC_EXPERIENCES_MOCKS) {
      expect(() => UiCommand.parse(mock.command)).not.toThrow();
    }
  });

  it('has unique ids', () => {
    const ids = SYNC_EXPERIENCES_MOCKS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
