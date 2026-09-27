"use client";

// Two districts, side by side, in the same stories-style slides as a single
// district. The pair lives in the URL hash (#a=baling&b=kulim) so it can be shared.

import Link from "next/link";
import { useEffect, useState } from "react";
import StoryDeck, { type Slide } from "@/components/StoryDeck";
import { fmt, rm, rmBillion, tx, type Locale } from "@/lib/i18n";

export type CompareDistrict = {
  slug: string;
  name: string;
  typeLabel: string;
  color: string;
  tagline: string;
  shape: string;
  income: number;
  poverty: number;
  gdppc: number;
  growthPast: number;
  gdp2030: number;
  growth2030: number;
  sectors: { key: string; label: string; v: number }[];
};

type Props = {
  lang: Locale;
  districts: CompareDistrict[];
  kedah: { income: number; poverty: number; gdppc: number };
  years: { income: number; gdp: number; horizon: number; past: string };
};

const FALLBACK: Record<string, string> = { kulim: "baling" };

export default function CompareDeck({ lang, districts, kedah, years }: Props) {
  const [pair, setPair] = useState<[string, string]>(["baling", "kulim"]);
  useEffect(() => {
    const read = () => {
      const p = new URLSearchParams(window.location.hash.slice(1));
      const a = districts.some((d) => d.slug === p.get("a")) ? p.get("a")! : "baling";
      let b = districts.some((d) => d.slug === p.get("b")) ? p.get("b")! : FALLBACK[a] ?? "kulim";
      if (b === a) b = a === "kulim" ? "baling" : "kulim";
      setPair([a, b]);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [districts]);
  const choose = (which: 0 | 1, slug: string) => {
    const next: [string, string] = which === 0 ? [slug, pair[1]] : [pair[0], slug];
    setPair(next);
    history.replaceState(null, "", `#a=${next[0]}&b=${next[1]}`);
  };
  const A = districts.find((d) => d.slug === pair[0])!;
  const B = districts.find((d) => d.slug === pair[1])!;
  const oneIn = (p: number) => Math.max(1, Math.round(100 / p));
  const oneInText = (p: number) => tx(lang, `1 daripada ${oneIn(p)}`, `1 in ${oneIn(p)}`);
  const pctMore = (x: number, y: number) => fmt(lang, Math.abs(x / y - 1) * 100, 0);
  const hiInc = A.income >= B.income ? A : B;
  const loInc = hiInc === A ? B : A;
  const hiPc = A.gdppc >= B.gdppc ? A : B;
  const loPc = hiPc === A ? B : A;

  const pairBars = (vals: [string, number, string][], fmtv: (v: number) => string) => {
    const max = Math.max(...vals.map((v) => v[1]));
    return (
      <div className="sl-bars">
        {vals.map(([name, v, color]) => (
          <div key={name} className="sl-bar">
            <span className="sl-bar-name">{name}</span>
            <span className="sl-bar-track"><span style={{ width: `${(v / max) * 100}%`, background: color }} /></span>
            <span className="sl-bar-v tnum">{fmtv(v)}</span>
          </div>
        ))}
      </div>
    );
  };
  const both = (render: (d: CompareDistrict) => React.ReactNode) => (
    <div className="cmp-two">
      {[A, B].map((d) => <div key={d.slug} className="cmp-col">{render(d)}</div>)}
    </div>
  );

  const measures = [
    { label: tx(lang, "Pendapatan isi rumah", "Household income"), win: A.income >= B.income ? A : B },
    { label: tx(lang, "Kemiskinan lebih rendah", "Lower poverty"), win: A.poverty <= B.poverty ? A : B },
    { label: tx(lang, "KDNK per kapita", "GDP per person"), win: A.gdppc >= B.gdppc ? A : B },
    { label: tx(lang, `Pertumbuhan ${years.past}`, `Growth ${years.past}`), win: A.growthPast >= B.growthPast ? A : B },
    { label: tx(lang, `Pertumbuhan dijangka hingga ${years.horizon}`, `Expected growth to ${years.horizon}`), win: A.growth2030 >= B.growth2030 ? A : B },
  ];
  const aWins = measures.filter((m) => m.win === A).length;

  const slides: Slide[] = [
    {
      key: "cover", theme: "dark", label: `${A.name} · ${B.name}`,
      content: (
        <div className="sl-body cmp-cover">
          <p className="sl-kicker">{tx(lang, "Perbandingan", "Head to head")}</p>
          <h2 className="sl-title cmp-title">{A.name} <em>{tx(lang, "lawan", "vs")}</em> {B.name}</h2>
          {both((d) => (
            <>
              <svg viewBox="0 0 100 100" className="cmp-shape" aria-hidden="true"><path d={d.shape} style={{ fill: d.color }} /></svg>
              <strong>{d.name}</strong>
              <span className="cmp-type">{d.typeLabel}</span>
              <span className="cmp-line">{d.tagline}</span>
            </>
          ))}
        </div>
      ),
    },
    {
      key: "income", label: tx(lang, "Pendapatan", "Income"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Pendapatan isi rumah", "Household income")} · {years.income}</p>
          <h2 className="sl-q">{tx(lang, `Isi rumah di ${hiInc.name} berpendapatan ${pctMore(hiInc.income, loInc.income)}% lebih tinggi`, `Households in ${hiInc.name} earn ${pctMore(hiInc.income, loInc.income)}% more`)}</h2>
          {both((d) => <div className="cmp-big">{rm(lang, d.income)}<span>{tx(lang, "sebulan", "a month")}</span></div>)}
          {pairBars([[A.name, A.income, "var(--accent)"], [B.name, B.income, "var(--gold)"], ["Kedah", kedah.income, "var(--axis)"]], (v) => rm(lang, v))}
          <p className="sl-source">{tx(lang, "Pendapatan penengah isi rumah. Sumber: DOSM.", "Median household income. Source: DOSM.")}</p>
        </div>
      ),
    },
    {
      key: "poverty", label: tx(lang, "Kemiskinan", "Poverty"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Kemiskinan", "Poverty")} · {years.income}</p>
          <h2 className="sl-q">{tx(lang, "Berapa isi rumah hidup di bawah garis kemiskinan?", "How many households live below the poverty line?")}</h2>
          {both((d) => (
            <>
              <div className="cmp-big">{oneInText(d.poverty)}<span>{fmt(lang, d.poverty, 1)}%</span></div>
              <div className="sl-dots cmp-dots" aria-hidden="true">
                {Array.from({ length: Math.min(oneIn(d.poverty), 30) }, (_, n) => <span key={n} className={n === 0 ? "on" : undefined} />)}
              </div>
            </>
          ))}
          <p className="sl-verdict neutral">{tx(lang, `Bagi Kedah: ${oneInText(kedah.poverty)} (${fmt(lang, kedah.poverty, 1)}%).`, `Kedah: ${oneInText(kedah.poverty)} (${fmt(lang, kedah.poverty, 1)}%).`)}</p>
          <p className="sl-source">{tx(lang, "Kemiskinan mutlak. Sumber: DOSM.", "Absolute poverty. Source: DOSM.")}</p>
        </div>
      ),
    },
    {
      key: "economy", theme: "accent", label: tx(lang, "Ekonomi", "Economy"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Ekonomi", "Economy")} · {years.gdp}</p>
          <h2 className="sl-q">{tx(lang, "Apa yang menggerakkan ekonomi mereka?", "What drives their economies?")}</h2>
          {[A, B].map((d) => (
            <div key={d.slug} className="cmp-econ">
              <strong>{d.name}</strong>
              <div className="sl-stack">
                {d.sectors.filter((x) => x.v >= 0.5).map((x) => (
                  <span key={x.key} style={{ flexGrow: x.v, background: `var(--s-${x.key})` }} title={`${x.label} ${fmt(lang, x.v, 0)}%`} />
                ))}
              </div>
              <span className="muted small">{d.sectors.slice(0, 3).map((x) => `${x.label} ${fmt(lang, x.v, 0)}%`).join(" · ")}</span>
            </div>
          ))}
          <p className="sl-source">{tx(lang, "Bahagian KDNK daerah. Sumber: DOSM.", "Share of district GDP. Source: DOSM.")}</p>
        </div>
      ),
    },
    {
      key: "gdppc", label: tx(lang, "KDNK per kapita", "GDP per person"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "KDNK per kapita", "GDP per person")} · {years.gdp}</p>
          <h2 className="sl-q">{tx(lang, `${hiPc.name} menghasilkan ${fmt(lang, hiPc.gdppc / loPc.gdppc, 1)} kali ganda bagi setiap penduduk`, `${hiPc.name} produces ${fmt(lang, hiPc.gdppc / loPc.gdppc, 1)} times as much per resident`)}</h2>
          {pairBars([[A.name, A.gdppc, "var(--accent)"], [B.name, B.gdppc, "var(--gold)"], ["Kedah", kedah.gdppc, "var(--axis)"]], (v) => rm(lang, v))}
          <p className="sl-source">{tx(lang, "KDNK dikira di tempat pengeluaran, bukan tempat tinggal. Sumber: DOSM.", "GDP is counted where it is produced, not where people live. Source: DOSM.")}</p>
        </div>
      ),
    },
    {
      key: "future", theme: "gold", label: tx(lang, "Menjelang 2030", "By 2030"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Unjuran", "Projection")} · {years.horizon}</p>
          <h2 className="sl-q">{tx(lang, "Siapa tumbuh lebih pantas?", "Who grows faster?")}</h2>
          {both((d) => <div className="cmp-big">{fmt(lang, d.growth2030, 1)}%<span>{tx(lang, `setahun · ${rmBillion(lang, d.gdp2030, 1)} menjelang ${years.horizon}`, `a year · ${rmBillion(lang, d.gdp2030, 1)} by ${years.horizon}`)}</span></div>)}
          <p className="sl-verdict neutral">{tx(lang, "Jika trend semasa berterusan. Unjuran ialah anggaran model, dengan julat ketidakpastian.", "If current trends hold. Projections are model estimates with uncertainty ranges.")}</p>
          <p className="sl-source"><Link href={`/${lang}/unjuran/`}>{tx(lang, "Cuba simulator senario →", "Try the scenario simulator →")}</Link></p>
        </div>
      ),
    },
    {
      key: "score", label: tx(lang, "Skor", "Score"),
      content: (
        <div className="sl-body">
          <p className="sl-kicker">{tx(lang, "Keputusan", "The result")}</p>
          <h2 className="sl-q">{A.name} {aWins} — {measures.length - aWins} {B.name}</h2>
          <ul className="cmp-score">
            {measures.map((m) => (
              <li key={m.label}><span>{m.label}</span><strong><span className="dmap-chip" style={{ background: m.win === A ? "var(--accent)" : "var(--gold)" }} />{m.win.name}</strong></li>
            ))}
          </ul>
          <div className="sl-actions">
            <Link className="sl-btn primary" href={`/${lang}/daerah/${A.slug}/`}>{tx(lang, `Slaid ${A.name}`, `${A.name} slides`)}</Link>
            <Link className="sl-btn" href={`/${lang}/daerah/${B.slug}/`}>{tx(lang, `Slaid ${B.name}`, `${B.name} slides`)}</Link>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="cmp-pick">
        {([0, 1] as const).map((which) => (
          <label key={which}>
            <span className="muted small">{which === 0 ? tx(lang, "Daerah pertama", "First district") : tx(lang, "Daerah kedua", "Second district")}</span>
            <select value={pair[which]} onChange={(e) => choose(which, e.target.value)}>
              {districts.filter((d) => d.slug !== pair[which === 0 ? 1 : 0]).map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
            </select>
          </label>
        ))}
      </div>
      <StoryDeck
        key={`${A.slug}-${B.slug}`}
        lang={lang}
        title={`${A.name} · ${B.name}`}
        slides={slides}
        syncHash={false}
        exit={{ href: `/${lang}/daerah/`, label: tx(lang, "Semua daerah", "All districts") }}
      />
    </>
  );
}
