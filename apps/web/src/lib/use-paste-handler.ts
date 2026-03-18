'use client';

import { useCallback, useEffect } from 'react';

export function usePasteHandler(onUrl: (url: string) => void) {
  // biome-ignore lint/correctness/useExhaustiveDependencies: onUrl is the dependency being stabilized
  const stable = useCallback(onUrl, [onUrl]);

  useEffect(() => {
    function handle(e: ClipboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target.isContentEditable
      )
        return;

      const text = e.clipboardData?.getData('text/plain')?.trim() ?? '';
      try {
        new URL(text);
        stable(text);
      } catch {
        // not a URL — ignore
      }
    }

    document.addEventListener('paste', handle);
    return () => document.removeEventListener('paste', handle);
  }, [stable]);
}
