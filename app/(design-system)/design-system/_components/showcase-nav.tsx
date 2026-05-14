const SECTIONS = [
  { id: 'colors', label: 'Colors' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'overlays', label: 'Overlays' },
  { id: 'misc', label: 'Misc' },
];

export function ShowcaseNav() {
  return (
    <nav className="sticky top-8 w-48 shrink-0">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Sections
      </p>
      <ul className="space-y-1">
        {SECTIONS.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className="block rounded-md px-2 py-1 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
