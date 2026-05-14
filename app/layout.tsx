import { Inter, Source_Serif_4 } from 'next/font/google';
import localFont from 'next/font/local';
import { APP_CONFIG_DEFAULTS } from '@/app-config';
import { Toaster } from '@/components/ui/sonner';
import { cn } from '@/lib/shadcn/utils';
import '@/styles/globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const sourceSerif = Source_Serif_4({
  variable: '--font-serif',
  subsets: ['latin'],
  display: 'swap',
});

const commitMono = localFont({
  display: 'swap',
  variable: '--font-commit-mono',
  src: [
    {
      path: '../fonts/CommitMono-400-Regular.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../fonts/CommitMono-700-Regular.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: '../fonts/CommitMono-400-Italic.otf',
      weight: '400',
      style: 'italic',
    },
    {
      path: '../fonts/CommitMono-700-Italic.otf',
      weight: '700',
      style: 'italic',
    },
  ],
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
      className={cn(
        inter.variable,
        commitMono.variable,
        sourceSerif.variable,
        'scroll-smooth font-sans antialiased'
      )}
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
