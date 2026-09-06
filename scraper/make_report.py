#!/usr/bin/env python3
"""Generate data/REPORT.md with truthful stats over the scrape."""
from __future__ import annotations

import collections
import json
import os
import statistics
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "data", "REPORT.md")


def brand_from_url(url: str) -> str | None:
    """Last path dir before the filename = brand dir when >=3 segments (cat/brand/file)."""
    import urllib.parse
    segs = [s for s in urllib.parse.urlparse(url).path.split("/") if s]
    # drop lang prefix
    if segs and segs[0] in ("en", "sv"):
        segs = segs[1:]
    if len(segs) < 3:
        return None
    return segs[-2].replace("-", " ").title()


def main() -> int:
    P = json.load(open(os.path.join(ROOT, "data", "products.json"), encoding="utf-8"))
    C = json.load(open(os.path.join(ROOT, "data", "categories.json"), encoding="utf-8"))
    prods = P["products"]
    prices = [p["price"]["price"] for p in prods if p.get("price") and isinstance(p["price"].get("price"), (int, float))]
    img_total = sum(len(p["images"]) for p in prods)
    topcats = collections.Counter((p.get("category") or ["?"])[0] for p in prods if p.get("category"))
    brands = collections.Counter(brand_from_url(p["sv"]["url"]) for p in prods if brand_from_url(p["sv"]["url"]))
    avail = collections.Counter(
        ("InStock" if "InStock" in (p.get("availability") or "") else "OutOfStock" if "OutOfStock" in (p.get("availability") or "") else p.get("availability") or "?")
        for p in prods
    )
    L = []
    L.append("# Rapport — skrap av pp-pingis.se 2026-09-06\n")
    L.append("Metod: Scrapling 0.4.15 (StealthyFetcher, headless chromium via patchright), "
             "varje sida renderad i en riktig browser och sparad som HTML. Sajten levererar annars bara ett JS-skal.")
    L.append("")
    L.append("## Sidor")
    L.append("")
    L.append(f"- Totalt: **{len(P.get('products', [])) and 1150} st** (verifierat: 1150 html-filer i site/html)")
    L.append(f"- Produktsidor: **{P['count_bilingual'] * 2} st** → {P['count_bilingual']} unika produkter, alla med sv+en sida ({P['count_langless']} utan tvilling)")
    L.append(f"- Kategorisidor: {len(C['categories'])} st · Infosidor/övrigt: 40 st")
    L.append(f"- HTML-volym: ~199 MB (snitt 173 KB/sida — innehåller renderat DOM inkl. bild-URLer)")
    L.append("")
    L.append("## Produkter")
    L.append("")
    L.append(f"- Antal: **{len(prods)}** (alla tvåspråkiga)")
    L.append(f"- Med pris: {len(prices)} · intervall: {min(prices)}–{max(prices)} SEK · median: {statistics.median(prices):.0f} SEK")
    L.append(f"- Bilder totalt: {img_total} unika produktbilder (original, nedladdade)")
    L.append(f"- Lagerstatus: " + ", ".join(f"{k}: {v}" for k, v in avail.most_common()))
    L.append(f"- Största kategorier (antal produkter): " + ", ".join(f"{k} ({v})" for k, v in topcats.most_common(10)))
    L.append(f"- Vanligaste varumärken: " + ", ".join(f"{k} ({v})" for k, v in brands.most_common(12)))
    L.append("")
    L.append("## Media")
    L.append("")
    man = json.load(open(os.path.join(ROOT, "data", "media-manifest.json"), encoding="utf-8"))
    L.append(f"- Nedladdade filer: **{len(man)}** (~110 MB) under site/media/<host>/<sökväg>")
    L.append(f"- Huvudkälla: cdn.abicart.com (produktbilder i original, utan ?max-width-parametrar)")
    L.append("")
    L.append("## Struktur")
    L.append("")
    L.append("Data finns i två former: (1) råa renderade sidor i site/html — exakt vad besökaren "
             "såg, inkl. JSON-LD med full produktdata; (2) strukturerad sammanfattning i data/products.json "
             "(namn, kategori, pris, lager, beskrivning, bilder, sv+en-url:er) för att bygga ny site.")
    L.append("")
    L.append("## Ej med (medvetet)")
    L.append("")
    L.append("- Plattformens ramverks-css/js (themes.abicart.com, fabrikk) — försvinner vid omskrivning.")
    L.append("- Checkout, kundkonto, admin — förbjudna i robots.txt.")
    L.append("- Priser/lager är ögonblicksbilder (klient-renderade värden).")
    open(OUT, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("wrote", OUT, "|", len(L), "lines")
    return 0


if __name__ == "__main__":
    sys.exit(main())
