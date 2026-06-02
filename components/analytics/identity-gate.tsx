'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ANALYTICS_EVENTS } from '@/lib/analytics/events';
import { readIdentity, writeIdentity } from '@/lib/analytics/identity';
import { captureEvent, identifyTester } from '@/lib/analytics/posthog';

interface IdentityGateProps {
  children: React.ReactNode;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function IdentityGate({ children }: IdentityGateProps) {
  // null = not yet read (avoid hydration flash); false = needs form; true = ready.
  const [ready, setReady] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const existing = readIdentity();
    if (existing) {
      identifyTester(existing.email, existing.name);
      setReady(true);
    } else {
      setReady(false);
    }
  }, []);

  if (ready === null) return null;
  if (ready) return <>{children}</>;

  const trimmedName = name.trim();
  const trimmedEmail = email.trim();
  const valid = trimmedName.length > 0 && EMAIL_RE.test(trimmedEmail);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const identity = { name: trimmedName, email: trimmedEmail };
    writeIdentity(identity);
    identifyTester(identity.email, identity.name);
    captureEvent(ANALYTICS_EVENTS.testerIdentified, identity);
    setReady(true);
  };

  return (
    <div className="relative z-10 flex h-full items-center justify-center p-6">
      <Card className="bg-beige-50 flex w-full max-w-md flex-col gap-5 rounded-2xl px-8 py-10 shadow-xl">
        <div className="text-center">
          <h1 className="text-foreground text-2xl font-medium">Welcome</h1>
          <p className="text-muted-foreground mt-2 text-sm leading-6">
            Antes de empezar, contanos quién sos. Esta sesión se graba con fines de prueba.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tester-name">Nombre</Label>
            <Input
              id="tester-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tester-email">Email</Label>
            <Input
              id="tester-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>
          <Button type="submit" size="lg" disabled={!valid} className="mt-2 rounded-lg">
            Empezar
          </Button>
        </form>
      </Card>
    </div>
  );
}
