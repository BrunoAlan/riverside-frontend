import Image from 'next/image';

export function AgentHeader() {
  return (
    <div className="flex justify-center">
      <Image
        src="/riverside-logo-small.svg"
        alt="Riverside Luxury Cruises"
        width={694}
        height={275}
        priority
        className="h-16 w-auto"
      />
    </div>
  );
}
