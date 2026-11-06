import '../src/front-end/global.css';
import '../src/front-end/app.css';

import { createElement, type ReactNode } from 'react';
import { withThemeFromJSXProvider } from '@storybook/addon-themes';
import type { Preview, ReactRenderer } from '@storybook/react-vite';

interface ThemePreviewProps {
  theme: { name: 'light' | 'dark' };
  children: ReactNode;
}

function ThemePreview({ theme, children }: ThemePreviewProps) {
  return createElement(
    'div',
    {
      'data-theme': theme.name,
      style: {
        background: 'var(--page-background)',
        color: 'var(--page-foreground)',
        padding: '24px',
      },
    },
    children,
  );
}

const preview: Preview = {
  tags: ['autodocs'],
  decorators: [
    withThemeFromJSXProvider<ReactRenderer>({
      themes: {
        light: { name: 'light' },
        dark: { name: 'dark' },
      },
      defaultTheme: 'light',
      Provider: ThemePreview,
    }),
  ],
};

export default preview;
