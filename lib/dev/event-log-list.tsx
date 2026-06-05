'use client';

import { useState } from 'react';
import { type DevEvent, useClearDevEventLog, useDevEventLog } from './event-log-store';

const CHANNEL_COLOR: Record<DevEvent['channel'], string> = {
  'ui-commands': 'text-sky-300',
  'frontend-intent': 'text-amber-300',
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function EventRow({ event }: { event: DevEvent }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10 py-1">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 text-left"
      >
        <span className="opacity-60">{formatTime(event.ts)}</span>
        <span className={CHANNEL_COLOR[event.channel]}>{event.channel}</span>
        <span className={event.ok ? '' : 'text-red-400'}>{event.label}</span>
        {event.correlationId && (
          <span className="ml-auto opacity-50">{event.correlationId.slice(0, 8)}</span>
        )}
      </button>
      {open && (
        <div className="mt-1 space-y-1">
          <div className="opacity-60">payload</div>
          <pre className="max-h-48 overflow-auto rounded bg-white/5 p-1">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
          {event.envelope !== undefined && (
            <>
              <div className="opacity-60">envelope</div>
              <pre className="max-h-48 overflow-auto rounded bg-white/5 p-1">
                {JSON.stringify(event.envelope, null, 2)}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function EventLogList() {
  const events = useDevEventLog();
  const clear = useClearDevEventLog();
  const newestFirst = [...events].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="opacity-60">{events.length} events</span>
        <button type="button" onClick={clear} className="rounded bg-white/20 px-2 py-0.5">
          Clear
        </button>
      </div>
      <div className="max-h-80 overflow-auto">
        {newestFirst.length === 0 && <div className="opacity-50">no events yet</div>}
        {newestFirst.map((e) => (
          <EventRow key={e.id} event={e} />
        ))}
      </div>
    </div>
  );
}
