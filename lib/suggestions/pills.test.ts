import { describe, expect, it } from 'vitest';
import { type SuggestionPill, pillsForView } from './pills';

const FIXTURE: SuggestionPill[] = [
  { id: 'scoped', label: 'Scoped', views: ['dream_stage'] },
  { id: 'global', label: 'Global' },
  { id: 'multi', label: 'Multi', views: ['dream_stage', 'itinerary'] },
];

describe('pillsForView', () => {
  it('includes pills scoped to the view and pills with no views', () => {
    expect(pillsForView('dream_stage', FIXTURE).map((p) => p.id)).toEqual([
      'scoped',
      'global',
      'multi',
    ]);
  });

  it('excludes pills scoped to other views', () => {
    expect(pillsForView('itinerary', FIXTURE).map((p) => p.id)).toEqual(['global', 'multi']);
  });

  it('returns only unscoped pills when no pill targets the view', () => {
    expect(pillsForView('cabin_selection', FIXTURE).map((p) => p.id)).toEqual(['global']);
  });

  it('returns an empty array when the catalog is empty', () => {
    expect(pillsForView('itinerary', [])).toEqual([]);
  });

  it('defaults to the shipped catalog', () => {
    expect(pillsForView('presentation').map((p) => p.id)).toEqual([
      'vienna-christmas',
      'budapest',
      'river-vs-ocean',
    ]);
  });
});
