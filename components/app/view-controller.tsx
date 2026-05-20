'use client';

import { AnimatePresence, motion } from 'motion/react';
import { ContentView } from '@/components/agent-ui/content-view';
import { WindowBackground } from '@/components/app/window-background';
import { useUiView } from '@/lib/agent-ui/hooks';

const MotionContentView = motion.create(ContentView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.5, ease: 'linear' },
};

function viewKey(view: ReturnType<typeof useUiView>): string {
  if (view.type === 'compare_itinerary') {
    return `compare_itinerary:${view.options.map((o) => o.id).join(',')}`;
  }
  return view.type;
}

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
