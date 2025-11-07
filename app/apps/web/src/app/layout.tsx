// app/layout.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Eye Tracker Pro',
  description: 'Next-Generation Eye Tracking Technology',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ margin: 0, padding: 0 }}>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden' }}>
        {children}
      </body>
    </html>
  );
}
