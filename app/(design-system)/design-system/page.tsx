import { ShowcaseNav } from './_components/showcase-nav';
import { Section } from './_components/section';
import { ColorSwatch } from './_components/color-swatch';
import { Button } from '@/components/ui/button';

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
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Variants</h3>
                <div className="flex flex-wrap gap-3">
                  <Button>Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Sizes</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra small</Button>
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">States</h3>
                <div className="flex flex-wrap gap-3">
                  <Button>Idle</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
            </div>
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
