import { ShowcaseNav } from './_components/showcase-nav';
import { Section } from './_components/section';
import { ColorSwatch } from './_components/color-swatch';

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
            <div className="space-y-8">
              {(['green', 'beige', 'neutral', 'error', 'warning', 'success'] as const).map((family) => (
                <div key={family}>
                  <h3 className="mb-3 text-sm font-medium capitalize text-foreground">{family}</h3>
                  <div className="grid grid-cols-11 gap-2">
                    {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((stop) => (
                      <ColorSwatch key={stop} token={`${family}-${stop}`} label={`${family}-${stop}`} />
                    ))}
                  </div>
                </div>
              ))}

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Semantic tokens</h3>
                <div className="grid grid-cols-4 gap-3 sm:grid-cols-6">
                  {[
                    'background',
                    'foreground',
                    'card',
                    'card-foreground',
                    'popover',
                    'popover-foreground',
                    'primary',
                    'primary-foreground',
                    'secondary',
                    'secondary-foreground',
                    'muted',
                    'muted-foreground',
                    'accent',
                    'accent-foreground',
                    'destructive',
                    'destructive-foreground',
                    'warning',
                    'warning-foreground',
                    'success',
                    'success-foreground',
                    'border',
                    'input',
                    'ring',
                  ].map((token) => (
                    <ColorSwatch key={token} token={token} />
                  ))}
                </div>
              </div>
            </div>
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
