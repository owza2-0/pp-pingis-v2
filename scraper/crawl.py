#!/usr/bin/env python3
"""PP-Pingis v2 crawler — renders & mirrors pp-pingis.se via Scrapling StealthyFetcher.

Reads a URL list (sitemap), renders each page in a real browser (patchright),
saves the full HTML to site/html/<url-path>, extracts JSON-LD, media and meta,
and appends one NDJSON record per page to data/pages.ndjson. Resumable.
"""
from __future__ import annotations

import argparse
import json
import logging
import os
import queue
import re
import sys
import tempfile
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor, as_completed

from scrapling.fetchers import StealthyFetcher

logging.basicConfig(level=logging.WARNING, format="%(levelname)s %(name)s: %(message)s")
logging.getLogger("scrapling").setLevel(logging.ERROR)
logging.getLogger("patchright").setLevel(logging.ERROR)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))  # project root
HTML_OUT = os.path.join(ROOT, "site", "html")
NDJSON = os.path.join(ROOT, "data", "pages.ndjson")
FAIL_LOG = os.path.join(ROOT, "data", "failures.txt")

MEDIA_HOSTS = {"cdn.abicart.com", "admin.abicart.se", "pp-pingis.se", "www.pp-pingis.se"}
DOC_RE = re.compile(r'<a[^>]+href="([^"]+)"', re.I)
IMG_RE = re.compile(r'<img[^>]+>', re.I)
ATTR_RE = re.compile(r'(?:src|data-src|data-lazy-src|data-original)="([^"]+)"', re.I)
META_IMG_RE = re.compile(r'<meta[^>]+(?:property|name)="(?:og:image|twitter:image)"[^>]+content="([^"]+)"', re.I)
LINK_IMG_RE = re.compile(r'<link[^>]+rel="image_src"[^>]+href="([^"]+)"', re.I)
SRCSET_RE = re.compile(r'(?:srcset|data-srcset)="([^"]+)"', re.I)
CSS_RE = re.compile(r'<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"', re.I)
LDJSON_RE = re.compile(r'<script[^>]*type="application/ld\+json"[^>]*>(.*?)</script>', re.S | re.I)
TITLE_RE = re.compile(r'<title[^>]*>(.*?)</title>', re.S | re.I)

_ext_lock = threading.Lock()
_done_count = 0
_fail_count = 0
_counter_lock = threading.Lock()


def normalize(u: str) -> str | None:
    u = u.strip()
    if not u or u.startswith("data:") or u.startswith("javascript:"):
        return None
    if u.startswith("//"):
        u = "https:" + u
    if u.startswith("/"):
        u = "https://pp-pingis.se" + u
    try:
        p = urllib.parse.urlparse(u)
    except ValueError:
        return None
    if p.scheme not in ("http", "https"):
        return None
    u = urllib.parse.urlunparse((p.scheme, p.netloc.lower(), p.path, "", p.query, ""))
    return u


def url_to_file(u: str) -> str:
    p = urllib.parse.urlparse(u)
    path = p.path or "/"
    if path.endswith("/"):
        rel = path + "index.html"
    elif "." not in path.rsplit("/", 1)[-1]:
        rel = path + "/index.html"
    else:
        rel = path
    rel = rel.lstrip("/")
    return rel or "index.html"


def rel_lang(rel: str) -> str:
    return "en" if rel.split("/", 1)[0] == "en" else "sv"


def is_media(u: str) -> bool:
    p = urllib.parse.urlparse(u)
    host = p.netloc.lower()
    if host not in MEDIA_HOSTS:
        return False
    path = p.path.lower()
    if not path:
        return False
    if re.search(r"\.(jpg|jpeg|png|webp|gif|avif|svg|ico|pdf|zip|docx?|xlsx?|mp4|webm|woff2?|ttf)$", path):
        return True
    # shop files dir without obvious extension still often media
    if "/files/" in path and "." not in path.rsplit("/", 1)[-1]:
        return True
    return False


def pick_srcset(v: str) -> list[str]:
    return [c.split(" ")[0].strip() for c in v.split(",") if c.strip()]


def extract_media(html: str, page_url: str) -> list[str]:
    out: list[str] = []
    for m in IMG_RE.finditer(html):
        tag = m.group(0)
        for sm in ATTR_RE.finditer(tag):
            out.append(sm.group(1))
        for sm in SRCSET_RE.finditer(tag):
            out.extend(pick_srcset(sm.group(1)))
    for sm in META_IMG_RE.finditer(html):
        out.append(sm.group(1))
    for sm in LINK_IMG_RE.finditer(html):
        out.append(sm.group(1))
    for href in DOC_RE.findall(html):
        if re.search(r"\.(pdf|zip|docx?|xlsx?)(\?|$)", href, re.I):
            out.append(href)
    for href in CSS_RE.findall(html):
        h = href.split("?")[0]
        if "admin.abicart.se" in h or "pp-pingis.se" in h or h.endswith(".css"):
            out.append(href)
    seen: set[str] = set()
    res: list[str] = []
    for u in out:
        n = normalize(u)
        if n and n not in seen and is_media(n):
            seen.add(n)
            res.append(n)
    return res


def extract_jsonld(html: str) -> list[dict]:
    res = []
    for block in LDJSON_RE.findall(html):
        try:
            d = json.loads(block)
            if isinstance(d, dict):
                res.append(d)
        except Exception:
            pass
    return res


def render(url: str, profile: str, timeout: int) -> str:
    p = StealthyFetcher.fetch(
        url,
        headless=True,
        network_idle=True,
        timeout=timeout * 1000,
        user_data_dir=profile,
        retries=2,
        retry_delay=2,
        locale="sv-SE",
    )
    body = p.body
    if isinstance(body, str):
        return body
    return body.decode("utf-8", errors="replace")


def process_url(url: str, profile: str, timeout: int) -> dict:
    global _done_count, _fail_count
    rel = url_to_file(url)
    html = render(url, profile, timeout)
    local = os.path.join(HTML_OUT, rel)
    os.makedirs(os.path.dirname(local) or HTML_OUT, exist_ok=True)
    with open(local, "w", encoding="utf-8") as f:
        f.write(html)
    tm = TITLE_RE.search(html)
    lds = extract_jsonld(html)
    products = [d for d in lds if d.get("@type") == "Product"]
    bread = next((d for d in lds if d.get("@type") == "BreadcrumbList"), None)
    rec = {
        "url": url,
        "file": os.path.join("site", "html", rel),
        "lang": rel_lang(rel),
        "size": len(html),
        "title": (tm.group(1).strip() if tm else None),
        "kind": "article" if products else ("category" if bread else "page"),
        "product_ids": [pr.get("productID") for pr in products],
        "breadcrumb": [li.get("item", {}).get("name") for li in (bread or {}).get("itemListElement", [])],
        "media": extract_media(html, url),
        "fetched_at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    with _ext_lock:
        with open(NDJSON, "a", encoding="utf-8") as f:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    with _counter_lock:
        _done_count += 1
        n = _done_count
    if n % 25 == 0:
        print(f"[crawl] {n} pages done (failures: {_fail_count})", flush=True)
    return rec


def main() -> int:
    global _fail_count
    ap = argparse.ArgumentParser()
    ap.add_argument("--urls", default=os.path.join(ROOT, "sitemap", "all_urls.txt"))
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--timeout", type=int, default=60)
    args = ap.parse_args()

    with open(args.urls, encoding="utf-8") as f:
        urls = [u.strip() for u in f if u.strip()]
    if args.limit:
        urls = urls[: args.limit]
    os.makedirs(os.path.join(ROOT, "site", "html"), exist_ok=True)
    os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
    if not os.path.exists(NDJSON):
        open(NDJSON, "w").close()

    done = set()
    if os.path.exists(NDJSON):
        for line in open(NDJSON, encoding="utf-8"):
            try:
                done.add(json.loads(line)["url"])
            except Exception:
                pass
    todo = [u for u in urls if u not in done]
    print(f"[crawl] total={len(urls)} already_done={len(urls) - len(todo)} todo={len(todo)} workers={args.workers}")
    if not todo:
        print("[crawl] nothing to do")
        return 0

    profiles: list[str] = []
    q: queue.Queue = queue.Queue()
    for u in todo:
        q.put(u)

    def worker(wid: int):
        profile = tempfile.mkdtemp(prefix=f"ppc{wid}-")
        profiles.append(profile)
        while True:
            try:
                u = q.get_nowait()
            except queue.Empty:
                break
            t0 = time.time()
            try:
                process_url(u, profile, args.timeout)
            except Exception as e:
                with _counter_lock:
                    _fail_count += 1
                with _ext_lock:
                    with open(FAIL_LOG, "a", encoding="utf-8") as f:
                        f.write(f"{u}\t{type(e).__name__}: {e}\n")
                print(f"[crawl] FAIL {u} -> {type(e).__name__}: {e}", flush=True)
            finally:
                q.task_done()

    workers = []
    for w in range(args.workers):
        th = threading.Thread(target=worker, args=(w,), daemon=True)
        th.start()
        workers.append(th)
    for th in workers:
        th.join()

    # retry pass for failures (best effort, single worker)
    if os.path.exists(FAIL_LOG):
        lines = [l for l in open(FAIL_LOG, encoding="utf-8") if l.strip()]
        if lines:
            os.replace(FAIL_LOG, FAIL_LOG + ".bak")
            print(f"[crawl] retry pass for {len(lines)} failures")
            profile = tempfile.mkdtemp(prefix="ppcretry-")
            for line in lines:
                u = line.split("\t", 1)[0]
                try:
                    process_url(u, profile, args.timeout)
                except Exception as e:
                    with open(FAIL_LOG, "a", encoding="utf-8") as f:
                        f.write(f"{u}\t{type(e).__name__}: {e}\n")
    print(f"[crawl] finished: done={_done_count} failures={_fail_count}")
    return 0 if _fail_count == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
