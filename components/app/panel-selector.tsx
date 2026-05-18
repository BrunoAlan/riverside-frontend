'use client';

import { CONTENT_PANELS } from '@/components/app/content-panels/registry';
import { usePanelSelection } from '@/components/app/panel-selection-context';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export function PanelSelector() {
  const { activeId, setActiveId } = usePanelSelection();

  return (
    <Select value={activeId} onValueChange={setActiveId}>
      <SelectTrigger className="bg-background/80 w-48 backdrop-blur">
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
  );
}
