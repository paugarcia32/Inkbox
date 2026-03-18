'use client';

import { ThemeSelector } from '@/components/theme-selector';
import { authClient, signOut, useSession } from '@/lib/auth';
import { trpc } from '@/lib/trpc';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function SectionCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white dark:border-stone-700 dark:bg-stone-900">
      {children}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-stone-100 px-6 py-5 dark:border-stone-800">
      <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">{title}</h2>
      {description && (
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">{description}</p>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();

  // Profile
  const [name, setName] = useState('');
  const [namePending, setNamePending] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  useEffect(() => {
    if (session?.user?.name) setName(session.user.name);
  }, [session?.user?.name]);

  async function handleSaveName(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setNamePending(true);
    setNameError(false);
    const { error } = await authClient.updateUser({ name: name.trim() });
    setNamePending(false);
    if (error) {
      setNameError(true);
    } else {
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  }

  // Delete account
  const [showConfirm, setShowConfirm] = useState(false);
  const deleteAccount = trpc.users.deleteAccount.useMutation({
    onSuccess: async () => {
      await signOut();
      router.push('/login');
    },
  });

  if (!session?.user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-semibold text-stone-900 dark:text-stone-100">Settings</h1>

      <div className="space-y-6">
        {/* Profile */}
        <SectionCard>
          <SectionHeader title="Profile" description="Update your display name." />
          <form onSubmit={handleSaveName} className="px-6 py-5">
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="settings-name"
                  className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300"
                >
                  Display name
                </label>
                <input
                  id="settings-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-900 outline-none transition focus:border-accent-400 focus:ring-2 focus:ring-accent-500/15 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:focus:border-accent-600"
                />
              </div>

              <div>
                <p className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300">
                  Email
                </p>
                <p className="rounded-lg border border-stone-200 bg-stone-50 px-3.5 py-2.5 text-sm text-stone-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-400">
                  {session.user.email}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={namePending || !name.trim()}
                  className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-accent-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {namePending ? 'Saving…' : 'Save changes'}
                </button>
                {nameSaved && (
                  <span className="text-sm text-stone-500 dark:text-stone-400">Saved!</span>
                )}
                {nameError && (
                  <span className="text-sm text-red-500">Failed to save. Try again.</span>
                )}
              </div>
            </div>
          </form>
        </SectionCard>

        {/* Appearance */}
        <SectionCard>
          <SectionHeader title="Appearance" description="Choose how Hako looks to you." />
          <div className="px-6 py-5">
            <ThemeSelector />
          </div>
        </SectionCard>

        {/* Danger zone */}
        <div className="rounded-xl border border-red-200 bg-white dark:border-red-900/60 dark:bg-stone-900">
          <div className="border-b border-red-100 px-6 py-5 dark:border-red-900/40">
            <h2 className="text-base font-semibold text-red-700 dark:text-red-400">Danger zone</h2>
            <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
              Irreversible actions that affect your account.
            </p>
          </div>

          <div className="px-6 py-5">
            {!showConfirm ? (
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                    Delete account
                  </p>
                  <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
                    Permanently delete your account and all your items and collections.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowConfirm(true)}
                  className="shrink-0 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                >
                  Delete account
                </button>
              </div>
            ) : (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-900/10">
                <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                  Are you sure you want to delete your account?
                </p>
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                  This will permanently delete all your items, collections, and account data. This
                  action cannot be undone.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => deleteAccount.mutate()}
                    disabled={deleteAccount.isPending}
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleteAccount.isPending ? 'Deleting…' : 'Yes, delete my account'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={deleteAccount.isPending}
                    className="rounded-lg border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50 disabled:opacity-50 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
                  >
                    Cancel
                  </button>
                </div>
                {deleteAccount.isError && (
                  <p className="mt-3 text-sm text-red-600 dark:text-red-400">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
