import * as React from 'react';

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="border-border scroll-mt-20 border-b py-12 last:border-b-0">
      <header className="mb-6">
        <h2 className="text-foreground text-2xl font-semibold">{title}</h2>
        {description ? <p className="text-muted-foreground mt-1 text-sm">{description}</p> : null}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
