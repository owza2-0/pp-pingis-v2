# pp-pingis-v2 — Ny modern e-handel & 3D Racketverkstad

Modern omskrivning av **pp-pingis.se** (bordtennisbutik i Garphyttan, Örebro) med fullständig produktkatalog, blixtsnabb responsiv SPA, en **fotorealistisk interaktiv 3D-racket** i Three.js samt en **3D Racketverkstad (Custom Racket Studio)** för skräddarsydda bordtennisracketar.

---

## 🏓 Vad som finns

### 1. Modern Web-app (`web/`)
- **Single Page Application**: Rent och modernt gränssnitt utan externa ramverks-overhead (`vanilla JS + CSS + HTML5`).
- **Interaktiv 3D-racket i Heron** ([`web/js/racket3d.js`](web/js/racket3d.js)):
  - 3D WebGL-modell med naturtrogen bordtennisanatomi: 5-skikts fanérkant (plywood med synliga kolfiberskikt), träblad med ådring och lasergravyr, tvåtons konkavt handtag och infälld metall-/kristallins med varumärke.
  - 360° touch- och mus-orbit, dynamisk mus-parallax och ljuseffekter.
  - Vändknapp (Forehand / Backhand) och "Studsa boll"-knapp med syntetiserat bordtennisljud via Web Audio API.
  - Automatisk 2D-fallback vid enheter utan WebGL eller vid `prefers-reduced-motion`.
- **Racketverkstad / Bygg eget racket i 3D** (`#/bygg-racket`):
  - Stegvis guide:
    1. *Välj stomme*: Välj bland 35+ stommar (Donic, Yasaka, Andro, DHS m.fl.) — 3D-modellen uppdateras direkt i realtid.
    2. *Forehand-gummi*: Välj ITTF-godkänd färg (Röd, Blå, Rosa, Grön, Svart) och svamptjocklek (2.0 mm / Max). Klicka "Rulla på gummi" för att se gummit appliceras med en taktil roll-on animation.
    3. *Backhand-gummi*: Racketen roterar automatiskt 180° till baksidan för att välja och applicera svart tävlingsgummi.
    4. *Montering & Kantband*: Välj greppform (Konkav, Rak, Anatomisk) och kantband. Fri professionell limning & montering ingår.
  - **Sprängskiss (Exploded View)**: Klicka på "Lager" för att se skikten separeras i 3D-rymden (ytgummi -> svamp -> träkärna).
  - **Realtidsberäknade spelegenskaper**: Dynamiska mätare för Fart, Skruv, Kontroll och totalvikt i gram.
  - **Varukorgskoppling**: Lägger till stomme, forehand och backhand som ett sammanhållet specialbygge med alla specifikationer sparade i orderunderlaget.
- **Responsivitet (Mobil & iPad/Tablet)**:
  - Anpassad för mobiltelefoner (iPhone, Android) med stackade kontroller, 2x2 statsmätare, optimerade touch-targets och noll överlappning.
  - Anpassad för iPad och surfplattor i både stående (portrait 768px) och liggande vy (landscape 1024px) med dynamisk kamera-inramning.
- **Prestanda & Offline**:
  - Three.js ligger sparat lokalt i [`web/js/three.min.js`](web/js/three.min.js) (590 KB, noll externa nätverksberoenden i runtime).
  - Pixel ratio cappad till 2x och rendering pausas med `IntersectionObserver` när 3D-canvas inte syns.

### 2. Skrapat underlag & rådata
- `data/products.json`: 305 produkter (komplett data: namn, pris inkl moms, lagerstatus, beskrivning, bilder, url), sv+en sammanslagna.
- `data/categories.json`: Kategorisidor (500 st) + breadcrumb-kategorier (203 st).
- `data/REPORT.md`: Sammanfattning av skrapet från ursprungssajten.
- `site/html/`: 1 150 renderade sidor från den ursprungliga butiken.
- `site/media/`: 412 sparade originalmediafiler (~110 MB).
- `scraper/`: Python-skript för Scrapling/Patchright och bildkonvertering.

---

## 🚀 Starta & Testa

Öppna webbappen lokalt i valfri webbläsare eller starta en enkel lokal server:

```bash
# Alternativ 1: Starta python http-server
python3 -m http.server 8080 -d web

# Öppna sedan i webbläsaren:
# http://localhost:8080/

# Alternativ 2: Öppna direkt via file://
open web/index.html   # macOS
xdg-open web/index.html # Linux
```

---

## 🛠️ Byggfiler & Skript

- `web/build.py`: Bygger `web/assets/img` (webp) och genererar `web/data.js` från rådatan.
- `web/js/racket3d.js`: Three.js 3D-racketmotorn.
- `web/js/app.js`: SPA-router, varukorg, Racketverkstad och butiksvyer.
- `web/css/style.css`: All styling inklusive mörkt tema, typografi och responsiva media queries.
