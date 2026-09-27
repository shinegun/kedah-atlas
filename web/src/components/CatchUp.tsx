"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { fmt, rm, tx, type Locale } from "@/lib/i18n";

export type Preset = { key: string; label: string; rate: number; note: string };

type Props = {
  lang: Locale;
  /** latest year with data; projections start here */
  year: number;
  /** GDP per person, RM (2015 prices) */
  kedahPc: number;
  malaysiaPc: number;
  /** % a year, 2015 to `year` */
  kedahPopGrowth: number;
  malaysiaPcGrowth: number;
  presets: Preset[];
};

const AXIS_SPAN = 60; // years shown on the timeline
const MIN = 1;
const MAX = 22;

/**
 * "How long until Kedah catches up?" A what-if calculator, not a forecast:
 * Kedah's real GDP grows at the chosen rate, its population at its recent rate,
 * and Malaysia's GDP per person keeps its recent pace.
 */
export default function CatchUp({ lang, year, kedahPc, malaysiaPc, kedahPopGrowth, malaysiaPcGrowth, presets }: Props) {
  const id = useId();
  const [rate, setRate] = useState(presets[0].rate);

  const run = (g: number) => {
    const pcG = (1 + g / 100) / (1 + kedahPopGrowth / 100) - 1;
    const mG = malaysiaPcGrowth / 100;
    const double = year + Math.log(2) / Math.log(1 + g / 100);
    const catchUp = pcG > mG ? year + Math.log(malaysiaPc / kedahPc) / Math.log((1 + pcG) / (1 + mG)) : null;
    const share10 = ((kedahPc * (1 + pcG) ** 10) / (malaysiaPc * (1 + mG) ** 10)) * 100;
    return { pcG: pcG * 100, double: Math.ceil(double), catchUp: catchUp === null ? null : Math.ceil(catchUp), share10 };
  };
  const now = run(rate);
  const custom = !presets.some((p) => p.rate === rate);
  const rows = [...presets.map((p) => ({ ...p, active: p.rate === rate })),
    ...(custom ? [{ key: "custom", label: tx(lang, "Pilihan anda", "Your choice"), rate, note: "", active: true }] : [])];

  const pos = (y: number) => `${Math.min(100, ((y - year) / AXIS_SPAN) * 100)}%`;
  const ticks = Array.from({ length: AXIS_SPAN / 10 + 1 }, (_, i) => year + i * 10);
  const rateTxt = `${fmt(lang, rate, 1)}%`;

  return (
    <div className="card cu">
      <div className="cu-controls">
        <label htmlFor={`${id}-r`} className="cu-label">
          {tx(lang, "Pertumbuhan KDNK benar Kedah setahun", "Kedah's real GDP growth a year")}
          <strong className="tnum">{rateTxt}</strong>
        </label>
        <input
          id={`${id}-r`}
          type="range"
          min={MIN}
          max={MAX}
          step={0.1}
          value={rate}
          onChange={(e) => setRate(+e.target.value)}
          aria-valuetext={rateTxt}
        />
        <div className="cu-chips" role="group" aria-label={tx(lang, "Kadar contoh", "Example rates")}>
          {presets.map((p) => (
            <button key={p.key} type="button" aria-pressed={p.rate === rate} onClick={() => setRate(p.rate)}>
              {p.label} <span className="tnum">{fmt(lang, p.rate, 1)}%</span>
            </button>
          ))}
        </div>
      </div>

      <p className="cu-answer" aria-live="polite">
        {now.catchUp === null
          ? tx(lang,
            `Pada kadar ${rateTxt} setahun, KDNK Kedah berganda menjelang ${now.double}. Tetapi KDNK per kapita Kedah tidak akan mengejar purata Malaysia — jurangnya kekal atau melebar.`,
            `At ${rateTxt} a year, Kedah's GDP doubles by ${now.double}. But its GDP per person never catches the Malaysian average — the gap stays or widens.`)
          : tx(lang,
            `Pada kadar ${rateTxt} setahun, KDNK Kedah berganda menjelang ${now.double}, dan KDNK per kapita Kedah menyamai purata Malaysia menjelang ${now.catchUp}.`,
            `At ${rateTxt} a year, Kedah's GDP doubles by ${now.double}, and its GDP per person reaches the Malaysian average by ${now.catchUp}.`)}
      </p>

      <div className="stats">
        <div className="stat">
          <div className="label">{tx(lang, "KDNK Kedah berganda", "Kedah's GDP doubles")}</div>
          <div className="value tnum">{now.double}</div>
          <div className="context">{tx(lang, `daripada ${year}`, `from ${year}`)}</div>
        </div>
        <div className="stat">
          <div className="label">{tx(lang, "Menyamai purata Malaysia", "Reaches Malaysian average")}</div>
          <div className="value tnum">{now.catchUp ?? tx(lang, "Tidak pernah", "Never")}</div>
          <div className="context">{tx(lang, "KDNK per kapita", "GDP per person")}</div>
        </div>
        <div className="stat">
          <div className="label">{tx(lang, `Kedah pada ${year + 10}`, `Kedah in ${year + 10}`)}</div>
          <div className="value tnum">{fmt(lang, Math.min(now.share10, 999), 0)}%</div>
          <div className="context">
            {tx(lang, `daripada purata Malaysia (kini ${fmt(lang, (kedahPc / malaysiaPc) * 100, 0)}%)`,
              `of the Malaysian average (now ${fmt(lang, (kedahPc / malaysiaPc) * 100, 0)}%)`)}
          </div>
        </div>
      </div>

      <h3 className="cu-h">{tx(lang, "Tahun KDNK per kapita Kedah menyamai purata Malaysia", "Year Kedah's GDP per person reaches the Malaysian average")}</h3>
      <p className="muted small" style={{ margin: "-8px 0 0" }}>
        {tx(lang, "Jika Kedah tumbuh pada kadar purata setiap tempat dalam tempoh yang dinyatakan.", "If Kedah grew at each place's average rate over the period shown.")}
      </p>
      <ol className="cu-rows">
        {rows.map((r) => {
          const res = run(r.rate);
          return (
            <li key={r.key} className={r.active ? "on" : undefined}>
              <span className="cu-row-label">
                {r.label} <span className="tnum muted">{fmt(lang, r.rate, 1)}%</span>
                {r.note && <span className="cu-note">{r.note}</span>}
              </span>
              <span className="cu-track">
                {res.catchUp === null || res.catchUp > year + AXIS_SPAN ? (
                  <span className="cu-never">{res.catchUp === null ? tx(lang, "tidak pernah →", "never →") : `${res.catchUp} →`}</span>
                ) : (
                  <span className="cu-dot" style={{ left: pos(res.catchUp) }}>
                    <span className="tnum">{res.catchUp}</span>
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="cu-axis" aria-hidden="true">
        <span />
        <span className="cu-ticks">
          {ticks.map((t) => (
            <span key={t} style={{ left: pos(t) }}>{t}</span>
          ))}
        </span>
      </div>

      <p className="source">
        <span className="badge estimate">{tx(lang, "Anggaran", "Estimate")}</span>{" "}
        {tx(lang,
          `Kalkulator ini ialah senario, bukan ramalan. Titik mula: KDNK per kapita Kedah ${rm(lang, kedahPc)} dan Malaysia ${rm(lang, malaysiaPc)} (${year}, harga malar 2015). Andaian: penduduk Kedah bertambah ${fmt(lang, kedahPopGrowth, 2)}% setahun dan KDNK per kapita Malaysia tumbuh ${fmt(lang, malaysiaPcGrowth, 2)}% setahun, seperti purata 2015–${year}. Sumber: DOSM.`,
          `This calculator is a scenario, not a forecast. Starting point: GDP per person of ${rm(lang, kedahPc)} in Kedah and ${rm(lang, malaysiaPc)} in Malaysia (${year}, 2015 prices). Assumes Kedah's population grows ${fmt(lang, kedahPopGrowth, 2)}% a year and Malaysia's GDP per person ${fmt(lang, malaysiaPcGrowth, 2)}% a year, as on average in 2015–${year}. Source: DOSM.`)}{" "}
        <Link href={`/${lang}/kaedah/#catch-up`}>{tx(lang, "Kaedah →", "Method →")}</Link>
      </p>
    </div>
  );
}
