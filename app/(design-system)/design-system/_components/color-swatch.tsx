'use client';

import { useEffect, useState } from 'react';

interface ColorSwatchProps {
  /** CSS variable name without the leading `--`, e.g. "green-500" or "primary" */
  token: string;
  label?: string;
}

export function ColorSwatch({ token, label }: ColorSwatchProps) {
  const [hex, setHex] = useState<string>('');

  useEffect(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(`--${token}`).trim();
    setHex(value);
  }, [token]);

  return (
    <div className="flex flex-col gap-1">
      <div
        className="border-border h-12 w-full rounded-md border"
        style={{ backgroundColor: `var(--${token})` }}
      />
      <div className="text-foreground text-xs">{label ?? token}</div>
      <div className="text-muted-foreground font-mono text-[10px] uppercase">{hex || '—'}</div>
    </div>
  );
}
