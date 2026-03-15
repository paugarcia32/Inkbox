'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { InboxIcon, RectangleStackIcon, ArrowRightStartOnRectangleIcon } from '@heroicons/react/24/outline';
import { signOut, useSession } from '@/lib/auth';
import { ThemeToggle } from './theme-toggle';

const NAV_ITEMS = [
  { href: '/inbox', label: 'Inbox', Icon: InboxIcon },
  { href: '/collections', label: 'Collections', Icon: RectangleStackIcon },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  async function handleSignOut() {
    await signOut();
    router.push('/login');
  }

  return (
    <aside className="flex h-screen w-56 shrink-0 flex-col border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950">
      {/* Logo + Theme */}
      <div className="flex items-center justify-between px-5 py-5">
        <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-100">inkbox</span>
        <ThemeToggle />
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-0.5 px-3">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? 'bg-accent-50 text-accent-600 dark:bg-accent-900/20 dark:text-accent-400'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100'
              }`}
            >
              <Icon className="size-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Sign out */}
      <div className="border-t border-stone-200 p-3 dark:border-stone-800">
        {session?.user && (
          <div className="mb-2 flex items-center gap-2.5 px-3 py-2">
            {session.user.image ? (
              <img
                src={session.user.image}
                alt=""
                className="size-7 shrink-0 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
                {session.user.name?.charAt(0)?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
                {session.user.name}
              </p>
              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                {session.user.email}
              </p>
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleSignOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100"
        >
          <ArrowRightStartOnRectangleIcon className="size-4 shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
