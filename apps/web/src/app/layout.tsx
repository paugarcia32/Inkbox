import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import { headers } from 'next/headers';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
});

export const metadata: Metadata = {
  title: 'hako',
  description: 'Your box. Your internet.',
  icons: {
    icon: [
      { url: '/logo-light.png', media: '(prefers-color-scheme: light)' },
      { url: '/logo-dark.png', media: '(prefers-color-scheme: dark)' },
    ],
  },
};

// Blocking inline script — must run before first paint to avoid theme flash.
// dangerouslySetInnerHTML is intentional here: content is a static string,
// not user input, so there is no XSS risk.
const ThemeScript = ({ nonce }: { nonce: string }) => (
  <script
    nonce={nonce}
    suppressHydrationWarning
    // biome-ignore lint/security/noDangerouslySetInnerHtml: static theme init script
    dangerouslySetInnerHTML={{
      __html: `(function(){try{var s=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;if(s==='dark'||(!s&&d)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
    }}
  />
);

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? '';
  return (
    <html lang="en" className={plusJakarta.variable} suppressHydrationWarning>
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
