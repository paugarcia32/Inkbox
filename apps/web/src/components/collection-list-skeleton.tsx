/**
 * Structured skeleton that mirrors the visual shape of a collection list row.
 * Each row: color-dot placeholder | name bar | spacer | count bar
 */

// [name%, count-px] pairs — vary to look organic
const ROWS: [number, number][] = [
  [52, 18],
  [38, 22],
  [61, 14],
  [44, 20],
  [57, 16],
];

export function CollectionListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <ul className="space-y-0.5">
      {Array.from({ length: count }).map((_, i) => {
        const [namePct, countW] = ROWS[i % ROWS.length] ?? [50, 16];
        return (
          <li key={namePct} className="flex h-10 items-center gap-3 rounded-lg px-2">
            {/* Color dot placeholder */}
            <div className="size-2 shrink-0 rounded-full bg-stone-200 animate-pulse dark:bg-stone-700/70" />
            {/* Collection name bar */}
            <div
              className="h-2.5 rounded-full bg-stone-200 animate-pulse dark:bg-stone-700/70"
              style={{ width: `${namePct}%` }}
            />
            <div className="flex-1" />
            {/* Item count bar */}
            <div
              className="h-2 rounded-full bg-stone-200 animate-pulse dark:bg-stone-700/70"
              style={{ width: `${countW}px` }}
            />
          </li>
        );
      })}
    </ul>
  );
}
