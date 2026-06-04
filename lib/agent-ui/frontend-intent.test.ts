import { describe, expect, it } from 'vitest';
import { FRONTEND_INTENT_TOPIC, buildFrontendIntent } from './frontend-intent';

describe('buildFrontendIntent', () => {
  it('builds a v1 envelope with intent only', () => {
    const env = buildFrontendIntent('view_itinerary');
    expect(env).toEqual({
      version: 'v1',
      topic: 'frontend-intent',
      intent: 'view_itinerary',
    });
    expect(FRONTEND_INTENT_TOPIC).toBe('frontend-intent');
  });

  it('includes entities and user_message when provided', () => {
    const env = buildFrontendIntent('explore_destination', {
      entities: { destination_id: 'vienna' },
      userMessage: 'User opened Vienna detail',
    });
    expect(env.entities).toEqual({ destination_id: 'vienna' });
    expect(env.user_message).toBe('User opened Vienna detail');
    expect(env.intent).toBe('explore_destination');
  });

  it('omits optional fields when not provided', () => {
    const env = buildFrontendIntent('view_itinerary', {});
    expect('entities' in env).toBe(false);
    expect('user_message' in env).toBe(false);
  });

  it('preserves an empty-string user_message', () => {
    const env = buildFrontendIntent('view_itinerary', { userMessage: '' });
    expect('user_message' in env).toBe(true);
    expect(env.user_message).toBe('');
  });

  it('builds a select_cabin envelope with cabin_id', () => {
    const env = buildFrontendIntent('select_cabin', {
      entities: { cabin_id: 'mozart-suite' },
      userMessage: 'User selected Mozart Suite',
    });
    expect(env.intent).toBe('select_cabin');
    expect(env.entities).toEqual({ cabin_id: 'mozart-suite' });
  });
});
