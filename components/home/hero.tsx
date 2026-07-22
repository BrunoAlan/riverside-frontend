import Image from 'next/image';
import { FloatingActions } from '@/components/home/floating-actions';
import { PrimaryNav } from '@/components/home/primary-nav';
import { TopUtilityBar } from '@/components/home/top-utility-bar';
import { PoweredByFooter } from '@/components/layout/powered-by-footer';

export function Hero() {
  return (
    // `h-screen` (not `min-h-screen`): the image container needs a definite height to resolve `h-full`.
    <section className="flex h-screen w-full flex-col bg-white">
      <TopUtilityBar />
      <PrimaryNav />

      <div className="min-h-0 flex-1 px-4 pb-4 md:px-20 md:pb-10">
        <div className="relative h-full min-h-[24rem] w-full overflow-hidden">
          <Image
            src="/hero-image.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/25" />

          <div className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] items-center px-6 md:px-12">
            <h1 className="max-w-2xl font-[family-name:var(--font-serif)] text-5xl leading-[1.05] font-normal tracking-wide text-white md:text-7xl">
              Riverside Luxury
              <br />
              Cruises
            </h1>
          </div>
        </div>
        <FloatingActions />
      </div>
      <PoweredByFooter />
    </section>
  );
}
