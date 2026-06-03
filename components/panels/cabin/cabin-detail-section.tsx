import type { BedIcon } from '@phosphor-icons/react';

export function DetailSection({
  icon: SectionIcon,
  title,
  items,
}: {
  icon: typeof BedIcon;
  title: string;
  items: readonly string[];
}) {
  return (
    <section className="flex flex-col">
      <div className="flex items-center gap-2 pb-2">
        <SectionIcon className="text-neutral-700" size={20} />
        <h3 className="font-display text-lg font-semibold text-neutral-700">{title}</h3>
      </div>
      <ul className="border-border border-t">
        {items.map((item) => (
          <li key={item} className="border-border text-muted-foreground border-b py-2 text-sm">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
