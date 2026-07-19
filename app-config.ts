import type { SuggestionPill } from '@/lib/suggestions/pills';

export interface AppConfig {
  pageTitle: string;
  pageDescription: string;
  companyName: string;

  supportsChatInput: boolean;
  supportsVideoInput: boolean;
  supportsScreenShare: boolean;
  isPreConnectBufferEnabled: boolean;

  logo: string;
  startButtonText: string;
  accent?: string;
  logoDark?: string;
  accentDark?: string;

  audioVisualizerType?: 'bar' | 'wave' | 'grid' | 'radial' | 'aura';
  audioVisualizerColor?: `#${string}`;
  audioVisualizerColorDark?: `#${string}`;
  audioVisualizerColorShift?: number;
  audioVisualizerBarCount?: number;
  audioVisualizerGridRowCount?: number;
  audioVisualizerGridColumnCount?: number;
  audioVisualizerRadialBarCount?: number;
  audioVisualizerRadialRadius?: number;
  audioVisualizerWaveLineWidth?: number;

  // agent dispatch configuration
  agentName?: string;

  // voice selection (Cartesia voice IDs)
  voices?: { id: string; label: string }[];
  defaultVoiceId?: string;

  // tappable prompt suggestions shown above the booking summary
  suggestionPills: SuggestionPill[];

  // LiveKit Cloud Sandbox configuration
  sandboxId?: string;
}

export const APP_CONFIG_DEFAULTS: AppConfig = {
  companyName: 'Riverside',
  pageTitle: 'Riverside Voice Agent',
  pageDescription: 'A voice agent by Riverside',

  supportsChatInput: true,
  supportsVideoInput: true,
  supportsScreenShare: true,
  isPreConnectBufferEnabled: true,

  logo: '/riverside-logo.svg',
  accent: '#7B907E',
  logoDark: '/riverside-logo.svg',
  accentDark: '#7B907E',
  startButtonText: 'Start the experience',

  // optional: audio visualization configuration
  // audioVisualizerType: 'bar',
  // audioVisualizerColor: '#002cf2',
  // audioVisualizerColorDark: '#1fd5f9',
  // audioVisualizerColorShift: 0.3,
  // audioVisualizerBarCount: 5,
  // audioVisualizerType: 'radial',
  // audioVisualizerRadialBarCount: 24,
  // audioVisualizerRadialRadius: 100,
  // audioVisualizerType: 'grid',
  // audioVisualizerGridRowCount: 25,
  // audioVisualizerGridColumnCount: 25,
  // audioVisualizerType: 'wave',
  // audioVisualizerWaveLineWidth: 3,
  // audioVisualizerType: 'aura',

  // agent dispatch configuration
  agentName: process.env.AGENT_NAME ?? undefined,

  // voice selection — Cartesia voice IDs
  voices: [
    { id: '78ab82d5-25be-4f7d-82b3-7ad64e5b85b2', label: 'Savannah' },
    { id: 'd1d9c946-7cfc-4378-85a4-07d09827cb7e', label: 'Jolene' },
    { id: '98a34ef2-2140-4c28-9c71-663dc4dd7022', label: 'Clyde' },
    { id: '25d7abcb-4d6d-4aca-adce-8a1c85620c8b', label: 'Jessica' },
    { id: '10bd4af4-825b-49b8-b8bd-0ca11865536e', label: 'Rachel' },
  ],
  defaultVoiceId: '78ab82d5-25be-4f7d-82b3-7ad64e5b85b2',

  // tappable prompt suggestions, in display order.
  //
  // By default the pill's `label` is what gets sent to the agent. Set `message`
  // to send something different — useful when a short chip should expand into a
  // fuller prompt:
  //
  //   { id: 'more-like-this', label: 'More like this', message: 'Show me more itineraries similar to this one' }
  //
  // Omit `views` to show a pill on every view. Ids must be unique.
  suggestionPills: [
    {
      id: 'vienna-christmas',
      label: 'Plan a romantic Christmas getaway in Vienna',
      views: ['presentation'],
    },
    { id: 'budapest', label: 'Tell me about Budapest', views: ['presentation', 'itinerary'] },
    {
      id: 'river-vs-ocean',
      label: 'What makes river cruises different from ocean cruises?',
      views: ['presentation'],
    },
    {
      id: 'stops-highlights',
      label: 'What can I do at each stop?',
      views: ['itinerary'],
    },
    {
      id: 'excursions',
      label: 'Show me the excursions',
      message: 'Show me the excursions available on this itinerary',
      views: ['itinerary'],
    },
    {
      id: 'whats-included',
      label: "What's included?",
      message: 'What is included in the price of this cruise?',
      views: ['itinerary'],
    },
    {
      id: 'best-time',
      label: 'When is the best time to go?',
      message: 'When is the best time of year to do this itinerary?',
      views: ['itinerary'],
    },
  ],

  // LiveKit Cloud Sandbox configuration
  sandboxId: undefined,
};
