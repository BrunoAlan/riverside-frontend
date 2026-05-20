'use client';

import { useUiHint } from '@/lib/agent-ui/hooks';

export function HintOverlay() {
  const hint = useUiHint();
  if (!hint) return null;
  if (hint.type === 'soft_redirect') {
    return (
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 shadow">
        {hint.reasonCode}
        {hint.missing?.length ? ` · falta: ${hint.missing.join(', ')}` : null}
      </div>
    );
  }
  return null;
}
