'use client';

import { useEffect, useRef } from 'react';

interface ScrollSentinelProps {
  onIntersect: () => void;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
}

export function ScrollSentinel({
  onIntersect,
  isFetchingNextPage,
  hasNextPage,
}: ScrollSentinelProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          onIntersect();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onIntersect, hasNextPage, isFetchingNextPage]);

  if (!hasNextPage && !isFetchingNextPage) return null;

  return (
    <div ref={ref} className="flex justify-center py-4">
      {isFetchingNextPage && (
        <div className="size-4 animate-spin rounded-full border-2 border-stone-300 border-t-stone-500 dark:border-stone-700 dark:border-t-stone-400" />
      )}
    </div>
  );
}
