import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Inkbox',
  description: 'Your personal reading inbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
