export const LOCALES = ["ms", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "ms";

export const hasLocale = (x: string): x is Locale => (LOCALES as readonly string[]).includes(x);

export const numberLocale = (l: Locale) => (l === "ms" ? "ms-MY" : "en-MY");

export function fmt(l: Locale, x: number | null | undefined, digits = 0): string {
  if (x === null || x === undefined || Number.isNaN(x)) return "–";
  return x.toLocaleString(numberLocale(l), { minimumFractionDigits: digits, maximumFractionDigits: digits });
}

export const rm = (l: Locale, x: number, digits = 0) => `RM${fmt(l, x, digits)}`;

/** RM million → "RM11.0 bil" / "RM11.0 billion" */
export function rmBillion(l: Locale, millions: number, digits = 1): string {
  return l === "ms" ? `RM${fmt(l, millions / 1000, digits)} bilion` : `RM${fmt(l, millions / 1000, digits)} bn`;
}

export const sectorLabel: Record<string, Record<Locale, string>> = {
  services: { ms: "Perkhidmatan", en: "Services" },
  manufacturing: { ms: "Pembuatan", en: "Manufacturing" },
  agriculture: { ms: "Pertanian", en: "Agriculture" },
  construction: { ms: "Pembinaan", en: "Construction" },
  mining: { ms: "Perlombongan & pengkuarian", en: "Mining & quarrying" },
};

export const industryLabel: Record<string, Record<Locale, string>> = {
  agriculture: { ms: "Pertanian, perhutanan & perikanan", en: "Agriculture, forestry & fishing" },
  mining: { ms: "Perlombongan & pengkuarian", en: "Mining & quarrying" },
  manufacturing: { ms: "Pembuatan", en: "Manufacturing" },
  electricity: { ms: "Bekalan elektrik, gas & pendingin udara", en: "Electricity, gas & air-con supply" },
  water: { ms: "Bekalan air, pembetungan & pengurusan sisa", en: "Water, sewerage & waste" },
  construction: { ms: "Pembinaan", en: "Construction" },
  trade: { ms: "Perdagangan borong & runcit", en: "Wholesale & retail trade" },
  transport: { ms: "Pengangkutan & penyimpanan", en: "Transport & storage" },
  food_accommodation: { ms: "Makanan, minuman & penginapan", en: "Food, beverage & accommodation" },
  ict: { ms: "Maklumat & komunikasi", en: "Information & communication" },
  finance: { ms: "Kewangan & insurans", en: "Finance & insurance" },
  real_estate: { ms: "Hartanah", en: "Real estate" },
  professional: { ms: "Profesional, saintifik & teknikal", en: "Professional, scientific & technical" },
  admin_support: { ms: "Pentadbiran & khidmat sokongan", en: "Administrative & support services" },
  public_admin: { ms: "Pentadbiran awam & pertahanan", en: "Public administration & defence" },
  education: { ms: "Pendidikan", en: "Education" },
  health: { ms: "Kesihatan & kerja sosial", en: "Health & social work" },
  arts: { ms: "Kesenian, hiburan & rekreasi", en: "Arts, entertainment & recreation" },
  other_services: { ms: "Perkhidmatan lain", en: "Other services" },
  households: { ms: "Isi rumah sebagai majikan", en: "Households as employers" },
};

export const occupationLabel: Record<string, Record<Locale, string>> = {
  managers: { ms: "Pengurus", en: "Managers" },
  professionals: { ms: "Profesional", en: "Professionals" },
  technicians: { ms: "Juruteknik & profesional bersekutu", en: "Technicians & associate professionals" },
  clerical: { ms: "Pekerja sokongan perkeranian", en: "Clerical support workers" },
  service_sales: { ms: "Pekerja perkhidmatan & jualan", en: "Service & sales workers" },
  skilled_agriculture: { ms: "Pekerja mahir pertanian, penternakan & perikanan", en: "Skilled agricultural & fishery workers" },
  craft: { ms: "Pekerja kemahiran & pertukangan", en: "Craft & related trades workers" },
  operators: { ms: "Operator mesin & loji, pemasang", en: "Plant & machine operators, assemblers" },
  elementary: { ms: "Pekerjaan asas", en: "Elementary occupations" },
};

export const cropLabel: Record<string, Record<Locale, string>> = {
  durian: { ms: "Durian", en: "Durian" },
  banana: { ms: "Pisang", en: "Banana" },
  rambutan: { ms: "Rambutan", en: "Rambutan" },
  coconut: { ms: "Kelapa", en: "Coconut" },
  cempedak: { ms: "Cempedak", en: "Cempedak" },
  kelulut_bee: { ms: "Lebah kelulut", en: "Stingless bee (kelulut)" },
  dokong: { ms: "Dokong", en: "Dokong" },
  watermelon: { ms: "Tembikai", en: "Watermelon" },
  pineapple: { ms: "Nanas", en: "Pineapple" },
  sweet_corn: { ms: "Jagung manis", en: "Sweet corn" },
  mangosteen: { ms: "Manggis", en: "Mangosteen" },
  ladys_finger: { ms: "Bendi", en: "Okra" },
  chilli: { ms: "Cili", en: "Chilli" },
  mango: { ms: "Mangga", en: "Mango" },
  papaya: { ms: "Betik", en: "Papaya" },
  starfruit: { ms: "Belimbing", en: "Starfruit" },
  langsat: { ms: "Langsat", en: "Langsat" },
  guava: { ms: "Jambu batu", en: "Guava" },
  cucumber: { ms: "Timun", en: "Cucumber" },
  long_bean: { ms: "Kacang panjang", en: "Long bean" },
  pumpkin: { ms: "Labu", en: "Pumpkin" },
  cassava: { ms: "Ubi kayu", en: "Cassava" },
  sweet_potato: { ms: "Keledek", en: "Sweet potato" },
  pepper: { ms: "Lada hitam", en: "Pepper" },
  lemon_grass: { ms: "Serai", en: "Lemongrass" },
  brinjal: { ms: "Terung", en: "Brinjal" },
  nipa_palm: { ms: "Nipah", en: "Nipa palm" },
  pandan: { ms: "Pandan", en: "Pandan" },
  water_spinach: { ms: "Kangkung", en: "Water spinach" },
  yellow_sugar_cane: { ms: "Tebu kuning", en: "Yellow sugar cane" },
  ginger: { ms: "Halia", en: "Ginger" },
  turmeric: { ms: "Kunyit", en: "Turmeric" },
};

export const cropName = (l: Locale, key: string) =>
  cropLabel[key]?.[l] ?? key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());

const dict = {
  ms: {
    siteName: "KedahKu",
    tagline: "Pekerjaan rakyat Kedah, dan ke mana ekonominya boleh berkembang",
    nav: { home: "Utama", map: "Peta", forecast: "Unjuran", districts: "Daerah", compare: "Perbandingan", story: "Cerita", method: "Kaedah", data: "Data" },
    langSwitch: "English",
    official: "Rasmi",
    estimate: "Anggaran",
    source: "Sumber",
    sources: "Sumber",
    footerNote:
      "Projek bebas yang menggunakan data terbuka Jabatan Perangkaan Malaysia (DOSM). Laman ini bukan penerbitan rasmi kerajaan. Angka bertanda ‘Anggaran’ dihasilkan oleh model kami dan bukan statistik rasmi.",
    builtOn: "Data dikemas kini",
  },
  en: {
    siteName: "KedahKu",
    tagline: "Where Kedah's people work — and where its economy can grow",
    nav: { home: "Home", map: "Map", forecast: "Projections", districts: "Districts", compare: "Compare", story: "Story", method: "Method", data: "Data" },
    langSwitch: "Bahasa Melayu",
    official: "Official",
    estimate: "Estimate",
    source: "Source",
    sources: "Sources",
    footerNote:
      "An independent project built on open data from the Department of Statistics Malaysia (DOSM). Not an official government publication. Figures marked ‘Estimate’ are our model, not official statistics.",
    builtOn: "Data updated",
  },
} satisfies Record<Locale, unknown>;

export const t = (l: Locale) => dict[l];

/** Serialisable number format, so server pages can hand formats to client charts. */
export type FormatSpec = { lang: Locale; kind: "num" | "rm" | "pct" | "k" | "index"; digits?: number };

export function formatValue(spec: FormatSpec, v: number): string {
  const d = spec.digits ?? 0;
  switch (spec.kind) {
    case "rm":
      return rm(spec.lang, v, d);
    case "pct":
      return `${fmt(spec.lang, v, d)}%`;
    case "k":
      return spec.lang === "ms" ? `${fmt(spec.lang, v, d)} ribu` : `${fmt(spec.lang, v, d)}k`;
    default:
      return fmt(spec.lang, v, d);
  }
}

/** District types (see /kaedah#jenis). Three validated categorical slots plus the neutral grey for "everything else". */
export const typeInfo: Record<string, { label: Record<Locale, string>; rule: Record<Locale, string>; color: string }> = {
  industry: {
    label: { ms: "Hab perindustrian", en: "Industrial hub" },
    rule: { ms: "Pembuatan menyumbang sekurang-kurangnya 30% daripada KDNK daerah.", en: "Manufacturing makes up at least 30% of district GDP." },
    color: "var(--s-manufacturing)",
  },
  services: {
    label: { ms: "Pusat perkhidmatan", en: "Services centre" },
    rule: { ms: "Perkhidmatan melebihi 70% daripada KDNK, dan KDNK per kapita di atas purata Kedah.", en: "Services are over 70% of GDP, and GDP per person is above the Kedah average." },
    color: "var(--s-services)",
  },
  farm: {
    label: { ms: "Jelapang pertanian", en: "Farming heartland" },
    rule: { ms: "Pertanian menyumbang sekurang-kurangnya 35% daripada KDNK daerah.", en: "Agriculture makes up at least 35% of district GDP." },
    color: "var(--s-agriculture)",
  },
  rural: {
    label: { ms: "Luar bandar, ekonomi campuran", en: "Rural mixed economy" },
    rule: { ms: "Daerah lain: perkhidmatan tempatan dan pertanian, dengan KDNK per kapita di bawah purata Kedah.", en: "All other districts: local services and farming, with GDP per person below the Kedah average." },
    color: "var(--div-2)",
  },
};

/** Inline bilingual copy: tx(lang, "Malay", "English"). */
export const tx = <T,>(l: Locale, ms: T, en: T): T => (l === "ms" ? ms : en);
