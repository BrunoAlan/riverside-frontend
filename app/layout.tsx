import { Host_Grotesk, Inter } from 'next/font/google';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/shadcn/utils';
import '@/styles/globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const hostGrotesk = Host_Grotesk({
  variable: '--font-host-grotesk',
  subsets: ['latin'],
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  const { pageTitle, pageDescription } = APP_CONFIG_DEFAULTS;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn(hostGrotesk.variable, inter.variable, 'scroll-smooth font-sans antialiased')}
    >
      <head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </head>
      <body className="overflow-x-hidden">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
