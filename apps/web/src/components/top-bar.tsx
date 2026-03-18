'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Logo } from './logo';
import { UserMenu } from './user-menu';

const NAV_ITEMS = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/all', label: 'All' },
  { href: '/collections', label: 'Collections' },
  { href: '/archive', label: 'Archive' },
];

export function TopBar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLDivElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex(({ href }) => pathname.startsWith(href));
    const activeLink = linkRefs.current[activeIndex];
    const nav = navRef.current;

    if (activeLink && nav) {
      const navRect = nav.getBoundingClientRect();
      const linkRect = activeLink.getBoundingClientRect();
      setPill({ left: linkRect.left - navRect.left, width: linkRect.width });
      setReady(true);
    }
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        {/* Logo */}
        {/*<div className="size-7 shrink-0 rounded-full bg-accent-500" />*/}
        <Logo size={32} />

        {/* Pill nav */}
        <div
          ref={navRef}
          className="relative flex items-center rounded-full bg-stone-100 p-1 dark:bg-stone-800"
        >
          {/* Sliding indicator */}
          {pill && (
            <div
              className={`absolute inset-y-1 rounded-full bg-white shadow-sm dark:bg-stone-700 ${ready ? 'transition-all duration-200 ease-out' : ''}`}
              style={{ left: pill.left, width: pill.width }}
            />
          )}

          {NAV_ITEMS.map(({ href, label }, i) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                ref={(el) => {
                  linkRefs.current[i] = el;
                }}
                className={`relative z-10 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? 'text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
