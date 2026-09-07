#!/usr/bin/env python3
"""Bygger web/assets/img (webp) + web/data.js från skrapat underlag."""
import json, os, re, subprocess, sys, hashlib
from collections import Counter

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(BASE, "web")
IMG_OUT = os.path.join(WEB, "assets", "img")

BRANDS = ["Yasaka", "Donic", "Gewo", "Tibhar", "Andro", "Joola", "Friendship",
          "Nittaku", "DHS", "Mizuno", "Butterfly", "Juic", "Stiga", "Victas",
          "XIOM", "Xushaofa"]

KIND_RULES = [
    ("Stommar", ["Stommar"]),
    ("Gummiplattor", ["Gummiplattor", "Backside"]),
    ("Färdiga racketar", ["Färdiga racketar", "Specialpaket"]),
    ("Bollar", ["Bollar"]),
    ("Bord & nät", ["Bord", "Nätställningar"]),
    ("Robotar", ["Robotar", "Donic Newgy Robo-Pong"]),
    ("Kläder & skor", ["Kläder & textilier", "Skor", "Strumpor", "Shorts & Kjolar", "Tröjor"]),
    ("Väskor & fodral", ["Väskor", "Fodral"]),
    ("Racketvård & lim", ["Lim & racketvård", "Godkänt Fästlim", "Cleaner", "Övrig Racketvård", "Kantband"]),
    ("Tillbehör", ["Klubbtillbehör", "Spelartillbehör"]),
]

def norm_url(u):
    return u.replace("&amp;", "&").split("?")[0]

def strip_html(s):
    s = re.sub(r"(?i)<\s*br\s*/?\s*>", "\n", s or "")
    s = re.sub(r"(?i)</\s*(p|li|div|h[1-6])\s*>", "\n", s)
    s = re.sub(r"(?i)<\s*li\s*>", "• ", s)
    s = re.sub(r"<[^>]+>", "", s)
    s = (s.replace("&amp;", "&").replace("&nbsp;", " ").replace("&ouml;", "ö")
           .replace("&auml;", "ä").replace("&aring;", "å").replace("&Ouml;", "Ö")
           .replace("&Auml;", "Ä").replace("&Aring;", "Å").replace("&quot;", '"')
           .replace("&#039;", "'").replace("&lt;", "<").replace("&gt;", ">"))
    return re.sub(r"\n{3,}", "\n\n", s).strip()

def kind_of(cats):
    for kind, keys in KIND_RULES:
        if any(k in cats for k in keys):
            return kind
    return "Tillbehör"

def brand_of(name):
    first = (name.split() or [""])[0].strip(",.").lower()
    for b in BRANDS:
        if first == b.lower():
            return b
    return None

def main():
    os.makedirs(IMG_OUT, exist_ok=True)
    products = json.load(open(os.path.join(BASE, "data/products.json")))["products"]
    manifest = json.load(open(os.path.join(BASE, "data/media-manifest.json")))
    url2file = {}
    for e in manifest:
        url2file[norm_url(e["url"])] = e["file"]

    out, convert_jobs = [], []
    for p in products:
        pid = p["productID"]
        imgs = []
        for idx, u in enumerate(p["images"]):
            src = url2file.get(norm_url(u))
            if not src:
                continue
            src_path = os.path.join(BASE, src)
            if not os.path.exists(src_path):
                continue
            base_name = f"p{pid}-{idx}"
            for size, suffix in ((900, ""), (1600, "@2x")):
                dst = os.path.join(IMG_OUT, f"{base_name}{suffix}.webp")
                if not os.path.exists(dst):
                    convert_jobs.append((src_path, dst, size))
            imgs.append(base_name)
        if not imgs:
            continue
        cats = p.get("category") or []
        out.append({
            "id": pid,
            "name": p["name"].strip(),
            "brand": brand_of(p["name"]),
            "price": p["price"]["price"],
            "stock": p["availability"].endswith("InStock"),
            "kind": kind_of(cats),
            "cats": cats,
            "desc": strip_html(p.get("description", "")),
            "imgs": imgs,
            "url": (p.get("sv") or {}).get("url", ""),
        })

    print(f"{len(out)} produkter, {len(convert_jobs)} bilder att konvertera")
    fails = 0
    for i, (src, dst, size) in enumerate(convert_jobs):
        r = subprocess.run(
            ["magick", src, "-auto-orient", "-resize", f"{size}x{size}>",
             "-quality", "82", "-define", "webp:method=6", dst],
            capture_output=True)
        if r.returncode != 0:
            fails += 1
            print("FAIL", src, r.stderr.decode()[:200], file=sys.stderr)
        if (i + 1) % 100 == 0:
            print(f"  {i+1}/{len(convert_jobs)}")
    print(f"konvertering klar, {fails} fel")

    # logga
    kinds = Counter(p["kind"] for p in out)
    brands = Counter(p["brand"] for p in out if p["brand"])
    print("kinds:", dict(kinds.most_common()))
    print("brands:", dict(brands.most_common()))

    with open(os.path.join(WEB, "data.js"), "w", encoding="utf-8") as f:
        f.write("window.PP_DATA=")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print("data.js skriven:", os.path.getsize(os.path.join(WEB, "data.js")), "bytes")

if __name__ == "__main__":
    main()
