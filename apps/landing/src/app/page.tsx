import { ThemeToggle } from '@/components/theme-toggle';
import {
  DevicePhoneMobileIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  LinkIcon,
  PlayCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';

const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-50">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 border-b border-stone-200 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
          <span className="text-lg font-bold tracking-tight">hako</span>
          <nav className="flex items-center gap-2">
            <Link
              href={`${appUrl}/login`}
              className="px-3 py-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 transition hover:text-stone-900 dark:hover:text-stone-100"
            >
              Log in
            </Link>
            <Link
              href={`${appUrl}/register`}
              className="rounded-lg bg-accent-500 px-3.5 py-1.5 text-sm font-semibold text-white transition hover:bg-accent-600"
            >
              Get started
            </Link>
            <ThemeToggle />
          </nav>
        </div>
      </header>

      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight leading-tight sm:text-6xl">
          The internet
          <br />
          <span className="text-accent-500">can wait.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-stone-500 dark:text-stone-400 leading-relaxed">
          Save anything from the web — articles, tweets, videos, posts — and read it whenever you're
          ready. No noise, no algorithm. Just your collection.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href={`${appUrl}/register`}
            className="rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
          >
            Start for free
          </Link>
          <Link
            href={`${appUrl}/login`}
            className="rounded-lg border border-stone-200 dark:border-stone-700 px-5 py-2.5 text-sm font-medium text-stone-700 dark:text-stone-300 transition hover:border-stone-300 dark:hover:border-stone-600 hover:bg-stone-100 dark:hover:bg-stone-800"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* ── Features ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <h2 className="mb-6 text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
          What you can save
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            icon={<DocumentTextIcon className="size-5" />}
            title="Articles & News"
            description="Save any article from the web. Hako strips away ads and distractions so you can read in a clean, focused view."
          />
          <FeatureCard
            icon={<XIcon />}
            title="Tweets & Threads"
            description="Found a thread worth reading later? Save individual tweets or full threads. No more losing posts in the endless scroll."
          />
          <FeatureCard
            icon={<PinterestIcon />}
            title="Pinterest Posts"
            description="Save pins and boards you want to revisit — inspiration, recipes, or design ideas you're not ready to act on yet."
          />
          <FeatureCard
            icon={<PlayCircleIcon className="size-5" />}
            title="YouTube Videos"
            description="Queue up videos without losing them to the algorithm. Watch on your own time, inside the app or linked directly."
          />
          <FeatureCard
            icon={<LinkIcon className="size-5" />}
            title="Any Link"
            description="If it lives on the internet, you can save it. Blog posts, newsletters, Reddit threads, product pages — all of it."
          />
        </div>
      </section>

      {/* ── Platforms ──────────────────────────────────────────────── */}
      <section className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto max-w-5xl px-6 py-16 flex flex-col items-center text-center gap-6">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-stone-400 dark:text-stone-500">
            Available on
          </h2>
          <div className="flex flex-wrap justify-center gap-3">
            <PlatformBadge
              icon={<GlobeAltIcon className="size-5" />}
              label="Web"
              sublabel="Any browser"
            />
            <PlatformBadge
              icon={<DevicePhoneMobileIcon className="size-5" />}
              label="iOS"
              sublabel="With share extension"
            />
            <PlatformBadge
              icon={<DevicePhoneMobileIcon className="size-5" />}
              label="Android"
              sublabel="With share extension"
            />
          </div>
        </div>
      </section>

      {/* ── Footer CTA ─────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto max-w-5xl px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm font-medium text-stone-500 dark:text-stone-400 italic">
            Save now. Read when it matters.
          </p>
          <Link
            href={`${appUrl}/register`}
            className="rounded-lg bg-accent-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-600"
          >
            Get started →
          </Link>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 p-5 transition hover:border-stone-300 dark:hover:border-stone-600">
      <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-accent-50 dark:bg-accent-900/30 text-accent-500">
        {icon}
      </div>
      <h3 className="mb-1.5 text-sm font-semibold text-stone-900 dark:text-stone-100">{title}</h3>
      <p className="text-sm leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
    </div>
  );
}

function PlatformBadge({
  icon,
  label,
  sublabel,
}: { icon: React.ReactNode; label: string; sublabel: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-100 dark:bg-stone-800 px-4 py-3">
      <span className="text-stone-500 dark:text-stone-400">{icon}</span>
      <div className="text-left">
        <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">{label}</p>
        <p className="text-xs text-stone-500 dark:text-stone-400">{sublabel}</p>
      </div>
    </div>
  );
}

// Brand-specific icons (not in Heroicons — kept as minimal SVG)
function XIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function PinterestIcon() {
  return (
    <svg className="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.373 0 0 5.373 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 0 1 .083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.632-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z" />
    </svg>
  );
}
