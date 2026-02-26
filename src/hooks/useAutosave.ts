import { useEffect, useRef } from "react";

/**
 * Auto-saves editor changes after a debounce period.
 * Skips the initial mount and node-switch re-initialization to avoid false saves.
 * Flushes pending saves on unmount AND on node switch (covers AI-generated changes
 * that haven't triggered a timeout yet).
 */
export function useAutosave(
  saveFn: () => void,
  triggers: unknown[],
  nodeId: string,
  delay = 800,
) {
  const saveFnRef = useRef(saveFn);
  saveFnRef.current = saveFn;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Skip 2: first for the initial effect run, second for the re-init setState re-render
  const skipRef = useRef(2);
  // Track whether any real changes happened since the last save
  const dirtyRef = useRef(false);

  // Reset skip counter when node changes — flush any unsaved work first
  useEffect(() => {
    if (dirtyRef.current) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      saveFnRef.current();
      dirtyRef.current = false;
    }
    skipRef.current = 2;
  }, [nodeId]);

  // Debounced save on trigger change
  useEffect(() => {
    if (skipRef.current > 0) {
      skipRef.current--;
      return;
    }

    dirtyRef.current = true;

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveFnRef.current();
      dirtyRef.current = false;
      timeoutRef.current = null;
    }, delay);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, triggers);

  // Flush pending save on unmount (user clicked away)
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (dirtyRef.current) {
        saveFnRef.current();
        dirtyRef.current = false;
      }
    };
  }, []);
}
