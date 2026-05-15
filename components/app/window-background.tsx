'use client';

import { useEffect, useRef } from 'react';
import Image from 'next/image';

interface WindowBackgroundProps {
  isPlaying: boolean;
}

export function WindowBackground({ isPlaying }: WindowBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [isPlaying]);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/window-video.mp4" type="video/mp4" />
      </video>
      <Image src="/window-overlay.png" alt="" fill priority className="object-cover" />
    </div>
  );
}
