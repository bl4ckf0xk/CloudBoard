import type { Metadata } from 'next';
import './globals.css';
import { RoleProvider } from '@/lib/roleContext';
import AppShell from '@/components/AppShell';
import AuthGuard from '@/components/auth/AuthGuard';

export const metadata: Metadata = {
  title: 'CloudBoard — Internal Performance Tracking',
  description:
    'CloudBoard is an internal enterprise platform for tracking cross-department performance, recognising team contributions, and managing point submissions across all departments.',
  keywords: [
    'cloudboard',
    'performance tracking',
    'internal tool',
    'recognition',
    'points',
    'enterprise',
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('cloudboard_theme');if(t){document.documentElement.setAttribute('data-theme',t);}else if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <RoleProvider>
          <AuthGuard>
            <AppShell>{children}</AppShell>
          </AuthGuard>
        </RoleProvider>
      </body>
    </html>
  );
}
