"use client";

// A small, non-blocking card that asks the reader to send the page to someone.
// It waits for a moment of real interest (the last slide of a deck, or most of a
// long page read after some time on it), shows at most once per visit, and backs
// off for weeks after "Not now" or a share. Never on arrival, never a full-screen overlay.

import { track } from "@vercel/analytics";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { tx, type Locale } from "@/lib/i18n";

/** StoryDeck fires this when a reader reaches the last slide. */
export const DECK_END_EVENT = "kk:deck-end";

const STORE_KEY = "kk-share-snooze"; // localStorage: epoch ms until which we stay quiet
const SESSION_KEY = "kk-share-shown"; // sessionStorage: already asked this visit
const DAY = 86_400_000;
const SNOOZE_DISMISS = 14 * DAY;
const SNOOZE_SHARED = 90 * DAY;
const MIN_DWELL = 20_000; // on the current page before a scroll can trigger it
const SCROLL_DEPTH = 0.7;

function canAsk() {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return false;
    return Date.now() > Number(localStorage.getItem(STORE_KEY) ?? 0);
  } catch {
    return false; // storage blocked: we couldn't remember a "Not now", so don't ask at all
  }
}

function snooze(ms: number) {
  try {
    localStorage.setItem(STORE_KEY, String(Date.now() + ms));
  } catch {}
}

type Props = { lang: Locale; districtNames: Record<string, string> };

export default function SharePrompt({ lang, districtNames }: Props) {
  const path = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canNative, setCanNative] = useState(false);

  const slug = path.match(/\/daerah\/([^/]+)/)?.[1];
  const district = slug ? districtNames[slug] : undefined;

  useEffect(() => {
    let timer: number | undefined;
    const arrived = Date.now();
    const show = () => {
      if (!canAsk()) return;
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      timer = window.setTimeout(() => {
        setCanNative(typeof navigator.share === "function");
        setOpen(true);
      }, 700);
      cleanup();
    };
    const onScroll = () => {
      const doc = document.documentElement;
      if (doc.scrollHeight < window.innerHeight * 1.6) return; // short page: nothing to "finish"
      const depth = (window.scrollY + window.innerHeight) / doc.scrollHeight;
      if (depth >= SCROLL_DEPTH && Date.now() - arrived >= MIN_DWELL) show();
    };
    const cleanup = () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener(DECK_END_EVENT, show);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener(DECK_END_EVENT, show);
    return () => {
      cleanup();
      window.clearTimeout(timer);
    };
  }, [path]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      snooze(SNOOZE_DISMISS);
      setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;

  const url = `${window.location.origin}${window.location.pathname}`;
  const pageTitle = document.title.replace(/\s·\sKedahKu$/, "");
  const message = district
    ? tx(lang, `${district} dalam angka: ekonomi, pekerjaan dan taraf hidup, daripada data rasmi DOSM.`,
        `${district} in numbers: the economy, jobs and living standards, from official DOSM data.`)
    : `${pageTitle} — KedahKu`;
  const enc = encodeURIComponent;
  const targets = [
    { name: "WhatsApp", href: `https://wa.me/?text=${enc(`${message}\n${url}`)}`, primary: true },
    { name: "Telegram", href: `https://t.me/share/url?url=${enc(url)}&text=${enc(message)}` },
    { name: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${enc(url)}` },
    { name: "X", href: `https://x.com/intent/tweet?text=${enc(message)}&url=${enc(url)}` },
  ];

  function dismiss() {
    snooze(SNOOZE_DISMISS);
    setOpen(false);
  }
  // Counted (without personal data) so we can tell which channels people actually use.
  const shared = (channel: string) => {
    snooze(SNOOZE_SHARED);
    track("share", { channel });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      shared("copy");
    } catch {}
  };
  const native = async () => {
    try {
      await navigator.share({ title: pageTitle, text: message, url });
      shared("native");
      setOpen(false);
    } catch {} // cancelled: leave the card open
  };

  return (
    <aside className="share-prompt" role="dialog" aria-labelledby="share-prompt-title">
      <button type="button" className="share-x" onClick={dismiss} aria-label={tx(lang, "Tutup", "Close")}>✕</button>
      <p id="share-prompt-title" className="share-title">
        {district ? tx(lang, `Kenal sesiapa dari ${district}?`, `Know someone from ${district}?`)
          : tx(lang, "Ada kawan yang patut tahu tentang ini?", "Know someone who should see this?")}
      </p>
      <p className="share-body">
        {district
          ? tx(lang, `Hantar profil ${district} kepada mereka. Angka rasmi yang mudah dibaca, dan setiap angka ada sumbernya.`,
              `Send them ${district}'s profile: official numbers, easy to read, every one sourced.`)
          : tx(lang, "Hantar halaman ini kepada seorang kawan, atau ke kumpulan WhatsApp keluarga.",
              "Send this page to a friend, or to the family WhatsApp group.")}
      </p>
      <div className="share-actions">
        {targets.map((x) => (
          <a key={x.name} href={x.href} target="_blank" rel="noopener noreferrer"
            className={x.primary ? "share-btn primary" : "share-btn"} onClick={() => shared(x.name)}>
            {x.name}
          </a>
        ))}
        <button type="button" className="share-btn" onClick={copy}>
          {copied ? tx(lang, "Pautan disalin ✓", "Link copied ✓") : tx(lang, "Salin pautan", "Copy link")}
        </button>
        {canNative && (
          <button type="button" className="share-btn" onClick={native}>{tx(lang, "Lagi…", "More…")}</button>
        )}
      </div>
      <button type="button" className="share-later" onClick={dismiss}>{tx(lang, "Bukan sekarang", "Not now")}</button>
    </aside>
  );
}
