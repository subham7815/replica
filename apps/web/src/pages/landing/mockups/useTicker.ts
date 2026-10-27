import { useEffect, useState } from 'react';

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

// Loops a step counter 0..steps-1; with reduced motion it parks on the final (fully resolved) frame.
export function useTicker(steps: number, intervalMs: number, active: boolean) {
  const [reduced] = useState(prefersReducedMotion);
  const [t, setT] = useState(reduced ? steps - 1 : 0);

  useEffect(() => {
    if (!active || reduced) return;
    const id = setInterval(() => setT((x) => (x + 1) % steps), intervalMs);
    return () => clearInterval(id);
  }, [active, reduced, steps, intervalMs]);

  return t;
}
