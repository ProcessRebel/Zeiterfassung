import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Zeitkonto',
  description: 'Arbeitszeiten eintragen und das Überstundenkonto im Blick behalten.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'Zeitkonto', statusBarStyle: 'default' },
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#f5f2ec',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
