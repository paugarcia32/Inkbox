'use client';

import {
  ArchiveBoxIcon,
  FolderIcon,
  InboxIcon,
  QueueListIcon,
} from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { Logo } from './logo';
import { UserMenu } from './user-menu';

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const NAV_ITEMS: NavItem[] = [
  { href: '/inbox', label: 'Inbox', icon: InboxIcon },
  { href: '/all', label: 'All', icon: QueueListIcon },
  { href: '/collections', label: 'Collections', icon: FolderIcon },
  { href: '/archive', label: 'Archive', icon: ArchiveBoxIcon },
];

export function TopBar() {
  const pathname = usePathname();
  const { data: counts } = trpc.items.count.useQuery();
  const trpcUtils = trpc.useUtils();

  function handleMouseEnter(href: string) {
    switch (href) {
      case '/inbox':
        void trpcUtils.items.list.prefetch({ inboxOnly: true });
        break;
      case '/all':
        void trpcUtils.items.list.prefetch({});
        break;
      case '/collections':
        void trpcUtils.collections.list.prefetch({});
        break;
      case '/archive':
        void trpcUtils.items.list.prefetch({ archivedOnly: true });
        break;
    }
  }

  return (
    <header className="sticky top-0 z-50 bg-stone-50 dark:bg-stone-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
        <Logo size={32} />

        <div className="flex items-center rounded-full bg-stone-100 p-1 dark:bg-stone-800">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onMouseEnter={() => handleMouseEnter(href)}
                className={[
                  'relative flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'text-stone-900 dark:text-stone-100'
                    : 'text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200',
                ].join(' ')}
              >
                {active && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-full bg-white shadow-sm dark:bg-stone-700"
                    transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                  />
                )}
                <Icon className="relative size-4 shrink-0" />
                <span className="relative">{label}</span>
                {href === '/inbox' && counts?.inbox ? (
                  <span className="relative rounded-full bg-accent-500 px-1.5 py-px text-xs leading-none text-white">
                    {counts.inbox}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>

        <UserMenu />
      </div>
    </header>
  );
}
