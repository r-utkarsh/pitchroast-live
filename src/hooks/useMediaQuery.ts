import { useSyncExternalStore } from 'react';

/**
 * Tailwind breakpoint helper for the rare case where a layout needs a
 * different DOM tree (not just different classes), e.g. avoiding duplicate
 * action buttons that would break strict locators.
 */
export default function useMediaQuery(query: string): boolean {
  function subscribe(onChange: () => void) {
    const list = window.matchMedia(query);
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }

  function getSnapshot() {
    return window.matchMedia(query).matches;
  }

  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
