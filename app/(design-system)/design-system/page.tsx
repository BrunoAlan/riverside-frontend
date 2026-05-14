'use client';

import { ShowcaseNav } from './_components/showcase-nav';
import { Section } from './_components/section';
import { ColorSwatch } from './_components/color-swatch';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="email-demo">Email</Label>
                <Input id="email-demo" type="email" placeholder="you@example.com" />
                <p className="text-xs text-muted-foreground">We never share your email.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-demo">Bio</Label>
                <Textarea id="bio-demo" placeholder="Tell us a bit about yourself..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="err-demo">Field with error</Label>
                <Input id="err-demo" aria-invalid placeholder="invalid input" />
                <p className="text-xs text-destructive">This field is required.</p>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox id="cb-demo" />
                <Label htmlFor="cb-demo">Accept terms and conditions</Label>
              </div>
              <div className="space-y-3">
                <Label>Plan</Label>
                <RadioGroup defaultValue="pro" className="gap-2">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="rg-free" value="free" />
                    <Label htmlFor="rg-free">Free</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id="rg-pro" value="pro" />
                    <Label htmlFor="rg-pro">Pro</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center gap-3">
                <Switch id="sw-demo" />
                <Label htmlFor="sw-demo">Enable notifications</Label>
              </div>
            </div>
          </Section>
          <Section id="feedback" title="Feedback">
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Alerts</h3>
                <div className="space-y-3">
                  <Alert>
                    <AlertTitle>Heads up!</AlertTitle>
                    <AlertDescription>This is the default alert.</AlertDescription>
                  </Alert>
                  <Alert variant="destructive">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>Something went wrong.</AlertDescription>
                  </Alert>
                  <Alert variant="warning">
                    <AlertTitle>Warning</AlertTitle>
                    <AlertDescription>Be careful with this action.</AlertDescription>
                  </Alert>
                  <Alert variant="success">
                    <AlertTitle>Success</AlertTitle>
                    <AlertDescription>Your changes were saved.</AlertDescription>
                  </Alert>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Badges</h3>
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="outline">Outline</Badge>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Tooltip</h3>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline">Hover me</Button>
                    </TooltipTrigger>
                    <TooltipContent>This is a tooltip.</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Toasts (sonner)</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => toast('Default toast')}>Default</Button>
                  <Button variant="outline" onClick={() => toast.success('Success!')}>Success</Button>
                  <Button variant="outline" onClick={() => toast.error('Something failed')}>Error</Button>
                </div>
              </div>
            </div>
          </Section>
          <Section id="overlays" title="Overlays">
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Dialog</h3>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">Open dialog</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Are you sure?</DialogTitle>
                      <DialogDescription>
                        This action cannot be undone. It will permanently delete the resource.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost">Cancel</Button>
                      <Button variant="destructive">Delete</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Dropdown menu</h3>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">Open menu</Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuLabel>My account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Profile</DropdownMenuItem>
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Log out</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium text-foreground">Tabs</h3>
                <Tabs defaultValue="account" className="w-full max-w-md">
                  <TabsList>
                    <TabsTrigger value="account">Account</TabsTrigger>
                    <TabsTrigger value="password">Password</TabsTrigger>
                  </TabsList>
                  <TabsContent value="account">Account settings go here.</TabsContent>
                  <TabsContent value="password">Password settings go here.</TabsContent>
                </Tabs>
              </div>
            </div>
          </Section>
          <Section id="misc" title="Misc">
            <p className="text-sm text-muted-foreground">Pending.</p>
          </Section>
        </main>
      </div>
    </div>
  );
}
