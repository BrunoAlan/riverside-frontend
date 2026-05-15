'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ListIcon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export function PrimaryNav() {
  return (
    <div className="relative w-full bg-[#F5EFE3]">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between px-6">
        <Button variant="ghost" className="gap-2 text-xs tracking-[0.1em] uppercase">
          <ListIcon size={20} weight="regular" />
          Menu
        </Button>

        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="rounded-full border-neutral-700 px-5 text-[11px] tracking-[0.1em] text-neutral-900 uppercase"
          >
            <Link href="/agent">Virtual Concierge</Link>
          </Button>
          <Button className="hidden rounded-full bg-[#5C6E5C] px-5 text-[11px] tracking-[0.1em] text-white uppercase hover:bg-[#4E5E4E] sm:inline-flex">
            Cruise Finder
          </Button>
        </div>
      </div>

      {/* Centered overflowing logo */}
      <Link
        href="/"
        aria-label="Riverside Luxury Cruises"
        className="absolute top-0 left-1/2 z-10 -translate-x-1/2"
      >
        <Image
          src="/riverside-logo.svg"
          alt="Riverside Luxury Cruises"
          width={120}
          height={130}
          priority
          className="h-[110px] w-auto md:h-[130px]"
        />
      </Link>
    </div>
  );
}
