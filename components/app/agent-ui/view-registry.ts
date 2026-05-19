import type { ComponentType } from 'react';
import type { UiView } from '@/lib/agent-ui/ui-view-types';

export type ViewComponent<K extends UiView['type']> = ComponentType<{
  view: Extract<UiView, { type: K }>;
}>;

export type ViewRegistry = {
  [K in UiView['type']]: ViewComponent<K>;
};
