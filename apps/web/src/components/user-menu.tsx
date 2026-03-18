'use client';

import { signOut, useSession } from '@/lib/auth';
import { useClickOutside } from '@/lib/use-click-outside';
import { Cog6ToothIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';

export function UserMenu() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useClickOutside(wrapperRef, () => setOpen(false), open);

  async function handleSignOut() {
    setOpen(false);
    await signOut();
    router.push('/login');
  }

  if (isPending) {
    return <div className="size-8 rounded-full bg-stone-200 dark:bg-stone-700 animate-pulse" />;
  }

  if (!session?.user) return null;

  const { user } = session;

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-8 shrink-0 items-center justify-center rounded-full ring-2 ring-transparent transition hover:ring-accent-300 dark:hover:ring-accent-700"
        aria-label="User menu"
        aria-expanded={open}
      >
        {user.image ? (
          <Image
            src={user.image}
            alt=""
            width={32}
            height={32}
            className="size-8 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-8 items-center justify-center rounded-full bg-accent-100 text-xs font-semibold text-accent-600 dark:bg-accent-900/30 dark:text-accent-400">
            {user.name?.charAt(0)?.toUpperCase() ?? '?'}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900">
          {/* User info */}
          <div className="px-3.5 py-3">
            <p className="truncate text-sm font-medium text-stone-900 dark:text-stone-100">
              {user.name}
            </p>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user.email}</p>
          </div>

          <div className="my-1 h-px bg-stone-100 dark:bg-stone-800" />

          {/* Settings */}
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3.5 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            <Cog6ToothIcon className="size-4 shrink-0 text-stone-400" />
            Settings
          </Link>

          <div className="my-1 h-px bg-stone-100 dark:bg-stone-800" />

          {/* Sign out */}
          <button
            type="button"
            onClick={handleSignOut}
            className="flex w-full items-center gap-2.5 px-3.5 py-2 text-sm text-stone-700 transition-colors hover:bg-stone-50 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
