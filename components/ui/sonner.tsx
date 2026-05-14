'use client';

import { useTheme } from 'next-themes';
import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      richColors
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',

          '--success-bg': 'var(--success-50)',
          '--success-text': 'var(--neutral-900)',
          '--success-border': 'var(--success-200)',

          '--info-bg': 'var(--neutral-100)',
          '--info-text': 'var(--neutral-900)',
          '--info-border': 'var(--neutral-200)',

          '--warning-bg': 'var(--warning-50)',
          '--warning-text': 'var(--neutral-900)',
          '--warning-border': 'var(--warning-200)',

          '--error-bg': 'var(--error-50)',
          '--error-text': 'var(--neutral-900)',
          '--error-border': 'var(--error-200)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
