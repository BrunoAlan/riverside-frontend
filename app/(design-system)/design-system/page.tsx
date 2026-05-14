'use client';

import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ColorSwatch } from './_components/color-swatch';
import { Section } from './_components/section';
import { ShowcaseNav } from './_components/showcase-nav';

export default function DesignSystemPage() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <div className="mx-auto flex max-w-6xl gap-12 px-6 py-12">
        <ShowcaseNav />
        <main className="min-w-0 flex-1">
          <header className="mb-8">
            <h1 className="text-foreground text-4xl font-bold">Design System</h1>
            <p className="text-muted-foreground mt-2">
              Tokens, components, and patterns for the riverside frontend.
            </p>
          </header>
          <Section id="colors" title="Colors" description="Raw palette and semantic tokens.">
            <div className="space-y-8">
              {(['green', 'beige', 'neutral', 'error', 'warning', 'success'] as const).map(
                (family) => (
                  <div key={family}>
                    <h3 className="text-foreground mb-3 text-sm font-medium capitalize">
                      {family}
                    </h3>
                    <div className="grid grid-cols-11 gap-2">
                      {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((stop) => (
                        <ColorSwatch
                          key={stop}
                          token={`${family}-${stop}`}
                          label={`${family}-${stop}`}
                        />
                      ))}
                    </div>
                  </div>
                )
              )}

              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Semantic tokens</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Variants</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Sizes</h3>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="xs">Extra small</Button>
                  <Button size="sm">Small</Button>
                  <Button>Default</Button>
                  <Button size="lg">Large</Button>
                </div>
              </div>
              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">States</h3>
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
                <p className="text-muted-foreground text-xs">We never share your email.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio-demo">Bio</Label>
                <Textarea id="bio-demo" placeholder="Tell us a bit about yourself..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="err-demo">Field with error</Label>
                <Input id="err-demo" aria-invalid placeholder="invalid input" />
                <p className="text-destructive text-xs">This field is required.</p>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Alerts</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Badges</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Tooltip</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Toasts (sonner)</h3>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => toast('Default toast')}>
                    Default
                  </Button>
                  <Button variant="outline" onClick={() => toast.success('Success!')}>
                    Success
                  </Button>
                  <Button variant="outline" onClick={() => toast.error('Something failed')}>
                    Error
                  </Button>
                </div>
              </div>
            </div>
          </Section>
          <Section id="overlays" title="Overlays">
            <div className="space-y-6">
              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Dialog</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Dropdown menu</h3>
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
                <h3 className="text-foreground mb-3 text-sm font-medium">Tabs</h3>
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
            <div className="space-y-6">
              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Card</h3>
                <Card className="max-w-md">
                  <CardHeader>
                    <CardTitle>Project</CardTitle>
                    <CardDescription>An overview of your project.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Card body content goes here.</p>
                  </CardContent>
                </Card>
              </div>

              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Avatar</h3>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
                    <AvatarFallback>SC</AvatarFallback>
                  </Avatar>
                  <Avatar>
                    <AvatarFallback>AB</AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Skeleton</h3>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[300px]" />
                </div>
              </div>

              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Separator</h3>
                <div>
                  <p className="text-sm">Above</p>
                  <Separator className="my-2" />
                  <p className="text-sm">Below</p>
                </div>
              </div>

              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Toggle</h3>
                <Toggle>Press me</Toggle>
              </div>

              <div>
                <h3 className="text-foreground mb-3 text-sm font-medium">Select</h3>
                <Select>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Pick one" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="a">Option A</SelectItem>
                    <SelectItem value="b">Option B</SelectItem>
                    <SelectItem value="c">Option C</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
