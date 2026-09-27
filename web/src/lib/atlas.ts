import raw from "@/data/atlas.json";

export const SECTORS = ["services", "manufacturing", "agriculture", "construction", "mining"] as const;
export type Sector = (typeof SECTORS)[number];

type Point = { year: number; value: number };
type Bilingual = { ms: string; en: string };
type Range = { central: number; low: number; high: number };

export const DISTRICT_TYPES = ["industry", "services", "farm", "rural"] as const;
export type DistrictType = (typeof DISTRICT_TYPES)[number];

export type District = {
  slug: string;
  name: string;
  type: DistrictType;
  /** AI-drafted brief (see pipeline/briefs.py); `reviewed` flips once a person has checked it */
  brief?: {
    ms: Record<"working" | "holding" | "watch", string[]>;
    en: Record<"working" | "holding" | "watch", string[]>;
    drafted_by: string;
    drafted_on: string;
    reviewed: boolean;
  };
  area_km2: number | null;
  population: {
    latest_year: number;
    latest: number;
    series: Point[];
    age_share: { children: number; youth: number; working: number; elderly: number };
    net_migration_k: number;
    net_migration_per_1000_yr: number;
    natural_increase_k: number;
  };
  gdp: {
    unit: string;
    latest_year: number;
    total: Point[];
    by_sector: Record<Sector, Point[]>;
    share_of_kedah: number;
    per_capita_k: number;
    per_capita_rank_my: [number, number];
    cagr_2015_2019: number;
    lq_kedah: Record<Sector, number>;
    lq_malaysia: Record<Sector, number>;
    shift_share: { state: number; mix: number; local: number; actual: number };
    projection: { year: number; total: number; by_sector: Record<Sector, number> };
  };
  labour: {
    latest_year: number;
    series: { year: number; lf: number; employed: number; unemployed: number; u_rate: number; p_rate: number }[];
  };
  jobs_estimate: { year: number; by_sector: Record<Sector, Range> };
  living: {
    latest_year: number;
    income_median: Point[];
    income_mean: Point[];
    poverty: Point[];
    gini: Point[];
    expenditure_mean: Point[];
    income_rank_my: [number, number];
    poverty_rank_my: [number, number];
  };
  place: Record<string, number | null>;
  crops_2017: { crop: string; hectares: number }[];
  highlights: ({ tone: "strength" | "concern" } & Bilingual)[];
};

export type Source = {
  id: string;
  title: string;
  publisher: string;
  licence: string;
  years: string;
  note: string | null;
  catalogue: string;
  url: string;
  retrieved: string;
  sha256: string | null;
};

type Atlas = {
  meta: {
    built: string;
    sector_labels: Record<string, Bilingual>;
    shift_share_period: [number, number];
    migration_period: [number, number];
    jobs_seed_years: [number, number];
    gdp_imputed: { district: string; year: number; sector: string; value: number }[];
    type_rules: [DistrictType, string][];
    kedah_gdp_per_capita_k: number;
    kawasanku_as_of: string | number;
  };
  sources: Source[];
  kedah: {
    gdp_state: ({ year: number; total: number } & Record<Sector, number>)[];
    gdp_latest_year: number;
    jobs_industry: Record<string, Record<string, number>>;
    jobs_occupation: Record<string, Record<string, number>>;
    jobs_by_sector: Record<Sector, number>;
    jobs_year: number;
    income_median: Record<string, number>;
    poverty: Record<string, number>;
    gini: Record<string, number>;
    u_rate: number;
    cagr_2015_2019: number;
    population: Record<string, number>;
    history: { income_median: Record<string, number>; poverty: Record<string, number> };
  };
  malaysia: {
    income_median: Record<string, number>;
    poverty: Record<string, number>;
    sector_share_gdp: Record<Sector, number>;
  };
  peers: {
    period: [number, number];
    kedah: Peer & StateExtras;
    penang: Peer & StateExtras;
    malaysia: Peer;
  };
  forecast: Forecast;
  districts: District[];
};

export type Band = { year: number; p10: number; p50: number; p90: number };
export type Forecast = {
  model: "shift_share" | "momentum" | "ml" | "naive";
  backtest: {
    median_abs_pct_error: Record<string, Record<string, number>>;
    kedah_median_abs_pct_error: Record<string, Record<string, number>>;
    n_districts: number;
    n_samples: number;
    quantiles_log: Record<string, [number, number]>;
  };
  known_until: number;
  horizon: number;
  years: number[];
  proj_years: number[];
  kedah: Band[];
  kedah_band: Record<string, [number, number]>;
  state_base: Record<Sector, number>;
  baseline_growth: Record<Sector, number>;
  shares: Record<string, Record<Sector, number[]>>;
  district_band: Record<string, Record<string, [number, number]>>;
  districts: Record<string, {
    total: (Band & { per_capita_k: number })[];
    sectors: Record<Sector, Point[]>;
    relative_growth_3y: Record<Sector, number>;
    population_k: Point[];
  }>;
  kedah_population_k: Point[];
  productivity: { manufacturing_rm_per_worker: number; year: number };
};

/** Sector GDP series, household income and poverty, land area (km²) and area-weighted night lights. */
export type StateExtras = {
  sectors: Record<Sector, Point[]>;
  cagr_sectors: Record<Sector, number>;
  income_median: Point[];
  poverty: Point[];
  area_km2: number;
  nightlights: number;
};

/** Real GDP (RM million, 2015 prices), population (thousands), GDP per person (RM) and growth rates (% a year). */
export type Peer = {
  gdp: Point[];
  population: Point[];
  per_capita: Point[];
  cagr_gdp: number;
  cagr_pop: number;
  cagr_per_capita: number;
};

export const atlas = raw as unknown as Atlas;
export const districts = atlas.districts;

export function getDistrict(slug: string): District | undefined {
  return districts.find((d) => d.slug === slug);
}

export const last = <T,>(xs: T[]): T => xs[xs.length - 1];

export function sourceById(id: string): Source | undefined {
  return atlas.sources.find((s) => s.id === id);
}
