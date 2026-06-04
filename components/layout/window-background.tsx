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
    } else if (!video.paused) {
      video.pause();
      video.currentTime = 0;
    }
  }, [isPlaying]);

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0">
      <video
        ref={videoRef}
        muted
        loop
        playsInline
        preload="auto"
        poster="/window-poster.jpg"
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/window-video.webm" type='video/webm; codecs="av01.0.05M.08"' />
        <source src="/window-video.mp4" type='video/mp4; codecs="avc1.64001f"' />
      </video>
      <Image src="/window-overlay.webp" alt="" fill priority className="object-cover" />
    </div>
  );
}
