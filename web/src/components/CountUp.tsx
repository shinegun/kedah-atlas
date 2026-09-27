"use client";

import { useEffect, useRef, useState } from "react";
import { fmt, type Locale } from "@/lib/i18n";

/**
 * A number that counts up from zero the first time it scrolls into view. The
 * server renders the final value (no-JS, crawlers, reduced motion all see it);
 * the animation only runs while the element is off-screen-then-visible.
 */
export default function CountUp({ lang, value, digits = 0, suffix = "", ms = 900 }: {
  lang: Locale; value: number; digits?: number; suffix?: string; ms?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms);
        setShown(value * (1 - Math.pow(1 - t, 3)));
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.6 });
    // only animate numbers that start below the fold
    if (el.getBoundingClientRect().top > window.innerHeight) io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, ms]);
  return (
    <span ref={ref} aria-label={`${fmt(lang, value, digits)}${suffix}`}>
      <span aria-hidden="true">{fmt(lang, shown, digits)}{suffix}</span>
    </span>
  );
}
