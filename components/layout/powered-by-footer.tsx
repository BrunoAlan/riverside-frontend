import Image from 'next/image';

export function PoweredByFooter() {
  return (
    <footer className="flex shrink-0 items-center justify-center gap-1.5 pt-2 pb-3">
      <span className="text-muted-foreground text-xs">Powered by</span>
      <Image src="/hyperfunnel.svg" alt="Hyperfunnel" width={129} height={12} />
    </footer>
  );
}
