import { createContext, useContext, useEffect, useRef, useState } from 'react';

export const EXIT_MS = 180;

/**
 * Keeps the last non-null value rendered for EXIT_MS after it becomes null,
 * so overlays can play an exit animation instead of disappearing.
 */
export function usePresence<T>(value: T | null): { shown: T | null; closing: boolean } {
  const [shown, setShown] = useState<T | null>(value);
  const [closing, setClosing] = useState(false);
  const timer = useRef<number>();

  useEffect(() => {
    window.clearTimeout(timer.current);
    if (value !== null) { setShown(value); setClosing(false); return; }
    if (shown === null) return;
    setClosing(true);
    timer.current = window.setTimeout(() => { setShown(null); setClosing(false); }, EXIT_MS);
    return () => window.clearTimeout(timer.current);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return { shown, closing };
}

export const ClosingContext = createContext(false);
export const useClosing = () => useContext(ClosingContext);
