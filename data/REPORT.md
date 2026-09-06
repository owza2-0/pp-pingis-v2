# Rapport — skrap av pp-pingis.se 2026-09-06

Metod: Scrapling 0.4.15 (StealthyFetcher, headless chromium via patchright), varje sida renderad i en riktig browser och sparad som HTML. Sajten levererar annars bara ett JS-skal.

## Sidor

- Totalt: **1150 st** (verifierat: 1150 html-filer i site/html)
- Produktsidor: **610 st** → 305 unika produkter, alla med sv+en sida (0 utan tvilling)
- Kategorisidor: 500 st · Infosidor/övrigt: 40 st
- HTML-volym: ~199 MB (snitt 173 KB/sida — innehåller renderat DOM inkl. bild-URLer)

## Produkter

- Antal: **305** (alla tvåspråkiga)
- Med pris: 305 · intervall: 1–15490 SEK · median: 399 SEK
- Bilder totalt: 409 unika produktbilder (original, nedladdade)
- Lagerstatus: InStock: 294, OutOfStock: 11
- Största kategorier (antal produkter): Gummiplattor (96), Lim & racketvård (35), Stommar (35), Kläder & textilier (33), Bollar (15), Fodral (13), Väskor (11), Klubbtillbehör (11), Utförsäljning (9), Skor (8)
- Vanligaste varumärken: Donic (69), Yasaka (68), Gewo (20), Tibhar (19), Andro (7), Friendship (7), Joola (7), Dhs (5), Mizuno (4), Nittaku (3), Stiga (3), Juic (2)

## Media

- Nedladdade filer: **411** (~110 MB) under site/media/<host>/<sökväg>
- Huvudkälla: cdn.abicart.com (produktbilder i original, utan ?max-width-parametrar)

## Struktur

Data finns i två former: (1) råa renderade sidor i site/html — exakt vad besökaren såg, inkl. JSON-LD med full produktdata; (2) strukturerad sammanfattning i data/products.json (namn, kategori, pris, lager, beskrivning, bilder, sv+en-url:er) för att bygga ny site.

## Ej med (medvetet)

- Plattformens ramverks-css/js (themes.abicart.com, fabrikk) — försvinner vid omskrivning.
- Checkout, kundkonto, admin — förbjudna i robots.txt.
- Priser/lager är ögonblicksbilder (klient-renderade värden).
