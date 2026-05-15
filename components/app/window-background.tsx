'use client';

import Image from 'next/image';

export function WindowBackground({ ref, ...props }: React.ComponentProps<'div'>) {
  return (
    <div ref={ref} aria-hidden {...props} className="pointer-events-none fixed inset-0 -z-10">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src="/window-video.mp4" type="video/mp4" />
      </video>
      <Image src="/window-overlay.png" alt="" fill priority className="object-cover" />
    </div>
  );
}
