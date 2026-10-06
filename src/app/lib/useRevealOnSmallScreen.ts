import { useEffect, useRef } from 'react';

export function useRevealOnSmallScreen<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!key || window.innerWidth >= 1024) return;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [key]);

  return ref;
}
