import { describe, expect, it } from 'vitest';
import { buildRoomConfig } from './utils';

describe('buildRoomConfig', () => {
  it('returns undefined when there is no agentName', () => {
    expect(buildRoomConfig(undefined, 'voice-1')).toBeUndefined();
  });

  it('omits metadata when no voice is selected', () => {
    expect(buildRoomConfig('riverside-agent', null)).toEqual({
      agents: [{ agent_name: 'riverside-agent' }],
    });
  });

  it('embeds the selected voice as JSON metadata', () => {
    expect(buildRoomConfig('riverside-agent', 'voice-1')).toEqual({
      agents: [{ agent_name: 'riverside-agent', metadata: '{"voice_id":"voice-1"}' }],
    });
  });
});
