"use client";

// Interactive district map, modelled on PolitikKu's seat map: a big stage label
// names what you point at; clicking isolates and zooms into a district while the
// others dim; a side panel becomes that district's report card; Esc zooms out and
// the view lives in the URL hash so it can be shared.
//
// Colour answers one question at a glance — better or worse than the Kedah
// average? — on a validated red↔grey↔blue diverging scale, or names a district's
// type on a validated categorical set. Names and values are printed on the map,
// so colour is never the only channel. Penang and Perlis are drawn in grey for
// context. Indicators with several survey releases get a play-through timeline.

import Link from "next/link";
import { geoMercator, geoPath } from "d3-geo";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import geo from "@/data/kedah.geo.json";
import contextGeo from "@/data/context.geo.json";
import { fmt, formatValue, tx, type FormatSpec, type Locale } from "@/lib/i18n";
import { useWidth } from "@/lib/useWidth";

export type MapCategory = { key: string; label: string; short: string; rule: string; color: string };
export type MapYear = { year: number; values: Record<string, number>; ref: number; note: string };

export type MapIndicator = {
  key: string;
  /** hash-friendly id, e.g. "kemiskinan" */
  slug: string;
  label: string;
  question: string;
  note: string;
  spec: FormatSpec;
  values: Record<string, number>;
  ref: number;
  refLabel: string;
  estimate?: boolean;
  /** diverging = better/worse than Kedah; sequential = plain magnitude; category = district type */
  mode: "diverging" | "sequential" | "category";
  better: "higher" | "lower" | null;
  /** how the gap to Kedah is measured and where the colour bands break */
  compare: "ratio" | "points" | "absolute";
  near: number;
  far: number;
  /** 5 labels worst→best (diverging) or [low, high] (sequential); unused for categories */
  legend: string[];
  /** category mode: district → category key, and the categories in legend order */
  cats?: Record<string, string>;
  categories?: MapCategory[];
  /** earlier releases for the timeline, oldest first; the latest equals `values` */
  years?: MapYear[];
};

type Props = {
  lang: Locale;
  indicators: MapIndicator[];
  slugs: Record<string, string>;
  /** full-bleed hero layout; this content opens the side panel when nothing is selected */
  hero?: ReactNode;
};

const ASPECT = 0.9;
const ZOOM_MS = 260;
const PLAY_MS = 1400;
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const SHORT: Record<string, string> = {
  Langkawi: "LGK", "Kubang Pasu": "KPS", "Padang Terap": "PTR", "Kota Setar": "KST", "Pokok Sena": "PSN",
  Pendang: "PDG", Yan: "YAN", Sik: "SIK", "Kuala Muda": "KMD", Baling: "BLG", Kulim: "KLM", "Bandar Baharu": "BBH",
};
// Labels for small coastal districts sit in the sea with a leader line (dx, dy as fractions of width).
const LEADER: Record<string, [number, number]> = { "Kota Setar": [-0.13, 0.0], Yan: [-0.1, 0.02] };

const FINE_MQ = "(hover: hover) and (pointer: fine)";
const subscribeFine = (cb: () => void) => {
  const mq = window.matchMedia(FINE_MQ);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};
const readFine = () => window.matchMedia(FINE_MQ).matches;
const subscribeResize = (cb: () => void) => {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
};

const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

const fc = geo as unknown as FeatureCollection<Geometry, { district: string }>;
const ctx = contextGeo as unknown as FeatureCollection<Geometry, { state: string; district: string }>;
type VB = [number, number, number, number];

function gapOf(ind: MapIndicator, v: number) {
  if (ind.compare === "ratio") return ind.ref ? (v / ind.ref - 1) * 100 : 0;
  return v - ind.ref;
}

/** 0..4 bin. Diverging: 0 = much worse, 2 = about the same, 4 = much better. Sequential: quintile of range. */
function binOf(ind: MapIndicator, v: number, lo: number, hi: number) {
  if (ind.mode === "sequential") return hi === lo ? 2 : Math.min(4, Math.floor(((v - lo) / (hi - lo)) * 5));
  const g = gapOf(ind, v) * (ind.better === "lower" ? -1 : 1);
  if (g <= -ind.far) return 0;
  if (g < -ind.near) return 1;
  if (g <= ind.near) return 2;
  if (g < ind.far) return 3;
  return 4;
}

const catOf = (ind: MapIndicator, n: string) => ind.categories?.find((c) => c.key === ind.cats?.[n]);
const rangeOf = (ind: MapIndicator) => {
  const vs = Object.values(ind.values);
  return vs.length ? [Math.min(...vs), Math.max(...vs)] : [0, 0];
};
/** fill for district `n` under indicator `i` */
function fillOf(i: MapIndicator, n: string) {
  if (i.mode === "category") return catOf(i, n)?.color ?? "var(--div-2)";
  const [lo, hi] = rangeOf(i);
  const b = binOf(i, i.values[n], lo, hi);
  return i.mode === "diverging" ? `var(--div-${b})` : `var(--seq-${b + 1})`;
}
const binFill = (i: MapIndicator, b: number) => (i.mode === "diverging" ? `var(--div-${b})` : `var(--seq-${b + 1})`);
function textFillOf(i: MapIndicator, n: string) {
  if (i.mode === "category") return "var(--ink)";
  const [lo, hi] = rangeOf(i);
  const b = binOf(i, i.values[n], lo, hi);
  return i.mode === "diverging" ? `var(--div-text-${b})` : `var(--seq-text-${b + 1})`;
}
const valueText = (i: MapIndicator, n: string) =>
  i.mode === "category" ? catOf(i, n)?.label ?? "" : formatValue(i.spec, i.values[n]);

export default function DistrictMap({ lang, indicators, slugs, hero }: Props) {
  const [active, setActive] = useState(indicators[0].key);
  const [year, setYear] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [showTable, setShowTable] = useState(false);
  const [copied, setCopied] = useState(false);
  const [box, W] = useWidth<HTMLDivElement>(620);
  const vh = useSyncExternalStore(subscribeResize, () => window.innerHeight, () => 860);
  const base = indicators.find((i) => i.key === active)!;
  // hero: fit the map, stage label, timeline and legend inside one screen
  const chrome = 260 + (base.years && base.years.length > 1 ? 64 : 0);
  const H = hero
    ? Math.round(Math.max(340, Math.min(W * ASPECT, W < 760 ? vh * 0.62 : vh - chrome)))
    : Math.round(W * ASPECT);
  // the indicator as shown: the chosen timeline year, or the latest release
  const ind = useMemo<MapIndicator>(() => {
    const y = year !== null ? base.years?.find((x) => x.year === year) : undefined;
    return y ? { ...base, values: y.values, ref: y.ref, note: y.note } : base;
  }, [base, year]);
  const years = base.years && base.years.length > 1 ? base.years.map((y) => y.year) : null;
  const shownYear = year ?? (years ? years[years.length - 1] : null);
  const isCat = ind.mode === "category";
  const names = useMemo(() => fc.features.map((f) => f.properties.district), []);
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({});
  // mouse vs touch: hover previews only for a fine pointer (false during SSR)
  const fine = useSyncExternalStore(subscribeFine, readFine, () => false);

  // ---- geometry (full view), recomputed only when the size changes
  const geom = useMemo(() => {
    const projection = geoMercator().fitExtent([[10, 10], [W - 10, H - 10]], fc);
    const path = geoPath(projection).digits(1);
    const out: Record<string, { d: string; c: [number, number]; b: [[number, number], [number, number]] }> = {};
    fc.features.forEach((f: Feature<Geometry, { district: string }>) => {
      const [cx, cy] = path.centroid(f);
      out[f.properties.district] = { d: path(f) ?? "", c: [Math.round(cx), Math.round(cy)], b: path.bounds(f) };
    });
    const island = { type: "FeatureCollection", features: ctx.features.filter((f) => ["Timur Laut", "Barat Daya"].includes(f.properties.district)) } as FeatureCollection;
    const perlis = ctx.features.find((f) => f.properties.state === "Perlis")!;
    const round = (p: [number, number]) => p.map(Math.round) as [number, number];
    const context = {
      shapes: ctx.features.map((f) => ({ key: f.properties.district, d: path(f) ?? "" })),
      penang: round(path.centroid(island)),
      perlis: round(path.centroid(perlis)),
      sea: round(projection([99.98, 5.72]) as [number, number]),
    };
    return { districts: out, context };
  }, [W, H]);
  const g = geom.districts;

  // ---- viewBox zoom (lerp, like PolitikKu's animateTo). The resting frame is derived
  // from the selection; an animation only blends from where we were towards it.
  const frameFor = useCallback(
    (name: string | null): VB => {
      if (!name) return [0, 0, W, H];
      const [[x0, y0], [x1, y1]] = g[name].b;
      // pad the district and never zoom past ~3.4× so neighbours stay visible for context
      let w = Math.max((x1 - x0) * 1.45, W / 3.4);
      let h = Math.max((y1 - y0) * 1.45, H / 3.4);
      if (w / h > W / H) h = w * (H / W);
      else w = h * (W / H);
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      return [cx - w / 2, cy - h / 2, w, h];
    },
    [g, W, H],
  );
  const [tween, setTween] = useState<{ from: VB; t: number } | null>(null);
  const target = frameFor(selected);
  const vb: VB = tween ? (tween.from.map((v, i) => v + (target[i] - v) * easeOut(tween.t)) as VB) : target;
  const vbNow = useRef<VB>(vb);
  useEffect(() => {
    vbNow.current = vb;
  });
  // The URL hash is written on user actions only (never from an effect), so reading a
  // shared link on load can't be overwritten by the default view.
  const current = useRef({ active, selected, year });
  useEffect(() => {
    current.current = { active, selected, year };
  });
  const writeHash = useCallback(
    (activeKey: string, name: string | null, yr: number | null) => {
      const p = new URLSearchParams({ peta: indicators.find((i) => i.key === activeKey)!.slug });
      if (name) p.set("daerah", slugs[name]);
      if (yr !== null) p.set("tahun", String(yr));
      const next = `#${p.toString()}`;
      if (window.location.hash !== next) history.replaceState(null, "", next);
    },
    [indicators, slugs],
  );
  const chooseIndicator = (key: string) => {
    setActive(key);
    setYear(null);
    setPlaying(false);
    writeHash(key, current.current.selected, null);
  };
  const chooseYear = (yr: number | null) => {
    setYear(yr);
    writeHash(current.current.active, current.current.selected, yr);
  };
  const anim = useRef<number | null>(null);
  const select = useCallback((name: string | null, fromUrl = false) => {
    if (anim.current) cancelAnimationFrame(anim.current);
    setSelected(name);
    if (!fromUrl) writeHash(current.current.active, name, current.current.year);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTween(null);
      return;
    }
    const from = vbNow.current;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / ZOOM_MS);
      setTween(t < 1 ? { from, t } : null);
      if (t < 1) anim.current = requestAnimationFrame(step);
    };
    anim.current = requestAnimationFrame(step);
  }, [writeHash]);

  // ---- URL hash: #peta=<indicator>&daerah=<district>&tahun=<year>
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(window.location.hash.slice(1));
      const i = indicators.find((x) => x.slug === p.get("peta"));
      if (i) setActive(i.key);
      const yr = Number(p.get("tahun"));
      setYear(i?.years?.some((y) => y.year === yr) ? yr : null);
      const dn = Object.keys(slugs).find((n) => slugs[n] === p.get("daerah"));
      select(dn ?? null, true);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [indicators, slugs, select]);

  // ---- timeline playback: step through the releases once, then stop on the latest
  useEffect(() => {
    if (!playing || !years) return;
    const id = window.setInterval(() => {
      const at = years.indexOf(current.current.year ?? years[years.length - 1]);
      if (at >= years.length - 1) {
        setPlaying(false);
        return;
      }
      const next = years[at + 1];
      setYear(next === years[years.length - 1] ? null : next);
    }, PLAY_MS);
    return () => window.clearInterval(id);
  }, [playing, years]);
  const play = () => {
    if (!years) return;
    if (playing) return setPlaying(false);
    setYear(years[0]);
    setPlaying(true);
  };

  // ---- stats for the current indicator
  const [lo, hi] = rangeOf(ind);
  const ranked = useMemo(() => Object.entries(ind.values).sort((a, b) => b[1] - a[1]), [ind]);
  const rankOf = (n: string) => ranked.findIndex(([x]) => x === n) + 1;
  const f = (v: number) => formatValue(ind.spec, v);
  const bins = Object.fromEntries(names.map((n) => [n, isCat ? 2 : binOf(ind, ind.values[n], lo, hi)]));

  const comparison = (i: MapIndicator, v: number) => {
    const gp = gapOf(i, v);
    const unit = i.compare === "ratio" ? "%" : i.compare === "points" ? tx(lang, " mata peratusan", " percentage points") : "";
    const size = `${fmt(lang, Math.abs(gp), i.compare === "ratio" ? 0 : 1)}${unit}`;
    const b = binOf(i, v, lo, hi);
    const same = i.mode === "diverging" ? b === 2 : Math.abs(gp) < i.near;
    if (i.compare === "absolute" && i.ref === 0 && !i.better) {
      // net migration: describe the direction of moves, not a gap to "zero"
      const text = same
        ? tx(lang, "pergerakan masuk dan keluar hampir seimbang", "moves in and out roughly balance")
        : gp > 0
          ? tx(lang, `lebih ramai berpindah masuk (bersih ${size} bagi setiap 1,000 penduduk)`, `more people move in (net ${size} per 1,000 residents)`)
          : tx(lang, `lebih ramai berpindah keluar (bersih ${size} bagi setiap 1,000 penduduk)`, `more people move out (net ${size} per 1,000 residents)`);
      return { text, tone: "neutral" as const };
    }
    if (same) return { text: tx(lang, `hampir sama dengan ${i.refLabel} (${formatValue(i.spec, i.ref)})`, `about the same as ${i.refLabel} (${formatValue(i.spec, i.ref)})`), tone: "same" as const };
    const higher = gp > 0;
    const text = tx(lang, `${size} ${higher ? "lebih tinggi" : "lebih rendah"} daripada ${i.refLabel} (${formatValue(i.spec, i.ref)})`,
      `${size} ${higher ? "higher" : "lower"} than ${i.refLabel} (${formatValue(i.spec, i.ref)})`);
    if (i.mode !== "diverging" || !i.better) return { text, tone: "neutral" as const };
    const good = (i.better === "higher") === higher;
    return { text, tone: good ? ("better" as const) : ("worse" as const) };
  };
  /** one-line description of district `n` under the current indicator */
  const describe = (n: string) => (isCat ? catOf(ind, n)?.rule ?? "" : comparison(ind, ind.values[n]).text);
  const toneLabel = (tone: string) =>
    ({ better: tx(lang, "Lebih baik", "Better"), worse: tx(lang, "Lebih teruk", "Worse"), same: tx(lang, "Setara", "Similar"), neutral: "" })[tone] ?? "";
  const rankText = (n: string) => (isCat ? "" : tx(lang, ` Kedudukan ${rankOf(n)} daripada 12.`, ` Rank ${rankOf(n)} of 12.`));

  // ---- keyboard: arrows move to the nearest district in that direction
  const move = (from: string, key: string) => {
    const [fx, fy] = g[from].c;
    const dir = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] }[key];
    if (!dir) return null;
    let best: string | null = null;
    let bestScore = Infinity;
    for (const n of names) {
      if (n === from) continue;
      const dx = g[n].c[0] - fx;
      const dy = g[n].c[1] - fy;
      const along = dx * dir[0] + dy * dir[1];
      if (along <= 0) continue;
      const across = Math.abs(dx * dir[1] - dy * dir[0]);
      const score = along + across * 2;
      if (score < bestScore) [best, bestScore] = [n, score];
    }
    return best;
  };
  const onPathKey = (e: React.KeyboardEvent, name: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      select(name === selected ? null : name);
    } else if (e.key === "Escape") {
      select(null);
    } else {
      const next = move(name, e.key);
      if (next) {
        e.preventDefault();
        pathRefs.current[next]?.focus();
        if (selected) select(next);
      }
    }
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selected) select(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, select]);

  const zoom = W / vb[2];
  const small = W < 480;
  const focus = hover ?? selected;
  const sel = selected;
  const selCmp = sel && !isCat ? comparison(ind, ind.values[sel]) : null;
  const announce = sel ? `${sel}: ${valueText(ind, sel)}. ${cap(describe(sel))}.${rankText(sel)}` : "";

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked: the URL bar already holds the link */
    }
  };

  const pickerProps = { lang, indicators, active, onChoose: chooseIndicator, titled: !!hero };

  return (
    <div className={`dmap${hero ? " hero" : ""}`}>
      {!hero && <Picker where="main" {...pickerProps} />}
      {hero && (
        <div className="dmap-sm-top">
          <div className="dmap-intro">{hero}</div>
          <Picker where="sm" {...pickerProps} />
        </div>
      )}

      <div className="dmap-layout">
        {/* ---------------- stage */}
        <div className={`dmap-stage${hero ? "" : " card"}`} ref={box}>
          <div className="dmap-stage-label" aria-hidden="true">
            {focus ? (
              <>
                <div className="dmap-stage-name">{focus}</div>
                <div className="dmap-stage-value">
                  <span className="dmap-chip" style={{ background: fillOf(ind, focus) }} />
                  {valueText(ind, focus)}
                  <span className="muted"> · {describe(focus)}</span>
                </div>
              </>
            ) : (
              <>
                <div className="dmap-stage-name">{ind.question}</div>
                <div className="dmap-stage-value muted">
                  {!isCat && ind.ref !== 0 && <>{ind.refLabel}: {f(ind.ref)} · </>}{fine ? tx(lang, "Tuding atau klik pada daerah", "Point at or click a district") : tx(lang, "Ketik pada daerah", "Tap a district")}
                </div>
              </>
            )}
          </div>

          <svg
            viewBox={vb.map((n) => n.toFixed(2)).join(" ")}
            width="100%"
            height={H}
            role="group"
            aria-label={tx(lang, `Peta daerah Kedah: ${ind.label}${shownYear ? `, ${shownYear}` : ""}. Guna Tab dan kekunci anak panah untuk bergerak antara daerah, Enter untuk memilih, Esc untuk kembali.`,
              `Map of Kedah's districts: ${ind.label}${shownYear ? `, ${shownYear}` : ""}. Use Tab and the arrow keys to move between districts, Enter to select, Esc to go back.`)}
            className={sel ? "has-sel" : undefined}
            onClick={(e) => {
              if (e.target === e.currentTarget) select(null);
            }}
          >
            {/* neighbours for context: not interactive */}
            <g className="dmap-context" aria-hidden="true">
              {geom.context.shapes.map((s) => (
                <path key={s.key} d={s.d} />
              ))}
              <text x={geom.context.penang[0]} y={geom.context.penang[1]} fontSize={10.5 / zoom} textAnchor="middle">PULAU PINANG</text>
              <text x={geom.context.perlis[0]} y={geom.context.perlis[1]} fontSize={10.5 / zoom} textAnchor="middle">PERLIS</text>
              <text x={geom.context.sea[0]} y={geom.context.sea[1]} fontSize={11 / zoom} textAnchor="middle" className="sea">
                {tx(lang, "Selat Melaka", "Strait of Malacca")}
              </text>
            </g>
            {names.map((n) => (
              <path
                key={n}
                ref={(el) => {
                  pathRefs.current[n] = el;
                }}
                d={g[n].d}
                className={`dmap-district${sel === n ? " sel" : ""}${sel && sel !== n ? " dim" : ""}${hover === n ? " hot" : ""}`}
                style={{ fill: fillOf(ind, n) }}
                tabIndex={0}
                role="button"
                aria-pressed={sel === n}
                aria-label={`${n}: ${valueText(ind, n)}, ${describe(n)}.${rankText(n)}`}
                onPointerEnter={() => fine && setHover(n)}
                onPointerLeave={() => fine && setHover(null)}
                onFocus={() => setHover(n)}
                onBlur={() => setHover(null)}
                onClick={() => select(n === sel ? null : n)}
                onKeyDown={(e) => onPathKey(e, n)}
              />
            ))}
            {/* labels on the map: name + value (colour is never the only channel) */}
            {names.map((n) => {
              const [cx, cy] = g[n].c;
              // sea labels would hang off-screen while zoomed elsewhere, so fold them in
              const lead = sel && sel !== n ? undefined : LEADER[n];
              const [lx, ly] = lead ? [cx + lead[0] * W, cy + lead[1] * W] : [cx, cy];
              const fs = (small ? 10 : hero && W > 800 ? 12.5 : 11.5) / zoom;
              const textFill = lead ? "var(--ink)" : textFillOf(ind, n);
              const halo = lead || isCat ? "var(--surface)" : fillOf(ind, n);
              const second = isCat ? catOf(ind, n)?.short ?? "" : f(ind.values[n]);
              return (
                <g key={n} className={`dmap-label${sel && sel !== n ? " dim" : ""}`} aria-hidden="true">
                  {lead && <line x1={lx + 4 / zoom} y1={ly} x2={cx} y2={cy} className="dmap-leader" />}
                  <text x={lx} y={ly - fs * 0.15} textAnchor={lead ? "end" : "middle"} fontSize={fs}
                    style={{ fill: textFill, stroke: halo, strokeWidth: 3 / zoom }} className="dmap-name">
                    {small && !sel ? SHORT[n] : n}
                  </text>
                  {!(small && isCat && !sel) && (
                    <text x={lx} y={ly + fs * 1.05} textAnchor={lead ? "end" : "middle"} fontSize={fs * 0.92}
                      style={{ fill: textFill, stroke: halo, strokeWidth: 3 / zoom }} className="dmap-val">
                      {second}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {sel && (
            <button type="button" className="dmap-back" onClick={() => select(null)}>
              ← {tx(lang, "Semua daerah", "All districts")} <kbd>Esc</kbd>
            </button>
          )}

          {/* timeline: several survey releases */}
          {years && (
            <div className="dmap-time" role="group" aria-label={tx(lang, "Tahun data", "Data year")}>
              <button type="button" className="dmap-play" onClick={play} aria-pressed={playing}
                aria-label={playing ? tx(lang, "Jeda", "Pause") : tx(lang, "Main semua tahun", "Play all years")}>
                <span aria-hidden="true">{playing ? "❚❚" : "▶"}</span>
              </button>
              <span className="dmap-year tnum" aria-live="polite">{shownYear}</span>
              <span className="dmap-years">
                {years.map((y, i) => (
                  <button key={y} type="button" aria-pressed={y === shownYear}
                    onClick={() => { setPlaying(false); chooseYear(i === years.length - 1 ? null : y); }}>
                    {y}
                  </button>
                ))}
              </span>
            </div>
          )}

          {/* legend */}
          <div className="dmap-legend">
            {isCat ? (
              <ul className="dmap-legend-cats">
                {ind.categories!.map((c) => (
                  <li key={c.key}><span className="dmap-chip" style={{ background: c.color }} />{c.label}</li>
                ))}
              </ul>
            ) : (
              <>
                <div className="dmap-legend-scale" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((b) => (
                    <span key={b} style={{ background: binFill(ind, b) }} />
                  ))}
                </div>
                <div className={`dmap-legend-labels${ind.mode === "sequential" ? " two" : ""}`}>
                  {ind.legend.map((l) => (
                    <span key={l}>{l}</span>
                  ))}
                </div>
              </>
            )}
            <p className="source" style={{ marginTop: 8 }}>
              {ind.estimate && <span className="badge estimate">{tx(lang, "Anggaran", "Estimate")}</span>} {ind.note}
            </p>
          </div>
          <div className="sr-only" aria-live="polite">{announce}</div>
        </div>

        {/* ---------------- panel */}
        <aside className={`dmap-panel${hero ? "" : " card"}`} aria-label={tx(lang, "Butiran", "Details")}>
          {hero && !sel && <div className="dmap-intro dmap-lg">{hero}</div>}
          {hero && <Picker where="lg" {...pickerProps} />}
          {sel ? (
            <div>
              <p className="dmap-kicker">{ind.label}{shownYear ? ` · ${shownYear}` : ""}</p>
              <h3 className="dmap-title">{sel}</h3>
              <div className={`dmap-big${isCat ? " cat" : ""}`}>
                {isCat && <span className="dmap-chip" style={{ background: fillOf(ind, sel) }} />}
                {valueText(ind, sel)}
              </div>
              {selCmp && selCmp.tone !== "neutral" && (
                <span className={`dmap-tone ${selCmp.tone}`}>
                  <span aria-hidden="true">{selCmp.tone === "better" ? "▲" : selCmp.tone === "worse" ? "▼" : "●"}</span>
                  {toneLabel(selCmp.tone)}
                </span>
              )}
              <p className="secondary" style={{ margin: "6px 0 2px" }}>{cap(describe(sel))}.</p>
              {!isCat && (
                <p className="muted small" style={{ margin: 0 }}>
                  {tx(lang, `Kedudukan ${rankOf(sel)} daripada 12 (1 = paling tinggi)`, `Rank ${rankOf(sel)} of 12 (1 = highest)`)}
                </p>
              )}

              {!isCat && <Strip ind={ind} lo={lo} hi={hi} focus={sel} lang={lang} bins={bins} />}

              <table className="dmap-rows">
                <caption className="sr-only">{tx(lang, `Semua penunjuk bagi ${sel}`, `All indicators for ${sel}`)}</caption>
                <tbody>
                  {indicators.map((i) => (
                    <tr key={i.key} className={i.key === active ? "on" : undefined}>
                      <th scope="row">
                        <button type="button" onClick={() => chooseIndicator(i.key)}>{i.label}</button>
                      </th>
                      <td>
                        <span className="dmap-chip" style={{ background: fillOf(i, sel) }} />
                        {valueText(i, sel)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="dmap-actions">
                <Link className="dmap-btn primary" href={`/${lang}/daerah/${slugs[sel]}/`}>
                  {tx(lang, "Profil penuh", "Full profile")} →
                </Link>
                <button type="button" className="dmap-btn" onClick={copyLink}>
                  {copied ? tx(lang, "Pautan disalin ✓", "Link copied ✓") : tx(lang, "Salin pautan", "Copy link")}
                </button>
              </div>
            </div>
          ) : isCat ? (
            <div>
              <p className="dmap-kicker">{ind.label}</p>
              <h3 className="dmap-title dmap-q" style={{ fontSize: "1.15rem" }}>{ind.question}</h3>
              <div className="dmap-groups">
                {ind.categories!.map((c) => {
                  const members = names.filter((n) => ind.cats?.[n] === c.key);
                  return (
                    <div key={c.key} className="dmap-group">
                      <div className="dmap-group-h"><span className="dmap-chip" style={{ background: c.color }} />{c.label} <span className="muted">· {members.length}</span></div>
                      <p className="muted small">{c.rule}</p>
                      <div className="dmap-group-list">
                        {members.map((n) => (
                          <button key={n} type="button" onClick={() => select(n)}
                            onPointerEnter={() => fine && setHover(n)} onPointerLeave={() => fine && setHover(null)}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <p className="dmap-kicker">{ind.label}{shownYear ? ` · ${shownYear}` : ""}</p>
              <h3 className="dmap-title dmap-q" style={{ fontSize: "1.15rem" }}>{ind.question}</h3>
              <div className="dmap-extremes">
                <button type="button" onClick={() => select(ranked[0][0])}>
                  <span className="muted small">{tx(lang, "Paling tinggi", "Highest")}</span>
                  <strong>{ranked[0][0]}</strong>
                  <span>{f(ranked[0][1])}</span>
                </button>
                <button type="button" onClick={() => select(ranked[ranked.length - 1][0])}>
                  <span className="muted small">{tx(lang, "Paling rendah", "Lowest")}</span>
                  <strong>{ranked[ranked.length - 1][0]}</strong>
                  <span>{f(ranked[ranked.length - 1][1])}</span>
                </button>
              </div>
              {ind.mode === "diverging" && ind.better && (
                <p className="small secondary" style={{ margin: "10px 0 0" }}>
                  {(() => {
                    const better = names.filter((n) => bins[n] >= 3).length;
                    const worse = names.filter((n) => bins[n] <= 1).length;
                    return tx(lang, `${better} daerah lebih baik dan ${worse} daerah lebih teruk daripada purata Kedah.`,
                      `${better} districts are better and ${worse} worse than the Kedah average.`);
                  })()}
                </p>
              )}
              <Strip ind={ind} lo={lo} hi={hi} focus={hover} lang={lang} bins={bins} onPick={select} />
              <ol className="dmap-list">
                {ranked.map(([n, v], i) => (
                  <li key={n}>
                    <button
                      type="button"
                      onClick={() => select(n)}
                      onPointerEnter={() => fine && setHover(n)}
                      onPointerLeave={() => fine && setHover(null)}
                      data-active={hover === n}
                    >
                      <span className="n">{i + 1}</span>
                      <span className="dmap-chip" style={{ background: fillOf(ind, n) }} />
                      <span className="nm">{n}</span>
                      <span className="v">{f(v)}</span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {!sel && (
            <button type="button" className="dmap-link" onClick={() => setShowTable((s) => !s)} aria-expanded={showTable}>
              {showTable ? tx(lang, "Sembunyikan jadual", "Hide table") : tx(lang, "Lihat sebagai jadual", "View as a table")}
            </button>
          )}
        </aside>
      </div>

      {showTable && !sel && (
        <div className={`table-wrap${hero ? " wrap" : ""}`} style={{ marginTop: 12 }}>
          <table>
            <caption className="sr-only">{ind.label}</caption>
            <thead>
              <tr>
                <th scope="col">{tx(lang, "Daerah", "District")}</th>
                <th scope="col">{ind.label}</th>
                <th scope="col" style={{ textAlign: "left" }}>
                  {isCat ? tx(lang, "Peraturan", "Rule") : tx(lang, `Berbanding ${ind.refLabel}`, `Compared with ${ind.refLabel}`)}
                </th>
                {!isCat && <th scope="col">{tx(lang, "Kedudukan", "Rank")}</th>}
              </tr>
            </thead>
            <tbody>
              {(isCat ? names.map((n) => [n, 0] as [string, number]) : ranked).map(([n]) => (
                <tr key={n}>
                  <td><Link href={`/${lang}/daerah/${slugs[n]}/`}>{n}</Link></td>
                  <td>{valueText(ind, n)}</td>
                  <td style={{ textAlign: "left", whiteSpace: "normal" }}>{cap(describe(n))}</td>
                  {!isCat && <td>{rankOf(n)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Indicator picker — native radios, so arrow keys work out of the box. The hero
 *  renders it twice (panel on desktop, above the map on phones); CSS shows one. */
function Picker({ where, lang, indicators, active, onChoose, titled }: {
  where: string; lang: Locale; indicators: MapIndicator[]; active: string; onChoose: (key: string) => void; titled: boolean;
}) {
  return (
    <fieldset className={`dmap-picker ${where}`}>
      <legend className={titled ? "dmap-picker-title" : "sr-only"}>{tx(lang, "Warna peta mengikut", "Colour the map by")}</legend>
      {indicators.map((i) => (
        <label key={i.key} className={i.key === active ? "on" : undefined}>
          <input type="radio" name={`dmap-indicator-${where}`} value={i.key} checked={i.key === active} onChange={() => onChoose(i.key)} />
          {i.label}
        </label>
      ))}
    </fieldset>
  );
}

/** A number line of all 12 districts with the Kedah average marked — the whole
 *  distribution in one glance, synced with the map. */
function Strip({ ind, lo, hi, focus, lang, bins, onPick }: {
  ind: MapIndicator; lo: number; hi: number; focus: string | null; lang: Locale;
  bins: Record<string, number>; onPick?: (n: string) => void;
}) {
  const [ref, w] = useWidth<HTMLDivElement>(320);
  const pad = 10;
  const span = Math.max(hi, ind.ref) - Math.min(lo, ind.ref) || 1;
  const min = Math.min(lo, ind.ref);
  const x = (v: number) => pad + ((v - min) / span) * (w - pad * 2);
  // stack dots that would overlap into rows
  const sorted = Object.entries(ind.values).sort((a, b) => a[1] - b[1]);
  const rows: number[] = [];
  const lastX: number[] = [];
  sorted.forEach(([, v], i) => {
    const px = x(v);
    let r = 0;
    while (lastX[r] !== undefined && px - lastX[r] < 12) r++;
    lastX[r] = px;
    rows[i] = r;
  });
  const H = 44 + Math.max(...rows) * 12;
  return (
    <div ref={ref} className="dmap-strip">
      <svg width={w} height={H} role="img" aria-label={tx(lang, `Taburan 12 daerah; garis tegak ialah ${ind.refLabel}.`, `Spread of the 12 districts; the vertical line is ${ind.refLabel}.`)}>
        <line x1={pad} x2={w - pad} y1={20} y2={20} className="dmap-strip-axis" />
        <line x1={x(ind.ref)} x2={x(ind.ref)} y1={8} y2={H - 14} className="dmap-strip-ref" />
        <text x={x(ind.ref)} y={H - 2} textAnchor="middle" className="dmap-strip-text">{ind.refLabel}</text>
        {sorted.map(([n, v], i) => {
          const on = n === focus;
          return (
            <circle
              key={n}
              cx={x(v)}
              cy={20 + rows[i] * 12}
              r={on ? 7 : 5}
              style={{ fill: binFill(ind, bins[n]) }}
              className={`dmap-dot${on ? " on" : ""}`}
              onClick={onPick ? () => onPick(n) : undefined}
            >
              <title>{`${n}: ${formatValue(ind.spec, v)}`}</title>
            </circle>
          );
        })}
        <text x={pad} y={H - 2} className="dmap-strip-text">{formatValue(ind.spec, lo)}</text>
        <text x={w - pad} y={H - 2} textAnchor="end" className="dmap-strip-text">{formatValue(ind.spec, hi)}</text>
      </svg>
    </div>
  );
}
