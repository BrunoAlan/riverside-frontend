import { describe, expect, it } from 'vitest';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { getViewDetailId } from './view-detail';

describe('getViewDetailId', () => {
  it('returns the city id when an itinerary detail is open', () => {
    const view: UiView = { type: 'itinerary', detailCityId: 'vienna' };
    expect(getViewDetailId(view)).toBe('vienna');
  });

  it('returns null for an itinerary with no detail open', () => {
    const view: UiView = { type: 'itinerary' };
    expect(getViewDetailId(view)).toBeNull();
  });

  it('returns the cabin id when a cabin detail is open', () => {
    const view: UiView = { type: 'cabin_selection', cabins: [], detailCabinId: 'owners-suite' };
    expect(getViewDetailId(view)).toBe('owners-suite');
  });

  it('returns null for a cabin selection with no detail open', () => {
    const view: UiView = { type: 'cabin_selection', cabins: [] };
    expect(getViewDetailId(view)).toBeNull();
  });

  it('returns null for views without a detail concept', () => {
    expect(getViewDetailId({ type: 'start' })).toBeNull();
    expect(getViewDetailId({ type: 'presentation' })).toBeNull();
  });
});
