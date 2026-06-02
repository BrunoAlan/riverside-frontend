import { headers } from 'next/headers';
import { IdentityGate } from '@/components/analytics/identity-gate';
import { PostHogProvider } from '@/components/analytics/posthog-provider';
import { App } from '@/components/layout/app';
import { getAppConfig } from '@/lib/utils';

export default async function Page() {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);

  return (
    <PostHogProvider>
      <IdentityGate>
        <App appConfig={appConfig} />
      </IdentityGate>
    </PostHogProvider>
  );
}
