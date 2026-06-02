import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { captureEvent, identifyTester, initPostHog, resetAnalyticsForTests } from './posthog';

const mockPosthog = vi.hoisted(() => ({
  init: vi.fn(),
  identify: vi.fn(),
  capture: vi.fn(),
}));

vi.mock('posthog-js', () => ({ default: mockPosthog }));

describe('posthog wrapper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetAnalyticsForTests();
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('does not init or capture without a key', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '');
    initPostHog();
    captureEvent('session_started', { voice_id: null });
    identifyTester('a@b.com', 'Ada');
    expect(mockPosthog.init).not.toHaveBeenCalled();
    expect(mockPosthog.capture).not.toHaveBeenCalled();
    expect(mockPosthog.identify).not.toHaveBeenCalled();
  });

  it('inits with the key and forwards events when configured', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    initPostHog();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
    expect(mockPosthog.init).toHaveBeenCalledWith('phc_test', expect.any(Object));

    captureEvent('session_started', { voice_id: 'voice-1' });
    expect(mockPosthog.capture).toHaveBeenCalledWith('session_started', { voice_id: 'voice-1' });

    identifyTester('ada@b.com', 'Ada');
    expect(mockPosthog.identify).toHaveBeenCalledWith('ada@b.com', {
      name: 'Ada',
      email: 'ada@b.com',
    });
  });

  it('inits at most once', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    initPostHog();
    initPostHog();
    expect(mockPosthog.init).toHaveBeenCalledTimes(1);
  });

  it('does not init in local dev even with a key', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test');
    initPostHog();
    captureEvent('session_started', { voice_id: null });
    expect(mockPosthog.init).not.toHaveBeenCalled();
    expect(mockPosthog.capture).not.toHaveBeenCalled();
  });
});
