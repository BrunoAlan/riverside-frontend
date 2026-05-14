import Image from 'next/image';

export function AgentHeader() {
  return (
    <div className="flex justify-center">
      <Image
        src="/riverside-logo.svg"
        alt="Riverside Luxury Cruises"
        width={100}
        height={110}
        priority
        className="h-[90px] w-auto"
      />
    </div>
  );
}
