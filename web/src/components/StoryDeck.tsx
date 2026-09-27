"use client";

// Stories-style slides: progress bars along the top, tap the right side (or swipe
// left, or press →) for the next slide and the left side for the previous one.
// No auto-advance — readers set the pace. The slide number lives in the URL hash
// (#3) so a slide can be shared.

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { tx, type Locale } from "@/lib/i18n";

export type Slide = { key: string; theme?: "dark" | "light" | "accent" | "gold"; label: string; content: ReactNode };

type Props = {
  lang: Locale;
  title: string;
  slides: Slide[];
  exit: { href: string; label: string };
  next?: { href: string; label: string };
  /** keep the slide number in the URL hash (off when the page uses the hash itself) */
  syncHash?: boolean;
};

export default function StoryDeck({ lang, title, slides, exit, next, syncHash = true }: Props) {
  const [i, setI] = useState(0);
  const n = slides.length;
  const touch = useRef<{ x: number; y: number } | null>(null);

  const go = useCallback((to: number) => {
    const k = Math.max(0, Math.min(n - 1, to));
    setI(k);
    if (syncHash) history.replaceState(null, "", k ? `#${k + 1}` : window.location.pathname);
  }, [n, syncHash]);

  useEffect(() => {
    if (!syncHash) return;
    const read = () => {
      const k = Number(window.location.hash.slice(1));
      setI(Number.isFinite(k) && k >= 1 && k <= n ? k - 1 : 0);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [n, syncHash]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") { e.preventDefault(); go(i + 1); }
      if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(i - 1); }
      if (e.key === "Home") go(0);
      if (e.key === "End") go(n - 1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [i, n, go]);

  // tap zones: left third = back, rest = forward (links and buttons inside keep working)
  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest("a, button, input, select, label")) return;
    const r = e.currentTarget.getBoundingClientRect();
    go(e.clientX - r.left < r.width / 3 ? i - 1 : i + 1);
  };
  const onTouchStart = (e: React.TouchEvent) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY });
  const onTouchEnd = (e: React.TouchEvent) => {
    const t0 = touch.current;
    touch.current = null;
    if (!t0) return;
    const dx = e.changedTouches[0].clientX - t0.x;
    const dy = e.changedTouches[0].clientY - t0.y;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? i + 1 : i - 1);
  };

  const s = slides[i];
  return (
    <section className="deck" aria-roledescription={tx(lang, "slaid", "slides")} aria-label={title}>
      <div className="deck-top">
        <div className="deck-bars" aria-hidden="true">
          {slides.map((x, k) => (
            <button key={x.key} type="button" tabIndex={-1} className={k < i ? "done" : k === i ? "now" : undefined} onClick={() => go(k)} />
          ))}
        </div>
        <div className="deck-meta">
          <span className="deck-title">{title}</span>
          <span className="deck-count tnum">{i + 1} / {n}</span>
          <Link className="deck-exit" href={exit.href} aria-label={exit.label} title={exit.label}>✕</Link>
        </div>
      </div>

      <div
        className={`deck-stage theme-${s.theme ?? "light"}`}
        onClick={onClick}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div key={s.key} className="deck-slide" role="group" aria-roledescription={tx(lang, "slaid", "slide")}
          aria-label={`${i + 1} / ${n}: ${s.label}`}>
          {s.content}
        </div>
      </div>

      <div className="deck-nav">
        <button type="button" onClick={() => go(i - 1)} disabled={i === 0}>← {tx(lang, "Sebelum", "Back")}</button>
        <span className="muted small deck-hint">{tx(lang, "Ketik, leret atau guna kekunci ← →", "Tap, swipe or use the ← → keys")}</span>
        {i < n - 1 ? (
          <button type="button" className="primary" onClick={() => go(i + 1)}>{tx(lang, "Seterusnya", "Next")} →</button>
        ) : next ? (
          <Link className="primary" href={next.href}>{next.label} →</Link>
        ) : (
          <Link className="primary" href={exit.href}>{exit.label}</Link>
        )}
      </div>
      <div className="sr-only" aria-live="polite">{`${i + 1} / ${n}: ${s.label}`}</div>
    </section>
  );
}
