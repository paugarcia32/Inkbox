import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="mb-8">
          <div className="mb-6">
            <span className="text-2xl font-bold tracking-tight">inkbox</span>
          </div>
          <h1 className="text-2xl font-semibold leading-snug">
            Welcome back
          </h1>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Sign in to continue reading.
          </p>
        </div>

        {/* Form */}
        <form className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/15 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-sm text-stone-900 placeholder-stone-400 outline-none transition focus:border-accent-500 focus:ring-2 focus:ring-accent-500/15 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100 dark:placeholder-stone-500"
            />
          </div>

          <button
            type="submit"
            className="mt-2 w-full rounded-lg bg-accent-500 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600 active:bg-accent-700"
          >
            Sign in
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-500 dark:text-stone-400">
          No account?{' '}
          <Link href="/register" className="font-medium text-accent-500 transition-colors hover:text-accent-400">
            Create one
          </Link>
        </p>

      </div>
    </div>
  );
}
