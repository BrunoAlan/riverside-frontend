import Link from 'next/link';
import { Envelope, MagnifyingGlass, Phone, User } from '@phosphor-icons/react/dist/ssr';
import { Separator } from '@/components/ui/separator';

const itemClass =
  'flex items-center gap-1.5 text-[11px] uppercase tracking-[0.08em] text-neutral-800 hover:text-neutral-950 transition-colors';

export function TopUtilityBar() {
  return (
    <div className="w-full bg-[#EFE9DF]">
      <div className="mx-auto flex h-9 max-w-[1400px] items-center justify-center gap-6 px-4">
        <Link href="#" className={itemClass}>
          US [$]
        </Link>

        <Link href="#" className={`${itemClass} hidden md:flex`}>
          <Envelope size={14} weight="regular" />
          My Guests
        </Link>

        <Link href="#" className={itemClass}>
          <span aria-hidden className="text-base leading-none">
            🇬🇧
          </span>
          English
        </Link>

        <Link href="#" className={itemClass}>
          <User size={14} weight="regular" />
          My Account
        </Link>

        <Link href="#" className={`${itemClass} hidden md:flex`}>
          <MagnifyingGlass size={14} weight="regular" />
          Contact
        </Link>

        <Link href="tel:+10833305313" className={`${itemClass} hidden md:flex`}>
          <Phone size={14} weight="regular" />
          +1 (0) 833 305 3313
        </Link>

        <Separator orientation="vertical" className="hidden h-4 md:block" />

        <Link href="#" className={`${itemClass} hidden md:flex`}>
          Travel Agents
        </Link>
      </div>
    </div>
  );
}
