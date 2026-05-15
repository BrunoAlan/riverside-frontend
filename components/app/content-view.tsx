'use client';

import { useState } from 'react';
import { CONTENT_PANELS } from '@/components/app/content-panels/registry';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const ContentView = ({ ref }: React.ComponentProps<'div'>) => {
  const [activeId, setActiveId] = useState(CONTENT_PANELS[0].id);

  const activePanel = CONTENT_PANELS.find((panel) => panel.id === activeId) ?? CONTENT_PANELS[0];
  const ActivePanel = activePanel.component;

  return (
    <div ref={ref} className="relative h-svh">
      <div className="h-full">
        <ActivePanel />
      </div>
      <div className="absolute top-0 right-0 z-20 p-4">
        <Select value={activeId} onValueChange={setActiveId}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CONTENT_PANELS.map((panel) => (
              <SelectItem key={panel.id} value={panel.id}>
                {panel.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
