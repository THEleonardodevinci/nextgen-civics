'use client';

import { useEffect, useState } from 'react';

/** Thin progress bar pinned under the header while reading an article. */
export default function ReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="sticky top-16 z-30 h-[3px] bg-transparent" aria-hidden>
      <div className="h-full bg-gold transition-[width] duration-75" style={{ width: `${pct}%` }} />
    </div>
  );
}
