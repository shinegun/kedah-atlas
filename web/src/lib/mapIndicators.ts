import type { MapIndicator } from "@/components/DistrictMap";
import { atlas, DISTRICT_TYPES, districts, last } from "@/lib/atlas";
import { tx, typeInfo, type Locale } from "@/lib/i18n";

/** Everything the /peta map can colour districts by, in picker order. */
export function mapIndicators(lang: Locale): MapIndicator[] {
  const k = atlas.kedah;
  const hiesYear = String(districts[0].living.latest_year);
  const byName = (f: (x: (typeof districts)[number]) => number) =>
    Object.fromEntries(districts.map((x) => [x.name, f(x)]));
  const [mig0, mig1] = atlas.meta.migration_period;

  // Kedah benchmarks for "better or worse than Kedah" colouring.
  const kedahGdppc =
    (districts.reduce((a, x) => a + last(x.gdp.total).value, 0) /
      districts.reduce((a, x) => a + x.population.series.find((p) => p.year === last(x.gdp.total).year)!.value, 0)) * 1000;
  const kedahFarmShare = (k.jobs_by_sector.agriculture / Object.values(k.jobs_by_sector).reduce((a, b) => a + b, 0)) * 100;
  const judged = [
    tx(lang, "Jauh lebih teruk", "Much worse"), tx(lang, "Lebih teruk", "Worse"), tx(lang, "Setara Kedah", "Near Kedah"),
    tx(lang, "Lebih baik", "Better"), tx(lang, "Jauh lebih baik", "Much better"),
  ];

  const hiesYears = districts[0].living.income_median.map((p) => p.year);
  const yearValues = (pick: (x: (typeof districts)[number]) => { year: number; value: number }[], y: number) =>
    byName((x) => pick(x).find((p) => p.year === y)!.value);
  const shortType: Record<string, { ms: string; en: string }> = {
    industry: { ms: "Industri", en: "Industry" }, services: { ms: "Perkhidmatan", en: "Services" },
    farm: { ms: "Pertanian", en: "Farming" }, rural: { ms: "Campuran", en: "Mixed" },
  };

  return [
    {
      key: "type", slug: "jenis", label: tx(lang, "Jenis daerah", "District type"),
      question: tx(lang, "Apakah yang menggerakkan ekonomi setiap daerah?", "What drives each district's economy?"),
      note: tx(lang, `Dikelaskan mengikut campuran KDNK daerah, ${districts[0].gdp.latest_year}, dengan peraturan mudah — lihat halaman Kaedah. Sumber: DOSM.`,
        `Classified from each district's GDP mix, ${districts[0].gdp.latest_year}, using simple rules — see Method. Source: DOSM.`),
      spec: { lang, kind: "num" }, values: {}, ref: 0, refLabel: "", mode: "category", better: null, compare: "points", near: 0, far: 0, legend: [],
      cats: Object.fromEntries(districts.map((x) => [x.name, x.type])),
      categories: DISTRICT_TYPES.map((key) => ({
        key, label: typeInfo[key].label[lang], short: shortType[key][lang], rule: typeInfo[key].rule[lang], color: typeInfo[key].color,
      })),
    },
    {
      key: "income", slug: "pendapatan", label: tx(lang, "Pendapatan penengah", "Median income"),
      question: tx(lang, "Di mana pendapatan isi rumah paling tinggi?", "Where are household incomes highest?"),
      note: tx(lang, `Pendapatan penengah isi rumah sebulan, ${hiesYear}. Setara = dalam ±5% daripada penengah Kedah. Sumber: DOSM.`,
        `Median monthly household income, ${hiesYear}. Near = within ±5% of the Kedah median. Source: DOSM.`),
      spec: { lang, kind: "rm" }, values: byName((x) => last(x.living.income_median).value),
      ref: k.income_median[hiesYear], refLabel: "Kedah", mode: "diverging", better: "higher", compare: "ratio", near: 5, far: 15, legend: judged,
      years: hiesYears.map((y) => ({
        year: y, values: yearValues((x) => x.living.income_median, y), ref: k.income_median[String(y)],
        note: tx(lang, `Pendapatan penengah isi rumah sebulan, ${y}. Setara = dalam ±5% daripada penengah Kedah. Sumber: DOSM.`,
          `Median monthly household income, ${y}. Near = within ±5% of the Kedah median. Source: DOSM.`),
      })),
    },
    {
      key: "poverty", slug: "kemiskinan", label: tx(lang, "Kemiskinan", "Poverty"),
      question: tx(lang, "Di mana kemiskinan paling tinggi?", "Where is poverty highest?"),
      note: tx(lang, `Kemiskinan mutlak, ${hiesYear}. Setara = dalam ±1 mata peratusan daripada Kedah. Sumber: DOSM.`,
        `Absolute poverty, ${hiesYear}. Near = within ±1 percentage point of Kedah. Source: DOSM.`),
      spec: { lang, kind: "pct", digits: 1 }, values: byName((x) => last(x.living.poverty).value),
      ref: k.poverty[hiesYear], refLabel: "Kedah", mode: "diverging", better: "lower", compare: "points", near: 1, far: 3, legend: judged,
      years: hiesYears.map((y) => ({
        year: y, values: yearValues((x) => x.living.poverty, y), ref: k.poverty[String(y)],
        note: tx(lang, `Kemiskinan mutlak, ${y}. Setara = dalam ±1 mata peratusan daripada Kedah. Sumber: DOSM.`,
          `Absolute poverty, ${y}. Near = within ±1 percentage point of Kedah. Source: DOSM.`),
      })),
    },
    {
      key: "gdppc", slug: "kdnk-per-kapita", label: tx(lang, "KDNK per kapita", "GDP per person"),
      question: tx(lang, "Daerah mana menghasilkan output paling tinggi bagi setiap penduduk?", "Which districts produce the most per resident?"),
      note: tx(lang, "KDNK per kapita, 2020, harga malar 2015, mengikut lokasi pengeluaran. Setara = dalam ±10% daripada Kedah. Sumber: DOSM.",
        "GDP per resident, 2020, constant 2015 prices, by place of production. Near = within ±10% of Kedah. Source: DOSM."),
      spec: { lang, kind: "rm" }, values: byName((x) => x.gdp.per_capita_k * 1000),
      ref: kedahGdppc, refLabel: "Kedah", mode: "diverging", better: "higher", compare: "ratio", near: 10, far: 35, legend: judged,
    },
    {
      key: "urate", slug: "pengangguran", label: tx(lang, "Pengangguran", "Unemployment"),
      question: tx(lang, "Di mana pengangguran paling tinggi?", "Where is unemployment highest?"),
      note: tx(lang, `Kadar pengangguran, ${districts[0].labour.latest_year}. Setara = dalam ±0.5 mata peratusan daripada Kedah. Sumber: DOSM (ralat piawai adalah tinggi di peringkat daerah).`,
        `Unemployment rate, ${districts[0].labour.latest_year}. Near = within ±0.5 percentage points of Kedah. Source: DOSM (high standard error at district level).`),
      spec: { lang, kind: "pct", digits: 1 }, values: byName((x) => last(x.labour.series).u_rate),
      ref: k.u_rate, refLabel: "Kedah", mode: "diverging", better: "lower", compare: "points", near: 0.5, far: 1.5, legend: judged,
    },
    {
      key: "migration", slug: "migrasi", label: tx(lang, "Migrasi bersih", "Net migration"),
      question: tx(lang, "Ke mana penduduk berpindah?", "Where are people moving to?"),
      note: tx(lang, `Anggaran migrasi bersih bagi setiap 1,000 penduduk setahun, ${mig0}–${mig1}: perubahan penduduk ditolak (kelahiran − kematian). Seimbang = dalam ±1.`,
        `Estimated net migration per 1,000 residents a year, ${mig0}–${mig1}: population change minus (births − deaths). Balanced = within ±1.`),
      spec: { lang, kind: "num", digits: 1 }, values: byName((x) => x.population.net_migration_per_1000_yr), estimate: true,
      ref: 0, refLabel: tx(lang, "seimbang", "balanced"), mode: "diverging", better: null, compare: "absolute", near: 1, far: 4,
      legend: [tx(lang, "Ramai keluar", "Many leaving"), tx(lang, "Keluar", "Leaving"), tx(lang, "Seimbang", "Balanced"), tx(lang, "Masuk", "Arriving"), tx(lang, "Ramai masuk", "Many arriving")],
    },
    {
      key: "farmjobs", slug: "pertanian", label: tx(lang, "Pekerjaan pertanian", "Farm jobs"),
      question: tx(lang, "Di mana pertanian masih menjadi sumber rezeki utama?", "Where does farming still matter most?"),
      note: tx(lang, `Anggaran peratusan pekerja dalam sektor pertanian, ${k.jobs_year}. Model KedahKu — lihat halaman Kaedah.`,
        `Estimated share of workers in agriculture, ${k.jobs_year}. KedahKu model — see Method.`),
      spec: { lang, kind: "pct", digits: 0 }, estimate: true,
      values: byName((x) => {
        const s = x.jobs_estimate.by_sector;
        const tot = Object.values(s).reduce((a, b) => a + b.central, 0);
        return (s.agriculture.central / tot) * 100;
      }),
      ref: kedahFarmShare, refLabel: "Kedah", mode: "sequential", better: null, compare: "points", near: 1, far: 5,
      legend: [tx(lang, "Rendah", "Low"), tx(lang, "Tinggi", "High")],
    },
    {
      key: "lights", slug: "cahaya-malam", label: tx(lang, "Cahaya malam", "Night lights"),
      question: tx(lang, "Di manakah Kedah paling terang pada waktu malam?", "Where does Kedah glow brightest at night?"),
      note: tx(lang, `Purata keamatan cahaya waktu malam daripada imej satelit, ${atlas.meta.kawasanku_as_of}: petunjuk kasar kepadatan bandar dan aktiviti ekonomi. Sumber: DOSM Kawasanku.`,
        `Average night-time light intensity from satellite imagery, ${atlas.meta.kawasanku_as_of}: a rough signal of urban density and economic activity. Source: DOSM Kawasanku.`),
      spec: { lang, kind: "num", digits: 1 }, values: byName((x) => x.place.nightlights ?? 0),
      ref: atlas.peers.kedah.nightlights, refLabel: "Kedah", mode: "sequential", better: null, compare: "absolute", near: 0.5, far: 2,
      legend: [tx(lang, "Gelap", "Dark"), tx(lang, "Terang", "Bright")],
    },
  ];
}
