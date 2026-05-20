import { describe, expect, it, vi } from 'vitest';
import { handleUiCommandStream } from './transport';

function fakeReader(payload: string) {
  return { readAll: async () => payload } as { readAll: () => Promise<string> };
}

describe('handleUiCommandStream', () => {
  it('parses valid JSON command and forwards to applyCommand', async () => {
    const apply = vi.fn();
    const recordError = vi.fn();
    const reader = fakeReader(
      JSON.stringify({ type: 'show_discovery_canvas', correlation_id: 'c1' })
    );
    await handleUiCommandStream(reader, apply, recordError);
    expect(apply).toHaveBeenCalledTimes(1);
    expect(apply.mock.calls[0][0].type).toBe('show_discovery_canvas');
    expect(recordError).not.toHaveBeenCalled();
  });

  it('records error and does not call applyCommand for invalid JSON', async () => {
    const apply = vi.fn();
    const recordError = vi.fn();
    await handleUiCommandStream(fakeReader('not json'), apply, recordError);
    expect(apply).not.toHaveBeenCalled();
    expect(recordError).toHaveBeenCalledTimes(1);
    expect(recordError.mock.calls[0][0].message).toMatch(/JSON/i);
  });

  it('records error for valid JSON that fails schema', async () => {
    const apply = vi.fn();
    const recordError = vi.fn();
    await handleUiCommandStream(
      fakeReader(JSON.stringify({ type: 'unknown_type', correlation_id: 'c1' })),
      apply,
      recordError
    );
    expect(apply).not.toHaveBeenCalled();
    expect(recordError).toHaveBeenCalledTimes(1);
  });
});
