import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';

export const metadata: Metadata = {
  title: 'Synapse — Knowledge & Work OS',
  description:
    'An all-in-one workspace combining block editing, bidirectional graph linking, and local-first performance.',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [
      { url: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
};

const themeAntiFlashScript = `(function() {
  try {
    var raw = localStorage.getItem('synapse_active_theme_colors');
    if (raw) {
      var c = JSON.parse(raw);
      var r = document.documentElement;
      var map = {
        background: '--background',
        foreground: '--foreground',
        card: '--card',
        cardForeground: '--card-foreground',
        popover: '--popover',
        popoverForeground: '--popover-foreground',
        primary: '--primary',
        primaryForeground: '--primary-foreground',
        secondary: '--secondary',
        secondaryForeground: '--secondary-foreground',
        muted: '--muted',
        mutedForeground: '--muted-foreground',
        accent: '--accent',
        accentForeground: '--accent-foreground',
        destructive: '--destructive',
        destructiveForeground: '--destructive-foreground',
        border: '--border',
        input: '--input',
        ring: '--ring',
        sidebar: '--sidebar',
        sidebarBorder: '--sidebar-border'
      };
      for (var k in map) {
        if (c[k]) r.style.setProperty(map[k], c[k]);
      }
      if (c.background) {
        var h = c.background.replace('#', '');
        var rN = parseInt(h.length === 3 ? h[0]+h[0] : h.substring(0,2), 16);
        var gN = parseInt(h.length === 3 ? h[1]+h[1] : h.substring(2,4), 16);
        var bN = parseInt(h.length === 3 ? h[2]+h[2] : h.substring(4,6), 16);
        if (!isNaN(rN) && !isNaN(gN) && !isNaN(bN)) {
          var isDark = Math.sqrt(0.299*rN*rN + 0.587*gN*gN + 0.114*bN*bN) < 127.5;
          if (isDark) {
            r.classList.add('dark');
            r.classList.remove('light');
          } else {
            r.classList.remove('dark');
            r.classList.add('light');
          }
        }
      }
    }
  } catch(e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="antialiased bg-background text-foreground min-h-screen"
        suppressHydrationWarning
      >
        <Script
          id="theme-anti-flash"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeAntiFlashScript }}
        />
        <QueryProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
