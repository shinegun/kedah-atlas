"""District GDP nowcasts (2021–2025) and projections (to 2030), with a backtest.

DOSM stopped publishing district GDP after 2020, but publishes state GDP by
sector every year. The question each model answers is: given a district's
sector output in a base year and how the state's sector grew since, how much
faster or slower did (or will) the district grow than its state sector?

Models compared on every Malaysian district, leave-one-state-out (the model
never sees the state it is tested on):
  - constant share of state GDP       (the naive benchmark)
  - constant share of each state sector (shift-share)
  - damped momentum                   (half the district's past relative growth)
  - gradient-boosted trees            (machine learning on district features)
The model with the lowest error is used. Its out-of-sample errors set the
P10–P90 range; beyond the tested horizon the range widens with sqrt(years).

Usage: uv run python pipeline/forecast.py   (prints the backtest)
"""

from __future__ import annotations

import math

import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

PARTS = ["p1", "p2", "p3", "p4", "p5"]
FIRST, LAST = 2015, 2020  # district GDP years published by DOSM
CLIP = 0.4                # cap on annual relative growth (log points) used as a target
DAMP = 0.7                # yearly decay of relative growth beyond the tested horizon
MOMENTUM = 0.5            # weight on past relative growth in the momentum model
SEED = 7


def _panel(gdp_all: pd.DataFrame):
    """X[(state, district, sector)] × year and S[(state, sector)] × year (sum of districts)."""
    g = gdp_all[gdp_all.sector.isin(PARTS)]
    X = g.pivot_table(index=["state", "district", "sector"], columns="year", values="value", aggfunc="sum")
    S = X.groupby(level=["state", "sector"]).sum()
    return X, S


def _features(X: pd.DataFrame, S: pd.DataFrame, b: int, static: pd.DataFrame, mom_base: int | None = None) -> pd.DataFrame:
    """One row per (state, district, sector) at base year b. Momentum features can be
    taken from an earlier year (mom_base) to skip a shock year such as 2020."""
    mb = mom_base or b
    idx = X.index
    s_of = S.reindex(pd.MultiIndex.from_arrays([idx.get_level_values(0), idx.get_level_values(2)]))
    s_of.index = idx
    xb = X[b]
    tot_d = xb.groupby(level=["state", "district"]).transform("sum")
    tot_s = S[b].groupby(level="state").sum().reindex(idx.get_level_values(0)).values
    with np.errstate(divide="ignore", invalid="ignore"):
        f = pd.DataFrame(index=idx)
        f["mom1"] = np.log(X[mb] / X[mb - 1]) - np.log(s_of[mb] / s_of[mb - 1]) if mb - 1 >= FIRST else np.nan
        f["momL"] = (np.log(X[mb] / X[FIRST]) - np.log(s_of[mb] / s_of[FIRST])) / (mb - FIRST) if mb > FIRST else np.nan
        f["share"] = xb / tot_d
        f["lq"] = f["share"] / (s_of[b] / tot_s)
        f["size"] = np.log(tot_d)
        f["sshare"] = xb / s_of[b]
        f["state_g"] = np.log(s_of[mb] / s_of[mb - 1]) if mb - 1 >= FIRST else np.nan
    for p in PARTS:
        f[f"is_{p}"] = (idx.get_level_values(2) == p).astype(float)
    st = static.reindex(idx.get_level_values(1))
    for c in static.columns:
        f[c] = st[c].values
    return f.replace([np.inf, -np.inf], np.nan)


def _samples(X, S, static):
    rows = []
    for b in range(FIRST + 1, LAST):
        f = _features(X, S, b, static)
        for h in range(1, LAST - b + 1):
            s_of = S.reindex(pd.MultiIndex.from_arrays([X.index.get_level_values(0), X.index.get_level_values(2)])).values
            with np.errstate(divide="ignore", invalid="ignore"):
                s_ratio = s_of[:, list(S.columns).index(b + h)] / s_of[:, list(S.columns).index(b)]
                y = (np.log(X[b + h] / X[b]) - np.log(s_ratio)) / h
            d = f.copy()
            d["h"], d["b"], d["y"] = h, b, y.values
            d["x_b"], d["x_t"], d["s_ratio"] = X[b].values, X[b + h].values, s_ratio
            rows.append(d)
    out = pd.concat(rows)
    ok = (out.x_b > 1) & (out.x_t > 0) & np.isfinite(out.y)
    out.loc[~ok, "y"] = np.nan
    out["y"] = out.y.clip(-CLIP, CLIP)
    return out


def _gbm():
    return HistGradientBoostingRegressor(loss="absolute_error", max_iter=250, learning_rate=0.05,
                                         max_leaf_nodes=15, min_samples_leaf=30, l2_regularization=1.0, random_state=SEED)


FEATS = None  # set on first use


def _feat_cols(df):
    return [c for c in df.columns if c not in {"y", "b", "x_b", "x_t", "s_ratio"}]


def _reconstruct(df: pd.DataFrame, yhat: np.ndarray) -> pd.DataFrame:
    """District-sector predictions, raked so each state sector sums to its known total,
    then summed to district totals."""
    d = df[["b", "h", "x_b", "x_t", "s_ratio"]].copy()
    d["pred"] = d.x_b * d.s_ratio * np.exp(np.nan_to_num(yhat) * d.h)
    d["pred"] = d.pred.where(d.x_b > 0, 0.0)
    d = d.reset_index()
    tot = d.groupby(["state", "sector", "b", "h"])[["pred", "x_t"]].transform("sum")
    d["pred"] = d.pred * (tot.x_t / tot.pred.replace(0, np.nan)).fillna(1)
    return d.groupby(["state", "district", "b", "h"])[["pred", "x_t"]].sum()


def backtest(gdp_all: pd.DataFrame, static: pd.DataFrame) -> dict:
    X, S = _panel(gdp_all)
    data = _samples(X, S, static)
    cols = _feat_cols(data)
    states = data.index.get_level_values("state").unique()
    preds = {"shift_share": np.zeros(len(data)), "momentum": np.zeros(len(data)), "ml": np.full(len(data), np.nan)}
    preds["momentum"] = (MOMENTUM * data.momL.fillna(0)).clip(-CLIP, CLIP).values
    state_of = data.index.get_level_values("state")
    for st in states:
        test = state_of == st
        train = (~test) & data.y.notna().values
        m = _gbm().fit(data.loc[train, cols], data.loc[train, "y"])
        preds["ml"][test] = m.predict(data.loc[test, cols])
    results, errors = {}, {}
    for name, yhat in preds.items():
        r = _reconstruct(data, yhat)
        e = np.log(r.x_t / r.pred)
        errors[name] = e
        results[name] = {int(h): float(np.median(np.abs(r.xs(h, level="h").pred / r.xs(h, level="h").x_t - 1)) * 100)
                         for h in (1, 2, 3)}
    # naive: constant share of the state's total GDP
    tot = data.reset_index().groupby(["state", "district", "b", "h"])[["x_b", "x_t"]].sum()
    st_tot = tot.groupby(level=["state", "b", "h"]).transform("sum")
    naive = tot.x_b / st_tot.x_b * st_tot.x_t
    results["naive"] = {int(h): float(np.median(np.abs(naive.xs(h, level="h") / tot.x_t.xs(h, level="h") - 1)) * 100)
                        for h in (1, 2, 3)}
    kedah = {name: {int(h): float(np.median(np.abs(np.exp(-e.xs("Kedah", level="state").xs(h, level="h")) - 1)) * 100)
                    for h in (1, 2, 3)} for name, e in errors.items()}
    best = min(preds, key=lambda k: np.mean(list(results[k].values())))
    q = {int(h): [float(np.quantile(errors[best].xs(h, level="h"), 0.1)), float(np.quantile(errors[best].xs(h, level="h"), 0.9))]
         for h in (1, 2, 3)}
    n_units = int(data.reset_index()[["state", "district"]].drop_duplicates().shape[0])
    return {"results": results, "kedah": kedah, "best": best, "quantiles": q, "cols": cols, "data": data,
            "n_districts": n_units, "n_samples": int(data.y.notna().sum())}


def _band(q: dict, h: int) -> tuple[float, float]:
    """Log-error P10/P90 at horizon h; beyond the tested 3 years, widen with sqrt(h/3)."""
    if h <= 3:
        return tuple(q[h])
    lo, hi = q[3]
    k = math.sqrt(h / 3)
    return lo * k, hi * k


def _cum_rel(yhat_h: dict[int, float], h: int) -> float:
    """Cumulative relative growth after h years: model predictions up to 3 years, then
    the 3-year annual rate decaying by DAMP each further year."""
    if h <= 3:
        return yhat_h[h] * h
    g3 = yhat_h[3]
    return g3 * 3 + g3 * sum(DAMP ** (k - 3) for k in range(4, h + 1))


def run(gdp_all: pd.DataFrame, gdp_state: pd.DataFrame, static: pd.DataFrame, districts: list[str],
        pop_k: pd.DataFrame, sector_code: dict, horizon: int = 2030, n_sims: int = 2000) -> dict:
    bt = backtest(gdp_all, static)
    X, S = _panel(gdp_all)
    cols, best = bt["cols"], bt["best"]
    train = bt["data"][bt["data"].y.notna()]
    model = _gbm().fit(train[cols], train["y"]) if best == "ml" else None

    # ---- Kedah district-sector base (2020) and model relative growth by horizon
    Xk = X.xs("Kedah", level="state").reindex(pd.MultiIndex.from_product([districts, PARTS], names=["district", "sector"]))
    f = _features(X, S, LAST, static, mom_base=LAST - 1).xs("Kedah", level="state")
    f = f.reindex(Xk.index)
    yhat = {}
    for h in (1, 2, 3):
        fh = f.copy()
        fh["h"] = h
        if best == "ml":
            yhat[h] = model.predict(fh[cols])
        elif best == "momentum":
            yhat[h] = (MOMENTUM * fh.momL.fillna(0)).clip(-CLIP, CLIP).values
        else:
            yhat[h] = np.zeros(len(fh))

    # state sector path: actual to the latest year, then the 2015–latest average growth
    st = gdp_state[(gdp_state.state == "Kedah") & gdp_state.sector.isin(PARTS)].pivot_table(index="year", columns="sector", values="value")
    last_year = int(st.index.max())
    years_hist = list(range(LAST, last_year + 1))
    growth_hist = np.log(st / st.shift(1)).dropna()           # annual log growth by sector
    base_g = np.log(st.loc[last_year] / st.loc[FIRST]) / (last_year - FIRST)
    proj_years = list(range(last_year + 1, horizon + 1))
    S_path = {y: st.loc[y] for y in years_hist}
    for i, y in enumerate(proj_years, start=1):
        S_path[y] = st.loc[last_year] * np.exp(base_g * i)

    # district-sector P50 for every year, raked to the state sector path
    x2020 = Xk[LAST].values
    p50 = {}
    for y in years_hist[1:] + proj_years:
        h = y - LAST
        rel = np.array([_cum_rel({k: yhat[k][i] for k in (1, 2, 3)}, h) for i in range(len(x2020))])
        s_idx = Xk.index.get_level_values("sector")
        raw = x2020 * (S_path[y][s_idx].values / S_path[LAST][s_idx].values) * np.exp(rel)
        df = pd.Series(raw, index=Xk.index)
        df = df * (S_path[y] / df.groupby(level="sector").sum()).reindex(s_idx).values
        p50[y] = df

    # ---- uncertainty (Monte Carlo): district model error + state sector growth shocks after the last known year
    rng = np.random.default_rng(SEED)
    q = bt["quantiles"]
    tot50 = {y: p50[y].groupby(level="district").sum() for y in p50}
    band = {d: {} for d in districts}
    kedah_band = {}
    shocks = growth_hist.values                                  # rows = historical years
    sims_state = np.zeros((n_sims, len(proj_years)))
    for n in range(n_sims):
        draw = shocks[rng.integers(0, len(shocks), len(proj_years))]
        path = st.loc[last_year].values * np.exp(np.cumsum(draw, axis=0))
        base = st.loc[last_year].values * np.exp(np.outer(np.arange(1, len(proj_years) + 1), base_g.values))
        sims_state[n] = path.sum(axis=1) / base.sum(axis=1)
    for j, y in enumerate(proj_years):
        lo, hi = np.quantile(sims_state[:, j], [0.1, 0.9])
        kedah_band[y] = [float(lo), float(hi)]
    for y in p50:
        h = y - LAST
        lo_e, hi_e = _band(q, h)
        z = 1.2816
        sd_d = (hi_e - lo_e) / (2 * z)
        if y in kedah_band:
            sd_s = (math.log(kedah_band[y][1]) - math.log(kedah_band[y][0])) / (2 * z)
        else:
            sd_s = 0.0
        sd = math.sqrt(sd_d ** 2 + sd_s ** 2)
        for d in districts:
            band[d][y] = [math.exp(-z * sd), math.exp(z * sd)]

    # ---- population projection (district 2020–latest trend) for GDP per person
    pop_years = sorted(pop_k.columns)
    p0, p1 = pop_years[0], pop_years[-1]
    pop_g = np.log(pop_k[p1] / pop_k[p0]) / (p1 - p0)
    pop_proj = {d: {y: float(pop_k.loc[d, y]) if y in pop_years else float(pop_k.loc[d, p1] * math.exp(pop_g[d] * (y - p1)))
                    for y in range(LAST, horizon + 1)} for d in districts}

    r = lambda v, n=1: round(float(v), n)  # noqa: E731
    out_d = {}
    for d in districts:
        out_d[d] = {
            "total": [{"year": y, "p50": r(tot50[y][d]), "p10": r(tot50[y][d] * band[d][y][0]), "p90": r(tot50[y][d] * band[d][y][1]),
                       "per_capita_k": r(tot50[y][d] / pop_proj[d][y], 2)} for y in sorted(tot50)],
            "sectors": {sector_code[p]: [{"year": y, "value": r(p50[y][(d, p)])} for y in sorted(p50)] for p in PARTS},
            "relative_growth_3y": {sector_code[p]: r(yhat[3][list(Xk.index).index((d, p))] * 100, 2) for p in PARTS},
            "population_k": [{"year": y, "value": r(pop_proj[d][y])} for y in range(LAST, horizon + 1)],
        }
    kedah_tot = {y: float(sum(S_path[y])) for y in S_path}
    # scenario inputs: district shares of each state sector (baseline), per projection year
    shares = {d: {sector_code[p]: [r(p50[y][(d, p)] / S_path[y][p], 5) for y in proj_years] for p in PARTS} for d in districts}
    fmt_res = {k: {str(h): r(v, 1) for h, v in res.items()} for k, res in bt["results"].items()}
    return {
        "model": best,
        "backtest": {"median_abs_pct_error": fmt_res,
                     "kedah_median_abs_pct_error": {k: {str(h): r(v, 1) for h, v in res.items()} for k, res in bt["kedah"].items()},
                     "n_districts": bt["n_districts"], "n_samples": bt["n_samples"],
                     "quantiles_log": {str(h): [r(a, 4), r(b, 4)] for h, (a, b) in bt["quantiles"].items()}},
        "known_until": last_year,
        "horizon": horizon,
        "years": sorted(tot50),
        "proj_years": proj_years,
        "kedah": [{"year": y, "p50": r(kedah_tot[y]),
                   "p10": r(kedah_tot[y] * kedah_band[y][0]) if y in kedah_band else r(kedah_tot[y]),
                   "p90": r(kedah_tot[y] * kedah_band[y][1]) if y in kedah_band else r(kedah_tot[y])} for y in sorted(kedah_tot)],
        "kedah_band": {str(y): [r(a, 4), r(b, 4)] for y, (a, b) in kedah_band.items()},
        "state_base": {sector_code[p]: r(st.loc[last_year][p]) for p in PARTS},
        "baseline_growth": {sector_code[p]: r((math.exp(base_g[p]) - 1) * 100, 2) for p in PARTS},
        "shares": shares,
        "district_band": {d: {str(y): [r(a, 4), r(b, 4)] for y, (a, b) in band[d].items() if y in proj_years} for d in districts},
        "districts": out_d,
        "kedah_population_k": [{"year": y, "value": r(sum(pop_proj[d][y] for d in districts))} for y in range(LAST, horizon + 1)],
    }


if __name__ == "__main__":
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent))
    import build  # noqa: F401  (runs the build, which prints the backtest)
