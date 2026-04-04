import type { Metadata } from 'next';
import '@/styles/globals.css';
import '@/styles/landing.css';
import '@/styles/login.css';
import '@/styles/dashboard.css';
import '@/styles/ledger.css';
import '@/styles/pages.css';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'SGA Ledger System',
  description: 'A secure, realtime, admin-only digital bahi-khata system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
