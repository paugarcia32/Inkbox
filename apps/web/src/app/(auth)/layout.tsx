import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50">
      <div className="absolute left-4 top-4">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm font-medium text-stone-500 dark:text-stone-400 transition hover:text-stone-900 dark:hover:text-stone-100"
        >
          <span>←</span>
          <span>hako</span>
        </Link>
      </div>
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}
