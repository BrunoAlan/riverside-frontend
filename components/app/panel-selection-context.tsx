'use client';

import { createContext, useContext, useState } from 'react';
import { CONTENT_PANELS } from '@/components/app/content-panels/registry';

interface PanelSelectionValue {
  activeId: string;
  setActiveId: (id: string) => void;
}

const PanelSelectionContext = createContext<PanelSelectionValue | null>(null);

export function PanelSelectionProvider({ children }: { children: React.ReactNode }) {
  const [activeId, setActiveId] = useState(CONTENT_PANELS[0].id);

  return (
    <PanelSelectionContext value={{ activeId, setActiveId }}>{children}</PanelSelectionContext>
  );
}

export function usePanelSelection() {
  const ctx = useContext(PanelSelectionContext);
  if (!ctx) {
    throw new Error('usePanelSelection must be used within a PanelSelectionProvider');
  }
  return ctx;
}
