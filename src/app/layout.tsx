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
