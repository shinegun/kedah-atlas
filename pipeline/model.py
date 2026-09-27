"""Analytical building blocks. Each function is small and documented on /kaedah."""

import numpy as np
import pandas as pd

SECTORS = ["agriculture", "mining", "manufacturing", "construction", "services"]


def ipf(seed: np.ndarray, row_targets: np.ndarray, col_targets: np.ndarray,
        tol: float = 1e-9, max_iter: int = 1000) -> np.ndarray:
    """Iterative proportional fitting (RAS): rescale `seed` until its row sums
    equal `row_targets` and column sums equal `col_targets`."""
    assert np.isclose(row_targets.sum(), col_targets.sum()), "margins must share a total"
    m = seed.astype(float).copy()
    for _ in range(max_iter):
        m *= (row_targets / m.sum(axis=1))[:, None]
        m *= (col_targets / m.sum(axis=0))[None, :]
        if np.allclose(m.sum(axis=1), row_targets, rtol=tol):
            return m
    raise RuntimeError("IPF did not converge")


def estimate_jobs(gdp_seed: pd.DataFrame, district_employed: pd.Series, state_jobs: pd.Series,
                  draws: int = 2000, productivity_sd: float = 0.25, employed_rse: float = 0.05,
                  seed: int = 42) -> dict[str, pd.DataFrame]:
    """District × sector employment consistent with two official margins:
    each district's employed total (LFS by district) and Kedah's employed by sector
    (LFS state tables). The split inside the table follows each district's output mix.

    Uncertainty: output per worker is allowed to differ between districts
    (log-normal, sd=`productivity_sd`) and district totals carry sampling error
    (`employed_rse`). We report the 10th–90th percentile across draws."""
    districts, sectors = gdp_seed.index, gdp_seed.columns
    rows = district_employed.loc[districts].to_numpy(float)
    cols = state_jobs.loc[sectors].to_numpy(float)
    rows = rows * cols.sum() / rows.sum()   # district LFS totals rounded independently

    central = ipf(gdp_seed.to_numpy(float), rows, cols)

    rng = np.random.default_rng(seed)
    sims = np.empty((draws, *central.shape))
    for k in range(draws):
        s = gdp_seed.to_numpy(float) * rng.lognormal(0.0, productivity_sd, gdp_seed.shape)
        r = rows * (1 + rng.normal(0.0, employed_rse, rows.shape))
        r = np.clip(r, 1e-6, None)
        r *= cols.sum() / r.sum()
        sims[k] = ipf(s, r, cols)
    frame = lambda a: pd.DataFrame(a, index=districts, columns=sectors)  # noqa: E731
    return {
        "central": frame(central),
        "low": frame(np.percentile(sims, 10, axis=0)),
        "high": frame(np.percentile(sims, 90, axis=0)),
    }


def location_quotient(district: pd.DataFrame, reference: pd.Series) -> pd.DataFrame:
    """LQ > 1: the sector is a bigger slice of the district's economy than of the reference economy."""
    d_share = district.div(district.sum(axis=1), axis=0)
    r_share = reference / reference.sum()
    return d_share.div(r_share, axis=1)


def shift_share(base: pd.DataFrame, end: pd.DataFrame) -> pd.DataFrame:
    """Classic three-way decomposition of each district's output change against Kedah.

    - state:  growth if the district had grown at Kedah's overall rate
    - mix:    extra growth from holding faster/slower-growing sectors
    - local:  the rest — how the district's own sectors did vs the same sectors statewide
    Returned as % of base-year output."""
    k0, k1 = base.sum(), end.sum()
    g_total = k1.sum() / k0.sum() - 1
    g_sector = k1 / k0 - 1
    state = base.sum(axis=1) * g_total
    mix = (base * (g_sector - g_total)).sum(axis=1)
    # Written as a level difference so sectors that start at zero are handled.
    local = (end - base - base * g_sector).sum(axis=1)
    out = pd.DataFrame({"state": state, "mix": mix, "local": local})
    out["actual"] = end.sum(axis=1) - base.sum(axis=1)
    assert np.allclose(out[["state", "mix", "local"]].sum(axis=1), out["actual"])
    return out.div(base.sum(axis=1), axis=0) * 100


def cagr(start: float, end: float, years: int) -> float:
    return ((end / start) ** (1 / years) - 1) * 100
