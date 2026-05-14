'use client';

import { CameraIcon, MagnifyingGlassIcon, UserIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export function FloatingActions() {
  return (
    <div className="pointer-events-none absolute top-1/2 right-4 z-20 hidden -translate-y-1/2 md:block">
      <div className="pointer-events-auto flex flex-col gap-2 rounded-full bg-white/85 p-1 shadow-sm backdrop-blur-sm">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search"
          className="rounded-full text-neutral-800 hover:bg-neutral-100"
        >
          <MagnifyingGlassIcon size={18} weight="regular" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Account"
          className="rounded-full text-neutral-800 hover:bg-neutral-100"
        >
          <UserIcon size={18} weight="regular" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Gallery"
          className="rounded-full text-neutral-800 hover:bg-neutral-100"
        >
          <CameraIcon size={18} weight="regular" />
        </Button>
      </div>
    </div>
  );
}
