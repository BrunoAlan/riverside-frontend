'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ContentView } from '@/components/agent-ui/content-view';
import { WindowBackground } from '@/components/layout/window-background';
import { useUiView } from '@/lib/agent-ui/hooks';
import { viewKey } from '@/lib/agent-ui/view-key';

const MotionContentView = motion.create(ContentView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.5, ease: 'linear' as const },
};

export function ViewController() {
  const view = useUiView();
  const isPresentationActive = view.type === 'presentation';
  const showBackground = view.type === 'start' || view.type === 'presentation';

  return (
    <>
      {showBackground && <WindowBackground isPlaying={isPresentationActive} />}
      <AnimatePresence mode="wait">
        <MotionContentView key={viewKey(view)} {...VIEW_MOTION_PROPS} />
      </AnimatePresence>
    </>
  );
}
