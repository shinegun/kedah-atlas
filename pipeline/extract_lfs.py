"""Pull Kedah's employed persons by industry and by occupation out of the
annual Labour Force Survey report PDFs (Tables B4.5 and B4.8).

Writes data/interim/kedah_jobs_industry.csv and kedah_jobs_occupation.csv
(thousands of employed persons, place of residence).
"""

import re
from pathlib import Path

import pandas as pd
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "data" / "raw" / "pdf"
OUT = ROOT / "data" / "interim"

# Column order of Table B4.8 across its three pages (after the Total column).
INDUSTRY_PAGES = [
    ["total", "agriculture", "mining", "manufacturing", "electricity", "water", "construction", "trade"],
    ["transport", "food_accommodation", "ict", "finance", "real_estate", "professional", "admin_support"],
    ["public_admin", "education", "health", "arts", "other_services", "households"],
]
OCCUPATIONS = ["total", "managers", "professionals", "technicians", "clerical", "service_sales",
               "skilled_agriculture", "craft", "operators", "elementary"]

# Industry (MSIC section) → the five sectors used in district GDP.
SECTOR_OF = {
    "agriculture": "agriculture", "mining": "mining", "manufacturing": "manufacturing",
    "construction": "construction",
}


def parse_number(tok: str) -> float:
    tok = tok.replace(",", "")
    return 0.0 if tok in {"-", "n.a."} else float(tok)


def kedah_row(text: str, n: int) -> list[float]:
    """First 'Kedah ...' line on a page is the ('000) block, which precedes the (%) block."""
    for line in text.splitlines():
        if line.startswith("Kedah "):
            toks = line.split()[1:]
            if len(toks) != n:
                raise ValueError(f"expected {n} values, got {toks}")
            return [parse_number(t) for t in toks]
    raise ValueError("no Kedah row")


def find_pages(pdf, title: str) -> list[int]:
    pat = re.compile(rf"Table B4\.\d+: {title}, Malaysia, (\d{{4}})( \(cont)?")
    hits = []
    for i, page in enumerate(pdf.pages):
        head = "\n".join((page.extract_text() or "").splitlines()[:3])
        if pat.search(head):
            hits.append(i)
    return hits


def extract(year: int) -> tuple[pd.DataFrame, pd.DataFrame]:
    with pdfplumber.open(PDF_DIR / f"lfs_annual_{year}.pdf") as pdf:
        ind_pages = find_pages(pdf, "Employed persons by state and industry")
        occ_pages = find_pages(pdf, "Employed persons by state and occupation")
        assert len(ind_pages) == 3 and len(occ_pages) == 1, (ind_pages, occ_pages)
        values = {}
        for cols, p in zip(INDUSTRY_PAGES, ind_pages):
            values.update(zip(cols, kedah_row(pdf.pages[p].extract_text(), len(cols))))
        occ = dict(zip(OCCUPATIONS, kedah_row(pdf.pages[occ_pages[0]].extract_text(), len(OCCUPATIONS))))

    total = values.pop("total")
    parts = sum(values.values())
    # Total also includes extraterritorial bodies (~0) and rounding.
    assert abs(parts - total) < 2.0, (year, parts, total)
    ind = pd.DataFrame({"year": year, "industry": list(values), "employed_k": list(values.values())})
    ind["sector"] = ind.industry.map(SECTOR_OF).fillna("services")
    ind.loc[ind.industry.isin(["electricity", "water"]), "sector"] = "services"

    occ_total = occ.pop("total")
    assert abs(sum(occ.values()) - occ_total) < 2.0, (year, occ)
    occ_df = pd.DataFrame({"year": year, "occupation": list(occ), "employed_k": list(occ.values())})
    return ind, occ_df


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    years = sorted(int(p.stem.split("_")[-1]) for p in PDF_DIR.glob("lfs_annual_*.pdf"))
    inds, occs = zip(*(extract(y) for y in years))
    pd.concat(inds).to_csv(OUT / "kedah_jobs_industry.csv", index=False)
    pd.concat(occs).to_csv(OUT / "kedah_jobs_occupation.csv", index=False)
    print(pd.concat(inds).pivot(index="industry", columns="year", values="employed_k"))
    print(pd.concat(occs).pivot(index="occupation", columns="year", values="employed_k"))


if __name__ == "__main__":
    main()
