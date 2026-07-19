import { describe, expect, it } from 'vitest';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
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
    const shipped = APP_CONFIG_DEFAULTS.suggestionPills;
    const result = pillsForView('presentation');

    // Asserted structurally rather than by id: the copy is product-owned and
    // changes often, but the wiring to the shipped catalog must not.
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((pill) => shipped.includes(pill))).toBe(true);
    expect(result.every((pill) => !pill.views || pill.views.includes('presentation'))).toBe(true);
  });
});

describe('the shipped catalog', () => {
  it('has unique ids', () => {
    const ids = APP_CONFIG_DEFAULTS.suggestionPills.map((pill) => pill.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
