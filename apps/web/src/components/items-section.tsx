'use client';

import { ItemListSkeleton } from '@/components/item-list-skeleton';
import { type ReactNode, useEffect, useState } from 'react';

interface ItemsSectionProps {
  /** True only on the very first load (no cached data yet). */
  isLoading: boolean;
  /** True during any network request, including filter refetches. */
  isFetching?: boolean;
  children: ReactNode;
  /** Custom skeleton to show while loading. Defaults to ItemListSkeleton. */
  skeleton?: ReactNode;
}

/**
 * Wraps item lists with a crossfade between the loading skeleton and
 * the real content:
 *
 * - Skeleton fades OUT (150ms) while being removed from normal flow so
 *   it doesn't push the appearing content down.
 * - Content fades IN (180ms) simultaneously, starting from opacity 0
 *   with a subtle upward translate.
 * - When a filter refetch is in progress (isFetching but !isLoading),
 *   the existing content dims to 50% to signal activity.
 */
export function ItemsSection({ isLoading, isFetching, children, skeleton }: ItemsSectionProps) {
  const [skeletonMounted, setSkeletonMounted] = useState(isLoading);
  const [skeletonExiting, setSkeletonExiting] = useState(false);

  useEffect(() => {
    if (!isLoading && skeletonMounted) {
      // Trigger the CSS fade-out, then unmount after it finishes
      setSkeletonExiting(true);
      const t = setTimeout(() => {
        setSkeletonMounted(false);
        setSkeletonExiting(false);
      }, 150);
      return () => clearTimeout(t);
    }

    if (isLoading && !skeletonMounted) {
      // Loading restarted (e.g. hard refresh while data was cached)
      setSkeletonMounted(true);
      setSkeletonExiting(false);
    }
    return;
  }, [isLoading, skeletonMounted]);

  return (
    <div className="relative">
      {/* Skeleton — fades out and becomes absolute so it overlays
          the incoming content without pushing it down. */}
      {skeletonMounted && (
        <div
          className={[
            'transition-opacity duration-150',
            skeletonExiting ? 'pointer-events-none opacity-0 absolute inset-x-0 top-0' : '',
          ].join(' ')}
        >
          {skeleton ?? <ItemListSkeleton />}
        </div>
      )}

      {/* Real content — fades in when data is ready. */}
      {!isLoading && (
        <div
          className="animate-fade-in transition-opacity duration-150"
          style={{ opacity: isFetching ? 0.5 : 1 }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
