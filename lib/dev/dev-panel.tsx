'use client';

import { useEffect, useState } from 'react';
import {
  useApplyCommand,
  useClearAddedExperiencesFromDev,
  useSetBookingSummaryFromDev,
  useSetViewFromDev,
  useUiLastError,
  useUiSource,
  useUiView,
} from '@/lib/agent-ui/hooks';
import type { UiView } from '@/lib/agent-ui/ui-view-types';
import { useSetDevChatMessages } from './chat-mock-store';
import { CHAT_MOCKS } from './chat-mocks';
import { EventLogList } from './event-log-list';
import { BOOKING_SUMMARY_MOCKS, SYNC_EXPERIENCES_MOCKS, VIEW_MOCKS } from './mocks';

const VIEW_TYPES = Object.keys(VIEW_MOCKS) as UiView['type'][];
const CHAT_DOCK_OPEN_KEY = 'chat:dock:open';

export function DevPanel() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'mocks' | 'events'>('mocks');
  const view = useUiView();
  const source = useUiSource();
  const lastError = useUiLastError();
  const setViewFromDev = useSetViewFromDev();
  const setBookingSummaryFromDev = useSetBookingSummaryFromDev();
  const setDevChatMessages = useSetDevChatMessages();
  const applyCommand = useApplyCommand();
  const clearAddedExperiences = useClearAddedExperiencesFromDev();

  const [type, setType] = useState<UiView['type']>(view.type);
  const mocks = VIEW_MOCKS[type];
  const [mockId, setMockId] = useState(mocks[0]?.id ?? '');

  const [summaryMockId, setSummaryMockId] = useState(BOOKING_SUMMARY_MOCKS[0]?.id ?? '');
  const [chatMockId, setChatMockId] = useState(CHAT_MOCKS[0]?.id ?? '');
  const [syncMockId, setSyncMockId] = useState(SYNC_EXPERIENCES_MOCKS[0]?.id ?? '');

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

  const applyChat = () => {
    const chosen = CHAT_MOCKS.find((m) => m.id === chatMockId) ?? CHAT_MOCKS[0];
    if (!chosen) return;
    setDevChatMessages(chosen.messages);
    if (view.type === 'start') applyView();
    try {
      window.sessionStorage.setItem(CHAT_DOCK_OPEN_KEY, JSON.stringify(true));
    } catch {}
  };

  const applyExperiences = () => {
    const chosen =
      SYNC_EXPERIENCES_MOCKS.find((m) => m.id === syncMockId) ?? SYNC_EXPERIENCES_MOCKS[0];
    if (chosen) applyCommand(chosen.command);
  };

  // Clear then re-apply so the card replays its add animation. The re-apply is
  // deferred a tick: clearing and applying in the same render batch would leave
  // the card "added" the whole time (no false→true flip), so nothing animates.
  const replayExperiences = () => {
    const chosen =
      SYNC_EXPERIENCES_MOCKS.find((m) => m.id === syncMockId) ?? SYNC_EXPERIENCES_MOCKS[0];
    if (!chosen) return;
    clearAddedExperiences();
    setTimeout(() => applyCommand(chosen.command), 50);
  };

  const reset = () => {
    setViewFromDev({ type: 'start' });
    setDevChatMessages(null);
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
        <div className="w-80 space-y-2 rounded-md bg-black/80 p-3 text-white">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('mocks')}
                className={tab === 'mocks' ? 'underline' : 'opacity-60'}
              >
                Mocks
              </button>
              <button
                type="button"
                onClick={() => setTab('events')}
                className={tab === 'events' ? 'underline' : 'opacity-60'}
              >
                Events
              </button>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="opacity-60">
              ×
            </button>
          </div>
          {tab === 'events' ? (
            <EventLogList />
          ) : (
            <>
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
                  onClick={reset}
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

              <div className="mt-2 border-t border-white/20 pt-2">chat</div>
              <label className="block">
                mock
                <select
                  className="mt-1 w-full bg-white/10 px-1 py-0.5"
                  value={chatMockId}
                  onChange={(e) => setChatMockId(e.target.value)}
                >
                  {CHAT_MOCKS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={applyChat}
                className="w-full rounded bg-white text-black"
              >
                Apply chat
              </button>

              <div className="mt-2 border-t border-white/20 pt-2">itinerary experiences</div>
              <label className="block">
                mock
                <select
                  className="mt-1 w-full bg-white/10 px-1 py-0.5"
                  value={syncMockId}
                  onChange={(e) => setSyncMockId(e.target.value)}
                >
                  {SYNC_EXPERIENCES_MOCKS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={applyExperiences}
                  className="flex-1 rounded bg-white text-black"
                >
                  Apply experiences
                </button>
                <button
                  type="button"
                  onClick={replayExperiences}
                  className="rounded bg-white/20 px-2 text-white"
                >
                  Replay
                </button>
                <button
                  type="button"
                  onClick={clearAddedExperiences}
                  className="rounded bg-white/20 px-2 text-white"
                >
                  Clear
                </button>
              </div>

              {lastError && (
                <div className="rounded bg-red-900/60 p-1">last error: {lastError.message}</div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
