# Design QA — PP-PINGIS, mobilpass 2026-09-14

**final result: blocked**

Blockerare: **det finns ingen källbild (mock, Figma eller skiss) för mobilayouten i repot.** QA:n har därför kunnat jämföra mobilrenderingen mot repots egen designkontrakt (designtokens i `web/css/style.css`, README:s uttalade responsivitetskrav) och mot den levererade desktoprenderingen av samma komponenter — men inte mot en avsedd mobildesign, eftersom någon sådan inte existerar. Inga kvarstående P0/P1/P2-fynd finns; blockeraren gäller det saknade jämförelseobjektet, inte ett misstänkt fel. Se "Open Questions".

**Två pass samma dag.** Pass 1 (mobil) och pass 2 (ägarens fyra punkter: ljud bort, bakåtväg i stegen, mjuk gummi-animation, touch-yta på racketen — plus BETA-märket). **Pass 3: läsbarhet och tydlighet** — ägaren bad om fokus på texterna, särskilt tydligheten i markerat kategoriläge, och om en bedömning av ljust tema. Se respektive avsnitt.

**Sajten är en mock-up av en befintlig sida** (ägarens besked 2026-09-14). Frågan om varukorgens tomma läge är därmed avskriven — den byggs inte ut.

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

1. **Racketverkstadens 3D-panel** (elementbild av canvasen, överlagrad UI dold). Före pass 2: racketen fyllde 95 % av panelhöjden och nuddade nederkanten (raderna 16–350 av 352 px på mobil, 32–689 av 690 px på desktop). Efter pass 2: 74 % fyllnad med 6 % marginal upptill och 12 % nedtill, centrerad inom 12 px.
2. **Sista stegets sammanställning**: andelen av skärmbredden som panelen tar, samt om innehållet klipps (`scrollHeight` mot `clientHeight`).
3. **Steghuvudet** (rubrik + statusetikett): radbrytning och inbördes placering.

## Fynd — pass 2 (ägarens fyra punkter)

### Åtgärdade

**[P1] Ljudet borttaget helt**
Location: `web/js/racket3d.js` (ljudmotorn: `audioCtx` + `playHitSound` + 7 anrop) och exporten `PPRacket3D.playHitSound`.
Evidence: varje vändning, sprängskiss, bladbyte, kantband, gummi-byte och påläggning spelade en syntetiserad ton. Ägaren: "ta bort ljudet … när man vänder på racket och när man byter färg".
Impact: överraskande ljud i en demosida som ska visas för en vän.
Fix: hela ljudmotorn borttagen — ingen `AudioContext` skapas någonstans; anropen och exporten är borta.
Verifierat: instrumenterad räknare i webbläsaren gav **0 skapade AudioContext och 0 oscillatorer** efter att ha vänt racketen, slagit på/av lager, bytt gummi, bytt färg och bytt steg. `typeof window.PPRacket3D.playHitSound === "undefined"`.

**[P2] Det gick inte att gå tillbaka i stegen**
Location: `web/js/app.js` (`stepNav()`, delegerad klickhantering på `#wsStepContent`), `web/css/style.css` (`.workshop__step-nav`, `.workshop__back-btn`).
Evidence: enda tvåvägsnavigationen var stegflikarna högst upp i panelen — det fanns ingen bakåtknapp i innehållet, så efter ett val långt ned i en lista fanns ingen synlig väg tillbaka.
Impact: ägaren: "det går typ inte å gå tbx nu". Ett stegväljare utan bakåtväg tvingar fram omladdning.
Fix: bakåtknapp i varje steg 2–4 ("Tillbaka: Stomme" / "Forehand" / "Backhand") bredvid den befintliga "Nästa"-knappen, med samma återanvända glasstil som sekundär åtgärd. På mobil staplas de (Nästa överst, Tillbaka under), båda ≥44 px. Klicket delegeras från stegpanelen, så ingen lyssnare kopplas om per rendering.
Verifierat: bakåt går **4 → 3 → 2 → 1** via knapptryck; steg 2:s rad mäter `Tillbaka: Stomme` 44 px och `Nästa steg: …` 48 px; steg 4 har bakåtknapp och behåller köp-CTA:n. Visuellt verifierad hierarki (primär orange / sekundär mörk).

**[P2] Gummibytet ploppade in i stället för att läggas på**
Location: `web/js/racket3d.js` (`animateRubberChange`, `updateForehand`, `updateBackhand`, `applyRubberAnimation`).
Evidence: texturen byttes **direkt** på materialet (`fhRubberMat.map = newTex`) och den gamla animationen var en squash-stretch (`scale.set(1.4, 0.05, 1)` → `1,1,1`) i fasta steg per frame. Ägaren: "ser ut som ett browser-spel från 90-talet som bara ploppar in".
Fix: ny påläggning — ett tillfälligt mellanskikt med den nya texturen tonar in samtidigt som det växer från handtaget och uppåt (geometrins origo ligger vid halsen), med `easeOutCubic` över 340 ms, och svampens färg glider över i den nya. Den gamla ytan ligger kvar under tills den nya täcker, så det blir aldrig ett hål eller en blixt. Den permanenta texturen skrivs först när animationen är klar, och ett snabbt färgbyte kastar en pågående påläggning i stället för att stapla.
Verifierat: i en instrumenterad temp-kopia med förlängd varaktighet mättes opaciteten till 0 → 0,20 → 0,43 → 0,63 → 0,74 → 0,85 → 0,92 → 0,96 → 0,99 → 1 (mjuk, avtagande kurva), skalningen 0,25 → 1 (utrullning), permanent textur oförändrad under hela förloppet och bytt först vid slutet, svampfärg `1b74f0 → ff6600`. I den riktiga appen: färgbytet landar (kanal-medelvärde `(173,50,46) → (61,111,157)`, max Δ 112).

**[P2] Touch-ytan var hela rutan i stället för racketen**
Location: `web/js/racket3d.js` (`frameRacket()`, `onResize()`, `baseScale`/`basePositionY`) och `web/css/style.css` (pekarstyrning, `.is-interactive`).
Evidence: racketen fyllde **95 % av panelens höjd** och nuddade nederkanten — mätt till raderna 16–350 av 352 px på mobil och 32–689 av 690 px på desktop (samma i baslinjen, alltså ärvt, inte från pass 1). Med racketen så stor *är* "träff överallt i mitten" samma sak som "träff på racketen", vilket ägaren upplevde som att touchen låg över hela rutan: "gör touch-rutan där man flyttar runt på racket med centrerat på racket".
Impact: irritation vid navigering och ingen visuell ledtråd om var man får ta tag.
Fix: studio-vyn räknar nu fram sin egen inramning ur racketens bounding box: den skalas till 74 % av den synliga höjden och centreras på kamerans blickpunkt (hero-läget behåller sin godkända inramning). Dessutom visar muspekaren `grab` **bara** när den är över racketen (samma raycast som styr touchen), och panelen får en accentkant medan gesten håller racketen.
Verifierat: toppmarginal 6 %, bottenmarginal 12 %, centrumavvikelse 12 px; träff-test i fem punkter — mitten tar tag (`armed: true`), topp-/bottenmarginal och sidkanter tar **inte** tag. Skärmbilder: `mobil2/racket-framed.png`.

**[P3, önskad av ägaren] "BETA – TEST"-märke i 3D-byggaren**
Location: `web/js/app.js` (`.workshop__beta` i panelmarkupen), `web/css/style.css`.
Fix: litet piller uppe till höger i 3D-panelen — mono 10 px versaler, `--ink-dim`, glasbakgrund och tunn ram, `pointer-events: none` och utanför layoutflödet. Hint-texten till vänster har fått minskad maxbredd så de aldrig kan krocka.
Verifierat: 99×25 px, inom panelen, ingen överlappning med hinten, pekaren går **rakt igenom** (`elementFromPoint` → `canvas`), stegflikarna kvar i första skärmen och 0 px horisontell overflow. Syns i både mobil (393) och desktop (1440).

## Fynd — pass 3 (läsbarhet och tydlighet)

Mätt med renderad kontrast: för varje textelement jämförs elementets textfärg mot den faktiska bakgrunden i rutan (vanligaste färgen inuti, med ringen utanför som motkandidat — den kandidat som ligger längst från textfärgen vinner). Tröskel 4,5:1 för normal text, 3:1 för stor. Metoden prövades i fem iterationer; de tre första mätte fel (median­delning kollapsar när texten är minoritet, ringen utanför samplar grannar, och full-page-skärmbilder flyttar vh-baserad layout). Den femte mäter konsekvent: element utanför bildrutan och animerade element hoppas över, och mjuk scrollning stängs av.

### Åtgärdade

**[P1] Fyra CSS-variabler användes men definierades aldrig — det sprängde de markerade lägena**
Location: `web/css/style.css` (`:root`), drabbade `.wchip.is-active`, `.step-tab.is-active`, `.swatch-btn.is-active`, `.btn-tool`, `.wchip`, `.thick-btn`, `.mono-label`, `.step-sec__head p`, m.fl. (24 användningar).
Evidence: `--ink-bright` (12 användningar), `--ink-muted` (9), `--panel` (1) och `--font-sans` (2) fanns inte i något `:root`. En odefinierad `var()` utan fallback gör hela deklarationen ogiltig: `background` faller tillbaka på genomskinligt och `color` ärvs. I byggaren blev därför **det valda varumärkes-filtret mörk text på genomskinlig botten över en mörk panel** — uppmätt **1,10:1**. Stegflikarnas aktiva bakgrund (`--panel`) och svatcharnas valda text försvann på samma sätt.
Impact: exakt det ägaren beskrev — "läsbarheten och tydligheten när man markerat en kategori måste bli tydligare och bättre".
Fix: de fyra token definieras nu (`--ink-bright: #f7f3ec`, `--ink-muted`, `--panel`, `--font-sans: var(--font-display)`).
Verifierat: vald varumärkes-chip mäter **17,5:1** (`#0a0a0b` på `#f6f0ea`) mot 1,10:1 före.

**[P1] Vit text på varumärkes-orangen klarade inte kontrastkravet någonstans**
Location: primär-CTA (`.btn--accent`, `.workshop__next-btn`), `.chip.is-on`, `.badge--hot` ("Pro"), `.nav__badge-3d`, `.mob-link__tag`, varukorgsräknaren, `.thick-btn.is-active`, `.step-tab.is-done .step-tab__num`, `.btn-tool--accent`, `::selection`.
Evidence: vit text på `#FF613B→#E83A0E` mäter **2,99:1** respektive **4,16:1**; på `#ff5a30` 3,11:1. Det gäller alltså även den primära köpknappen.
Fix: ny fyllningstoken `--accent-deep: #d63a0c` → `--accent-deep-2: #b82c08`, som ger vit text **4,70–6,17:1** och fortfarande står ut mot sidan (4,21:1). Den ljusa `--accent` behålls för text, ramar och glöd, där den mäter 5,89:1 mot den mörka botten (den var alltså aldrig problemet som text).
Verifierat: vald kategori-chip mäter **5,12:1** mot 4,06:1 före.

**[P2] Små etiketter under läsbarhetsgränsen**
Location: `.pcard__brand` och `.pcard__stock` (10 px, mörk text i 50–55 % på krämfärgade kort), `.chip__count` (10 px), `.badge`/`.wcard__badge` (10 px), `.nav__badge-3d`/`.mob-link__tag` (9 px), `.pdp__spec dt`, `.citem__rm`, `.mono-label`.
Evidence: mörk text i 50 % på kräm mäter **3,36:1** (kräver 4,5 vid 10 px).
Fix: nya etikett-tokens (`--ink-dim` 0,62 → 0,74; `--ink-faint` 0,50 → 0,62; `--card-ink-soft` 0,68 → mäter 5,97:1 på kräm), storlekar upp (10 → 11 px på kortens etiketter, 9 → 10 px på märken, 11 → 11,5 px på mono-etiketter).

**[P2] Produktnamnet satt i VERSALER i upp till 52 px**
Location: `.pdp__name`.
Evidence: all-caps tar bort ordbilden — största möjliga läsbarhetssänkning på den mest lästa texten. Behålls på korta varumärkesetiketter (`.brandchip` 17 px, "DONIC") där versaler är rätt.
Fix: versaler bort, storlek `clamp(28px, 3.2vw, 46px)`, `font-stretch` 116 → 108 %, radhöjd 1,02 → 1,08.

**[P2] Markerade lägen syntes bara via färg, och ett av dem pulserade**
Location: `.group-tab.is-active`, `.swatch-btn.is-active`, `.step-tab.is-active`, `.wcard.is-selected`.
Fix: vald flik får fet stil + **accentmarkering nedtill** (syns utan färgseende), vald svatch 2 px accentram + fet text, vald stegflik fet + accentmarkering och ingen glömsk textskugga, valt kort ett **stabilt** läge med bock i stället för pulserande glöd. Byggarens filterknappar (`.wchip`, `.swatch-btn`, `.thick-btn`) fick `aria-pressed` — 12 kontroller har nu det.
Verifierat: `gruppflik_undermarkering: true`, 12 `aria-pressed`, alla markerade lägen ≥5,12:1.

**[P2] Spec-märkena ärvde produktfotots färg**
Location: `.wcard__badge` ("Fart: 7", "Kontroll: 10").
Evidence: genomskinlig botten gav **3,28:1** på ett kort (`#e5baaa` på `#c03008`) — kontrasten berodde på vilket foto som låg bakom.
Fix: solid botten `rgba(12,12,14,0.86)` + tunn ram → mätt 9,4:1 oberoende av underlaget.

### Nedtonat (ägaren: "den är redan flashig nog")

- **Filmkornet** låg som ett fast överlägg ovanpå all text och animerades; nu statiskt och opacity 0,032 → 0,018.
- **Skimmer-svepet över den primära CTA-texten** (`.workshop__next-btn::before`, vit gradient som svepte över etiketten) — borttaget, tillsammans med sin keyframe. En etikett ska inte konkurrera med en animation.
- **Textskuggan** på den aktiva stegfliken — borttagen.
- **Pulserande glöd** på valt kort → stabilt läge.

### Resultat av mätningen

| Sida | Mobil (före → efter) | Desktop (före → efter) |
|---|---|---|
| Startsida | 5 → **0** | 2 → **0** |
| Butik | 10 → **0** (se noten) | 13 → **0** (se noten) |
| Produktsida | 0 → 0 | 0 → 0 |
| Racketverkstad | 2 → **0** | 0 → 0 |

Efter fixen mäter 21 av 21 respektive 164 av 164 mätta element över tröskeln utom ett antal på butikssidan vars bakgrundsmätning hamnar på **produktfoton** i stället för kortets krämfärg. Det är en mätartefakt, inte en kontrast­brist: samma sida mätt stillastående (ingen skrollning, inga pågående `reveal`-animationer) ger **0 fel**, och en riktad mätning visar att varje produktbild ligger 26 px innanför sin ruta medan namnet börjar 41 px under den — texten ligger alltså på kortets krämfärg, inte på fotot. Kvarstår som residual: skrollade skivor kan inte mäta produktrutnätet pålitligt.

### Ljust tema eller inte — bedömning

Mätningen säger att problemet **inte** var det mörka temat: nära-vit brödtext mäter 17:1, dämpad text 6,3–9,5:1 och accenten som text 5,9:1. Det som faktiskt gick sönder var fyra saknade tokens, för ljus accentfyllning under vit text, för små etiketter och versala produktnamn.

Ett helt ljust tema är däremot en större affär än det låter, och siffrorna är konkreta:

- **Accenten måste bytas.** `#ff4a1c` som *text* på ljus botten ger 2,90:1; den behöver ned till omkring `#c9320a` (4,59:1). Då är det inte samma neon-orange längre — identiteten ändras, inte bara bakgrunden.
- **~150 regelinstanser är byggda för mörker:** 34 regler med `backdrop-filter`-glas, 42 användningar av accentglöd i `rgba`, 25 ljus-på-mörk-fyllningar (`rgba(255,255,255,0.0x)`), 8 radial-gradient-glöd och filmkornet. Alla behöver ses över, plus `--glass-*`-tokens och 3D-panelens mörka bakgrund.
- **Produktbilderna** är skrapade på vit botten. På den mörka sidan ger de krämfärgade korten separation; på en ljus sida försvinner den kontrasten och korten behöver ramar/skuggor i stället.

**Rekommendation: behåll mörkt, men "lugn mörkt"** — precis det som gjorts i det här passet (höjd textkontrast, djupare accentfyllning, inga animationer över text). Det ger läsbarheten utan att röra identiteten. Vill ägaren ändå prova ljust är den billigaste vägen inte ett helt tema utan att lyfta basen från `#0a0a0b` till omkring `#101014` och behålla de krämfärgade korten — eller att jag tar fram ett ljust förslag i en separat gren med ovanstående tokenkarta som utgångspunkt.

### Åtgärdade

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
| 7 | Ljud i varje interaktion (pass 2) | hela ljudmotorn borttagen | `verify_owner_asks.py`: 0 AudioContext, 0 oscillatorer, `playHitSound` borta ur API:t |
| 8 | Ingen bakåtväg i stegen (pass 2) | bakåtknapp i steg 2–4 + delegerat klick | klicksekvens 4 → 3 → 2 → 1; `Tillbaka: Stomme` 44 px, `Nästa` 48 px; visuellt primär/sekundär-hierarki bekräftad |
| 9 | Gummibyte "ploppade in" (pass 2) | mjuk påläggning: övertoning + utrullning, `easeOutCubic` 340 ms | instrumenterad ramp 0 → 0,20 → 0,43 → 0,63 → 0,74 → 0,85 → 0,92 → 0,96 → 0,99 → 1, skalning 0,25 → 1, textur bytt först vid slutet; färgbytet landar `(173,50,46) → (61,111,157)` |
| 10 | Touch-ytan = hela rutan (pass 2) | inramning: racketen 74 % av panelhöjden, centrerad; pekare `grab` bara över racketen | toppmarginal 6 %, bottenmarginal 12 %, centrum 12 px; träff i mitten = ja, marginaler/kanter = nej |
| 11 | BETA-märke önskat (pass 2) | litet piller uppe till höger i panelen, `pointer-events: none` | 99×25 px, ingen överlappning, pekaren går igenom till `canvas`, 0 px overflow, syns på mobil och desktop |

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
9. ~~Bort med ljudet (hela ljudmotorn)~~ klar
10. ~~Bakåtknapp i varje steg~~ klar
11. ~~Mjuk gummi-påläggning i stället för plopp~~ klar
12. ~~Touch-ytan centrerad på racketen, med luft runt~~ klar
13. ~~"BETA – TEST"-märke i 3D-byggaren~~ klar
14. ~~Definiera de fyra saknade CSS-token~~ klar
15. ~~Djupare accentfyllning så vit text klarar 4,5:1~~ klar
16. ~~Höj dämpad textkontrast och små etikettstorlekar~~ klar
17. ~~Versaler bort på produktnamn~~ klar
18. ~~Icke-färgberoende markering i valda lägen + `aria-pressed`~~ klar
19. ~~Nedtonat: korn, skimmer, glöd, puls~~ klar
20. **Blockerare för "passed":** ingen mobil källbild finns — se nedan

## Open Questions

- **Saknad källbild.** Ska mobilayouten bedömas mot en mock? Utan en sådan kan den här QA:n inte intyga designtrohet, bara frånvaro av mätbara fel (overflow, klippning, touch-mål, scroll-fällor, ljud). Två vägar: (a) en mobilmock tas fram och QA:n körs om mot den, eller (b) ägaren godkänner den desktop-härledda layouten som avsedd design och blockeraren stryks.
- **Hero-racketten har kvar sin gamla inramning** (fyller panelen, nuddar nederkanten). Studio-vyn fick ny inramning i pass 2, men hero-vyn lämnades medvetet orörd eftersom ägaren godkänt startsidans utseende. Ska hero följa samma inramning?
- **Varukorgens tomma läge:** avskriven — sajten är en mock-up av en befintlig sida (ägarbesked 2026-09-14).
- **Repo-status:** pass 2 committas och pushas efter ägarens besked så att ändringarna kan ses live efter re-deploy.

## Residual test gaps

- **Headless-Chromium här kör `requestAnimationFrame` i ~3 fps** (mätt: 3 frames/s). En 340 ms-animation ryms därför i praktiken i en enda frame, vilket gjorde att de första pixelmätningarna såg ut som ett plopp. Animationens ramp verifierades därför i en instrumenterad temp-kopia med förlängd varaktighet (samma kodväg, bara `duration` ändrad). På riktig hårdvara (60 fps) motsvarar 340 ms ~20 frames. Slutsatsen "mjuk påläggning" vilar alltså på den instrumenterade mätningen, inte på en pixelfilm i full frame rate.
- Ingen riktig mobil enhet; iOS Safari och Android Chrome är inte provade. `matchMedia("(pointer: coarse)")` styr bara vilken hint-text som visas, inte gatingen.
- Ljudets frånvaro är verifierad i Chromium; ingen kontroll av att en eventuell annan ljudkälla (t.ex. skärmläsare) påverkas.
- Ingen fysisk multitouch-provning (två fingrar samtidigt på 3D-ytan medan sidan scrollas).
- Kontrastvärden är beräknade ur tokens, inte mätta med kontrastverktyg mot renderade pixlar.
- Ingen prestandamätning (WebGL på låg mobilspec).
- Varukorgen provades bara i tomt läge.
