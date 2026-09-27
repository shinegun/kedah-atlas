"use client";

// What-if simulator on top of the district forecast. Each Kedah sector grows at a
// chosen rate from its latest published level; every district keeps its modelled
// share of each sector (the backtested model); the two named projects add
// manufacturing output in their districts on top of the trend. Ranges reuse the
// model's P10–P90 widths, so a scenario moves the centre, not the uncertainty.

import Link from "next/link";
import { useState } from "react";
import FanChart from "@/components/FanChart";
import { fmt, rm, rmBillion, sectorLabel, tx, type Locale } from "@/lib/i18n";

type Sector = "services" | "manufacturing" | "agriculture" | "construction" | "mining";
const EDITABLE: Sector[] = ["manufacturing", "services", "agriculture", "construction"];

export type Project = {
  key: string;
  label: string;
  note: string;
  district: string;
  /** extra jobs by projection year (above trend) */
  jobs: number[];
};

type Props = {
  lang: Locale;
  projYears: number[];
  knownUntil: number;
  stateBase: Record<Sector, number>;
  baseline: Record<Sector, number>;
  penang: Record<Sector, number>;
  shares: Record<string, Record<Sector, number[]>>;
  districtBand: Record<string, Record<string, [number, number]>>;
  kedahBand: Record<string, [number, number]>;
  history: { year: number; value: number }[];
  population: Record<number, number>;
  districtPopulation: Record<string, Record<number, number>>;
  malaysiaPc: { year: number; value: number; growth: number };
  /** each district's modelled GDP in the last known year */
  start: Record<string, number>;
  productivity: number;
  projects: Project[];
  slugs: Record<string, string>;
};

export default function ScenarioSim(p: Props) {
  const { lang, projYears } = p;
  const [growth, setGrowth] = useState<Record<Sector, number>>(p.baseline);
  const [on, setOn] = useState<Record<string, boolean>>({});
  const last = projYears[projYears.length - 1];
  const n = projYears.length;
  const districts = Object.keys(p.shares);

  const run = (g: Record<Sector, number>, projects: Record<string, boolean>) => {
    const byDistrict: Record<string, number[]> = {};
    for (const d of districts) byDistrict[d] = projYears.map(() => 0);
    (Object.keys(p.stateBase) as Sector[]).forEach((s) => {
      projYears.forEach((_, i) => {
        const total = p.stateBase[s] * (1 + g[s] / 100) ** (i + 1);
        for (const d of districts) byDistrict[d][i] += p.shares[d][s][i] * total;
      });
    });
    let jobs = 0;
    for (const pr of p.projects) {
      if (!projects[pr.key]) continue;
      projYears.forEach((_, i) => (byDistrict[pr.district][i] += (pr.jobs[i] * p.productivity) / 1e6));
      jobs += pr.jobs[n - 1];
    }
    const kedah = projYears.map((_, i) => districts.reduce((a, d) => a + byDistrict[d][i], 0));
    return { byDistrict, kedah, jobs };
  };
  const base = run(p.baseline, {});
  const now = run(growth, on);
  const changed = EDITABLE.some((s) => growth[s] !== p.baseline[s]) || Object.values(on).some(Boolean);

  // the range opens from the last published point, so the fan starts at the data
  const band = (vals: number[], ratio: (y: number) => [number, number]) => [
    { year: p.knownUntil, p50: p.history[p.history.length - 1].value, p10: p.history[p.history.length - 1].value, p90: p.history[p.history.length - 1].value },
    ...projYears.map((y, i) => ({ year: y, p50: vals[i], p10: vals[i] * ratio(y)[0], p90: vals[i] * ratio(y)[1] })),
  ];
  const kedahRatio = (y: number) => p.kedahBand[String(y)];
  const start = p.history[p.history.length - 1].value;
  const k30 = now.kedah[n - 1];
  const cagr = ((k30 / start) ** (1 / n) - 1) * 100;
  const pc30 = (k30 / p.population[last]) * 1000;
  const my30 = p.malaysiaPc.value * (1 + p.malaysiaPc.growth / 100) ** (last - p.malaysiaPc.year);
  const pcStart = (start / p.population[p.knownUntil]) * 1000;

  const presets: { key: string; label: string; g: Record<Sector, number>; projects: Record<string, boolean> }[] = [
    { key: "base", label: tx(lang, "Trend semasa", "Current trend"), g: p.baseline, projects: {} },
    { key: "penang", label: tx(lang, "Kadar Pulau Pinang", "Penang's pace"), g: { ...p.baseline, ...pick(p.penang) }, projects: Object.fromEntries(p.projects.map((x) => [x.key, true])) },
    { key: "slow", label: tx(lang, "Kelembapan", "Slowdown"), g: Object.fromEntries(Object.entries(p.baseline).map(([k, v]) => [k, +(v - 1.5).toFixed(1)])) as Record<Sector, number>, projects: {} },
  ];
  const isPreset = (pr: (typeof presets)[number]) =>
    EDITABLE.every((s) => Math.abs(growth[s] - pr.g[s]) < 1e-9) && p.projects.every((x) => !!on[x.key] === !!pr.projects[x.key]);

  const rows = districts
    .map((d) => {
      const v30 = now.byDistrict[d][n - 1];
      const d25 = p.start[d];
      return { d, v30, g: ((v30 / d25) ** (1 / n) - 1) * 100, pc: (v30 / p.districtPopulation[d][last]) * 1000, band: p.districtBand[d][String(last)] };
    })
    .sort((a, b) => b.g - a.g);
  const maxG = Math.max(...rows.map((r) => Math.abs(r.g)), 1);

  return (
    <div className="sim">
      <div className="sim-controls card">
        <div className="sim-presets" role="group" aria-label={tx(lang, "Senario siap", "Ready-made scenarios")}>
          {presets.map((pr) => (
            <button key={pr.key} type="button" aria-pressed={isPreset(pr)} onClick={() => { setGrowth(pr.g); setOn(pr.projects); }}>
              {pr.label}
            </button>
          ))}
        </div>
        <div className="sim-sliders">
          {EDITABLE.map((s) => (
            <label key={s} className="sim-slider">
              <span className="sim-slider-h">
                <span>{sectorLabel[s][lang]}</span>
                <strong className="tnum">{fmt(lang, growth[s], 1)}% <span className="muted">{tx(lang, "setahun", "a year")}</span></strong>
              </span>
              <input type="range" min={-3} max={12} step={0.1} value={growth[s]}
                onChange={(e) => setGrowth((g) => ({ ...g, [s]: +e.target.value }))}
                aria-valuetext={`${fmt(lang, growth[s], 1)}%`} />
              <span className="muted small">{tx(lang, `Trend ${fmt(lang, p.baseline[s], 1)}% · Pulau Pinang ${fmt(lang, p.penang[s], 1)}%`, `Trend ${fmt(lang, p.baseline[s], 1)}% · Penang ${fmt(lang, p.penang[s], 1)}%`)}</span>
            </label>
          ))}
        </div>
        <div className="sim-projects">
          {p.projects.map((pr) => (
            <label key={pr.key} className={`sim-toggle${on[pr.key] ? " on" : ""}`}>
              <input type="checkbox" checked={!!on[pr.key]} onChange={(e) => setOn((o) => ({ ...o, [pr.key]: e.target.checked }))} />
              <span>
                <strong>{pr.label}</strong>
                <span className="muted small">{pr.note}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="stats" aria-live="polite">
        <div className="stat">
          <div className="label">{tx(lang, `KDNK Kedah, ${last}`, `Kedah GDP, ${last}`)}</div>
          <div className="value tnum">{rmBillion(lang, k30)}</div>
          <div className="context">{tx(lang, "Julat", "Range")} {rmBillion(lang, k30 * kedahRatio(last)[0])}–{rmBillion(lang, k30 * kedahRatio(last)[1])}</div>
        </div>
        <div className="stat">
          <div className="label">{tx(lang, `Pertumbuhan setahun, ${p.knownUntil}–${last}`, `Growth a year, ${p.knownUntil}–${last}`)}</div>
          <div className="value tnum">{fmt(lang, cagr, 1)}%</div>
          <div className="context">{tx(lang, `Trend: ${fmt(lang, ((base.kedah[n - 1] / start) ** (1 / n) - 1) * 100, 1)}%`, `Trend: ${fmt(lang, ((base.kedah[n - 1] / start) ** (1 / n) - 1) * 100, 1)}%`)}</div>
        </div>
        <div className="stat">
          <div className="label">{tx(lang, `KDNK per kapita, ${last}`, `GDP per person, ${last}`)}</div>
          <div className="value tnum">{rm(lang, pc30)}</div>
          <div className="context">{tx(lang, `${fmt(lang, (pc30 / my30) * 100, 0)}% daripada purata Malaysia (kini ${fmt(lang, (pcStart / p.malaysiaPc.value) * 100, 0)}%)`, `${fmt(lang, (pc30 / my30) * 100, 0)}% of the Malaysian average (now ${fmt(lang, (pcStart / p.malaysiaPc.value) * 100, 0)}%)`)}</div>
        </div>
        <div className="stat">
          <div className="label">{tx(lang, `Pekerjaan tambahan projek, ${last}`, `Extra project jobs, ${last}`)}</div>
          <div className="value tnum">{fmt(lang, now.jobs, 0)}</div>
          <div className="context">{tx(lang, "melebihi trend", "above trend")}</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>{tx(lang, "KDNK Kedah", "Kedah GDP")} <span className="badge estimate">{tx(lang, "Unjuran", "Projection")}</span></h3>
        <p className="sub">{tx(lang, "RM bilion, harga malar 2015", "RM billion, constant 2015 prices")}</p>
        <FanChart
          lang={lang}
          knownUntil={p.knownUntil}
          spec={{ lang, kind: "num", digits: 1 }}
          ariaLabel={tx(lang, "KDNK Kedah: sebenar dan unjuran", "Kedah GDP: actual and projected")}
          series={[
            { key: "base", label: tx(lang, "Trend semasa", "Current trend"), color: "var(--s-services)",
              actual: p.history.map((h) => ({ year: h.year, value: h.value / 1000 })),
              forecast: band(base.kedah, kedahRatio).map((b) => ({ year: b.year, p10: b.p10 / 1000, p50: b.p50 / 1000, p90: b.p90 / 1000 })) },
            ...(changed ? [{ key: "sc", label: tx(lang, "Senario anda", "Your scenario"), color: "var(--s-manufacturing)", actual: [],
              forecast: band(now.kedah, kedahRatio).map((b) => ({ year: b.year, p10: b.p10 / 1000, p50: b.p50 / 1000, p90: b.p90 / 1000 })) }] : []),
          ]}
        />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>{tx(lang, `Daerah mengikut pertumbuhan, ${p.knownUntil}–${last}`, `Districts by growth, ${p.knownUntil}–${last}`)} <span className="badge estimate">{tx(lang, "Unjuran", "Projection")}</span></h3>
        <p className="sub">{tx(lang, "Pertumbuhan KDNK setahun dalam senario ini, dan KDNK per kapita pada", "GDP growth a year in this scenario, and GDP per person in")} {last}</p>
        <table className="sim-table">
          <thead>
            <tr>
              <th scope="col">{tx(lang, "Daerah", "District")}</th>
              <th scope="col">{tx(lang, "Pertumbuhan setahun", "Growth a year")}</th>
              <th scope="col">{tx(lang, `KDNK ${last}`, `GDP ${last}`)}</th>
              <th scope="col">{tx(lang, `Per kapita ${last}`, `Per person ${last}`)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.d}>
                <th scope="row"><Link href={`/${lang}/daerah/${p.slugs[r.d]}/`}>{r.d}</Link></th>
                <td>
                  <span className="sim-bar"><span style={{ width: `${Math.round((Math.max(r.g, 0) / maxG) * 1000) / 10}%` }} /></span>
                  <span className="tnum">{fmt(lang, r.g, 1)}%</span>
                </td>
                <td className="tnum">{rmBillion(lang, r.v30, 2)}<span className="muted small"> ({rmBillion(lang, r.v30 * r.band[0], 1)}–{rmBillion(lang, r.v30 * r.band[1], 1)})</span></td>
                <td className="tnum">{rm(lang, r.pc)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function pick(g: Record<Sector, number>): Partial<Record<Sector, number>> {
  return Object.fromEntries(EDITABLE.map((s) => [s, +g[s].toFixed(1)]));
}
