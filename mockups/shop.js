/* PP-Pingis konceptmockuper: delat beteende.
   Allt som är funktion ligger här, så att de tre designförslagen skiljer sig i form
   men aldrig i uppförande. Ingen innehållsdata skapas här, den kommer ur products.js.

   Varje mockup-sida ansvarar bara för sin egen form och färg:
     <input data-search>            sokfalt
     <div data-chips>               kategoriknappar (fylls har)
     <div data-count>               "visar n av m"
     <div data-grid>                produktlistan (fylls har)
     <span data-cart-count>         antal i varukorgen
     <button data-cart-toggle>      oppnar/stanger varukorgen
     <div data-empty></div>         tomt lage (fylls har)
     <nav data-variants>            byte mellan förslagen (fylls har)
     <p data-status aria-live>      upplast meddelande
*/
(() => {
  "use strict";

  const M = window.PP_MOCK;
  if (!M) return;

  const P = M.products;
  const SHOP = M.shop;
  const IMG = "assets/img/";
  const nf = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
  const kr = n => nf.format(n) + " kr";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* Spelvärden står som "10-", "7+" eller "10+++". Vi visar alltid butikens egen
     text orörd, och räknar bara ut ett läge för de staplar som är siffernära. */
  function level(v) {
    const t = String(v).trim();
    const m = t.match(/^(\d+(?:[.,]\d+)?)\s*([+\-]*)$/);
    if (!m) return null;
    const num = parseFloat(m[1].replace(",", "."));
    if (!(num > 0 && num <= 12)) return null;
    return { num, plus: (m[2].match(/\+/g) || []).length, minus: (m[2].match(/-/g) || []).length, ratio: num / 12 };
  }
  const BARSPEC = ["Fart", "Kontroll", "Skruv"];

  const state = { q: "", kind: "alla", cart: [] };

  /* ---------- vy: produktkort ---------- */
  function cardHTML(p) {
    const sharp = IMG + p.imgs[0] + ".webp";
    const twox = IMG + p.imgs[0] + "@2x.webp";
    const specs = Object.entries(p.specs || {});
    const specHTML = specs.length ? `<dl class="ppc__specs">${specs.map(([k, v]) => {
      const lv = BARSPEC.includes(k) ? level(v) : null;
      return `<div class="ppc__spec${lv ? " ppc__spec--bar" : ""}"${lv ? ` style="--level:${lv.ratio.toFixed(3)}"` : ""}>
        <dt class="ppc__spec-k">${esc(k)}</dt><dd class="ppc__spec-v">${esc(v)}</dd></div>`;
    }).join("")}</dl>` : "";

    return `<article class="ppc" data-id="${p.id}" data-name="${esc(p.name)}" data-kind="${esc(p.kind)}">
  <a class="ppc__media" href="${esc(p.url)}" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
    <span class="ppc__ph"><span class="ppc__ph-t">Bild laddas</span></span>
    <img class="ppc__img" src="${sharp}" srcset="${sharp} 1x, ${twox} 2x"
         alt="" loading="lazy" decoding="async" width="900" height="900" data-img>
  </a>
  <div class="ppc__body">
    <p class="ppc__meta"><span class="ppc__brand">${esc(p.brand)}</span><span class="ppc__kind">${esc(p.kind)}</span></p>
    <h3 class="ppc__name"><a class="ppc__link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.name)}<span class="ppc__ext" aria-hidden="true"> (öppnas hos butiken)</span></a></h3>
    <p class="ppc__blurb">${esc(p.blurb)}</p>
    ${specHTML}
    <div class="ppc__foot">
      <p class="ppc__price"><span class="ppc__kr">${kr(p.price)}</span><span class="ppc__stock">I lager</span></p>
      <button class="ppc__add" type="button" data-add="${p.id}">Lägg i varukorgen</button>
    </div>
  </div>
</article>`;
  }

  /* ---------- bildlägen: laddar, klart, fel ---------- */
  function wireMedia(root) {
    $$("[data-img]", root).forEach(img => {
      const media = img.closest(".ppc__media");
      const ph = $(".ppc__ph", media);
      const full = img.currentSrc || img.src;
      const showErr = () => {
        media.classList.add("is-error");
        if (ph) ph.innerHTML = `<span class="ppc__ph-t">Bild saknas för ${esc(img.closest(".ppc").dataset.name)}</span>`;
      };
      if (img.complete) {
        if (img.naturalWidth > 0) media.classList.add("is-loaded"); else showErr();
        return;
      }
      img.addEventListener("load", () => media.classList.add("is-loaded"), { once: true });
      img.addEventListener("error", showErr, { once: true });
      // Nätet kan ha gett upp innan lyssnaren hann kopplas på.
      if (full && img.complete && img.naturalWidth === 0) showErr();
    });
  }

  /* ---------- filtrering ---------- */
  const kinds = ["alla", ...new Set(P.map(p => p.kind))];
  function visible() {
    const q = state.q.trim().toLowerCase();
    return P.filter(p => {
      if (state.kind !== "alla" && p.kind !== state.kind) return false;
      if (!q) return true;
      return (p.name + " " + p.brand + " " + p.kind + " " + p.blurb).toLowerCase().includes(q);
    });
  }

  function render() {
    const list = visible();
    const grid = $("[data-grid]");
    if (!grid) return;
    grid.innerHTML = list.map(cardHTML).join("");
    wireMedia(grid);

    const count = $("[data-count]");
    // Upprepad rad på varje kort blir brus. Sidan säger det i stället en gång, här.
    if (count) count.textContent = (list.length === P.length
      ? `${P.length} utvalda av butikens ${SHOP.total} produkter`
      : `${list.length} av ${P.length} utvalda produkter`)
      + `. Länkarna går till ${SHOP.site.replace(/^https?:\/\//, "").replace(/\/$/, "")}.`;

    const empty = $("[data-empty]");
    if (empty) {
      const q = state.q.trim(), kind = state.kind;
      if (list.length) {
        empty.hidden = true;
        empty.innerHTML = "";
      } else {
        empty.hidden = false;
        empty.innerHTML = `<div class="ppc-empty" role="status">
  <p class="ppc-empty__t">${q ? `Ingen träff på "${esc(q)}"` : `Inget i kategorin ${esc(kind)}`}</p>
  <p class="ppc-empty__d">${q
    ? `${esc(kind === "alla" ? "Hela sortimentet" : kind)} innehåller inget som matchar. Prova ett varumärke som Donic eller Yasaka, eller välj en kategori.`
    : `Kategorin är tom i det här urvalet. Välj en annan kategori för att se produkter.`}</p>
  <button class="ppc-empty__btn" type="button" data-clear>${q ? "Rensa sökningen" : "Visa alla produkter"}</button>
</div>`;
        $("[data-clear]", empty).addEventListener("click", () => {
          state.q = "";
          state.kind = "alla";
          const s = $("[data-search]");
          if (s) s.value = "";
          syncChips();
          render();
          if (s) s.focus();
          say("Sökningen rensad, alla produkter visas igen.");
        });
      }
    }
    $$("[data-add]").forEach(b => b.addEventListener("click", () => add(b.dataset.add, b)));
  }

  /* ---------- kategoriknappar ---------- */
  function syncChips() {
    $$("[data-chips] [data-kind-btn]").forEach(b => {
      const on = b.dataset.kindBtn === state.kind;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }
  function buildChips() {
    const box = $("[data-chips]");
    if (!box) return;
    box.innerHTML = kinds.map(k => {
      const n = k === "alla" ? P.length : P.filter(p => p.kind === k).length;
      return `<button class="mchip" type="button" data-kind-btn="${esc(k)}" aria-pressed="false">${esc(k === "alla" ? "Alla" : k)} <span class="mchip__n">${n}</span></button>`;
    }).join("");
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-kind-btn]");
      if (!b) return;
      state.kind = b.dataset.kindBtn;
      syncChips();
      render();
      say(`${b.dataset.kindBtn === "alla" ? "Alla produkter" : b.dataset.kindBtn} visas.`);
    });
    syncChips();
  }

  /* ---------- varukorg ---------- */
  function say(msg) {
    const el = $("[data-status]");
    if (el) el.textContent = msg;
  }
  function add(id, btn) {
    const p = P.find(x => x.id === id);
    if (!p) return;
    const line = state.cart.find(l => l.id === id);
    if (line) line.n += 1; else state.cart.push({ id, n: 1 });
    btn.disabled = true;
    btn.textContent = "Tillagd i varukorgen";
    setTimeout(() => { btn.disabled = false; btn.textContent = "Lägg i varukorgen"; }, 1400);
    renderCart();
    say(`${p.name} lades i varukorgen, ${state.cart.reduce((s, l) => s + l.n, 0)} varor totalt.`);
  }
  function renderCart() {
    const n = state.cart.reduce((s, l) => s + l.n, 0);
    const total = state.cart.reduce((s, l) => s + l.n * P.find(x => x.id === l.id).price, 0);
    $$("[data-cart-count]").forEach(el => el.textContent = String(n));
    const body = $("[data-cart-body]");
    if (!body) return;
    if (!state.cart.length) {
      body.innerHTML = `<p class="mcart__none">Varukorgen är tom. Lägg till en produkt från listan för att se den här.</p>`;
      return;
    }
    body.innerHTML = `<ul class="mcart__list">${state.cart.map(l => {
      const p = P.find(x => x.id === l.id);
      return `<li class="mcart__row">
  <span class="mcart__n">${l.n} st</span>
  <span class="mcart__name">${esc(p.name)}</span>
  <span class="mcart__p">${kr(p.price * l.n)}</span>
  <button class="mcart__x" type="button" data-remove="${l.id}" aria-label="Ta bort ${esc(p.name)}">Ta bort</button>
</li>`;
    }).join("")}<li class="mcart__sum"><span>Totalt</span><b>${kr(total)}</b></li></ul>
<p class="mcart__ship">${total >= SHOP.freeShip
      ? "Fri frakt, ordern ligger över " + kr(SHOP.freeShip) + "."
      : "Kvar till fri frakt: " + kr(SHOP.freeShip - total) + "."}</p>
<a class="mcart__go" href="${esc(SHOP.site)}" target="_blank" rel="noopener">Slutför köpet hos pp-pingis.se</a>`;
    $$("[data-remove]", body).forEach(b => b.addEventListener("click", () => {
      state.cart = state.cart.filter(l => l.id !== b.dataset.remove);
      renderCart();
      say("Varan togs bort ur varukorgen.");
    }));
  }
  function wireCart() {
    // Alla [data-cart-toggle] som pekar på samma panel hanteras som en grupp.
    // Lyssnarna på document kopplas EN gång totalt, annars ser den ena knappens
    // lyssnare den andras klick som ett klick utanför och stänger direkt.
    const panels = new Map();
    $$("[data-cart-toggle]").forEach(t => {
      const panel = document.getElementById(t.getAttribute("aria-controls") || "");
      if (!panel) return;
      if (!panels.has(panel)) panels.set(panel, []);
      panels.get(panel).push(t);
      t.addEventListener("click", () => setOpen(panel, panel.hidden, t, true));
    });

    function setOpen(panel, open, opener, moveFocus) {
      const group = panels.get(panel) || [];
      panel.hidden = !open;
      group.forEach(t => t.setAttribute("aria-expanded", open ? "true" : "false"));
      if (open) {
        panel.dataset.opener = String(Array.prototype.indexOf.call(
          document.querySelectorAll("[data-cart-toggle]"), opener));
        const f = panel.querySelector("button, a");
        if (f) f.focus();
      } else if (moveFocus) {
        const i = Number(panel.dataset.opener);
        const all = document.querySelectorAll("[data-cart-toggle]");
        const back = (Number.isInteger(i) && all[i]) || group[0];
        if (back) back.focus();
      }
    }

    document.addEventListener("keydown", e => {
      if (e.key !== "Escape") return;
      for (const panel of panels.keys()) {
        if (!panel.hidden) { setOpen(panel, false, null, true); return; }
      }
    });
    document.addEventListener("click", e => {
      for (const [panel, group] of panels) {
        if (panel.hidden) continue;
        if (panel.contains(e.target) || group.some(t => t.contains(e.target))) continue;
        setOpen(panel, false, null, false);
      }
    });
  }

  /* ---------- byte mellan förslagen ---------- */
  function buildVariants() {
    $$("[data-variants]").forEach(nav => {
      const here = location.pathname.split("/").pop() || "index.html";
      nav.innerHTML = M.variants.map(v =>
        `<a class="mvar${v.file === here ? " is-here" : ""}" href="${v.file}"${v.file === here ? ' aria-current="page"' : ""}>
           <b class="mvar__b">${v.tag}</b><span class="mvar__s">${v.name}</span></a>`
      ).join("");
    });
  }

  /* ---------- start ---------- */
  function init() {
    buildVariants();
    buildChips();
    const s = $("[data-search]");
    if (s) s.addEventListener("input", () => { state.q = s.value; render(); });
    wireCart();
    renderCart();
    render();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
