import * as React from 'react';

interface SectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-12 border-b border-border last:border-b-0">
      <header className="mb-6">
        <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </header>
      <div className="space-y-6">{children}</div>
    </section>
  );
}
