import Image from 'next/image';

export function AgentHeader() {
  return (
    <div className="flex justify-center">
      <div className="bg-green-300/50 px-8 py-4">
        <Image
          src="/riverside-logo.svg"
          alt="Riverside Luxury Cruises"
          width={100}
          height={110}
          priority
          className="h-[90px] w-auto"
        />
      </div>
    </div>
  );
}
