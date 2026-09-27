"""Turn raw sources into the files the website reads.

Outputs
  web/src/data/atlas.json          everything the pages render
  web/src/data/kedah.geo.json      district boundaries
  web/public/downloads/*.csv       tidy tables for download
  data/processed/indicators.csv    long table: district, year, indicator, value, unit, kind, source

Usage: uv run python pipeline/build.py
"""

import json
import shutil
import sys
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from model import SECTORS, cagr, estimate_jobs, location_quotient, shift_share  # noqa: E402
import forecast  # noqa: E402
from sources import KEDAH_DISTRICTS, SOURCES, slug  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
RAW, INTERIM, PROCESSED = ROOT / "data/raw", ROOT / "data/interim", ROOT / "data/processed"
WEB_DATA, WEB_PUBLIC = ROOT / "web/src/data", ROOT / "web/public"

SECTOR_CODE = {"p1": "agriculture", "p2": "mining", "p3": "manufacturing", "p4": "construction", "p5": "services"}
SECTOR_LABEL = {
    "agriculture": {"ms": "Pertanian", "en": "Agriculture"},
    "mining": {"ms": "Perlombongan", "en": "Mining & quarrying"},
    "manufacturing": {"ms": "Pembuatan", "en": "Manufacturing"},
    "construction": {"ms": "Pembinaan", "en": "Construction"},
    "services": {"ms": "Perkhidmatan", "en": "Services"},
}


def read(name: str) -> pd.DataFrame:
    df = pd.read_parquet(RAW / f"{name}.parquet")
    if "date" in df:
        df["year"] = pd.to_datetime(df["date"]).dt.year
    return df


def r(x, n=1):
    """Round for JSON; keep None for missing."""
    if x is None or (isinstance(x, float) and np.isnan(x)):
        return None
    return round(float(x), n)


# ---------------------------------------------------------------- load

def impute_suppressed(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.DataFrame]:
    """DOSM suppresses some small district-sector cells (NaN). Fill them from the
    residual: district total, less the typical import-duty share, less known sectors.
    If several cells are missing in one district-year, split the residual by the
    national size of those sectors. Returns the filled frame and the list of fills."""
    wide = df.set_index(["state", "district", "year", "sector"])["value"].unstack("sector")
    parts = ["p1", "p2", "p3", "p4", "p5"]
    complete = wide.dropna()
    duty_share = 1 - (complete[parts].sum(axis=1) / complete["p0"]).median()
    weights = wide[parts].sum()
    fills = []
    for idx, row in wide[wide[parts].isna().any(axis=1)].iterrows():
        missing = [p for p in parts if pd.isna(row[p])]
        residual = max(row["p0"] * (1 - duty_share) - row[parts].sum(), 0.0)
        w = weights[missing] / weights[missing].sum()
        for p in missing:
            wide.loc[idx, p] = residual * w[p]
            fills.append({"state": idx[0], "district": idx[1], "year": idx[2],
                          "sector": SECTOR_CODE[p], "value": residual * w[p]})
    long = wide.reset_index().melt(id_vars=["state", "district", "year"], var_name="sector", value_name="value")
    return long, pd.DataFrame(fills)


gdp, gdp_fills = impute_suppressed(read("gdp_district").query("series == 'abs'"))
gdp_all = gdp.copy()
gdp = gdp[gdp.state == "Kedah"]
gdp_state = read("gdp_state").query("series == 'abs'")
lfs = read("lfs_district")
pop = read("population_district").query("sex == 'both' and ethnicity == 'overall'")
births = read("births_district").query("sex == 'both'")
deaths = read("deaths_district").query("sex == 'both'")
income = read("hh_income_district")
poverty = read("hh_poverty_district")
gini = read("hh_inequality_district")
hies = read("hies_district")
inc_state = read("hh_income_state")
pov_state = read("hh_poverty_state")
gini_state = read("hh_inequality_state")
hies_my = read("hies_malaysia")
poverty_my = read("poverty_malaysia")
crops = read("crops_district_area")
jobs_ind = pd.read_csv(INTERIM / "kedah_jobs_industry.csv")
jobs_occ = pd.read_csv(INTERIM / "kedah_jobs_occupation.csv")
kawasanku = json.loads((RAW / "kawasanku_indicators.json").read_text())

K = lambda df: df[df.state == "Kedah"]  # noqa: E731

# ---------------------------------------------------------------- GDP

def sector_table(df: pd.DataFrame, year: int) -> pd.DataFrame:
    t = df[df.year == year].pivot_table(index="district", columns="sector", values="value")
    return t.rename(columns=SECTOR_CODE)[SECTORS]

gdp_years = sorted(gdp.year.unique())
gdp_total = gdp[gdp.sector == "p0"].pivot_table(index="district", columns="year", values="value")
by_sector = {y: sector_table(gdp, y) for y in gdp_years}
latest_gdp_year = gdp_years[-1]

# Specialisation vs Kedah and vs Malaysia (all 160 districts summed).
my_sectors = gdp_all[gdp_all.year == latest_gdp_year].groupby("sector").value.sum().rename(SECTOR_CODE)[SECTORS]
lq_kedah = location_quotient(by_sector[latest_gdp_year], by_sector[latest_gdp_year].sum())
lq_malaysia = location_quotient(by_sector[latest_gdp_year], my_sectors)

# Growth decomposition before COVID-19 distorted 2020.
SS_BASE, SS_END = 2015, 2019
ss = shift_share(by_sector[SS_BASE], by_sector[SS_END])

# 2025 projection: each district keeps its 2020 share of each Kedah sector.
state_k = gdp_state[gdp_state.state == "Kedah"].pivot_table(index="year", columns="sector", values="value")
state_k_sectors = state_k.rename(columns=SECTOR_CODE)[SECTORS]
latest_state_year = int(state_k.index.max())
proj_factor = state_k_sectors.loc[latest_state_year] / by_sector[latest_gdp_year].sum()
gdp_proj = by_sector[latest_gdp_year] * proj_factor
# Scale up to include import duties (p6) so districts sum to the published state total.
gdp_proj_total = gdp_proj.sum(axis=1) * state_k.loc[latest_state_year, "p0"] / gdp_proj.sum().sum()

# ---------------------------------------------------------------- people

pop_t = pop[pop.age == "overall"].pivot_table(index="district", columns="year", values="population")
pop_k = pop_t.loc[KEDAH_DISTRICTS]
pop_years = sorted(pop_t.columns)
latest_pop_year = pop_years[-1]

AGE_BANDS = {
    "children": ["0-4", "5-9", "10-14"],
    "youth": ["15-19", "20-24"],
    "working": ["15-19", "20-24", "25-29", "30-34", "35-39", "40-44", "45-49", "50-54", "55-59", "60-64"],
    "elderly": ["65-69", "70-74", "75-79", "80-84", "85+"],
}
age = K(pop)[(K(pop).year == latest_pop_year) & (K(pop).age != "overall")].pivot_table(
    index="district", columns="age", values="population")
age_share = pd.DataFrame({b: age[cols].sum(axis=1) for b, cols in AGE_BANDS.items()}).div(age.sum(axis=1), axis=0) * 100

b_t = births.pivot_table(index="district", columns="year", values="abs")
d_t = deaths.pivot_table(index="district", columns="year", values="abs")
MIG_START, MIG_END = 2020, 2024
# Population is a mid-year estimate, so births/deaths in calendar years START..END-1 approximate the gap.
natural = (b_t[list(range(MIG_START, MIG_END))] - d_t[list(range(MIG_START, MIG_END))]).sum(axis=1) / 1000
net_mig = (pop_t[MIG_END] - pop_t[MIG_START]) - natural            # thousands, over 4 years
net_mig_rate = net_mig / pop_t[MIG_START] * 1000 / (MIG_END - MIG_START)  # per 1,000 people per year

# ---------------------------------------------------------------- labour & living standards

lfs_k = K(lfs).set_index(["district", "year"]).sort_index()
latest_lfs_year = int(lfs_k.index.get_level_values("year").max())

def panel(df, value):
    return K(df).pivot_table(index="district", columns="year", values=value)

inc_med, inc_mean = panel(income, "income_median"), panel(income, "income_mean")
pov = panel(poverty, "poverty_absolute")
gin = panel(gini, "gini")
exp_mean = panel(hies, "expenditure_mean")
hies_years = sorted(inc_med.columns)
latest_hies = hies_years[-1]

kedah_hies = (inc_state[inc_state.state == "Kedah"].set_index("year")[["income_median", "income_mean"]]
              .join(pov_state[pov_state.state == "Kedah"].set_index("year")["poverty_absolute"].rename("poverty"))
              .join(gini_state[gini_state.state == "Kedah"].set_index("year")["gini"]))
my_income = hies_my.set_index("year")
my_poverty = poverty_my.set_index("year")

# Malaysia-wide ranks (1 = highest value) among all districts.
def rank_all(df, col, year, ascending=False):
    s = df[df.year == year].set_index(["state", "district"])[col]
    return s.rank(ascending=ascending, method="min"), len(s)

rank_income, n_income = rank_all(income, "income_median", latest_hies)
rank_poverty, n_poverty = rank_all(poverty, "poverty_absolute", latest_hies)
gdp_pc_all = (gdp_all[(gdp_all.sector == "p0") & (gdp_all.year == latest_gdp_year)].set_index(["state", "district"]).value
              / pop[(pop.age == "overall") & (pop.year == latest_gdp_year)].set_index(["state", "district"]).population)
gdp_pc_all = gdp_pc_all.dropna()
rank_gdp_pc = gdp_pc_all.rank(ascending=False, method="min")

# ---------------------------------------------------------------- jobs mirror (estimates)

jobs_year = int(jobs_ind.year.max())
state_jobs = jobs_ind[jobs_ind.year == jobs_year].groupby("sector").employed_k.sum()[SECTORS]
seed = (by_sector[2019] + by_sector[2020]) / 2
emp_latest = lfs_k.xs(jobs_year, level="year")["lf_employed"]
jobs = estimate_jobs(seed.loc[KEDAH_DISTRICTS], emp_latest, state_jobs)

# ---------------------------------------------------------------- extras

kaw = {}
for group in kawasanku["data"].values():
    for item in group:
        for row in item["data"]:
            if row["area"] in KEDAH_DISTRICTS:
                kaw.setdefault(row["area"], {})[item["key"]] = row["tooltip"]

crops_k = K(crops).groupby(["district", "crop_species"]).planted_area.sum()

# ---------------------------------------------------------------- highlights (rule-based, bilingual)

def fmt(x, n=1):
    return f"{x:,.{n}f}"

state_income_med = kedah_hies.loc[latest_hies, "income_median"]
state_poverty = kedah_hies.loc[latest_hies, "poverty"]
kedah_ur = (K(lfs)[K(lfs).year == latest_lfs_year].lf_unemployed.sum()
            / K(lfs)[K(lfs).year == latest_lfs_year].lf.sum() * 100)
kedah_cagr = cagr(gdp_total.loc[KEDAH_DISTRICTS, SS_BASE].sum(), gdp_total.loc[KEDAH_DISTRICTS, SS_END].sum(), SS_END - SS_BASE)


def highlights(d: str) -> list[dict]:
    out = []
    shares = by_sector[latest_gdp_year].loc[d] / by_sector[latest_gdp_year].loc[d].sum() * 100
    specialised = [s for s in SECTORS if shares[s] >= 8 and lq_kedah.loc[d, s] >= 1.2]
    for s in sorted(specialised, key=lambda s: -lq_kedah.loc[d, s])[:2]:
        lq = lq_kedah.loc[d, s]
        out.append({"tone": "strength", "score": lq,
                    "ms": f"{SECTOR_LABEL[s]['ms']} menyumbang {fmt(shares[s], 0)}% daripada ekonomi daerah — {fmt(lq)} kali purata Kedah.",
                    "en": f"{SECTOR_LABEL[s]['en']} {'make' if s == 'services' else 'makes'} up {fmt(shares[s], 0)}% of the district economy — {fmt(lq)}× the Kedah average."})
    p = pov.loc[d, latest_hies]
    rank_k = int(pov[latest_hies].rank(ascending=False).loc[d])
    if p >= state_poverty * 1.3:
        where_ms = "tertinggi di Kedah" if rank_k == 1 else f"ke-{rank_k} tertinggi di Kedah"
        where_en = "the highest in Kedah" if rank_k == 1 else f"the {['', '', '2nd', '3rd'][rank_k] if rank_k <= 3 else f'{rank_k}th'} highest in Kedah"
        out.append({"tone": "concern", "score": p / state_poverty,
                    "ms": f"Kemiskinan mutlak {fmt(p)}% ({latest_hies}) — {where_ms}, berbanding {fmt(state_poverty)}% di peringkat negeri.",
                    "en": f"Absolute poverty is {fmt(p)}% ({latest_hies}) — {where_en}, against {fmt(state_poverty)}% statewide."})
    elif p <= state_poverty * 0.7:
        out.append({"tone": "strength", "score": state_poverty / max(p, 0.5),
                    "ms": f"Kemiskinan mutlak hanya {fmt(p)}% ({latest_hies}), jauh di bawah purata Kedah {fmt(state_poverty)}%.",
                    "en": f"Absolute poverty is only {fmt(p)}% ({latest_hies}), well below Kedah's {fmt(state_poverty)}%."})
    m = inc_med.loc[d, latest_hies]
    gap = (m / state_income_med - 1) * 100
    if abs(gap) >= 10:
        word_ms, word_en = ("lebih tinggi", "above") if gap > 0 else ("lebih rendah", "below")
        out.append({"tone": "strength" if gap > 0 else "concern", "score": abs(gap) / 10,
                    "ms": f"Pendapatan penengah isi rumah RM{m:,.0f} sebulan — {fmt(abs(gap), 0)}% {word_ms} daripada penengah Kedah.",
                    "en": f"Median household income is RM{m:,.0f} a month — {fmt(abs(gap), 0)}% {word_en} the Kedah median."})
    g = cagr(gdp_total.loc[d, SS_BASE], gdp_total.loc[d, SS_END], SS_END - SS_BASE)
    loc = ss.loc[d, "local"]
    if abs(g - kedah_cagr) >= 0.7:
        faster = g > kedah_cagr
        out.append({"tone": "strength" if faster else "concern", "score": abs(g - kedah_cagr),
                    "ms": f"KDNK tumbuh {fmt(g)}% setahun ({SS_BASE}–{SS_END}), {'lebih pantas' if faster else 'lebih perlahan'} daripada Kedah ({fmt(kedah_cagr)}%)."
                          + (" Sektor tempatan berprestasi lebih baik daripada sektor yang sama di peringkat negeri." if loc > 1 else
                             " Sektor tempatan ketinggalan berbanding sektor yang sama di peringkat negeri." if loc < -1 else ""),
                    "en": f"GDP grew {fmt(g)}% a year ({SS_BASE}–{SS_END}), {'faster' if faster else 'slower'} than Kedah ({fmt(kedah_cagr)}%)."
                          + (" Local industries outperformed the same industries statewide." if loc > 1 else
                             " Local industries lagged the same industries statewide." if loc < -1 else "")})
    mig = net_mig_rate.loc[d]
    if abs(mig) >= 3:
        people = abs(net_mig.loc[d]) * 1000 / (MIG_END - MIG_START)
        out.append({"tone": "concern" if mig < 0 else "strength", "score": abs(mig) / 3,
                    "ms": f"Dianggarkan seramai {people:,.0f} orang (bersih) setahun berpindah {'keluar dari' if mig < 0 else 'masuk ke'} daerah ini ({MIG_START}–{MIG_END}).",
                    "en": f"An estimated net {people:,.0f} people a year {'moved out of' if mig < 0 else 'moved into'} the district ({MIG_START}–{MIG_END})."})
    ur = lfs_k.loc[(d, latest_lfs_year), "u_rate"]
    if abs(ur - kedah_ur) >= 0.8:
        out.append({"tone": "concern" if ur > kedah_ur else "strength", "score": abs(ur - kedah_ur),
                    "ms": f"Kadar pengangguran {fmt(ur)}% ({latest_lfs_year}), berbanding {fmt(kedah_ur)}% bagi Kedah.",
                    "en": f"Unemployment is {fmt(ur)}% ({latest_lfs_year}) against {fmt(kedah_ur)}% for Kedah."})
    return sorted(out, key=lambda h: -h["score"])[:5]


# ---------------------------------------------------------------- assemble

def series(df, d, years):
    return [{"year": int(y), "value": r(df.loc[d, y], 3)} for y in years if y in df.columns and not pd.isna(df.loc[d, y])]


districts = []
for d in KEDAH_DISTRICTS:
    lf = lfs_k.loc[d]
    top_crops = crops_k.loc[d].sort_values(ascending=False).head(5) if d in crops_k.index.get_level_values(0) else pd.Series(dtype=float)
    districts.append({
        "slug": slug(d), "name": d,
        "area_km2": r(kaw.get(d, {}).get("total_area"), 0),
        "population": {"latest_year": int(latest_pop_year), "latest": r(pop_k.loc[d, latest_pop_year], 1),
                       "series": series(pop_k, d, pop_years),
                       "age_share": {k: r(v) for k, v in age_share.loc[d].items()},
                       "net_migration_k": r(net_mig.loc[d], 2), "net_migration_per_1000_yr": r(net_mig_rate.loc[d], 1),
                       "natural_increase_k": r(natural.loc[d], 2)},
        "gdp": {
            "unit": "RM million, constant 2015 prices",
            "latest_year": int(latest_gdp_year),
            "total": series(gdp_total, d, gdp_years),
            "by_sector": {s: [{"year": int(y), "value": r(by_sector[y].loc[d, s], 2)} for y in gdp_years] for s in SECTORS},
            "share_of_kedah": r(gdp_total.loc[d, latest_gdp_year] / gdp_total.loc[KEDAH_DISTRICTS, latest_gdp_year].sum() * 100, 2),
            "per_capita_k": r(gdp_total.loc[d, latest_gdp_year] / pop_k.loc[d, latest_gdp_year], 2),
            "per_capita_rank_my": [int(rank_gdp_pc.loc[("Kedah", d)]), int(len(rank_gdp_pc))],
            "cagr_2015_2019": r(cagr(gdp_total.loc[d, SS_BASE], gdp_total.loc[d, SS_END], SS_END - SS_BASE), 2),
            "lq_kedah": {s: r(lq_kedah.loc[d, s], 2) for s in SECTORS},
            "lq_malaysia": {s: r(lq_malaysia.loc[d, s], 2) for s in SECTORS},
            "shift_share": {k: r(v, 2) for k, v in ss.loc[d].items()},
            "projection": {"year": latest_state_year, "total": r(gdp_proj_total.loc[d], 1),
                           "by_sector": {s: r(gdp_proj.loc[d, s], 1) for s in SECTORS}},
        },
        "labour": {
            "latest_year": latest_lfs_year,
            "series": [{"year": int(y), "lf": r(row.lf), "employed": r(row.lf_employed), "unemployed": r(row.lf_unemployed),
                        "u_rate": r(row.u_rate), "p_rate": r(row.p_rate)} for y, row in lf.iterrows()],
        },
        "jobs_estimate": {
            "year": jobs_year,
            "by_sector": {s: {"central": r(jobs["central"].loc[d, s], 2), "low": r(jobs["low"].loc[d, s], 2),
                              "high": r(jobs["high"].loc[d, s], 2)} for s in SECTORS},
        },
        "living": {
            "latest_year": int(latest_hies),
            "income_median": series(inc_med, d, hies_years), "income_mean": series(inc_mean, d, hies_years),
            "poverty": series(pov, d, hies_years), "gini": series(gin, d, hies_years),
            "expenditure_mean": series(exp_mean, d, hies_years),
            "income_rank_my": [int(rank_income.loc[("Kedah", d)]), n_income],
            "poverty_rank_my": [int(rank_poverty.loc[("Kedah", d)]), n_poverty],
        },
        "place": {k: r(kaw.get(d, {}).get(k), 3) for k in
                  ["nightlights", "treecover", "hospital", "clinic", "school", "grocery", "population_density"]},
        "crops_2017": [{"crop": c, "hectares": r(v, 0)} for c, v in top_crops.items() if v > 0],
        "highlights": [{k: v for k, v in h.items() if k != "score"} for h in highlights(d)],
    })

# District types: a rule-based label per district from its GDP mix (latest district
# GDP year), so readers can remember each district by what drives it. Rules are
# applied in order and documented on /kaedah. Four types only: five categorical
# colours can't stay distinguishable on a map where any two may touch.
TYPE_RULES = [
    ("industry", "manufacturing >= 30% of district GDP"),
    ("farm", "agriculture >= 35% of district GDP"),
    ("services", "services >= 70% of GDP and GDP per person above the Kedah average"),
    ("rural", "all other districts"),
]
kedah_pc_k = gdp_total.loc[KEDAH_DISTRICTS, latest_gdp_year].sum() / pop_k.loc[KEDAH_DISTRICTS, latest_gdp_year].sum()


def district_type(rec: dict) -> str:
    sh = {s: rec["gdp"]["by_sector"][s][-1]["value"] for s in SECTORS}
    tot = sum(sh.values())
    share = {s: v / tot * 100 for s, v in sh.items()}
    if share["manufacturing"] >= 30:
        return "industry"
    if share["agriculture"] >= 35:
        return "farm"
    if share["services"] >= 70 and rec["gdp"]["per_capita_k"] > kedah_pc_k:
        return "services"
    return "rural"


for rec in districts:
    rec["type"] = district_type(rec)
    brief = ROOT / "data" / "briefs" / f"{rec['slug']}.json"
    if brief.exists():
        b = json.loads(brief.read_text())
        rec["brief"] = {k: b[k] for k in ("ms", "en", "drafted_by", "drafted_on", "reviewed")}

state_jobs_by_ind = jobs_ind.pivot(index="industry", columns="year", values="employed_k")
kedah = {
    "gdp_state": [{"year": int(y), "total": r(row["p0"], 1),
                   **{SECTOR_CODE[c]: r(row[c], 1) for c in SECTOR_CODE}} for y, row in state_k.iterrows()],
    "gdp_latest_year": latest_state_year,
    "jobs_industry": {int(y): {i: r(v) for i, v in state_jobs_by_ind[y].items()} for y in state_jobs_by_ind.columns},
    "jobs_occupation": {int(y): dict(zip(g.occupation, g.employed_k)) for y, g in jobs_occ.groupby("year")},
    "jobs_by_sector": {s: r(v) for s, v in state_jobs.items()},
    "jobs_year": jobs_year,
    "income_median": {int(y): int(v) for y, v in kedah_hies.income_median.items() if y in hies_years},
    "poverty": {int(y): r(v) for y, v in kedah_hies.poverty.items() if y in hies_years},
    "gini": {int(y): r(v, 3) for y, v in kedah_hies.gini.items() if y in hies_years},
    "history": {"income_median": {int(y): int(v) for y, v in kedah_hies.income_median.dropna().items()},
                "poverty": {int(y): r(v) for y, v in kedah_hies.poverty.dropna().items()}},
    "u_rate": r(kedah_ur),
    "cagr_2015_2019": r(kedah_cagr, 2),
    "population": {int(y): r(pop_k[y].sum()) for y in pop_years},
}
# Peers for the Shenzhen story: real GDP, population and GDP per person for
# Kedah, Penang and Malaysia (Malaysia = sum of states + Supra, which matches
# DOSM's national total).
pop_state = read("population_state").query("sex == 'both' and age == 'overall' and ethnicity == 'overall'")
pop_my = read("population_malaysia").query("sex == 'both' and age == 'overall' and ethnicity == 'overall'")
gdp_tot = gdp_state[gdp_state.sector == "p0"].pivot_table(index="year", columns="state", values="value")
gdp_tot["Malaysia"] = gdp_tot.sum(axis=1)
pop_tot = pop_state.pivot_table(index="year", columns="state", values="population")
pop_tot["Malaysia"] = pop_my.set_index("year").population
peer_years = [y for y in gdp_tot.index if y in pop_tot.index]
y0, y1 = peer_years[0], peer_years[-1]


def peer(state: str) -> dict:
    g, p = gdp_tot[state], pop_tot[state]
    pc = g / p * 1000  # RM million / thousand people -> RM per person
    return {
        "gdp": [{"year": int(y), "value": r(g[y], 1)} for y in peer_years],
        "population": [{"year": int(y), "value": r(p[y], 1)} for y in peer_years],
        "per_capita": [{"year": int(y), "value": r(pc[y], 0)} for y in peer_years],
        "cagr_gdp": r(cagr(g[y0], g[y1], y1 - y0), 2),
        "cagr_pop": r(cagr(p[y0], p[y1], y1 - y0), 2),
        "cagr_per_capita": r(cagr(pc[y0], pc[y1], y1 - y0), 2),
    }


# Kedah-vs-Penang extras: GDP by sector, household income and poverty, land area
# and area-weighted night lights (Kawasanku covers every district in Malaysia).
PENANG_DISTRICTS = ["Barat Daya", "Timur Laut", "Seberang Perai Utara", "Seberang Perai Tengah", "Seberang Perai Selatan"]
kaw_all: dict[str, dict] = {}
for group in kawasanku["data"].values():
    for item in group:
        for row in item["data"]:
            kaw_all.setdefault(row["area"], {})[item["key"]] = row["tooltip"]


def state_extras(state: str, members: list[str]) -> dict:
    sec = gdp_state[(gdp_state.state == state) & gdp_state.sector.isin(SECTOR_CODE)].pivot_table(
        index="year", columns="sector", values="value")
    area = sum(kaw_all[m]["total_area"] for m in members)
    lights = sum(kaw_all[m]["nightlights"] * kaw_all[m]["total_area"] for m in members) / area
    hies = inc_state[inc_state.state == state].set_index("year")
    pov = pov_state[pov_state.state == state].set_index("year")
    return {
        "sectors": {SECTOR_CODE[c]: [{"year": int(y), "value": r(v, 1)} for y, v in sec[c].items()] for c in SECTOR_CODE},
        "cagr_sectors": {SECTOR_CODE[c]: r(cagr(sec[c][y0], sec[c][y1], y1 - y0), 2) for c in SECTOR_CODE},
        "income_median": [{"year": int(y), "value": int(v)} for y, v in hies.income_median.dropna().items() if y in hies_years],
        "poverty": [{"year": int(y), "value": r(v, 1)} for y, v in pov.poverty_absolute.dropna().items() if y in hies_years],
        "area_km2": r(area, 0),
        "nightlights": r(lights, 2),
    }


peers = {"period": [int(y0), int(y1)],
         "kedah": peer("Kedah") | state_extras("Kedah", KEDAH_DISTRICTS),
         "penang": peer("Pulau Pinang") | state_extras("Pulau Pinang", PENANG_DISTRICTS),
         "malaysia": peer("Malaysia")}

# ---------------------------------------------------------------- forecasts

static = pd.DataFrame({
    "nightlights": {a: v.get("nightlights") for a, v in kaw_all.items()},
    "log_density": {a: np.log(v["population_density"]) if v.get("population_density") else np.nan for a, v in kaw_all.items()},
    "treecover": {a: v.get("treecover") for a, v in kaw_all.items()},
})
fc = forecast.run(gdp_all, gdp_state, static, KEDAH_DISTRICTS, pop_k, SECTOR_CODE)
mfg_year = max(int(y) for y in jobs_ind.year.unique())
mfg_workers_k = float(jobs_ind[(jobs_ind.year == mfg_year) & (jobs_ind.industry == "manufacturing")].employed_k.iloc[0])
fc["productivity"] = {"manufacturing_rm_per_worker": r(state_k.loc[mfg_year, "p3"] * 1e6 / (mfg_workers_k * 1000), 0),
                      "year": mfg_year}
bt = fc["backtest"]["median_abs_pct_error"]
print(f"forecast model: {fc['model']} | median abs % error (1y/3y): "
      + ", ".join(f"{k} {v['1']}/{v['3']}" for k, v in bt.items()))

malaysia = {
    "income_median": {int(y): int(v) for y, v in my_income.income_median.items() if y in hies_years},
    "poverty": {int(y): r(v) for y, v in my_poverty.poverty_absolute.items() if y in hies_years},
    "sector_share_gdp": {s: r(v / my_sectors.sum() * 100) for s, v in my_sectors.items()},
}

manifest = {m["id"]: m for m in json.loads((RAW / "manifest.json").read_text())}
sources_out = [{k: s.get(k) for k in ["id", "title", "publisher", "licence", "years", "note", "catalogue", "url"]}
               | {"retrieved": manifest.get(s["id"], {}).get("retrieved", "")[:10],
                  "sha256": manifest.get(s["id"], {}).get("sha256")} for s in SOURCES]

atlas = {
    "meta": {"built": date.today().isoformat(), "sector_labels": SECTOR_LABEL,
             "shift_share_period": [SS_BASE, SS_END], "type_rules": TYPE_RULES,
             "kedah_gdp_per_capita_k": r(kedah_pc_k, 2), "kawasanku_as_of": kawasanku.get("data_as_of"), "migration_period": [MIG_START, MIG_END],
             "jobs_seed_years": [2019, 2020],
             "gdp_imputed": [{"district": f.district, "year": int(f.year), "sector": f.sector, "value": r(f.value, 2)}
                             for f in gdp_fills[gdp_fills.state == "Kedah"].itertuples()]},
    "sources": sources_out, "kedah": kedah, "malaysia": malaysia, "peers": peers, "forecast": fc, "districts": districts,
}

# ---------------------------------------------------------------- write

WEB_DATA.mkdir(parents=True, exist_ok=True)
(WEB_DATA / "atlas.json").write_text(json.dumps(atlas, ensure_ascii=False, indent=1))
shutil.copy(RAW / "kedah_districts.geojson", WEB_DATA / "kedah.geo.json")
shutil.copy(RAW / "context_boundaries.geojson", WEB_DATA / "context.geo.json")

# Tidy long table (also the source for downloads).
rows = []
def add(d, y, ind, v, unit, kind, src):
    if v is not None and not pd.isna(v):
        rows.append({"district": d, "year": int(y), "indicator": ind, "value": float(v), "unit": unit, "kind": kind, "source": src})

for d in KEDAH_DISTRICTS:
    for y in gdp_years:
        add(d, y, "gdp_total", gdp_total.loc[d, y], "RM million (2015 prices)", "official", "gdp_district")
        for s in SECTORS:
            add(d, y, f"gdp_{s}", by_sector[y].loc[d, s], "RM million (2015 prices)", "official", "gdp_district")
    for y in pop_years:
        add(d, y, "population", pop_k.loc[d, y], "thousand", "official", "population_district")
    for y, row in lfs_k.loc[d].iterrows():
        for c in ["lf", "lf_employed", "lf_unemployed", "u_rate", "p_rate"]:
            add(d, y, c, row[c], "thousand" if c.startswith("lf") else "%", "official", "lfs_district")
    for y in hies_years:
        add(d, y, "income_median", inc_med.loc[d, y], "RM/month", "official", "hh_income_district")
        add(d, y, "income_mean", inc_mean.loc[d, y], "RM/month", "official", "hh_income_district")
        add(d, y, "poverty_absolute", pov.loc[d, y], "%", "official", "hh_poverty_district")
        add(d, y, "gini", gin.loc[d, y], "index", "official", "hh_inequality_district")
    for s in SECTORS:
        for k in ["central", "low", "high"]:
            add(d, jobs_year, f"jobs_{s}_{k}", jobs[k].loc[d, s], "thousand", "estimate", "atlas-kedah model")
        add(d, latest_gdp_year, f"lq_kedah_{s}", lq_kedah.loc[d, s], "ratio", "derived", "gdp_district")
        add(d, latest_state_year, f"gdp_{s}_projected", gdp_proj.loc[d, s], "RM million (2015 prices)", "estimate", "atlas-kedah model")
    add(d, latest_state_year, "gdp_total_projected", gdp_proj_total.loc[d], "RM million (2015 prices)", "estimate", "atlas-kedah model")
    add(d, MIG_END, "net_migration_per_1000_yr", net_mig_rate.loc[d], "per 1,000/yr", "derived", "population/births/deaths")

tidy = pd.DataFrame(rows)
PROCESSED.mkdir(parents=True, exist_ok=True)
tidy.to_csv(PROCESSED / "indicators.csv", index=False)
dl = WEB_PUBLIC / "downloads"
dl.mkdir(parents=True, exist_ok=True)
tidy.to_csv(dl / "atlas-kedah-indicators.csv", index=False)
tidy[tidy.kind == "estimate"].to_csv(dl / "atlas-kedah-estimates.csv", index=False)
jobs_ind.to_csv(dl / "kedah-jobs-by-industry.csv", index=False)
jobs_occ.to_csv(dl / "kedah-jobs-by-occupation.csv", index=False)
shutil.copy(RAW / "kedah_districts.geojson", dl / "kedah-districts.geojson")

print(f"atlas.json: {len(districts)} districts, {len(tidy):,} indicator rows")
print(pd.DataFrame({d["name"]: {h: len(d["highlights"]) for h in ["n"]} for d in districts}).T.n.to_dict())
