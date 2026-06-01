import { beforeEach, describe, expect, it } from 'vitest';
import { voiceStore } from './voice-store';

describe('voiceStore', () => {
  beforeEach(() => {
    voiceStore.setState({ voiceId: null });
  });

  it('starts with no voice selected', () => {
    expect(voiceStore.getState().voiceId).toBeNull();
  });

  it('sets the voiceId', () => {
    voiceStore.getState().setVoiceId('abc');
    expect(voiceStore.getState().voiceId).toBe('abc');
  });

  it('overwrites a previously selected voiceId', () => {
    voiceStore.getState().setVoiceId('abc');
    voiceStore.getState().setVoiceId('def');
    expect(voiceStore.getState().voiceId).toBe('def');
  });
});
