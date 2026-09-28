"""Flag Indonesian vocabulary and common grammar slips in the Malay copy.

Scans the Malay side of every bilingual string in web/src and pipeline/build.py.
Exit code 1 if anything is found. Rules live in docs/bm-style.md.

Usage: uv run python pipeline/check_bm.py
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# (pattern, suggestion). Word-bounded, case-insensitive unless noted.
BANNED = [
    (r"bisa", "boleh / dapat"), (r"karena", "kerana"), (r"unduh|unggah", "muat turun / muat naik"),
    (r"kantor", "pejabat"), (r"ponsel", "telefon pintar"), (r"gimana|banget", "bagaimana / sangat"),
    (r"butuh", "perlu"), (r"merubah", "mengubah"), (r"pengaturan", "tetapan"),
    (r"aktivitas|kualitas|fasilitas", "aktiviti / kualiti / kemudahan"), (r"analisa", "analisis"),
    (r"persen|prosentase", "peratus"), (r"silakan", "sila"), (r"saat ini", "kini"),
    (r"berbagai", "pelbagai"), (r"terkait", "berkaitan"), (r"pemerintah", "kerajaan"),
    (r"kebijakan", "dasar"), (r"provinsi|kabupaten", "negeri / daerah"), (r"lapangan kerja", "peluang pekerjaan"),
    (r"tenaga kerja", "tenaga buruh"), (r"dampak", "kesan"), (r"(pari)?wisata", "pelancongan"),
    (r"rumah sakit", "hospital"), (r"sawit", "kelapa sawit (check it isn't bare 'sawit')"),
    (r"\bvs\.?", "berbanding"), (r"mengapa", "kenapa"),
    (r"ia|ianya", "name the subject or rephrase (not 'dia' for things)"), (r"nombor", "angka (for statistics)"),
]
# Case-sensitive checks.
GRAMMAR = [
    (r"\bdi mana (ia|mereka|kita|kami)\b", "'di mana' is for questions only; use 'yang'"),
    (r"(keluar|bebas|lepas) dari (kemiskinan|masalah|kesusahan)", "abstract noun takes 'daripada'"),
    (r"(lebih|kurang) (tinggi|rendah|besar|kecil|pantas|perlahan|baik) dari\b", "comparison takes 'daripada'"),
    (r"(^|[.;:]\s+)Ia (kerja|ialah|adalah)", "avoid 'Ia ...' mirroring English 'It is ...'"),
]

MS_IN_TX = re.compile(r"tx\(\s*lang\s*,\s*([\"`])(.*?)\1\s*,", re.S)
MS_KEY = re.compile(r"\bms:\s*([\"`])(.*?)\1", re.S)
MS_PY = re.compile(r"\"ms\":\s*f?\"(.*?)\"", re.S)


def malay_strings():
    for path in sorted((ROOT / "web/src").rglob("*.ts*")):
        text = path.read_text()
        for rx in (MS_IN_TX, MS_KEY):
            for m in rx.finditer(text):
                yield path, text[: m.start()].count("\n") + 1, m.group(2)
    i18n = ROOT / "web/src/lib/i18n.ts"
    text = i18n.read_text()
    start, end = text.index("  ms: {"), text.index("  en: {")
    for m in re.finditer(r'"([^"]+)"', text[start:end]):
        yield i18n, text[: start + m.start()].count("\n") + 1, m.group(1)
    build = ROOT / "pipeline/build.py"
    text = build.read_text()
    for m in MS_PY.finditer(text):
        yield build, text[: m.start()].count("\n") + 1, m.group(1)
    # AI-drafted district briefs (Malay side)
    for path in sorted((ROOT / "data/briefs").glob("*.json")):
        brief = json.loads(path.read_text())
        for i, text in enumerate(t for items in brief.get("ms", {}).values() for t in items):
            yield path, i + 1, text
    # local guides (Malay side of every bilingual field)
    for path in sorted((ROOT / "web/src/data/jalan").glob("*.json")):
        text = path.read_text()
        for m in re.finditer(r'"ms":\s*"((?:[^"\\]|\\.)*)"', text):
            yield path, text[: m.start()].count("\n") + 1, m.group(1)


def main() -> int:
    problems = 0
    for path, line, s in malay_strings():
        for pat, fix in BANNED:
            for m in re.finditer(rf"\b(?:{pat})\b", s, re.I):
                if pat == r"sawit" and re.search(r"kelapa sawit", s, re.I):
                    continue
                problems += 1
                print(f"{path.relative_to(ROOT)}:{line}: '{m.group(0)}' → {fix}")
        for pat, why in GRAMMAR:
            for m in re.finditer(pat, s):
                problems += 1
                print(f"{path.relative_to(ROOT)}:{line}: '{m.group(0)}' — {why}")
    print(f"{problems} issue(s)" if problems else "BM check: no issues")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
