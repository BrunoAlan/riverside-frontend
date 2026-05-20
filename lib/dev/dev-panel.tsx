'use client';

import { useEffect, useState } from 'react';
import {
  useSetBookingSummaryFromDev,
  useSetViewFromDev,
  useUiLastError,
  useUiSource,
  useUiView,
} from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { BOOKING_SUMMARY_MOCKS, VIEW_MOCKS } from './mocks';

const VIEW_TYPES = Object.keys(VIEW_MOCKS) as UiView['type'][];

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const view = useUiView();
  const source = useUiSource();
  const lastError = useUiLastError();
  const setViewFromDev = useSetViewFromDev();
  const setBookingSummaryFromDev = useSetBookingSummaryFromDev();

  const [type, setType] = useState<UiView['type']>(view.type);
  const mocks = VIEW_MOCKS[type];
  const [mockId, setMockId] = useState(mocks[0]?.id ?? '');

  const [summaryMockId, setSummaryMockId] = useState(BOOKING_SUMMARY_MOCKS[0]?.id ?? '');

  useEffect(() => {
    setType(view.type);
    setMockId(VIEW_MOCKS[view.type][0]?.id ?? '');
  }, [view.type]);

  const applyView = () => {
    const chosen = mocks.find((m) => m.id === mockId) ?? mocks[0];
    if (chosen) setViewFromDev(chosen.view);
  };

  const applySummary = () => {
    const chosen =
      BOOKING_SUMMARY_MOCKS.find((m) => m.id === summaryMockId) ?? BOOKING_SUMMARY_MOCKS[0];
    if (chosen) setBookingSummaryFromDev(chosen.summary);
  };

  return (
    <div className="fixed right-3 bottom-3 z-[100] font-mono text-xs">
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-md bg-black/80 px-2 py-1 text-white"
        >
          dev
        </button>
      )}
      {open && (
        <div className="w-72 space-y-2 rounded-md bg-black/80 p-3 text-white">
          <div className="flex items-center justify-between">
            <span>UI dev panel</span>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
          <div>
            current: <b>{view.type}</b> (source: {source})
          </div>
          <label className="block">
            view
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={type}
              onChange={(e) => {
                const nextType = e.target.value as UiView['type'];
                setType(nextType);
                setMockId(VIEW_MOCKS[nextType][0]?.id ?? '');
              }}
            >
              {VIEW_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={mockId}
              onChange={(e) => setMockId(e.target.value)}
            >
              {mocks.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={applyView}
              className="flex-1 rounded bg-white text-black"
            >
              Apply view
            </button>
            <button
              type="button"
              onClick={() => setViewFromDev({ type: 'start' })}
              className="rounded bg-white/20 px-2 text-white"
            >
              Reset
            </button>
          </div>

          <div className="mt-2 border-t border-white/20 pt-2">booking summary</div>
          <label className="block">
            mock
            <select
              className="mt-1 w-full bg-white/10 px-1 py-0.5"
              value={summaryMockId}
              onChange={(e) => setSummaryMockId(e.target.value)}
            >
              {BOOKING_SUMMARY_MOCKS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={applySummary}
            className="w-full rounded bg-white text-black"
          >
            Apply summary
          </button>

          {lastError && (
            <div className="rounded bg-red-900/60 p-1">last error: {lastError.message}</div>
          )}
        </div>
      )}
    </div>
  );
}
