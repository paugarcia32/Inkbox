/**
 * Structured skeleton that mirrors the visual shape of an ItemRow.
 * Title widths are percentage-based so they scale proportionally with
 * the container width (max-w-3xl ≈ 720px effective), rather than
 * fixed pixel values that look too short on wide screens.
 */

// [title%, domain%] pairs — vary enough to look organic
const ROWS: [number, number][] = [
  [44, 16],
  [56, 14],
  [38, 17],
  [51, 13],
  [42, 15],
  [49, 16],
  [35, 14],
  [53, 15],
];

export function ItemListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="space-y-0.5">
      {Array.from({ length: count }).map((_, i) => {
        const [titlePct, domainPct] = ROWS[i % ROWS.length];
        return (
          <li key={i} className="flex h-10 items-center gap-3 px-2">
            {/* Favicon */}
            <div className="size-4 shrink-0 rounded bg-stone-200 animate-pulse dark:bg-stone-700/70" />
            {/* Title */}
            <div
              className="h-2.5 rounded-full bg-stone-200 animate-pulse dark:bg-stone-700/70"
              style={{ width: `${titlePct}%` }}
            />
            <div className="flex-1" />
            {/* Domain */}
            <div
              className="h-2 rounded-full bg-stone-200 animate-pulse dark:bg-stone-700/70"
              style={{ width: `${domainPct}%` }}
            />
          </li>
        );
      })}
    </ul>
  );
}
