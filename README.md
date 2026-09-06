# pp-pingis-v2 — scrapad kopia av pp-pingis.se (underlag för omskrivning)

Fullständig spegling av **pp-pingis.se** (bordtennisbutik, plattformen Abicart/
Textalk, shop-uid 13948) tagen 2026-09-06 som byggmaterial för en ny site
(överraskningsprojekt till kompisen). Sajten är klient-renderad (React-shell +
JSON-RPC), så varje sida hämtades med riktig headless-browser via
**Scrapling** (StealthyFetcher/patchright) och sparades i renderat skick.

## Vad som finns

    site/html/                 1150 renderade sidor (exakt spegling av sajtens sökvägar,
                                sv under /, engelska under /en/). ~199 MB.
    site/media/                 412 mediafiler (produktbilder original, logotyper,
                                custom-css) ~110 MB.  data/media-manifest.json listar url->fil.
    data/products.json          305 produkter (komplett data: namn, pris inkl moms,
                                lagerstatus, beskrivning, bilder, url), sv+en sammanslagna.
    data/categories.json        kategorisidor (500 st) + breadcrumb-kategorier (203 st).
    data/REPORT.md              sammanfattning av skrapet.
    sitemap/                    sajtens sitemap-xml (index + 3 urlset) + alla URLer.
    scraper/                    crawl.py (renderar sidor), fetch_media.py (laddar media),
                                analyze.py (bygger products.json/categories.json).

## Nyckeldata

- 1 150 sidor (575 sv + 575 en): 610 produktsidor (305 produkter, alla tvåspråkiga),
  500 kategorisidor, 40 infosidor (startsida, villkor, nyheter, extrapriser …).
- Alla 305 produkter har pris (1–15 490 SEK, median 399), beskrivning, bilder,
  lagerstatus och breadcrumb-kategori.
- Butikens kontaktuppgifter/org.nr ligger i JSON-LD (Organization) på varje sida.

## Så kör du om

    .venv/bin/python scraper/crawl.py          # rendera alla sidor (återupptagbar)
    .venv/bin/python scraper/fetch_media.py    # ladda ner media
    .venv/bin/python scraper/analyze.py        # bygg data/products.json + categories.json

Venven finns i .venv (scrapling[fetchers] + curl_cffi + playwright/patchright,
chromium hämtas via ms-playwright-cachen).

## Anteckningar

- Priser/lager = ögonblicksbild från skrapdatumet. Abicart renderar pris via
  klient-JS; det som står i JSON-LD/HTML är det som visades vid skrapet.
- Kategorisidor med produktrutnät fångades i renderat skick; paginering utöver
  sitemap finns ej (alla produkter låg i sitemapen).
- Plattformens ramverks-css/js (themes.abicart.com, fabrikk m.m.) är INTE med —
  de försvinner ändå vid omskrivning. Butikens egen custom-css
  (admin.abicart.se/shop/13948/files/.css/…) är sparad under site/media.
- Checkout/admin/kundkonton ej skrapade (robots.txt förbjuder admin/backend/checkout).
