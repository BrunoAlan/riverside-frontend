import { ShowcaseNav } from './_components/showcase-nav';
import { Section } from './_components/section';

export default function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        <ShowcaseNav />
        <main className="flex-1 min-w-0">
          <header className="mb-8">
            <h1 className="text-4xl font-bold text-foreground">Design System</h1>
            <p className="mt-2 text-muted-foreground">
              Tokens, components, and patterns for the riverside frontend.
            </p>
          </header>
          <Section id="colors" title="Colors" description="Raw palette and semantic tokens.">
            <p className="text-sm text-muted-foreground">Pending — added in Task 3.</p>
          </Section>
          <Section id="buttons" title="Buttons">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="forms" title="Forms">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="feedback" title="Feedback">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="overlays" title="Overlays">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
          <Section id="misc" title="Misc">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
        </main>
      </div>
    </div>
  );
}
