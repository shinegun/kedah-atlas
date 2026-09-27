"use client";

import { useEffect, useRef, useState } from "react";

/** Measures an element's width so SVG charts can draw at real pixel size
 *  (text stays legible on phones instead of shrinking with a fixed viewBox). */
export function useWidth<T extends HTMLElement>(initial: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(initial);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}
