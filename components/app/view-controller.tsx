'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import type { AppConfig } from '@/app-config';
import { ContentView } from '@/components/app/agent-ui/content-view';
import { WelcomeView } from '@/components/app/welcome-view';
import { WindowBackground } from '@/components/app/window-background';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionContentView = motion.create(ContentView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: {
      opacity: 1,
    },
    hidden: {
      opacity: 0,
    },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: {
    duration: 0.5,
    ease: 'linear',
  },
};

interface ViewControllerProps {
  appConfig: AppConfig;
}

export function ViewController({ appConfig }: ViewControllerProps) {
  const { start } = useSessionContext();
  const [started, setStarted] = useState(false);

  const handleStart = () => {
    setStarted(true);
    start();
  };

  return (
    <>
      {!started && <WindowBackground isPlaying={false} />}
      <AnimatePresence mode="wait">
        {!started ? (
          <MotionWelcomeView
            key="welcome"
            {...VIEW_MOTION_PROPS}
            startButtonText={appConfig.startButtonText}
            onStartCall={handleStart}
          />
        ) : (
          <MotionContentView key="content" {...VIEW_MOTION_PROPS} />
        )}
      </AnimatePresence>
    </>
  );
}
