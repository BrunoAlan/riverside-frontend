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
    <div ref={ref} className="relative z-10 flex h-svh flex-col">
      <div className="relative z-20 flex justify-end p-4">
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
      <div className="flex-1">
        <ActivePanel />
      </div>
    </div>
  );
};
