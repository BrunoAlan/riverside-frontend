import { posthog } from 'posthog-js';
import type { AnalyticsEventName, AnalyticsEventProps } from './events';

let initialized = false;

const DEFAULT_HOST = 'https://us.i.posthog.com';

export function initPostHog(): void {
  if (initialized) return;
  if (typeof window === 'undefined') return;
  // Never track in local dev (`next dev` sets NODE_ENV='development'). Using
  // `=== 'development'` (not `!== 'production'`) keeps vitest (NODE_ENV='test')
  // able to exercise the wrapper.
  if (process.env.NODE_ENV === 'development') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  posthog.init(key, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || DEFAULT_HOST,
    autocapture: true,
    capture_pageview: true,
    // Screen recording for user-testing sessions. Input text is masked by
    // default, so the name/email typed into the gate is never recorded.
    disable_session_recording: false,
    person_profiles: 'always',
  });
  initialized = true;
}

export function identifyTester(email: string, name: string): void {
  if (!initialized) return;
  posthog.identify(email, { name, email });
}

export function captureEvent<E extends AnalyticsEventName>(
  event: E,
  props: AnalyticsEventProps[E]
): void {
  if (!initialized) return;
  posthog.capture(event, props);
}

// Test-only seam: reset the module-level init flag between tests.
export function resetAnalyticsForTests(): void {
  initialized = false;
}
