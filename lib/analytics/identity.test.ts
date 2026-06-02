import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readIdentity, writeIdentity } from './identity';

function installLocalStorageStub() {
  const data = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => (data.has(k) ? data.get(k)! : null),
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => void data.clear(),
  });
  return data;
}

describe('identity store', () => {
  let data: Map<string, string>;

  beforeEach(() => {
    data = installLocalStorageStub();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('round-trips a written identity', () => {
    writeIdentity({ name: 'Ada', email: 'ada@example.com' });
    expect(readIdentity()).toEqual({ name: 'Ada', email: 'ada@example.com' });
  });

  it('returns null when nothing is stored', () => {
    expect(readIdentity()).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    data.set('riverside.tester-identity', '{not json');
    expect(readIdentity()).toBeNull();
  });

  it('returns null when required fields are missing', () => {
    data.set('riverside.tester-identity', JSON.stringify({ name: 'Ada' }));
    expect(readIdentity()).toBeNull();
  });
});
