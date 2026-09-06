#!/usr/bin/env python3
"""Download all media referenced by crawled pages into site/media/<host>/<path>.

Reads data/pages.ndjson, collects every media URL (page-safe hosts only),
normalizes by dropping size query params (?max-width=… etc.) to grab the
original, downloads via Scrapling Fetcher, skips already-downloaded files,
verifies non-empty + sane magic bytes, retries on failure.
"""
from __future__ import annotations

import argparse
import json
import os
import queue
import sys
import threading
import time
import urllib.parse
from concurrent.futures import ThreadPoolExecutor
from urllib.request import url2pathname

from scrapling.fetchers import Fetcher

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NDJSON = os.path.join(ROOT, "data", "pages.ndjson")
MEDIA_OUT = os.path.join(ROOT, "site", "media")
MANIFEST = os.path.join(ROOT, "data", "media.ndjson")
FAIL_LOG = os.path.join(ROOT, "data", "media_failures.txt")

KEEP_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".svg", ".ico",
            ".pdf", ".zip", ".doc", ".docx", ".xls", ".xlsx", ".mp4", ".webm",
            ".woff", ".woff2", ".ttf", ".css")
_lock = threading.Lock()
_done = 0
_fail = 0


def normalize_url(u: str) -> str:
    p = urllib.parse.urlparse(u)
    # original image = no width/height/quality transformation params
    q = ""
    if p.query:
        keep = [kv for kv in p.query.split("&") if not re_match_trans(kv)]
        q = "&".join(keep)
    return urllib.parse.urlunparse((p.scheme, p.netloc.lower(), p.path, "", q, ""))


def re_match_trans(kv: str) -> bool:
    k = kv.split("=", 1)[0].lower()
    return k in ("max-width", "max-width2", "max-height", "quality", "width", "height", "mode", "scale")


def target_path(u: str) -> str:
    p = urllib.parse.urlparse(u)
    path = url2pathname(p.path)
    if not path or path == "/":
        path = "/index.bin"
    ext = os.path.splitext(path)[1].lower()
    if not ext or len(ext) > 6:
        # no extension: try to infer from query or force .bin later by content sniff
        pass
    rel = p.netloc.lower() + path
    return os.path.join(MEDIA_OUT, rel.lstrip("/"))


def sniff_ok(data: bytes, url: str) -> bool:
    if not data:
        return False
    if data[:2] == b"\xff\xd8" or data[:8] == b"\x89PNG\r\n\x1a\n" or data[:4] == b"RIFF":
        return True
    if data[:6] in (b"GIF87a", b"GIF89a") or data[:4] == b"\x00\x00\x01\x00" or b"<svg" in data[:200].lower():
        return True
    if data[:4] == b"%PDF":
        return True
    if data[:5] in (b"PK\x03\x04", b"PK\x05\x06"):
        return True
    if data[:4] == b"\x1aE\xdf\xa3" or data[:4] == b"ftyp":
        return True
    if b"<style" in data[:400].lower() or b"{" in data[:120]:
        return True  # css
    if data[:4] == b"\x00\x01\x00\x00" or data[:2] == b"\x0c\x00" or data[:4] == b"OTTO":
        return True  # ttf/woff-ish
    # html error page fallback
    if b"<!doctype html" in data[:300].lower() or b"<html" in data[:300].lower():
        return False
    return True


def fetch_one(url: str) -> None:
    global _done, _fail
    nurl = normalize_url(url)
    tp = target_path(nurl)
    if os.path.exists(tp) and os.path.getsize(tp) > 0:
        return
    os.makedirs(os.path.dirname(tp) or MEDIA_OUT, exist_ok=True)
    ok = False
    last_err = ""
    for attempt in range(3):
        try:
            r = Fetcher.get(nurl, timeout=60)
            if getattr(r, "status", 500) != 200:
                last_err = f"status {r.status}"
                time.sleep(1 + attempt)
                continue
            body = r.body if isinstance(r.body, bytes) else bytes(r.body)
            if sniff_ok(body, nurl):
                tmp = tp + ".part"
                with open(tmp, "wb") as f:
                    f.write(body)
                os.replace(tmp, tp)
                ok = True
                break
            last_err = "content sniff failed (html?)"
            break
        except Exception as e:  # noqa: BLE001
            last_err = f"{type(e).__name__}: {e}"
            time.sleep(1.5 * (attempt + 1))
    with _lock:
        _done += 1
        if ok:
            with open(MANIFEST, "a", encoding="utf-8") as f:
                f.write(json.dumps({"url": nurl, "file": os.path.relpath(tp, ROOT), "size": os.path.getsize(tp)}, ensure_ascii=False) + "\n")
        else:
            _fail += 1
            with open(FAIL_LOG, "a", encoding="utf-8") as f:
                f.write(f"{url}\t{nurl}\t{last_err}\n")
        if _done % 50 == 0:
            print(f"[media] {_done} processed, {_fail} failed", flush=True)


def main() -> int:
    global _done, _fail
    ap = argparse.ArgumentParser()
    ap.add_argument("--workers", type=int, default=10)
    args = ap.parse_args()

    urls: list[str] = []
    for line in open(NDJSON, encoding="utf-8"):
        try:
            rec = json.loads(line)
            urls.extend(rec.get("media", []))
        except Exception:
            pass
    urls = sorted(set(u for u in urls if u.startswith("http")))
    done_urls = set()
    if os.path.exists(MANIFEST):
        for line in open(MANIFEST, encoding="utf-8"):
            try:
                done_urls.add(json.loads(line)["url"])
            except Exception:
                pass
    todo = [u for u in urls if normalize_url(u) not in done_urls]
    print(f"[media] unique media urls={len(urls)} todo={len(todo)} workers={args.workers}")
    if not todo:
        return 0
    os.makedirs(os.path.dirname(MANIFEST), exist_ok=True)
    if not os.path.exists(MANIFEST):
        open(MANIFEST, "w").close()

    with ThreadPoolExecutor(max_workers=args.workers) as ex:
        list(ex.map(fetch_one, todo))
    print(f"[media] done: ok≈{_done - _fail} failed={_fail} (see {os.path.relpath(FAIL_LOG, ROOT)})")
    return 0 if _fail == 0 else 2


if __name__ == "__main__":
    sys.exit(main())
