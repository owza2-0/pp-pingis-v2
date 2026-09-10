/* PP PINGIS — SPA */
(() => {
"use strict";

const PRODUCTS = window.PP_DATA || [];
const BY_ID = new Map(PRODUCTS.map(p => [p.id, p]));
const FREE_SHIP = 1249;
const HERO_ID = "69980"; // Donic Waldner OFF World Champion 89

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const app = $("#app");

const fmt = new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 });
const kr = n => fmt.format(n) + " kr";
const img = (base, size = "") => `assets/img/${base}${size}.webp`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------------- cart ---------------- */
const CART_KEY = "pp-cart-v1";
let cart = [];
try { cart = JSON.parse(localStorage.getItem(CART_KEY) || "[]"); } catch { cart = []; }

const saveCart = () => localStorage.setItem(CART_KEY, JSON.stringify(cart));
const cartCount = () => cart.reduce((n, i) => n + i.qty, 0);
const cartTotal = () => cart.reduce((n, i) => n + i.qty * (BY_ID.get(i.id)?.price || 0), 0);

function addToCart(id, qty = 1, note = "") {
  const row = cart.find(i => i.id === id && (i.note || "") === note);
  if (row) row.qty += qty; else cart.push({ id, qty, ...(note ? { note } : {}) });
  saveCart(); renderCart();
  const p = BY_ID.get(id);
  toast(`${p ? p.name : "Produkten"} ligger i varukorgen`);
  bumpCartIcon();
}

function setQtyByIndex(idx, qty) {
  if (!cart[idx]) return;
  cart[idx].qty = qty;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  saveCart(); renderCart();
}

function bumpCartIcon() {
  const el = $("#cartToggle");
  el.animate(
    [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
    { duration: 350, easing: "cubic-bezier(.22,1,.36,1)" }
  );
}

function renderCart() {
  const n = cartCount();
  const badge = $("#cartCount");
  badge.hidden = n === 0;
  badge.textContent = n;
  $("#cartHeadCount").textContent = n ? `(${n})` : "";

  const items = $("#cartItems");
  const foot = $("#cartFoot");
  const ship = $("#cartShip");

  if (!cart.length) {
    items.innerHTML = `<div class="cart__empty"><b>Tomt här inne</b>Din varukorg väntar på sin första racket.</div>`;
    foot.innerHTML = "";
    ship.innerHTML = "";
    return;
  }

  items.innerHTML = cart.map((i, idx) => {
    const p = BY_ID.get(i.id);
    if (!p) return "";
    return `
    <div class="citem">
      <a class="citem__img" href="#/produkt/${p.id}"><img src="${img(p.imgs[0])}" alt="${esc(p.name)}" loading="lazy"></a>
      <div>
        <div class="citem__name">${esc(p.name)}</div>
        ${i.note ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--accent);margin:2px 0 4px;line-height:1.3;">✦ ${esc(i.note)}</div>` : ""}
        <div class="citem__price">${kr(p.price)} / st</div>
        <div class="citem__row">
          <span class="citem__qty">
            <button data-cdec="${idx}" aria-label="Minska">−</button>
            <output>${i.qty}</output>
            <button data-cinc="${idx}" aria-label="Öka">+</button>
          </span>
          <button class="citem__rm" data-crm="${idx}">Ta bort</button>
        </div>
      </div>
      <div class="citem__total">${kr(p.price * i.qty)}</div>
    </div>`;
  }).join("");

  items.onclick = e => {
    const dec = e.target.closest("[data-cdec]");
    const inc = e.target.closest("[data-cinc]");
    const rm = e.target.closest("[data-crm]");
    if (dec) {
      const idx = parseInt(dec.dataset.cdec, 10);
      setQtyByIndex(idx, (cart[idx]?.qty || 1) - 1);
    } else if (inc) {
      const idx = parseInt(inc.dataset.cinc, 10);
      setQtyByIndex(idx, (cart[idx]?.qty || 0) + 1);
    } else if (rm) {
      const idx = parseInt(rm.dataset.crm, 10);
      setQtyByIndex(idx, 0);
    }
  };

  const total = cartTotal();
  const left = Math.max(0, FREE_SHIP - total);
  const pct = Math.min(100, Math.round((total / FREE_SHIP) * 100));
  ship.innerHTML = left > 0
    ? `Lägg till <b style="color:var(--accent)">${kr(left)}</b> till för fri frakt<div class="cart__shipbar"><i style="width:${pct}%"></i></div>`
    : `<b style="color:var(--ok)">Fri frakt!</b> Din order kvalificerar sig.<div class="cart__shipbar"><i style="width:100%"></i></div>`;

  foot.innerHTML = `
    <div class="cart__totalrow"><span>Totalt (inkl. moms)</span><b>${kr(total)}</b></div>
    <div class="cart__actions">
      <button class="btn btn--accent btn--full" id="checkoutBtn">
        Skicka via e-post
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
      </button>
      <button class="btn btn--ghost btn--full" id="copyOrderBtn" type="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        Kopiera order till urklipp
      </button>
    </div>
    <div class="cart__help">
      Frågor eller telefonorder? <a href="tel:+46700316655">070-031 66 55</a>
    </div>`;

  $("#checkoutBtn").addEventListener("click", checkout);
  $("#copyOrderBtn").addEventListener("click", copyOrder);
}

function formatOrderText() {
  const lines = cart.map(i => {
    const p = BY_ID.get(i.id);
    const note = i.note ? `\n    ✦ Specialanpassning: ${i.note}` : "";
    return p ? `${i.qty} × ${p.name} — ${kr(p.price * i.qty)} (art.nr ${p.id})${note}` : "";
  }).filter(Boolean);
  return [
    "Beställning till PP-Pingis (info@pp-pingis.se):",
    "--------------------------------------------------",
    ...lines,
    "--------------------------------------------------",
    `Totalt: ${kr(cartTotal())} (inkl. moms)`,
    "",
    "Namn:",
    "Leveransadress:",
    "Telefon:",
    "Övriga önskemål (t.ex. greppform, svamptjocklek):"
  ].join("\n");
}

function copyOrder() {
  const text = formatOrderText();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      toast("Orderdetaljer kopierade till urklipp!");
    }).catch(() => fallbackCopy(text));
  } else {
    fallbackCopy(text);
  }
}

function fallbackCopy(text) {
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    document.execCommand("copy");
    toast("Orderdetaljer kopierade till urklipp!");
  } catch (err) {
    toast("Kunde inte kopiera automatiskt");
  }
  document.body.removeChild(ta);
}

function checkout() {
  const lines = cart.map(i => {
    const p = BY_ID.get(i.id);
    return p ? `${i.qty} × ${p.name} — ${kr(p.price * i.qty)} (art.nr ${p.id})` : "";
  }).filter(Boolean);
  const body = [
    "Hej PP-Pingis!",
    "",
    "Jag vill gärna beställa:",
    "",
    ...lines,
    "",
    `Totalt: ${kr(cartTotal())} (inkl. moms)`,
    "",
    "Mvh,"
  ].join("\n");
  location.href = `mailto:Info@pp-pingis.se?subject=${encodeURIComponent("Beställning via pp-pingis.se")}&body=${encodeURIComponent(body)}`;
}

/* drawers & modals */
const drawer = $("#cartDrawer"), scrim = $("#scrim"), mobMenu = $("#mobMenu");
function openCart() { closeMenu(); closeSearch(); renderCart(); drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); scrim.hidden = false; document.body.style.overflow = "hidden"; }
function closeCart() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); if (!mobMenu?.classList.contains("is-open")) { scrim.hidden = true; document.body.style.overflow = ""; } }

function openMenu() { closeCart(); closeSearch(); mobMenu?.classList.add("is-open"); mobMenu?.setAttribute("aria-hidden", "false"); scrim.hidden = false; document.body.style.overflow = "hidden"; $("#menuToggle")?.setAttribute("aria-expanded", "true"); }
function closeMenu() { mobMenu?.classList.remove("is-open"); mobMenu?.setAttribute("aria-hidden", "true"); if (!drawer.classList.contains("is-open")) { scrim.hidden = true; document.body.style.overflow = ""; } $("#menuToggle")?.setAttribute("aria-expanded", "false"); }

$("#cartToggle")?.addEventListener("click", openCart);
$("#cartClose")?.addEventListener("click", closeCart);
$("#menuToggle")?.addEventListener("click", () => mobMenu?.classList.contains("is-open") ? closeMenu() : openMenu());
$("#menuClose")?.addEventListener("click", closeMenu);
scrim?.addEventListener("click", () => { closeCart(); closeMenu(); });
mobMenu?.addEventListener("click", e => { if (e.target.closest("a")) closeMenu(); });

document.addEventListener("keydown", e => { if (e.key === "Escape") { closeCart(); closeMenu(); closeSearch(); closeLightbox(); } });

$("#cartItems").addEventListener("click", e => {
  const inc = e.target.closest("[data-inc]"), dec = e.target.closest("[data-dec]"), rm = e.target.closest("[data-rm]");
  if (inc) { const r = cart.find(i => i.id === inc.dataset.inc); setQty(inc.dataset.inc, (r?.qty || 0) + 1); }
  if (dec) { const r = cart.find(i => i.id === dec.dataset.dec); setQty(dec.dataset.dec, (r?.qty || 0) - 1); }
  if (rm) setQty(rm.dataset.rm, 0);
  if (e.target.closest(".citem__img")) closeCart();
});

/* ---------------- toast ---------------- */
let toastTimer;
function toast(msg) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.add("is-show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-show"), 2600);
}

/* ---------------- search ---------------- */
const searchbar = $("#searchbar"), searchInput = $("#searchInput"), searchResults = $("#searchResults");
function openSearch() { searchbar.hidden = false; searchInput.focus(); }
function closeSearch() { searchbar.hidden = true; searchInput.value = ""; searchResults.innerHTML = ""; }
$("#searchToggle").addEventListener("click", () => searchbar.hidden ? openSearch() : closeSearch());

searchInput.addEventListener("input", () => {
  const q = searchInput.value.trim().toLowerCase();
  if (q.length < 2) { searchResults.innerHTML = ""; return; }
  const hits = PRODUCTS.filter(p =>
    p.name.toLowerCase().includes(q) ||
    (p.brand || "").toLowerCase().includes(q) ||
    p.kind.toLowerCase().includes(q)
  ).slice(0, 8);
  searchResults.innerHTML = hits.length
    ? hits.map(p => `
      <a class="searchbar__hit" href="#/produkt/${p.id}">
        <img src="${img(p.imgs[0])}" alt="" loading="lazy">
        <span class="n">${esc(p.name)}</span>
        <span class="p">${kr(p.price)}</span>
      </a>`).join("")
    : `<div class="mono-label" style="padding:14px 12px">Inga träffar på ”${esc(q)}”</div>`;
});

searchInput.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    const q = searchInput.value.trim();
    if (q) {
      closeSearch();
      location.hash = `#/butik?q=${encodeURIComponent(q)}`;
    }
  }
});
searchResults.addEventListener("click", e => { if (e.target.closest("a")) closeSearch(); });

/* ---------------- lightbox ---------------- */
const lightbox = $("#lightboxModal"), lightboxImg = $("#lightboxImg"), lightboxCaption = $("#lightboxCaption");
function openLightbox(src, alt = "") {
  if (!lightbox) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  if (lightboxCaption) lightboxCaption.textContent = alt;
  lightbox.hidden = false;
  lightbox.setAttribute("aria-hidden", "false");
  lightbox.classList.add("is-open");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  if (!lightbox || lightbox.hidden) return;
  lightbox.classList.remove("is-open");
  lightbox.hidden = true;
  lightbox.setAttribute("aria-hidden", "true");
  if (!drawer.classList.contains("is-open")) {
    document.body.style.overflow = "";
  }
}
$("#lightboxClose")?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", e => {
  if (e.target === lightbox || e.target.classList.contains("lightbox__content")) {
    closeLightbox();
  }
});

/* ---------------- shared fragments & spec parser ---------------- */
const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg>`;
const bagSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/><path d="M12 12v5m-2.5-2.5h5" stroke-linecap="round"/></svg>`;

function parseSpecs(desc) {
  if (!desc) return { cleanDesc: "", stats: [], badges: [] };
  const lines = desc.split("\n");
  const kept = [];
  const stats = [];
  const badges = [];

  const statRegex = /^(?:[-*•]\s*)?(Fart|Kontroll|Skruv|Spin|Hårdhet|Vikt)\s*[:：]\s*(.+)$/i;

  for (const line of lines) {
    const trimmed = line.trim();
    const m = trimmed.match(statRegex);
    if (m) {
      const key = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      let val = m[2].trim();
      if (["Fart", "Kontroll", "Skruv", "Spin"].includes(key)) {
        let pct = 50;
        const slashM = val.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)/);
        if (slashM) {
          pct = Math.min(100, Math.round((parseFloat(slashM[1]) / parseFloat(slashM[2])) * 100));
        } else {
          const numM = val.match(/^(\d+(?:\.\d+)?)\s*(\+{1,2}|-)?/);
          if (numM) {
            let base = parseFloat(numM[1]);
            if (base <= 12) {
              let score = base;
              if (numM[2] === "+") score += 0.3;
              if (numM[2] === "++") score += 0.6;
              if (numM[2] === "-") score -= 0.3;
              pct = Math.min(100, Math.round((score / 10.5) * 100));
            } else if (base <= 100) {
              pct = Math.min(100, Math.round(base));
            }
          }
        }
        stats.push({ key: key === "Spin" ? "Skruv" : key, val, pct });
      } else {
        if (val && val !== "gram" && !/^ca:?\s*gram$/i.test(val)) {
          badges.push({ key, val });
        }
      }
    } else {
      kept.push(line);
    }
  }

  const cleanDesc = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return { cleanDesc, stats, badges };
}

function productCard(p, i = 0) {
  const hot = p.price >= 900 && p.stock && ["Stommar", "Gummiplattor", "Färdiga racketar"].includes(p.kind);
  return `
  <article class="pcard reveal" style="transition-delay:${Math.min(i % 8, 6) * 45}ms">
    <a class="pcard__imgwrap" href="#/produkt/${p.id}" aria-label="${esc(p.name)}">
      <span class="pcard__badges">
        ${p.stock ? "" : `<span class="badge badge--out">Slutsåld</span>`}
        ${hot ? `<span class="badge badge--hot">Pro</span>` : ""}
      </span>
      <img src="${img(p.imgs[0])}" srcset="${img(p.imgs[0])} 1x, ${img(p.imgs[0], "@2x")} 2x" alt="${esc(p.name)}" loading="lazy">
    </a>
    <button class="pcard__quick" data-add="${p.id}" aria-label="Lägg ${esc(p.name)} i varukorg" ${p.stock ? "" : "disabled"}>${bagSvg}</button>
    <div class="pcard__body">
      <div class="pcard__brand">${esc(p.brand || p.kind)}</div>
      <a href="#/produkt/${p.id}"><h3 class="pcard__name">${esc(p.name)}</h3></a>
      <div class="pcard__foot">
        <span class="pcard__price">${kr(p.price)}</span>
        <span class="pcard__stock ${p.stock ? "" : "pcard__stock--out"}"><i></i>${p.stock ? "I lager" : "Slut"}</span>
      </div>
    </div>
  </article>`;
}

function bindQuickAdd(root = document) {
  $$("[data-add]", root).forEach(btn =>
    btn.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); addToCart(btn.dataset.add); })
  );
}

/* ---------------- reveal on scroll ---------------- */
let observer;
function observeReveals() {
  observer?.disconnect();
  observer = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("is-in"); observer.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  $$(".reveal").forEach(el => observer.observe(el));
}

/* ---------------- views ---------------- */
const KIND_ORDER = ["Stommar", "Gummiplattor", "Färdiga racketar", "Bollar", "Bord & nät", "Robotar", "Kläder & skor", "Väskor & fodral", "Racketvård & lim", "Tillbehör"];
const kindCount = k => PRODUCTS.filter(p => p.kind === k).length;

const CATEGORY_GROUPS = [
  { id: "all", name: "Alla produkter", kinds: [] },
  { id: "rackets", name: "Stommar & Gummi", kinds: ["Stommar", "Gummiplattor"], desc: "Pro-stommar & tävlingsgummin för maximal fart, känsla och spinn.", wide: true },
  { id: "complete", name: "Färdiga Racketar", kinds: ["Färdiga racketar"], desc: "Kvalitetsmonterade racketar för både motion och seriespel, klara ur kartong." },
  { id: "training", name: "Bollar & Träning", kinds: ["Bollar", "Bord & nät", "Robotar"], desc: "3-stjärniga tävlingsbollar, bollrobotar, nät och bord för hall och hemma." },
  { id: "apparel", name: "Kläder & Väskor", kinds: ["Kläder & skor", "Väskor & fodral"], desc: "Spelartröjor, shorts, greppvänliga skor och vadderade racketväskor." },
  { id: "care", name: "Vård & Tillbehör", kinds: ["Racketvård & lim", "Tillbehör"], desc: "VOC-fritt lim, rengöringsskum, grepplindor, kantskydd och tillbehör." }
];

const HOME_CATEGORIES = CATEGORY_GROUPS.filter(g => g.id !== "all");
const groupCount = kinds => PRODUCTS.filter(p => kinds.includes(p.kind)).length;

function homeView() {
  const hero = BY_ID.get(HERO_ID);
  const featured = PRODUCTS.filter(p => p.stock && p.price >= 400 && ["Stommar", "Gummiplattor", "Färdiga racketar", "Robotar"].includes(p.kind))
    .sort((a, b) => b.price - a.price).slice(0, 8);
  const deals = PRODUCTS.filter(p => p.stock && p.cats.some(c => /utförsäljning|rabatt|extrapris/i.test(c)))
    .sort((a, b) => b.price - a.price).slice(0, 4);
  const brands = [...new Set(PRODUCTS.map(p => p.brand).filter(Boolean))]
    .map(b => ({ b, n: PRODUCTS.filter(p => p.brand === b).length }))
    .sort((a, b) => b.n - a.n);
  const marqueeItems = ["Fri frakt över 1 249 kr", "Yasaka", "Donic", "Gewo", "Tibhar", "Snabba leveranser", "Personlig service", "Joola", "Andro", "Nittaku"];

  const catTiles = HOME_CATEGORIES.map((cat, i) => {
    const totalInCat = groupCount(cat.kinds);
    const subPills = cat.kinds.map(k => `<span class="cattile__pill">${esc(k)} <small>${kindCount(k)}</small></span>`).join("");
    return `
    <a class="cattile reveal ${cat.wide ? "cattile--wide" : ""}" style="transition-delay:${i * 65}ms" href="#/butik?group=${cat.id}">
      <div class="cattile__top">
        <span class="cattile__badge mono-label">${totalInCat} produkter</span>
        <span class="cattile__arrow" aria-hidden="true">${arrowSvg}</span>
      </div>
      <div class="cattile__body">
        <h3 class="cattile__name">${esc(cat.name)}</h3>
        <p class="cattile__desc">${esc(cat.desc)}</p>
        <div class="cattile__pills">${subPills}</div>
      </div>
    </a>`;
  }).join("");

  return `
  <div class="view">
    <section class="hero">
      <div class="hero__copy">
        <div class="mono-label">Bordtennisbutik · Garphyttan, Örebro</div>
        <h1 class="hero__title display">
          <span class="row"><span>Precision.</span></span>
          <span class="row"><span>Spinn.</span></span>
          <span class="row"><span><em>Speed.</em></span></span>
        </h1>
        <p class="hero__sub">Stommar, gummi och racketar från världens bästa märken — handplockade av folk som själva står vid bordet. Allt i lager, allt på riktigt.</p>
        <div class="hero__ctas">
          <a class="btn btn--accent" href="#/butik">Shoppa allt ${arrowSvg}</a>
          <a class="btn btn--ghost" href="#/bygg-racket"><span style="color:var(--accent)">✦</span> Bygg racket i 3D</a>
        </div>
        <div class="hero__meta">
          <div><b>${PRODUCTS.length}+</b><span>Produkter</span></div>
          <div><b>${brands.length}</b><span>Varumärken</span></div>
          <div><b>1 249 kr</b><span>Fri frakt över</span></div>
        </div>
      </div>
      <div class="hero__stage">
        <div class="hero__ring"></div>
        <div class="hero__panel" id="heroPanel">
          <div class="hero__canvas3d" id="hero3dContainer" title="Dra för att rotera racket i 3D"></div>
          <img class="hero__product" id="heroProduct" src="assets/img/hero.pic.webp" alt="${esc(hero.name)}">
        </div>
        <div class="hero__tools">
          <button class="btn-tool" id="heroFlipBtn" title="Vänd racket (Forehand / Backhand)" type="button">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v-3a4 4 0 0 1 4-4h12M16 1 20 5l-4 4M20 12v3a4 4 0 0 1-4 4H4M8 23l-4-4 4-4"/></svg>
            <span>Vänd</span>
          </button>
          <a class="btn-tool btn-tool--accent" href="#/bygg-racket" title="Öppna 3D Racketverkstad">
            <span>Bygg 3D</span>
            <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          </a>
        </div>
        <a class="hero__tag" href="#/produkt/${hero.id}">
          <div class="mono-label">Månadens stomme</div>
          <div class="n">${esc(hero.name)}</div>
          <div class="p">${kr(hero.price)}</div>
        </a>
      </div>
    </section>

    <div class="marquee" aria-hidden="true">
      <div class="marquee__track">
        ${[0, 1].map(() => marqueeItems.map((t, i) =>
          `<span class="marquee__item ${i % 3 === 1 ? "marquee__item--hollow" : ""}">${t}<i></i></span>`).join("")).join("")}
      </div>
    </div>

    <section class="section wrap">
      <div class="section__head reveal">
        <h2 class="section__title display">Handla per <em>kategori</em></h2>
        <a class="section__link" href="#/butik">Visa allt ${arrowSvg}</a>
      </div>
      <div class="catgrid">${catTiles}</div>
    </section>

    <section class="section wrap">
      <div class="section__head reveal">
        <h2 class="section__title display">Hetast <em>just nu</em></h2>
        <a class="section__link" href="#/butik">Hela butiken ${arrowSvg}</a>
      </div>
      <div class="pgrid">${featured.map(productCard).join("")}</div>
    </section>

    <div class="usps wrap reveal" style="padding-inline:0; max-width:1560px;">
      <div class="usp">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 7h11v10H3zM14 10h4l3 3v4h-7z"/><circle cx="7" cy="17" r="1.6"/><circle cx="17" cy="17" r="1.6"/></svg>
        <div><h3>Fri frakt över 1 249 kr</h3><p>PostNord eller Instabox — spårbart hela vägen till dörren.</p></div>
      </div>
      <div class="usp">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5z"/></svg>
        <div><h3>Skickas inom 24 h</h3><p>Lagerförda varor lämnar Garphyttan samma eller nästa vardag.</p></div>
      </div>
      <div class="usp">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 21s-7.5-4.6-9.3-9.2C1.4 8.6 3.4 5.5 6.6 5.5c2 0 3.7 1.2 4.4 2.9.7-1.7 2.4-2.9 4.4-2.9 3.2 0 5.2 3.1 3.9 6.3C19.5 16.4 12 21 12 21Z"/></svg>
        <div><h3>Riktig pingiskunskap</h3><p>Ring 070-031 66 55 — här svarar någon som vet vad tjock svamp gör.</p></div>
      </div>
    </div>

    ${deals.length ? `
    <section class="section wrap">
      <div class="section__head reveal">
        <h2 class="section__title display">På <em>rea</em></h2>
        <a class="section__link" href="#/butik?sort=price-asc">Fynda fler ${arrowSvg}</a>
      </div>
      <div class="pgrid">${deals.map(productCard).join("")}</div>
    </section>` : ""}

    <section class="section wrap">
      <div class="section__head reveal">
        <h2 class="section__title display">Våra <em>märken</em></h2>
      </div>
      <div class="brands reveal">
        ${brands.map(({ b, n }) => `<a class="brandchip" href="#/butik?brand=${encodeURIComponent(b)}">${esc(b)}<small>${n}</small></a>`).join("")}
      </div>
    </section>
  </div>`;
}

/* ---------------- shop ---------------- */
let shopState = { group: "all", kind: "", brand: "", q: "", sort: "pop" };

function shopView(params) {
  const initialKind = params.get("kind") || "";
  const initialGroup = params.get("group") || "";
  
  let activeGroup = "all";
  if (initialGroup) {
    activeGroup = initialGroup;
  } else if (initialKind) {
    const parentGroup = CATEGORY_GROUPS.find(g => g.kinds.includes(initialKind));
    if (parentGroup) activeGroup = parentGroup.id;
  }

  shopState = {
    group: activeGroup,
    kind: initialKind,
    brand: params.get("brand") || "",
    q: params.get("q") || "",
    sort: params.get("sort") || "pop",
    inStock: params.get("stock") === "1",
  };
  const brands = [...new Set(PRODUCTS.map(p => p.brand).filter(Boolean))].sort();

  app.innerHTML = `
  <div class="view shop wrap">
    <div class="shop__head">
      <div class="mono-label">Butiken</div>
      <h1 class="shop__title display">${shopState.kind ? esc(shopState.kind) : shopState.brand ? esc(shopState.brand) : "Alla <em style='font-style:italic;font-weight:300;color:var(--accent)'>prylar</em>"}</h1>
      <div class="shop__count mono-label" id="shopCount"></div>
    </div>
  </div>
  <div class="filters">
    <div class="wrap">
      <div class="filters__groups" role="tablist" aria-label="Huvudkategorier">
        ${CATEGORY_GROUPS.map(g => {
          const count = g.id === "all" ? PRODUCTS.length : groupCount(g.kinds);
          return `
          <button class="group-tab ${g.id === shopState.group ? "is-active" : ""}" data-group="${g.id}" role="tab" aria-selected="${g.id === shopState.group}">
            ${esc(g.name)} <span class="group-tab__count">${count}</span>
          </button>`;
        }).join("")}
      </div>
      <div class="filters__row">
        <div class="filters__chips" id="filtersChips"></div>
        <div class="filters__controls">
          <button class="chip chip--toggle ${shopState.inStock ? "is-on" : ""}" id="stockFilterBtn" type="button" aria-pressed="${shopState.inStock}">
            <span class="chip__dot"></span> Endast i lager
          </button>
          <input class="filters__search" type="search" id="shopSearch" placeholder="Filtrera …" value="${esc(shopState.q)}" aria-label="Filtrera produkter">
          <select class="filters__select" id="brandSelect" aria-label="Varumärke">
            <option value="">Alla märken</option>
            ${brands.map(b => `<option ${b === shopState.brand ? "selected" : ""}>${esc(b)}</option>`).join("")}
          </select>
          <select class="filters__select" id="sortSelect" aria-label="Sortera">
            <option value="pop">Populärast</option>
            <option value="price-asc">Pris: lägst först</option>
            <option value="price-desc">Pris: högst först</option>
            <option value="name">Namn A–Ö</option>
          </select>
        </div>
      </div>
    </div>
  </div>
  <div class="wrap shop__grid">
    <div class="pgrid" id="shopGrid"></div>
    <div class="shop__empty" id="shopEmpty" hidden>
      <b>Inget här</b>
      Testa en annan kategori eller rensa filtren.
    </div>
  </div>`;

  $("#sortSelect").value = shopState.sort;

  function renderSubChips() {
    const activeGroup = CATEGORY_GROUPS.find(g => g.id === shopState.group) || CATEGORY_GROUPS[0];
    const subKinds = activeGroup.id === "all" 
      ? KIND_ORDER.filter(k => kindCount(k) > 0)
      : activeGroup.kinds.filter(k => kindCount(k) > 0);
      
    const container = $("#filtersChips");
    if (!container) return;
    
    const totalGroupCount = activeGroup.id === "all" 
      ? PRODUCTS.length 
      : groupCount(activeGroup.kinds);

    container.innerHTML = `
      <button class="chip ${shopState.kind === "" ? "is-on" : ""}" data-kind="" aria-pressed="${shopState.kind === ""}">
        Visa alla <small class="chip__count">${totalGroupCount}</small>
      </button>
      ${subKinds.map(k => `
        <button class="chip ${shopState.kind === k ? "is-on" : ""}" data-kind="${esc(k)}" aria-pressed="${shopState.kind === k}">
          ${esc(k)} <small class="chip__count">${kindCount(k)}</small>
        </button>
      `).join("")}
    `;
    
    $$(".chip", container).forEach(c => {
      c.addEventListener("click", () => {
        const k = c.dataset.kind;
        shopState.kind = k;
        $$(".chip", container).forEach(x => {
          const active = x === c;
          x.classList.toggle("is-on", active);
          x.setAttribute("aria-pressed", active);
        });
        renderShopGrid();
        
        let url = shopState.group === "all" ? `#/butik` : `#/butik?group=${shopState.group}`;
        if (k) url += `${url.includes("?") ? "&" : "?"}kind=${encodeURIComponent(k)}`;
        if (shopState.brand) url += `${url.includes("?") ? "&" : "?"}brand=${encodeURIComponent(shopState.brand)}`;
        if (shopState.inStock) url += `${url.includes("?") ? "&" : "?"}stock=1`;
        history.replaceState(null, "", url);
      });
    });
  }

  renderSubChips();

  $$(".group-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const gId = tab.dataset.group;
      shopState.group = gId;
      shopState.kind = ""; // Clear sub-category when switching groups
      
      $$(".group-tab").forEach(t => {
        const active = t === tab;
        t.classList.toggle("is-active", active);
        t.setAttribute("aria-selected", active);
      });
      renderSubChips();
      renderShopGrid();
      
      let url = gId === "all" ? `#/butik` : `#/butik?group=${gId}`;
      if (shopState.brand) url += `${url.includes("?") ? "&" : "?"}brand=${encodeURIComponent(shopState.brand)}`;
      if (shopState.inStock) url += `${url.includes("?") ? "&" : "?"}stock=1`;
      history.replaceState(null, "", url);
    });
  });

  const stockBtn = $("#stockFilterBtn");
  stockBtn?.addEventListener("click", () => {
    shopState.inStock = !shopState.inStock;
    stockBtn.classList.toggle("is-on", shopState.inStock);
    stockBtn.setAttribute("aria-pressed", shopState.inStock);
    renderShopGrid();

    let url = `#/butik?group=${shopState.group}`;
    if (shopState.kind) url += `&kind=${encodeURIComponent(shopState.kind)}`;
    if (shopState.brand) url += `&brand=${encodeURIComponent(shopState.brand)}`;
    if (shopState.inStock) url += `&stock=1`;
    history.replaceState(null, "", url);
  });

  $("#brandSelect").addEventListener("change", e => {
    shopState.brand = e.target.value;
    renderShopGrid();
    let url = `#/butik?group=${shopState.group}`;
    if (shopState.kind) url += `&kind=${encodeURIComponent(shopState.kind)}`;
    if (shopState.brand) url += `&brand=${encodeURIComponent(shopState.brand)}`;
    if (shopState.inStock) url += `&stock=1`;
    history.replaceState(null, "", url);
  });
  $("#sortSelect").addEventListener("change", e => { shopState.sort = e.target.value; renderShopGrid(); });
  $("#shopSearch").addEventListener("input", e => { shopState.q = e.target.value; renderShopGrid(); });

  renderShopGrid();
}

function renderShopGrid() {
  const activeGroup = CATEGORY_GROUPS.find(g => g.id === shopState.group) || CATEGORY_GROUPS[0];

  let list = PRODUCTS.filter(p =>
    (activeGroup.id === "all" || activeGroup.kinds.includes(p.kind)) &&
    (!shopState.kind || p.kind === shopState.kind) &&
    (!shopState.brand || p.brand === shopState.brand) &&
    (!shopState.inStock || p.stock) &&
    (!shopState.q || (p.name + " " + (p.brand || "") + " " + p.kind).toLowerCase().includes(shopState.q.toLowerCase()))
  );
  if (shopState.sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
  if (shopState.sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);
  if (shopState.sort === "name") list = [...list].sort((a, b) => a.name.localeCompare(b.name, "sv"));
  if (shopState.sort === "pop") {
    const w = k => KIND_ORDER.indexOf(k);
    list = [...list].sort((a, b) => Number(b.stock) - Number(a.stock) || w(a.kind) - w(b.kind) || b.price - a.price);
  }

  $("#shopCount").textContent = `${list.length} produkter`;
  $("#shopEmpty").hidden = list.length > 0;
  $("#shopGrid").innerHTML = list.map(productCard).join("");
  bindQuickAdd($("#shopGrid"));
  $$("#shopGrid .reveal").forEach(el => el.classList.add("is-in"));

  // Dynamic page title update based on current category selection
  const titleEl = $(".shop__title");
  if (titleEl) {
    if (shopState.kind) {
      titleEl.innerHTML = esc(shopState.kind);
    } else if (activeGroup.id !== "all") {
      titleEl.innerHTML = esc(activeGroup.name);
    } else if (shopState.brand) {
      titleEl.innerHTML = esc(shopState.brand);
    } else {
      titleEl.innerHTML = "Alla <em style='font-style:italic;font-weight:300;color:var(--accent)'>prylar</em>";
    }
  }
}

/* ---------------- product detail ---------------- */
function productView(id) {
  const p = BY_ID.get(id);
  if (!p) { location.hash = "#/butik"; return; }
  const related = PRODUCTS.filter(x => x.id !== id && (x.kind === p.kind || x.brand === p.brand))
    .sort((a, b) => Number(b.stock) - Number(a.stock) || b.price - a.price).slice(0, 4);
  document.title = `${p.name} — PP PINGIS`;
  const { cleanDesc, stats, badges } = parseSpecs(p.desc);
  const parentGroup = CATEGORY_GROUPS.find(g => g.kinds.includes(p.kind));
  const groupCrumb = parentGroup ? `<a href="#/butik?group=${parentGroup.id}">${esc(parentGroup.name)}</a> / ` : "";

  app.innerHTML = `
  <div class="view pdp wrap">
    <nav class="pdp__crumbs mono-label" aria-label="Brödsmulor">
      <a href="#/">Hem</a> / <a href="#/butik">Butik</a> / ${groupCrumb}<a href="#/butik?group=${parentGroup ? parentGroup.id : 'all'}&kind=${encodeURIComponent(p.kind)}">${esc(p.kind)}</a> / <span style="color:var(--ink-dim)">${esc(p.name)}</span>
    </nav>
    <div class="pdp__grid">
      <div class="pdp__gallery">
        <div class="pdp__main" id="pdpMainWrap" role="button" tabindex="0" title="Klicka för att förstora bild">
          <img id="pdpMain" src="${img(p.imgs[0], "@2x")}" alt="${esc(p.name)}">
          <span class="pdp__zoom-hint">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/><path d="M11 8v6M8 11h6"/></svg>
            Förstora
          </span>
        </div>
        ${p.imgs.length > 1 ? `<div class="pdp__thumbs">
          ${p.imgs.map((im, i) => `<button class="pdp__thumb ${i === 0 ? "is-on" : ""}" data-img="${im}"><img src="${img(im)}" alt="Bild ${i + 1}"></button>`).join("")}
        </div>` : ""}
      </div>
      <div>
        <div class="pdp__brand">${esc(p.brand || "PP Pingis")}</div>
        <h1 class="pdp__name">${esc(p.name)}</h1>
        <div class="pdp__pricerow">
          <span class="pdp__price">${kr(p.price)}</span>
          <span class="pdp__vat">inkl. moms</span>
        </div>
        <div class="pdp__stock ${p.stock ? "" : "pdp__stock--out"}"><i></i>${p.stock ? "I lager — skickas inom 24 h" : "Tillfälligt slut"}</div>
        ${cleanDesc ? `<p class="pdp__desc">${esc(cleanDesc)}</p>` : ""}

        ${stats.length || badges.length ? `
        <div class="pdp__pro-stats">
          <div class="mono-label pdp__pro-title">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m12 16 4-4-4-4m-4 4h8"/></svg>
            Tekniska Pro-Egenskaper
          </div>
          ${stats.length ? `
            <div class="pdp__statbars">
              ${stats.map(s => `
                <div class="pdp__statbar">
                  <div class="pdp__statlabel">
                    <span>${esc(s.key)}</span>
                    <b>${esc(s.val)}</b>
                  </div>
                  <div class="pdp__statmeter">
                    <div class="pdp__statfill" style="width:${s.pct}%"></div>
                  </div>
                </div>
              `).join("")}
            </div>
          ` : ""}
          ${badges.length ? `
            <div class="pdp__statbadges">
              ${badges.map(b => `
                <span class="pdp__statbadge"><b>${esc(b.key)}:</b> ${esc(b.val)}</span>
              `).join("")}
            </div>
          ` : ""}
        </div>
        ` : ""}

        <div class="pdp__buyrow">
          <span class="qty">
            <button id="qtyDec" aria-label="Minska antal">−</button>
            <output id="qtyOut">1</output>
            <button id="qtyInc" aria-label="Öka antal">+</button>
          </span>
          <button class="btn btn--accent" id="pdpAdd" style="flex:1;justify-content:center" ${p.stock ? "" : "disabled"}>
            ${p.stock ? "Lägg i varukorg" : "Slutsåld"} ${p.stock ? bagSvg : ""}
          </button>
        </div>
        ${p.kind === "Stommar" ? `
        <a href="#/bygg-racket?blade=${p.id}" class="btn btn--ghost" style="width:100%;justify-content:center;margin-top:10px;margin-bottom:14px;gap:8px;font-size:13px;">
          <span style="color:var(--accent)">✦</span> Bygg komplett racket med denna stomme i 3D
        </a>` : ""}
        ${p.kind === "Gummiplattor" ? `
        <a href="#/bygg-racket?rubber=${p.id}" class="btn btn--ghost" style="width:100%;justify-content:center;margin-top:10px;margin-bottom:14px;gap:8px;font-size:13px;">
          <span style="color:var(--accent)">✦</span> Montera detta gummi i 3D-Racketverkstaden
        </a>` : ""}
        <div class="mono-label" style="margin-bottom:8px">Art.nr ${p.id} · Fri frakt över 1 249 kr</div>
        <dl class="pdp__specs">
          <div class="pdp__spec"><dt>Kategori</dt><dd>${esc(p.kind)}</dd></div>
          ${p.brand ? `<div class="pdp__spec"><dt>Varumärke</dt><dd>${esc(p.brand)}</dd></div>` : ""}
          <div class="pdp__spec"><dt>Lagerstatus</dt><dd>${p.stock ? "I lager" : "Slut i lager"}</dd></div>
          <div class="pdp__spec"><dt>Leverans</dt><dd>1–3 vardagar med PostNord / Instabox</dd></div>
        </dl>
      </div>
    </div>
  </div>
  ${related.length ? `
  <section class="section related wrap">
    <div class="section__head">
      <h2 class="section__title display">Passar <em>bra ihop</em></h2>
      <a class="section__link" href="#/butik?kind=${encodeURIComponent(p.kind)}">Fler ${esc(p.kind.toLowerCase())} ${arrowSvg}</a>
    </div>
    <div class="pgrid">${related.map(productCard).join("")}</div>
  </section>` : ""}`;

  // gallery & zoom
  let activeImg = p.imgs[0];
  const mainWrap = $("#pdpMainWrap");
  const main = $("#pdpMain");

  const openMainZoom = () => openLightbox(img(activeImg, "@2x"), p.name);
  mainWrap?.addEventListener("click", openMainZoom);
  mainWrap?.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openMainZoom(); } });

  $$(".pdp__thumb").forEach(t => t.addEventListener("click", () => {
    $$(".pdp__thumb").forEach(x => x.classList.toggle("is-on", x === t));
    activeImg = t.dataset.img;
    main.src = img(activeImg, "@2x");
    main.style.animation = "none"; void main.offsetWidth; main.style.animation = "";
  }));

  // qty + add
  let qty = 1;
  const out = $("#qtyOut");
  $("#qtyDec").addEventListener("click", () => { qty = Math.max(1, qty - 1); out.value = qty; });
  $("#qtyInc").addEventListener("click", () => { qty = Math.min(99, qty + 1); out.value = qty; });
  $("#pdpAdd")?.addEventListener("click", () => { addToCart(p.id, qty); openCart(); });

  bindQuickAdd(app);
  observeReveals();
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ---------------- 3D HERO RACKET ---------------- */
let hero3DInstance = null;

function initHero3D() {
  const container = $("#hero3dContainer");
  const fallbackImg = $("#heroProduct");
  const panel = $("#heroPanel");
  if (!container) return;

  if (matchMedia("(prefers-reduced-motion: reduce)").matches || !window.THREE || !window.PPRacket3D) {
    if (panel) panel.classList.add("hero__panel--2d");
    if (fallbackImg) fallbackImg.style.display = "block";
    heroParallaxFallback();
    return;
  }

  try {
    if (hero3DInstance) {
      hero3DInstance.dispose();
      hero3DInstance = null;
    }

    hero3DInstance = new PPRacket3D.RacketViewer({
      container: container,
      mode: "hero",
      bladeData: { name: "DONIC WALDNER OFF" },
      fhData: { name: "BLUESTAR A1", color: "red", colorHex: "#d62020", spongeColor: "#1b74f0" },
      bhData: { name: "BLUESTAR A2", color: "black", colorHex: "#18191c", spongeColor: "#1b74f0" },
      edgeTapeData: { name: "DONIC · PP-PINGIS" }
    });

    if (fallbackImg) fallbackImg.style.display = "none";
    if (panel) panel.classList.remove("hero__panel--2d");

    $("#heroFlipBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      hero3DInstance?.flipRacket();
    });
  } catch (err) {
    console.warn("3D initialization failed, using 2D fallback:", err);
    if (panel) panel.classList.add("hero__panel--2d");
    if (fallbackImg) fallbackImg.style.display = "block";
    heroParallaxFallback();
  }
}

function heroParallaxFallback() {
  const el = $("#heroProduct");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const stage = el.closest(".hero");
  if (!stage) return;
  stage.addEventListener("mousemove", e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.translate = `${x * 34}px ${y * 22}px`;
  });
  stage.addEventListener("mouseleave", () => { el.style.translate = "0 0"; });
}

/* ---------------- 3D RACKETVERKSTAD (CUSTOM STUDIO) ---------------- */
let workshop3DInstance = null;

function workshopView(params) {
  if (hero3DInstance) {
    hero3DInstance.dispose();
    hero3DInstance = null;
  }
  if (workshop3DInstance) {
    workshop3DInstance.dispose();
    workshop3DInstance = null;
  }

  const allBlades = PRODUCTS.filter(p => p.kind === "Stommar");
  const allRubbers = PRODUCTS.filter(p => p.kind === "Gummiplattor");
  const allTapes = PRODUCTS.filter(p => p.cats.includes("Kantband") || p.name.toLowerCase().includes("kantband"));

  const initialBladeId = params.get("blade") || HERO_ID;
  const initialRubberId = params.get("rubber");

  let selectedBlade = BY_ID.get(initialBladeId) || allBlades[0];
  let selectedFh = (initialRubberId && BY_ID.get(initialRubberId)) || allRubbers.find(r => r.name.includes("BlueStar A1")) || allRubbers[0];
  let selectedBh = allRubbers.find(r => r.name.includes("BlueStar A2")) || allRubbers[1] || allRubbers[0];
  let selectedTape = allTapes[0] || { id: "tape-0", name: "PP-Pingis Kantband 12mm", price: 0 };

  let currentStep = 1;
  let fhColor = "red";
  let fhThickness = "Max (2.2 mm)";
  let bhThickness = "2.0 mm";
  let gripType = "Konkav (Flared)";
  let freeAssembly = true;

  let bladeFilterBrand = "all";
  let fhFilterBrand = "all";
  let bhFilterBrand = "all";

  const RUBBER_COLORS = [
    { id: "red", name: "Röd (Klassisk)", hex: "#d62020", sponge: "#1b74f0" },
    { id: "blue", name: "Blå (Modern ITTF)", hex: "#1d61d8", sponge: "#ff6600" },
    { id: "pink", name: "Rosa (ITTF)", hex: "#e03380", sponge: "#ffaa00" },
    { id: "green", name: "Grön (ITTF)", hex: "#1ca04e", sponge: "#ff9900" },
    { id: "black", name: "Svart", hex: "#16171a", sponge: "#1b74f0" }
  ];

  function calcComboStats() {
    const bStats = parseSpecs(selectedBlade.desc).stats;
    const fStats = parseSpecs(selectedFh.desc).stats;
    const bhStats = parseSpecs(selectedBh.desc).stats;

    const getStat = (list, key, fallback) => {
      const s = list.find(x => x.key.toLowerCase() === key.toLowerCase());
      return s ? s.pct : fallback;
    };

    const bSpeed = getStat(bStats, "Fart", 85);
    const fSpeed = getStat(fStats, "Fart", 92);
    const bhSpeed = getStat(bhStats, "Fart", 88);

    const bCtrl = getStat(bStats, "Kontroll", 75);
    const fCtrl = getStat(fStats, "Kontroll", 65);
    const bhCtrl = getStat(bhStats, "Kontroll", 70);

    const fSpin = getStat(fStats, "Skruv", 95);
    const bhSpin = getStat(bhStats, "Skruv", 92);

    const totalSpeed = Math.round(bSpeed * 0.48 + fSpeed * 0.32 + bhSpeed * 0.2);
    const totalSpin = Math.round(fSpin * 0.55 + bhSpin * 0.45);
    const totalControl = Math.round(bCtrl * 0.55 + (fCtrl + bhCtrl) * 0.225);

    let bWeight = 85;
    const wMatch = selectedBlade.desc.match(/vikt[:\s]+(?:ca\.?\s*)?(\d+)/i);
    if (wMatch) bWeight = parseInt(wMatch[1], 10);
    const totalWeight = bWeight + 92 + 3;

    return {
      speed: { pct: totalSpeed, val: (totalSpeed / 10).toFixed(1) },
      spin: { pct: totalSpin, val: (totalSpin / 10).toFixed(1) },
      control: { pct: totalControl, val: (totalControl / 10).toFixed(1) },
      weight: { val: `${totalWeight} g`, pct: Math.min(100, Math.round((totalWeight / 220) * 100)) }
    };
  }

  function getBrands(items) {
    const set = new Set();
    items.forEach(i => { if (i.brand) set.add(i.brand); });
    return ["all", ...Array.from(set).sort()];
  }
  const bladeBrands = getBrands(allBlades);
  const rubberBrands = getBrands(allRubbers);

  app.innerHTML = `
  <div class="view workshop wrap">
    <div class="workshop__header">
      <nav class="mono-label pdp__crumbs" style="margin-bottom:14px;">
        <a href="#/">Hem</a> / <a href="#/butik?group=rackets">Stommar &amp; Gummi</a> / <span style="color:var(--ink-dim)">Racketverkstad 3D</span>
      </nav>
      <h1 class="workshop__title display">PP-Pingis <em>Racketverkstad</em></h1>
      <p class="workshop__lead">Skräddarsy ditt bordtennisracket i 3D. Välj stomme och applicera gummiplattor med valfri färg och svamptjocklek. Vi bjuder på professionell montering, limning med VOC-fritt tävlingslim och kantband!</p>
    </div>

    <div class="workshop__grid">
      <!-- 3D Studio Viewport -->
      <div class="workshop__stage-wrap">
        <div class="workshop__viewport">
          <div class="workshop__viewport-hint"><i></i><span>3D Studio · 360° vy</span></div>
          <div class="workshop__viewport-canvas" id="workshopCanvas" title="Dra för att rotera racket i 3D"></div>
          <div class="workshop__3d-tools">
            <button class="btn-tool" id="wsFlipBtn" type="button" title="Vänd racket">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v-3a4 4 0 0 1 4-4h12M16 1 20 5l-4 4M20 12v3a4 4 0 0 1-4 4H4M8 23l-4-4 4-4"/></svg>
              <span>Vänd</span>
            </button>
            <button class="btn-tool" id="wsExplodeBtn" type="button" title="Sprängskiss / Visa alla lager i 3D">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
              <span id="wsExplodeLabel">Lager</span>
            </button>
          </div>
        </div>

        <div class="workshop__stats-card" id="wsStatsCard"></div>
      </div>

      <!-- Configurator Controls -->
      <div class="workshop__controls">
        <div class="workshop__stepper" role="tablist">
          <button class="step-tab ${currentStep === 1 ? 'is-active' : ''}" data-step="1">
            <span class="step-tab__num">STEG 1</span>
            <span class="step-tab__title">🪵 Stomme</span>
          </button>
          <button class="step-tab ${currentStep === 2 ? 'is-active' : ''}" data-step="2">
            <span class="step-tab__num">STEG 2</span>
            <span class="step-tab__title">🔴 Forehand</span>
          </button>
          <button class="step-tab ${currentStep === 3 ? 'is-active' : ''}" data-step="3">
            <span class="step-tab__num">STEG 3</span>
            <span class="step-tab__title">⚫ Backhand</span>
          </button>
          <button class="step-tab ${currentStep === 4 ? 'is-active' : ''}" data-step="4">
            <span class="step-tab__num">STEG 4</span>
            <span class="step-tab__title">🔧 Montering</span>
          </button>
        </div>

        <div class="workshop__step-content" id="wsStepContent"></div>
      </div>
    </div>
  </div>`;

  // Init 3D Engine
  const container = $("#workshopCanvas");
  if (container && window.THREE && window.PPRacket3D) {
    const curFhColor = RUBBER_COLORS.find(c => c.id === fhColor) || RUBBER_COLORS[0];
    workshop3DInstance = new PPRacket3D.RacketViewer({
      container,
      mode: "studio",
      bladeData: { name: selectedBlade.name },
      fhData: { name: selectedFh.name, color: fhColor, colorHex: curFhColor.hex, spongeColor: curFhColor.sponge },
      bhData: { name: selectedBh.name, color: "black", colorHex: "#16171a", spongeColor: "#1b74f0" },
      edgeTapeData: { name: selectedTape.name || "PP-PINGIS" }
    });

    $("#wsFlipBtn")?.addEventListener("click", () => workshop3DInstance?.flipRacket());
    $("#wsExplodeBtn")?.addEventListener("click", () => {
      const active = workshop3DInstance?.toggleExplodedView();
      $("#wsExplodeBtn")?.classList.toggle("btn-tool--active", active);
      $("#wsExplodeLabel").textContent = active ? "Ihop" : "Lager";
    });
  }

  function renderStats() {
    const stats = calcComboStats();
    const el = $("#wsStatsCard");
    if (!el) return;
    el.innerHTML = `
      <div class="workshop__stats-head">
        <h4>Beräknade Spelegenskaper</h4>
        <span class="mono-label" style="color:var(--accent);display:inline-flex;align-items:center;gap:6px"><i style="width:7px;height:7px;border-radius:50%;background:var(--accent);box-shadow:0 0 8px var(--accent);display:inline-block;animation:pulseDot 2s infinite"></i>Pro-Kombination</span>
      </div>
      <div class="workshop__stats-grid">
        <div class="stat-box">
          <div class="stat-box__label"><span>Fart</span><b>${stats.speed.val}/10</b></div>
          <div class="stat-box__bar-bg"><div class="stat-box__bar-fill" data-target="${stats.speed.pct}" style="width:0%"></div></div>
        </div>
        <div class="stat-box">
          <div class="stat-box__label"><span>Skruv</span><b>${stats.spin.val}/10</b></div>
          <div class="stat-box__bar-bg"><div class="stat-box__bar-fill" data-target="${stats.spin.pct}" style="width:0%"></div></div>
        </div>
        <div class="stat-box">
          <div class="stat-box__label"><span>Kontroll</span><b>${stats.control.val}/10</b></div>
          <div class="stat-box__bar-bg"><div class="stat-box__bar-fill" data-target="${stats.control.pct}" style="width:0%"></div></div>
        </div>
        <div class="stat-box">
          <div class="stat-box__label"><span>Vikt ca</span><b>${stats.weight.val}</b></div>
          <div class="stat-box__bar-bg"><div class="stat-box__bar-fill" data-target="${stats.weight.pct}" style="width:0%"></div></div>
        </div>
      </div>
    `;

    // Animera barfyllningar med kort fördröjning
    requestAnimationFrame(() => {
      setTimeout(() => {
        el.querySelectorAll(".stat-box__bar-fill").forEach(bar => {
          bar.style.width = bar.dataset.target + "%";
        });
      }, 60);
    });
  }

  function setStep(newStep) {
    currentStep = newStep;
    $$(".step-tab").forEach(tab => {
      tab.classList.toggle("is-active", parseInt(tab.dataset.step, 10) === currentStep);
    });

    // Auto-vrid 3D-racketen om man går till backhand
    if (currentStep === 3 && !workshop3DInstance?.isFlipped) {
      workshop3DInstance?.flipRacket();
    } else if ((currentStep === 1 || currentStep === 2) && workshop3DInstance?.isFlipped) {
      workshop3DInstance?.flipRacket();
    }

    // Animerad steg-transition
    const content = $("#wsStepContent");
    if (content) {
      content.classList.add("is-fading");
      setTimeout(() => {
        renderStepContent();
        content.classList.remove("is-fading");
        content.classList.add("is-entering");
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            content.classList.remove("is-entering");
          });
        });
      }, 150);
    } else {
      renderStepContent();
    }
  }

  function renderStepContent() {
    const content = $("#wsStepContent");
    if (!content) return;

    if (currentStep === 1) {
      // STEG 1: STOMME
      const filteredBlades = bladeFilterBrand === "all" ? allBlades : allBlades.filter(b => b.brand === bladeFilterBrand);
      content.innerHTML = `
        <div class="step-sec__head">
          <div>
            <h3>Välj Stomme (Träblad)</h3>
            <p>Stommen är rackets ryggrad och avgör grundfart, styvhet och vibrationskänsla.</p>
          </div>
          <span class="mono-label">${filteredBlades.length} stommar</span>
        </div>

        <div class="workshop__subfilter">
          ${bladeBrands.map(b => `
            <button class="wchip ${bladeFilterBrand === b ? 'is-active' : ''}" data-bfilter="${b}">
              ${b === "all" ? "Alla märken" : b}
            </button>
          `).join("")}
        </div>

        <div class="workshop__cards-grid">
          ${filteredBlades.map(b => {
            const isSel = b.id === selectedBlade.id;
            const sp = parseSpecs(b.desc).stats;
            const fSpeed = sp.find(s => s.key === "Fart")?.val;
            const fCtrl = sp.find(s => s.key === "Kontroll")?.val;
            return `
            <div class="wcard ${isSel ? 'is-selected' : ''}" data-blade-id="${b.id}">
              <div class="wcard__check">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="wcard__imgwrap">
                <img src="${img(b.imgs[0])}" alt="${esc(b.name)}" loading="lazy">
              </div>
              <div class="wcard__meta">
                <span class="wcard__brand">${esc(b.brand || 'Stomme')}</span>
                <div class="wcard__name">${esc(b.name)}</div>
                <div class="wcard__price">${kr(b.price)}</div>
                <div class="wcard__specs">
                  ${fSpeed ? `<span class="wcard__badge">Fart: ${fSpeed}</span>` : ""}
                  ${fCtrl ? `<span class="wcard__badge">Kontroll: ${fCtrl}</span>` : ""}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>

        <button class="workshop__next-btn" id="toFhBtn" type="button">
          <span>Nästa steg: Välj Forehand-gummi</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      `;

      content.querySelectorAll("[data-bfilter]").forEach(btn => {
        btn.addEventListener("click", () => {
          bladeFilterBrand = btn.dataset.bfilter;
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-blade-id]").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.dataset.bladeId;
          const found = BY_ID.get(id);
          if (found) {
            selectedBlade = found;
            workshop3DInstance?.updateBlade({ name: selectedBlade.name });
            renderStats();
            renderStepContent();
          }
        });
      });

      $("#toFhBtn")?.addEventListener("click", () => setStep(2));

    } else if (currentStep === 2) {
      // STEG 2: FOREHAND
      const filteredRubbers = fhFilterBrand === "all" ? allRubbers : allRubbers.filter(r => r.brand === fhFilterBrand);
      content.innerHTML = `
        <div class="step-sec__head">
          <div>
            <h3>Välj Forehand-gummi</h3>
            <p>Välj din primära attackplatta, svamptjocklek och önskad gummifärg.</p>
          </div>
          <span class="mono-label">${filteredRubbers.length} gummin</span>
        </div>

        <div class="rubber-options">
          <div class="option-row">
            <span class="option-label">Gummifärg (ITTF-godkänd):</span>
            <div class="swatches">
              ${RUBBER_COLORS.map(c => `
                <button class="swatch-btn ${fhColor === c.id ? 'is-active' : ''}" data-fh-color="${c.id}" type="button">
                  <i style="background:${c.hex}"></i>
                  <span>${c.name.split(" ")[0]}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <div class="option-row">
            <span class="option-label">Svamptjocklek:</span>
            <div class="thickness-group">
              <button class="thick-btn ${fhThickness.startsWith('2.0') ? 'is-active' : ''}" data-fh-thick="2.0 mm" type="button">2.0 mm (Mer kontroll)</button>
              <button class="thick-btn ${fhThickness.startsWith('Max') ? 'is-active' : ''}" data-fh-thick="Max (2.2 mm)" type="button">Max (Maximal fart)</button>
            </div>
          </div>

          <button class="btn-apply-rubber" id="applyFhBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/></svg>
            <span>Rulla på ${esc(selectedFh.name)} på Forehand</span>
          </button>
        </div>

        <div class="workshop__subfilter">
          ${rubberBrands.map(b => `
            <button class="wchip ${fhFilterBrand === b ? 'is-active' : ''}" data-fhb="${b}">
              ${b === "all" ? "Alla märken" : b}
            </button>
          `).join("")}
        </div>

        <div class="workshop__cards-grid">
          ${filteredRubbers.map(r => {
            const isSel = r.id === selectedFh.id;
            const sp = parseSpecs(r.desc).stats;
            const fSpeed = sp.find(s => s.key === "Fart")?.val;
            const fSpin = sp.find(s => s.key === "Skruv")?.val;
            return `
            <div class="wcard ${isSel ? 'is-selected' : ''}" data-fh-id="${r.id}">
              <div class="wcard__check">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="wcard__imgwrap">
                <img src="${img(r.imgs[0])}" alt="${esc(r.name)}" loading="lazy">
              </div>
              <div class="wcard__meta">
                <span class="wcard__brand">${esc(r.brand || 'Gummi')}</span>
                <div class="wcard__name">${esc(r.name)}</div>
                <div class="wcard__price">${kr(r.price)}</div>
                <div class="wcard__specs">
                  ${fSpeed ? `<span class="wcard__badge">Fart: ${fSpeed}</span>` : ""}
                  ${fSpin ? `<span class="wcard__badge">Spinn: ${fSpin}</span>` : ""}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>

        <button class="workshop__next-btn" id="toBhBtn" type="button">
          <span>Nästa steg: Välj Backhand-gummi</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      `;

      content.querySelectorAll("[data-fh-color]").forEach(btn => {
        btn.addEventListener("click", () => {
          fhColor = btn.dataset.fhColor;
          const cur = RUBBER_COLORS.find(c => c.id === fhColor) || RUBBER_COLORS[0];
          workshop3DInstance?.updateForehand({
            name: selectedFh.name,
            color: fhColor,
            colorHex: cur.hex,
            spongeColor: cur.sponge
          });
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-fh-thick]").forEach(btn => {
        btn.addEventListener("click", () => {
          fhThickness = btn.dataset.fhThick;
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-fhb]").forEach(btn => {
        btn.addEventListener("click", () => {
          fhFilterBrand = btn.dataset.fhb;
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-fh-id]").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.dataset.fhId;
          const found = BY_ID.get(id);
          if (found) {
            selectedFh = found;
            const cur = RUBBER_COLORS.find(c => c.id === fhColor) || RUBBER_COLORS[0];
            workshop3DInstance?.updateForehand({
              name: selectedFh.name,
              color: fhColor,
              colorHex: cur.hex,
              spongeColor: cur.sponge
            });
            renderStats();
            renderStepContent();
          }
        });
      });

      $("#applyFhBtn")?.addEventListener("click", () => {
        workshop3DInstance?.applyRubberAnimation("fh");
        toast(`Gummit ${selectedFh.name} rullades på forehand!`);
      });

      $("#toBhBtn")?.addEventListener("click", () => setStep(3));

    } else if (currentStep === 3) {
      // STEG 3: BACKHAND
      const filteredRubbers = bhFilterBrand === "all" ? allRubbers : allRubbers.filter(r => r.brand === bhFilterBrand);
      content.innerHTML = `
        <div class="step-sec__head">
          <div>
            <h3>Välj Backhand-gummi (Svart)</h3>
            <p>I tävlingsbordtennis ska ena sidan alltid vara svart när den andra är färgad.</p>
          </div>
          <span class="mono-label">${filteredRubbers.length} gummin</span>
        </div>

        <div class="rubber-options">
          <div class="option-row">
            <span class="option-label">Färg:</span>
            <div class="swatches">
              <span class="swatch-btn is-active"><i style="background:#16171a"></i><span>Svart (Tävlingskrav)</span></span>
            </div>
          </div>

          <div class="option-row">
            <span class="option-label">Svamptjocklek:</span>
            <div class="thickness-group">
              <button class="thick-btn ${bhThickness.startsWith('2.0') ? 'is-active' : ''}" data-bh-thick="2.0 mm" type="button">2.0 mm (Optimal kontroll)</button>
              <button class="thick-btn ${bhThickness.startsWith('Max') ? 'is-active' : ''}" data-bh-thick="Max (2.2 mm)" type="button">Max (Maximal fart)</button>
            </div>
          </div>

          <button class="btn-apply-rubber" id="applyBhBtn" type="button">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="m10 15 5-3-5-3v6z"/></svg>
            <span>Rulla på ${esc(selectedBh.name)} på Backhand</span>
          </button>
        </div>

        <div class="workshop__subfilter">
          ${rubberBrands.map(b => `
            <button class="wchip ${bhFilterBrand === b ? 'is-active' : ''}" data-bhb="${b}">
              ${b === "all" ? "Alla märken" : b}
            </button>
          `).join("")}
        </div>

        <div class="workshop__cards-grid">
          ${filteredRubbers.map(r => {
            const isSel = r.id === selectedBh.id;
            const sp = parseSpecs(r.desc).stats;
            const fSpeed = sp.find(s => s.key === "Fart")?.val;
            const fSpin = sp.find(s => s.key === "Skruv")?.val;
            return `
            <div class="wcard ${isSel ? 'is-selected' : ''}" data-bh-id="${r.id}">
              <div class="wcard__check">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div class="wcard__imgwrap">
                <img src="${img(r.imgs[0])}" alt="${esc(r.name)}" loading="lazy">
              </div>
              <div class="wcard__meta">
                <span class="wcard__brand">${esc(r.brand || 'Gummi')}</span>
                <div class="wcard__name">${esc(r.name)}</div>
                <div class="wcard__price">${kr(r.price)}</div>
                <div class="wcard__specs">
                  ${fSpeed ? `<span class="wcard__badge">Fart: ${fSpeed}</span>` : ""}
                  ${fSpin ? `<span class="wcard__badge">Spinn: ${fSpin}</span>` : ""}
                </div>
              </div>
            </div>`;
          }).join("")}
        </div>

        <button class="workshop__next-btn" id="toAssemblyBtn" type="button">
          <span>Nästa steg: Kantband & Montering</span>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </button>
      `;

      content.querySelectorAll("[data-bh-thick]").forEach(btn => {
        btn.addEventListener("click", () => {
          bhThickness = btn.dataset.bhThick;
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-bhb]").forEach(btn => {
        btn.addEventListener("click", () => {
          bhFilterBrand = btn.dataset.bhb;
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-bh-id]").forEach(card => {
        card.addEventListener("click", () => {
          const id = card.dataset.bhId;
          const found = BY_ID.get(id);
          if (found) {
            selectedBh = found;
            workshop3DInstance?.updateBackhand({
              name: selectedBh.name,
              color: "black",
              colorHex: "#16171a",
              spongeColor: "#1b74f0"
            });
            renderStats();
            renderStepContent();
          }
        });
      });

      $("#applyBhBtn")?.addEventListener("click", () => {
        workshop3DInstance?.applyRubberAnimation("bh");
        toast(`Gummit ${selectedBh.name} rullades på backhand!`);
      });

      $("#toAssemblyBtn")?.addEventListener("click", () => setStep(4));

    } else if (currentStep === 4) {
      // STEG 4: MONTERING & KLART
      const totalPrice = selectedBlade.price + selectedFh.price + selectedBh.price;
      const fhColorName = (RUBBER_COLORS.find(c => c.id === fhColor)?.name || fhColor).split(" ")[0];

      content.innerHTML = `
        <div class="step-sec__head">
          <div>
            <h3>Montering & Sammanställning</h3>
            <p>Välj greppform, kantband och låt oss göra ditt mästarracket spelklart!</p>
          </div>
          <span class="mono-label" style="color:var(--ok)">✓ Redo för limning</span>
        </div>

        <div class="rubber-options">
          <div class="option-row">
            <span class="option-label">Greppform på handtag:</span>
            <div class="swatches">
              ${["Konkav (Flared)", "Rak (Straight)", "Anatomisk"].map(g => `
                <button class="swatch-btn ${gripType === g ? 'is-active' : ''}" data-grip="${g}" type="button">
                  <span>${g}</span>
                </button>
              `).join("")}
            </div>
          </div>

          <div class="option-row">
            <span class="option-label">Skyddande kantband:</span>
            <div class="swatches">
              ${(allTapes.length ? allTapes.slice(0, 3) : [{ id: "tape-0", name: "Donic Kantband 12mm" }]).map(t => `
                <button class="swatch-btn ${selectedTape.id === t.id ? 'is-active' : ''}" data-tape-id="${t.id}" type="button">
                  <span>${t.name}</span>
                </button>
              `).join("")}
            </div>
          </div>
        </div>

        <div class="assembly-badge">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
          <div>
            <h5>Kostnadsfri professionell montering ingår!</h5>
            <p>Vi limmar dina gummin med godkänt vattenbaserat VOC-fritt tävlingslim, pressar med gummikavel, skär med rakblad för millimeterexakta kanter och applicerar skyddande kantband. Racket är klart för match direkt ur kartongen.</p>
          </div>
        </div>

        <div class="workshop__summary-card">
          <h4 style="font-size:16px;font-weight:800;letter-spacing:-0.01em;">Ditt Specialbyggda Racket</h4>
          <div class="summary-table">
            <div class="sum-row">
              <span><b>Stomme:</b> ${esc(selectedBlade.name)} (${gripType})</span>
              <span>${kr(selectedBlade.price)}</span>
            </div>
            <div class="sum-row">
              <span><b>Forehand:</b> ${esc(selectedFh.name)} [${fhColorName}, ${fhThickness}]</span>
              <span>${kr(selectedFh.price)}</span>
            </div>
            <div class="sum-row">
              <span><b>Backhand:</b> ${esc(selectedBh.name)} [Svart, ${bhThickness}]</span>
              <span>${kr(selectedBh.price)}</span>
            </div>
            <div class="sum-row sum-row--free">
              <span><b>Kantband:</b> ${esc(selectedTape.name)}</span>
              <span>0 kr (Ingår)</span>
            </div>
            <div class="sum-row sum-row--free">
              <span><b>Professionell montering & lackning:</b></span>
              <span>0 kr (GRATIS)</span>
            </div>
            <div class="sum-total">
              <div>
                <span>Totalt pris</span>
                <div class="mono-label" style="color:var(--ok);font-size:11px;margin-top:2px;">✦ Fri frakt ingår</div>
              </div>
              <span class="price">${kr(totalPrice)}</span>
            </div>
          </div>

          <button class="btn btn--accent btn--full" id="wsAddToCartBtn" type="button" style="padding:16px;font-size:15px;font-weight:800;justify-content:center;">
            Lägg specialbyggt racket i varukorgen ${bagSvg}
          </button>
        </div>
      `;

      content.querySelectorAll("[data-grip]").forEach(btn => {
        btn.addEventListener("click", () => {
          gripType = btn.dataset.grip;
          renderStepContent();
        });
      });

      content.querySelectorAll("[data-tape-id]").forEach(btn => {
        btn.addEventListener("click", () => {
          const tId = btn.dataset.tapeId;
          const found = allTapes.find(t => t.id === tId) || { id: tId, name: btn.textContent.trim() };
          selectedTape = found;
          workshop3DInstance?.updateEdgeTape({ name: selectedTape.name });
          renderStepContent();
        });
      });

      $("#wsAddToCartBtn")?.addEventListener("click", () => {
        const fhNote = `Forehand på specialracket: ${fhColorName} (${fhThickness})`;
        const bhNote = `Backhand på specialracket: Svart (${bhThickness})`;
        const bladeNote = `Specialbyggt racket (${gripType}). Professionellt monterat & limmat med ${selectedTape.name}.`;

        addToCart(selectedBlade.id, 1, bladeNote);
        addToCart(selectedFh.id, 1, fhNote);
        addToCart(selectedBh.id, 1, bhNote);

        toast(`Ditt specialbyggda ${selectedBlade.name}-racket ligger i varukorgen!`);
        openCart();
      });
    }
  }

  // Stepper-klick
  $$(".step-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      const s = parseInt(tab.dataset.step, 10);
      setStep(s);
    });
  });

  renderStats();
  renderStepContent();
}

/* ---------------- router ---------------- */
function route() {
  const hash = location.hash || "#/";
  const [path, qs] = hash.slice(1).split("?");
  const params = new URLSearchParams(qs || "");
  closeCart(); closeMenu(); closeSearch(); closeLightbox();

  $$("[data-nav]").forEach(a => a.classList.remove("is-active"));
  $$("[data-mob-nav]").forEach(a => a.classList.remove("is-active"));
  document.title = "PP PINGIS — Bordtennis på allvar";

  if (path !== "/" && path !== "") {
    if (hero3DInstance) {
      hero3DInstance.dispose();
      hero3DInstance = null;
    }
  }
  if (path !== "/bygg-racket") {
    if (workshop3DInstance) {
      workshop3DInstance.dispose();
      workshop3DInstance = null;
    }
  }

  if (path === "/" || path === "") {
    $("[data-nav='home']")?.classList.add("is-active");
    $("[data-mob-nav='home']")?.classList.add("is-active");
    app.innerHTML = homeView();
    bindQuickAdd(app);
    observeReveals();
    initHero3D();
    window.scrollTo({ top: 0, behavior: "instant" });
  } else if (path === "/bygg-racket") {
    $("[data-nav='workshop']")?.classList.add("is-active");
    $("[data-mob-nav='workshop']")?.classList.add("is-active");
    document.title = "PP PINGIS — Racketverkstad (Bygg eget racket i 3D)";
    workshopView(params);
    window.scrollTo({ top: 0, behavior: "instant" });
  } else if (path === "/butik") {
    const grp = params.get("group") || (params.get("kind") ? CATEGORY_GROUPS.find(g => g.kinds.includes(params.get("kind")))?.id : "");
    if (grp && $(`[data-nav='${grp}']`)) {
      $(`[data-nav='${grp}']`)?.classList.add("is-active");
      $(`[data-mob-nav='${grp}']`)?.classList.add("is-active");
    } else {
      $("[data-nav='shop']")?.classList.add("is-active");
      $("[data-mob-nav='shop']")?.classList.add("is-active");
    }
    shopView(params);
    window.scrollTo({ top: 0, behavior: "instant" });
  } else if (path.startsWith("/produkt/")) {
    productView(path.split("/produkt/")[1]);
  } else {
    app.innerHTML = homeView();
    observeReveals();
  }
}

/* nav scroll state */
addEventListener("scroll", () => {
  $("#nav").classList.toggle("nav--scrolled", scrollY > 24);
}, { passive: true });

addEventListener("hashchange", route);
renderCart();
route();
})();
