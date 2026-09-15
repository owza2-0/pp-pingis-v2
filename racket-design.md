# Racketmodell – 2026-09-15

## Designval

Fortsätter butikens sportslab-inriktning: ENERGY 2 / RHYTHM 2 / MOTION 2. Antislop-ui används under arbetet enligt projektets tidigare val. Avgränsning: Three.js-modellen i hero och verkstad.

- Rundad bladkontur med horisontell tangent i toppen ger en sammanhängande silhuett.
- Brett, tunt FL-grepp med utåtriktade normaler och längsgående träådring gör konstruktionen läsbar från flera vinklar.
- Matt rött/svart gummi skiljs från träets svaga lack och kantbandets textilyta.
- Normaliserade UV-koordinater placerar produktnamnet en gång vid gummits nederkant. Baksidan vänds så trycket kan läsas utifrån.
- Plant kantband täcker laminatet i stället för att bilda en rund tråd.
- Färgutmatning för lokala Three.js r128 korrigerad till sRGB.
- Still hero-pose ersätter ständig svävning; dragning, vändning och lageranimation behålls. Mus utanför panelen ändrar inte posen.
- Påhittat certifieringsnummer och generella tillverkningspåståenden borttagna från texturerna. Modellen är fortfarande en schematisk förhandsvisning, inte en exakt modell av varje katalogprodukt.

## Kontroll

Playwright Chromium: befintlig `scratch/acceptance.py` 15/15 PASS, inga konsol-/sidfel, touchrotation respektive scroll utanför racketen fungerar, inget overflow på mobil eller desktop. Separat visuell granskning av modellens fram- och baksida. Slutlig syntaxkontroll och `git diff --check` godkända. UI-skillens relevanta material-, färg- och rörelsekrav granskade; sidans övriga layout är inte omdesignad.
