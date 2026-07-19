'use client';

import { useUiHint } from '@/lib/agent-ui/hooks';

// Raw debug surface: soft_redirect has no user-facing UX (the agent's spoken
// reply is the recovery), so the banner only exists for development.
const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

export function HintOverlay() {
  const hint = useUiHint();
  if (!IN_DEVELOPMENT) return null;
  if (!hint) return null;
  if (hint.type === 'soft_redirect') {
    return (
      <div className="pointer-events-none fixed top-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-amber-100 px-3 py-2 text-xs text-amber-900 shadow">
        {hint.reasonCode}
      </div>
    );
  }
  return null;
}
