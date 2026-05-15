import type { ComponentType } from 'react';
import { PanelB } from '@/components/app/content-panels/panel-b';
import { PanelC } from '@/components/app/content-panels/panel-c';
import { PanelDream } from '@/components/app/content-panels/panel-dream';
import { PanelWindow } from '@/components/app/content-panels/panel-window';

export interface ContentPanel {
  id: string;
  label: string;
  component: ComponentType;
}

export const CONTENT_PANELS: ContentPanel[] = [
  { id: 'window', label: 'Ventana', component: PanelWindow },
  { id: 'dream', label: 'Dream', component: PanelDream },
  { id: 'panel-b', label: 'Contenido B', component: PanelB },
  { id: 'panel-c', label: 'Contenido C', component: PanelC },
];
