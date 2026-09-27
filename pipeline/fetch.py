"""Download every source into data/raw/ and record a manifest with checksums.

Usage: uv run python pipeline/fetch.py [--force]
"""

import hashlib
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).parent))
from sources import CONTEXT_DISTRICTS, KEDAH_DISTRICTS, SOURCES  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
HEADERS = {"User-Agent": "atlas-kedah/0.1 (open-data research)"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def download(url: str, dest: Path, force: bool) -> None:
    if dest.exists() and not force:
        return
    r = requests.get(url, headers=HEADERS, timeout=120)
    r.raise_for_status()
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(r.content)


def fetch_boundaries(force: bool) -> Path:
    """Kawasanku pages embed each district's boundary; stitch them into one GeoJSON."""
    dest = RAW / "kedah_districts.geojson"
    if dest.exists() and not force:
        return dest
    features = []
    for name in KEDAH_DISTRICTS:
        url = f"https://open.dosm.gov.my/dashboard/kawasanku/Kedah/district/{name}"
        html = requests.get(url, headers=HEADERS, timeout=60).text
        m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
        props = json.loads(m.group(1))["props"]["pageProps"]
        feature = props["geojson"]
        feature["properties"] = {"district": name, "code": feature["properties"].get("code_state_district")}
        features.append(feature)
        if name == KEDAH_DISTRICTS[0]:
            # The comparison ("jitterplot") block covers all 160 districts; one copy is enough.
            (RAW / "kawasanku_indicators.json").write_text(json.dumps(props["jitterplot"]))
        time.sleep(0.5)
    dest.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    return dest


def kawasanku_feature(state: str, district: str) -> dict:
    url = f"https://open.dosm.gov.my/dashboard/kawasanku/{requests.utils.quote(state)}/district/{requests.utils.quote(district)}"
    html = requests.get(url, headers=HEADERS, timeout=60).text
    m = re.search(r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>', html, re.S)
    return json.loads(m.group(1))["props"]["pageProps"]["geojson"]


def fetch_context(force: bool) -> Path:
    """Penang and Perlis district outlines, for grey context around the Kedah map."""
    dest = RAW / "context_boundaries.geojson"
    if dest.exists() and not force:
        return dest
    features = []
    for state, names in CONTEXT_DISTRICTS.items():
        for name in names:
            f = kawasanku_feature(state, name)
            f["properties"] = {"state": state, "district": name}
            features.append(f)
            time.sleep(0.5)
    dest.write_text(json.dumps({"type": "FeatureCollection", "features": features}))
    return dest


def main(force: bool = False) -> None:
    manifest = []
    for s in SOURCES:
        if s["kind"] == "parquet":
            dest = RAW / f"{s['id']}.parquet"
            download(s["url"], dest, force)
        elif s["kind"] == "pdf":
            dest = RAW / "pdf" / f"{s['id']}.pdf"
            download(s["url"], dest, force)
        elif s["kind"] == "kawasanku":
            dest = fetch_boundaries(force)
        elif s["kind"] == "kawasanku_context":
            dest = fetch_context(force)
        else:
            raise ValueError(s["kind"])
        manifest.append({
            "id": s["id"], "url": s["url"], "file": str(dest.relative_to(ROOT)),
            "sha256": sha256(dest), "bytes": dest.stat().st_size,
            "retrieved": datetime.fromtimestamp(dest.stat().st_mtime, timezone.utc).isoformat(timespec="seconds"),
        })
        print(f"ok  {s['id']:<24} {dest.stat().st_size:>10,} B")
    (RAW / "manifest.json").write_text(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main(force="--force" in sys.argv)
