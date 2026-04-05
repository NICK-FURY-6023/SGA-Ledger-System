import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/landing.css';
import '@/styles/login.css';
import '@/styles/dashboard.css';
import '@/styles/ledger.css';
import '@/styles/pages.css';
import { AuthProvider } from '@/lib/auth';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_URL || 'https://sga-ledger-system.vercel.app'),
  title: 'SGALA — Shree Ganpati Agency Ledger Audit System',
  description: 'A secure, realtime, admin-only digital bahi-khata system for hardware & bath fittings. Cloud-synced ledger with audit trail, auto-save, and traditional register-style UI.',
  keywords: ['ledger', 'bahi-khata', 'accounting', 'hardware shop', 'bath fittings', 'audit', 'SGALA', 'Shree Ganpati Agency'],
  authors: [{ name: 'Shree Ganpati Agency' }],
  openGraph: {
    type: 'website',
    title: 'SGALA — Shree Ganpati Agency Ledger Audit System',
    description: 'Secure, cloud-synced digital bahi-khata with real-time audit trail. Built for hardware & bath fittings business.',
    siteName: 'SGALA',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SGALA - Shree Ganpati Agency Ledger Audit System',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SGALA — Shree Ganpati Agency Ledger Audit System',
    description: 'Secure, cloud-synced digital bahi-khata with real-time audit trail.',
    images: ['/og-image.png'],
  },
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preload" href="/SGA-180.webp" as="image" type="image/webp" />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#16161D',
                color: '#FFFFFF',
                border: '1px solid #2A2A35',
                borderRadius: '10px',
                fontSize: '0.9rem',
              },
              success: { iconTheme: { primary: '#00C853', secondary: '#FFF' } },
              error: { iconTheme: { primary: '#FF3D00', secondary: '#FFF' } },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
