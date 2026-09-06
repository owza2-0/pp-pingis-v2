#!/usr/bin/env python3
"""Analyze crawled pages -> data/products.json + data/categories.json + report stats."""
from __future__ import annotations

import json
import os
import re
import sys
from collections import Counter, defaultdict
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NDJSON = os.path.join(ROOT, "data", "pages.ndjson")
LDJSON_RE = re.compile(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S | re.I)


def extract_ld(filepath: str) -> list[dict]:
    try:
        with open(filepath, encoding="utf-8") as f:
            html = f.read()
    except Exception:
        return []
    out = []
    for block in LDJSON_RE.findall(html):
        try:
            d = json.loads(block)
            if isinstance(d, dict):
                out.append(d)
        except Exception:
            pass
    return out


def norm_price(ps: dict | None) -> dict | None:
    if not isinstance(ps, dict):
        return None
    if "price" in ps:
        return {"price": ps.get("price"), "currency": ps.get("priceCurrency"), "vat_included": ps.get("valueAddedTaxIncluded")}
    return None


def main() -> int:
    recs = [json.loads(l) for l in open(NDJSON, encoding="utf-8") if l.strip()]
    products: dict[str, dict] = {}   # productID -> merged
    by_url: dict[str, dict] = {}
    cat_children: dict[str, list[str]] = defaultdict(list)
    cat_names: dict[str, str] = {}

    for rec in recs:
        lds = extract_ld(os.path.join(ROOT, rec["file"]))
        prod = next((d for d in lds if d.get("@type") == "Product"), None)
        bread = next((d for d in lds if d.get("@type") == "BreadcrumbList"), None)
        if prod:
            pid = str(prod.get("productID") or "").strip()
            lang = rec["lang"]
            entry = {
                "url": rec["url"],
                "lang": lang,
                "name": prod.get("name"),
                "productID": pid or None,
                "category": (rec.get("breadcrumb") or [])[:-1] if (rec.get("breadcrumb") or []) and rec["breadcrumb"][-1] == prod.get("name") else (rec.get("breadcrumb") or []),
                "price": norm_price(prod.get("offers", {}).get("priceSpecification") if isinstance(prod.get("offers"), dict) else None),
                "availability": (prod.get("offers") or {}).get("availability") if isinstance(prod.get("offers"), dict) else None,
                "images": prod.get("image", []) if isinstance(prod.get("image"), list) else [prod["image"]] if prod.get("image") else [],
                "description": prod.get("description"),
                "url_path": rec["url"],
                "file": rec["file"],
            }
            by_url[rec["url"]] = entry
            key = pid or ("!" + rec["url"])
            merged = products.setdefault(key, {"_languages": {}, "productID": pid or None})
            merged["_languages"][lang] = entry
        if bread:
            items = bread.get("itemListElement", [])
            if len(items) >= 2:
                cat = items[0].get("item", {}).get("@id") or ""
                name0 = items[0].get("item", {}).get("name")
                if name0:
                    cat_names[cat] = name0
                if len(items) >= 3:
                    sub = items[1].get("item", {}).get("@id") or ""
                    subname = items[1].get("item", {}).get("name")
                    if subname:
                        cat_names[sub] = subname
                    cat_children[cat].append(sub)
                leaf = items[-2] if len(items) > 2 else items[0]
                leaf_url = leaf.get("item", {}).get("@id") or ""
                leaf_name = leaf.get("item", {}).get("name")
                if leaf_name and leaf_url not in cat_names:
                    cat_names[leaf_url] = leaf_name

    # category tree from category page URLs (dirs) + breadcrumbs
    tree: dict[str, dict] = {}
    for rec in recs:
        if rec["kind"] == "category":
            name = rec["title"].rsplit(" - ", 1)[0] if rec.get("title") else None
            tree[rec["url"]] = {"url": rec["url"], "name": name, "lang": rec["lang"], "file": rec["file"]}

    # merge sv/en product payload
    merged_products = []
    langless = []
    for key, m in products.items():
        sv = m["_languages"].get("sv")
        en = m["_languages"].get("en")
        if sv and en:
            merged_products.append({**{k: sv[k] for k in ("name", "productID", "price", "availability", "images", "description")},
                                    "category": sv.get("category") or [],
                                    "sv": {"url": sv["url"], "file": sv["file"]},
                                    "en": {"url": en["url"], "file": en["file"]},
                                    "languages": ["sv", "en"]})
        else:
            langless.append({**{k: (sv or en)[k] for k in ("name", "productID", "price", "availability", "images", "description")},
                             **{"url": (sv or en)["url"], "lang": (sv or en)["lang"], "file": (sv or en)["file"]},
                             "languages": [sv and "sv" or "en"]})
    merged_products.sort(key=lambda p: p.get("name") or "")
    langless.sort(key=lambda p: p.get("name") or "")

    out = os.path.join(ROOT, "data", "products.json")
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"generated": datetime.now(timezone.utc).isoformat(),
                   "count_bilingual": len(merged_products), "count_langless": len(langless),
                   "products": merged_products + langless}, f, ensure_ascii=False, indent=1)

    with open(os.path.join(ROOT, "data", "categories.json"), "w", encoding="utf-8") as f:
        json.dump({"categories": sorted(tree.values(), key=lambda c: c["url"]),
                   "breadcrumb_categories": [{"url": u, "name": n} for u, n in sorted(cat_names.items())]},
                  f, ensure_ascii=False, indent=1)

    media_all = [m for r in recs for m in r.get("media", [])]
    print("=== SUMMARY ===")
    print("pages:", len(recs), "| langs:", dict(Counter(r["lang"] for r in recs)),
          "| kinds:", dict(Counter(r["kind"] for r in recs)))
    print("products (bilingual):", len(merged_products), "| langless:", len(langless))
    print("category pages:", len(tree), "| breadcrumb cats:", len(cat_names))
    print("unique media urls referenced:", len(set(media_all)))
    sizes = [r["size"] for r in recs]
    print("html sizes: total MB", round(sum(sizes) / 1e6, 2), "| avg KB", round(sum(sizes) / len(sizes) / 1e3, 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
