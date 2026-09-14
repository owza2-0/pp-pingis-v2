# Design QA — PP-PINGIS, mobilpass 2026-09-14

**final result: blocked**

Blockerare: **det finns ingen källbild (mock, Figma eller skiss) för mobilayouten i repot.** QA:n har därför kunnat jämföra mobilrenderingen mot repots egen designkontrakt (designtokens i `web/css/style.css`, README:s uttalade responsivitetskrav) och mot den levererade desktoprenderingen av samma komponenter — men inte mot en avsedd mobildesign, eftersom någon sådan inte existerar. Inga kvarstående P0/P1/P2-fynd finns; blockeraren gäller det saknade jämförelseobjektet, inte ett misstänkt fel. Se "Open Questions".

---

## Artefakter

| | |
|---|---|
| Källbild (visuell sanning) | Levererad desktoprendering av samma vy, 1440×900: `/tmp/qa-pingis/final/d-home.png`, `/tmp/qa-pingis/final/d-ws-step1.png`. Kompletteras av repots designtokens (`web/css/style.css:5-28`) och README:s responsivitetskrav (stackade kontroller, 2×2 statsmätare, touch-mål, noll överlappning). **Ingen mobilmock finns.** |
| Implementation | `http://127.0.0.1:8811` (lokal `python3 -m http.server` mot `web/`), headless Chromium via Playwright |
| Mobilskärmbilder (efter fix) | `/tmp/qa-pingis/final/m-home.png`, `m-butik.png`, `m-pdp.png`, `m-menu.png`, `m-cart.png`, `m-ws-step1.png` … `m-ws-step4.png` (+ `-full.png` för hela sidan) |
| Mobilskärmbilder (före fix) | `/tmp/qa-pingis/baseline/` (samma namn) |
| Mätrapporter | `/tmp/qa-pingis/{baseline,final}/report.json`, `after/report.json` |
| Reproducerbara skript | `scratch/acceptance.py` (15 kriterier), `scratch/capture.py` (skärmbilder + mätvärden). Övriga under `/tmp/qa-pingis/`: `interaction.py`, `targets.py`, `diag.py`, `mincontent.py` |

## Viewport, storlek och densitet

| Vy | CSS-viewport | deviceScaleFactor | Bildpunkter | Densitet normaliserad |
|---|---|---|---|---|
| Mobil | 393×852 (iPhone 14 Pro) | 1 | 393×852 | Ja — 1:1, ingen omskalning behövdes |
| Platta | 768×1024 och 1024×768 | 1 | samma | Ja — 1:1 |
| Desktop (källbild) | 1440×900 | 1 | 1440×900 | Ja — 1:1 |
| 3D-panel, elementbild | 353×353 (mobil) / 689×689 (desktop) | 1 | 351×352 / 690×690 | Ja — ±1 px kantfrans, ingen omskalning |

Ingen jämförelse har gjorts mellan bilder med olika densitet. Full-page-bilder används bara för översikt (`m-butik-full.png` är 45 790 px hög), aldrig för detaljdomar.

## State som jämfördes

Mobil: startsida (topp + skrollad), butik, produktsida, mobilmeny öppen, varukorg öppen (tomt läge), hero-3D, samt Racketverkstadens alla fyra steg. Desktop: startsida och verkstadens steg 1. Interaktioner som provades: touch-drag på 3D-ytan både på och utanför racketen, stegbyte via flikar och via "Nästa", tangentbord på stegflikarna, samt mus-drag på desktop.

## Full-vy-jämförelse

Mobil steg 1 mot desktop steg 1 (bilderna ovan): samma komponentordning i desktopversionen (3D-vy → kontroller → specar), samma tokentyper (bakgrund `#0a0a0b`, accent `#ff4a1c`, radie `--radius-lg`, mono-etiketter i versaler), samma typografifamilj (Archivo + Space Mono). Skillnaden är avsiktlig och införd i detta pass: på skärmar ≤900 px ligger spec-kortet **sist** i stället för direkt under 3D-vyn (se F2).

## Fokusområdes-jämförelse

Fokus behövdes för tre ytor, eftersom helhetsvyn inte avgör dem:

1. **Racketverkstadens 3D-panel** (elementbild av canvasen, överlagrad UI dold): racketens pixelutsträckning mätt till raderna 16–350 av 352 px på mobil och 32–689 av 690 px på desktop — 95 % av panelhöjden i båda fallen.
2. **Sista stegets sammanställning**: andelen av skärmbredden som panelen tar, samt om innehållet klipps (`scrollHeight` mot `clientHeight`).
3. **Steghuvudet** (rubrik + statusetikett): radbrytning och inbördes placering.

## Fynd

### Åtgärdade i detta pass

**[P1] Racketverkstadens sista steg sprängde skärmbredden och klipptes av**
Location: `#wsAddToCartBtn` i steg 4, `web/css/style.css` (`.btn--full`), grid-kolumnen i `.workshop__grid`.
Evidence: knappens etikett "Lägg specialbyggt racket i varukorgen" kunde inte radbrytas (`.btn { white-space: nowrap }`) och gav knappen intrinsisk min-content-bredd **442 px**. Den tvingade `.workshop__step-content` till 510 px, vilket i sin tur tvingade *båda* grid-kolumnerna till 510 px — inklusive 3D-panelen — inne i en 353 px-kolumn. `body { overflow-x: hidden }` gjorde att överflödet klipptes i stället för att synas som scroll: `viewport_w` var 510 på steg 1–3:s 353, och dokumentets `scrollWidth` förblev 393. Mätt med `mincontent.py` per element.
Impact: sista steget (och 3D-panelen) kapades till höger; användaren kunde inte läsa sammanställningen eller nå hela köpknappen.
Fix: `white-space: normal; text-align: center; text-wrap: balance; min-width: 0` på `.btn--full`, plus `min-width: 0` och `overflow-wrap: break-word` på grid-/flexbarn i verkstaden.
Verifierat efteråt: steg 4-panelen 353 px bred, `right` 373 ≤ 393, `scrollOver` 0, ingen klippning.

**[P1] Sidan gick inte att scrolla när gesten började på 3D-ytan**
Location: `web/css/style.css` (`.workshop__viewport-canvas`, `.hero__canvas3d`), `web/js/racket3d.js` (`initInteractions`).
Evidence: `touch-action: none` på hela canvasen. Mätt med touch-drag (CDP): i Racketverkstaden flyttade gesten sidan **0 px** (baslinje `scroll_test.m-ws-canvas.moved = 0`). Det fanns ingen hit-testning någonstans i appen (ingen `THREE.Raycaster` utanför `three.min.js`), så varje touch i ytan startade rotation.
Impact: 3D-panelen (353×353 px på mobil) fungerade som en scrollfälla mitt i verkstaden — användaren kunde inte ta sig ned till stegen.
Fix: canvasen har nu `touch-action: pan-y`, och `touchstart` är icke-passiv och gör en raycast mot racketens synliga meshar: träff → `preventDefault()` + rotation + klassen `.is-touch-armed`; miss → ingen åtgärd, webbläsaren scrollar. Hint-texten byter text mellan "Tryck på racketen för att rotera" och "Roterar · släpp för att scrolla".
Verifierat efteråt: gest utanför racketen flyttar sidan 225 px; gest på racketen flyttar 0 px och roterar (`targetRotation.y` −0,35 → 0,63 rad i instrumenterad testkopia). Desktopens mus-drag är oförändrat.

**[P2] Stegflikarna — verkstadens enda tvåvägsnavigation — låg under första skärmen**
Location: `web/css/style.css`, ordningen i `.workshop__grid`, `.workshop__stage-wrap`.
Evidence: vid scrollY 0 på 393×852 låg `.workshop__stepper` på **top 999 px**, alltså 147 px under skärmkanten. 3D-panelen (bottom 675) plus spec-kortet (bottom 979) fyllde första skärmen.
Impact: användaren möttes av 3D-vyn utan att se var i flödet hen var, och utan bakåtväg (det finns ingen bakåtknapp — bara flikarna).
Fix: på skärmar ≤900 px är `.workshop__grid` en flexkolumn med `.workshop__stage-wrap { display: contents }` och ordningen 3D-vy → kontroller → spec-kort.
Verifierat efteråt: `.workshop__stepper` top 685, bottom 752 ≤ 852 — helt synlig i första skärmen. Desktopens tvåkolumnslayout och sticky 3D-vy är oförändrade (mätt).

**[P2] Rubriken klipptes av skärmkanten**
Location: `.workshop__title` i `web/css/style.css` (≤640 px-blocket).
Evidence: ordet "Racketverkstad" i `<em>` mätte 387 px i en 353 px-ruta vid `clamp(32px, 9vw, 42px)`; dess högerkant låg på **407 px i en 393 px-viewport**, alltså klippt av `body { overflow-x: hidden }` (`h1.scrollWidth − clientWidth = 34`).
Impact: sidans huvudrubrik var avskuren på mobil.
Fix: `clamp(28px, 7.8vw, 36px)`, `letter-spacing: -0.025em`, `text-wrap: balance`.
Verifierat efteråt: högerkant 361 ≤ 393, `scrollOver` 0 — ned till 320 px breda skärmar.

**[P2] Steghuvudet radbröts till en oavsiktlig layout**
Location: `.step-sec__head` (rubrik + statusetikett), ≤640 px.
Evidence: `flex-direction: row; align-items: flex-end` gav 94 px hög rad där etiketten ("✓ Redo för limning") hamnade ensam, högerställd på egen rad (`sameRow: false`).
Impact: såg ut som en trasig rubrik snarare än en statusmarkering.
Fix: staplad kolumn, vänsterställd, 8 px mellanrum.
Verifierat efteråt: `flex-direction: column`, etiketten på egen rad med `left` 0 relativt rubriken.

**[P2] Touch-mål under 44 px**
Location: `.nav__actions button` (40×40), `.chip` (35 px höga) i `web/css/style.css`.
Evidence: `targets.py` på mobil: 3 navknappar 40×40 och 15 chips 35 px höga; verkstadens egna kontroller låg redan ≥44 px.
Impact: under WCAG 2.5.8 / Apple HIG:s rekommenderade minimum.
Fix: `min-height: 44px` för chips, stegflikar, swatchar, tjockleksknappar, verktygsknappar; `44×44` för navknapparna.
Verifierat efteråt: inga kontroller under 44 px på hem, butik eller verkstad.

**[P2] Inre scrollista utan avgränsning (mätt, sedan justerad)**
Location: `.workshop__cards-grid` i ≤640 px-blocket.
Evidence: först tog jag bort listans `max-height` helt — det gjorde steg 2:s sida **16 180 px** hög (96 gummi i två kolumner) och lade "Nästa" ~12 000 px ned. Vikten mättes, inte gissades.
Fix: egen scrollruta med `max-height: min(58vh, 520px)` och `overscroll-behavior: contain` — sidan förblir kort och "Nästa" ligger kvar nära innehållet.
Verifierat efteråt: steg 2:s sidhöjd 3 093–3 137 px-nivå igen, ingen scroll-kedja ut i sidan.

**[P3, åtgärdad] Dekorativa glyfer och död CSS**
Location: `web/index.html`, `web/js/app.js`, `web/css/style.css`.
Evidence: `✦` användes 8 gånger (nav, mobilmeny, produktkort, två PDP-knappar, kvittonot, "Fri frakt ingår") och en pulserande prick upprepades i statistikpanelen; `.nav__sparkle` och `.footer__note` blev kvar utan innehåll.
Impact: den typen av ogrundad dekoration är det som läser som "AI-sloppy" snarare än premium.
Fix: glyferna borttagna, PDP-knappen fick den befintliga kubikonen i stället, dublettdotten statisk, döda CSS-regler och footer-noten "Ny design — samma besatthet." borttagna.

### Observationer, medvetet inte åtgärdade

- **Racketen nuddar panelens nederkant.** Mätt på elementbild med överlagrad UI dold: racketen upptar 95 % av panelhöjden på mobil (rader 16–350 av 352) och på desktop (32–689 av 690, där sista raden har 20 objektpixlar). Identiskt i baslinjen — alltså befintlig inramning, inte en mobilregression — och desktopversionen är den ägaren redan godkänt. Att ändra den skulle göra mobil och desktop olika. **Fråga:** ska racketen ha några procents marginal nedtill på smala skärmar, eller ska inramningen förbli identisk mellan vyerna?
- **Varukorgens tomma läge saknar väg vidare.** Endast stängningskrysset i sidhuvudet; ingen "Visa alla produkter". Det är ett hål i designen, inte i implementationen — därför rapporterat i stället för uppfunnet.
- **`.chip`-raden på butikssidan** (kategori-filter) är 44 px hög efter fixen men ligger i en rad som kan bli lång; ingen overflow mätt (0 px på alla sidor).

### Avvisade fynd (mätning motsade synintryck)

- "Kostnadsfrie professionell montering" och "REDO FÖR LEVERING" — synmodellens felläsning. Koden säger `Kostnadsfri professionell montering ingår!` och `✓ Redo för limning` (verifierat i `web/js/app.js:1558` och `:1528`).
- "Sammansättning" — koden säger `Montering & Sammanställning`.
- "Nästa-knappens text klipps" (`scrollWidth − clientWidth = 351`) — det är den animerade shimmer-pseudoelementet som sträcker sig utanför knappen och klipps av `overflow: hidden` med flit. Etiketten själv mäter 235 px i en 319 px-knapp.
- "3D-panelen är inte kvadratisk" — uppmätt 353×353 CSS px, elementbild 351×352 px (kantfrans).

## Jämförelsehistorik (varje P0/P1/P2-iteration)

| # | Fynd | Åtgärd | Visuellt bevis efteråt |
|---|---|---|---|
| 1 | Steg 4 sprängde bredden (510 px i 353 px-kolumn) | `white-space: normal` på `.btn--full` + `min-width: 0`-skydd | `final/m-ws-step4.png`, mätning: bredd 353, `right` 373, `scrollOver` 0 |
| 2 | 3D-ytan blockerade sidscroll (0 px) | `touch-action: pan-y` + raycast-gate i `racket3d.js` | `acceptance.py`: utanför racketen 225 px, på racketen 0 px; `targetRotation.y −0,35 → 0,63` |
| 3 | Stegflikar på top 999 px | omordning ≤900 px (3D → kontroller → specar) | `final/m-ws-step1.png`: flikarna synliga, mätt top 685 / bottom 752 |
| 4 | Rubriken klippt 14 px utanför skärmen | mindre `clamp` + balanserad radbrytning | mätning: högerkant 361 ≤ 393 |
| 5 | Steghuvudet radbröts fel | staplad kolumn | `final/m-ws-step4.png`: rubrik överst, etikett vänsterställd under |
| 6 | Touch-mål 35–40 px | 44 px på mobil | `targets.py`: inga under 44 px |

Regressioner som jag själv införde och rättade under passet: borttagen inre scrollruta (gav 16 180 px lång sida → återinförd, avgränsad) och en kvarvarande variabelreferens (`coarsePointer is not defined`, som slog ut 3D-initieringen — fångades av att två acceptanskriterier föll och rättades).

## Implementation Checklist

1. ~~`white-space: normal` på `.btn--full` + `min-width: 0` på gridbarn~~ klar
2. ~~`touch-action: pan-y` + raycast-gate i `racket3d.js` (touch)~~ klar
3. ~~Omordning ≤900 px så stegflikarna hamnar i första skärmen~~ klar
4. ~~Minskad rubrikstorlek på mobil~~ klar
5. ~~Staplat `.step-sec__head` på mobil~~ klar
6. ~~44 px touch-mål~~ klar
7. ~~Avgränsad inre scrollista på mobil~~ klar
8. ~~Borttagna dekorglyfer + död CSS~~ klar
9. **Öppet (kräver beslut):** radbrytning/marginal för racketen i panelen — se Open Questions
10. **Öppet (kräver beslut):** CTA i varukorgens tomma läge
11. **Blockerare för "passed":** ingen mobil källbild finns — se nedan

## Open Questions

- **Saknad källbild.** Ska mobilayouten bedömas mot en mock? Utan en sådan kan den här QA:n inte intyga designtrohet, bara frånvaro av mätbara fel (overflow, klippning, touch-mål, scroll-fällor). Två vägar: (a) en mobilmock tas fram och QA:n körs om mot den, eller (b) ägaren godkänner den desktop-härledda layouten som avsedd design och blockeraren stryks.
- **Racketen i panelen:** 95 % fyllnad och nederkant i linje med panelkanten, likadant på desktop. Ska det vara så, eller ska mobilen få marginal?
- **Varukorgens tomma läge:** ska det få en primär åtgärd ("Visa alla produkter")?
- **Repo-status:** ändringarna i `web/` är **inte committade**. Detta pass har inte rört git i projektrepot (vaultregeln säger att repon inte committas åt). Säg till om de ska committas och pushas.

## Residual test gaps

- Ingen riktig mobil enhet; iOS Safari och Android Chrome är inte provade (bara Chromium med touch-emulering). `matchMedia("(pointer: coarse)")` beter sig olika där, och det påverkar bara vilken hint-text som visas, inte gatingen.
- Ingen fysisk multitouch-provning (två fingrar samtidigt på 3D-ytan samtidigt som sidan scrollas).
- Kontrastvärden är beräknade ur tokens, inte mätta med kontrastverktyg mot renderade pixlar.
- Ingen prestandamätning (WebGL på låg mobilspec).
- Varukorgen provades bara i tomt läge; med varor är flödet oförändrat men obevisat i detta pass.
