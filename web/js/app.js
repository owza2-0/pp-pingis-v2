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

function addToCart(id, qty = 1) {
  const row = cart.find(i => i.id === id);
  if (row) row.qty += qty; else cart.push({ id, qty });
  saveCart(); renderCart();
  const p = BY_ID.get(id);
  toast(`${p ? p.name : "Produkten"} ligger i varukorgen`);
  bumpCartIcon();
}

function setQty(id, qty) {
  const row = cart.find(i => i.id === id);
  if (!row) return;
  row.qty = qty;
  if (row.qty <= 0) cart = cart.filter(i => i.id !== id);
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

  items.innerHTML = cart.map(i => {
    const p = BY_ID.get(i.id);
    if (!p) return "";
    return `
    <div class="citem">
      <a class="citem__img" href="#/produkt/${p.id}"><img src="${img(p.imgs[0])}" alt="${esc(p.name)}" loading="lazy"></a>
      <div>
        <div class="citem__name">${esc(p.name)}</div>
        <div class="citem__price">${kr(p.price)} / st</div>
        <div class="citem__row">
          <span class="citem__qty">
            <button data-dec="${p.id}" aria-label="Minska">−</button>
            <output>${i.qty}</output>
            <button data-inc="${p.id}" aria-label="Öka">+</button>
          </span>
          <button class="citem__rm" data-rm="${p.id}">Ta bort</button>
        </div>
      </div>
      <div class="citem__total">${kr(p.price * i.qty)}</div>
    </div>`;
  }).join("");

  const total = cartTotal();
  const left = Math.max(0, FREE_SHIP - total);
  const pct = Math.min(100, Math.round((total / FREE_SHIP) * 100));
  ship.innerHTML = left > 0
    ? `Lägg till <b style="color:var(--accent)">${kr(left)}</b> till för fri frakt<div class="cart__shipbar"><i style="width:${pct}%"></i></div>`
    : `<b style="color:var(--ok)">Fri frakt!</b> Din order kvalificerar sig.<div class="cart__shipbar"><i style="width:100%"></i></div>`;

  foot.innerHTML = `
    <div class="cart__totalrow"><span>Totalt (inkl. moms)</span><b>${kr(total)}</b></div>
    <button class="btn btn--accent btn--full" id="checkoutBtn">
      Skicka beställning
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>
    </button>`;

  $("#checkoutBtn").addEventListener("click", checkout);
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

/* cart drawer open/close */
const drawer = $("#cartDrawer"), scrim = $("#scrim");
function openCart() { renderCart(); drawer.classList.add("is-open"); drawer.setAttribute("aria-hidden", "false"); scrim.hidden = false; document.body.style.overflow = "hidden"; }
function closeCart() { drawer.classList.remove("is-open"); drawer.setAttribute("aria-hidden", "true"); scrim.hidden = true; document.body.style.overflow = ""; }
$("#cartToggle").addEventListener("click", openCart);
$("#cartClose").addEventListener("click", closeCart);
scrim.addEventListener("click", closeCart);
document.addEventListener("keydown", e => { if (e.key === "Escape") { closeCart(); closeSearch(); } });

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
searchResults.addEventListener("click", e => { if (e.target.closest("a")) closeSearch(); });

/* ---------------- shared fragments ---------------- */
const arrowSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 17 17 7M9 7h8v8"/></svg>`;
const bagSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 7h12l1.5 13.5a1 1 0 0 1-1 1.1H5.5a1 1 0 0 1-1-1.1L6 7Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/><path d="M12 12v5m-2.5-2.5h5" stroke-linecap="round"/></svg>`;

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
  { id: "rackets", name: "Racket & Delar", kinds: ["Stommar", "Gummiplattor", "Färdiga racketar"] },
  { id: "training", name: "Spel & Träning", kinds: ["Bollar", "Robotar", "Bord & nät"] },
  { id: "gear", name: "Vård & Tillbehör", kinds: ["Racketvård & lim", "Väskor & fodral", "Kläder & skor", "Tillbehör"] }
];

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

  const catTiles = KIND_ORDER.map((k, i) => `
    <a class="cattile reveal ${i % 5 === 0 ? "cattile--wide" : ""}" style="transition-delay:${(i % 4) * 55}ms" href="#/butik?kind=${encodeURIComponent(k)}">
      <span class="cattile__count">${String(kindCount(k)).padStart(2, "0")} produkter</span>
      <span class="cattile__name">${esc(k)}</span>
      <span class="cattile__arrow">${arrowSvg}</span>
    </a>`).join("");

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
          <a class="btn btn--ghost" href="#/butik?kind=Stommar">Utforska stommar</a>
        </div>
        <div class="hero__meta">
          <div><b>${PRODUCTS.length}+</b><span>Produkter</span></div>
          <div><b>${brands.length}</b><span>Varumärken</span></div>
          <div><b>1 249 kr</b><span>Fri frakt över</span></div>
        </div>
      </div>
      <div class="hero__stage">
        <div class="hero__ring"></div>
        <div class="hero__panel">
          <img class="hero__product" id="heroProduct" src="${img(hero.imgs[0])}" srcset="${img(hero.imgs[0])} 1x, ${img(hero.imgs[0], "@2x")} 2x" alt="${esc(hero.name)}">
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
      <div class="filters__groups">
        ${CATEGORY_GROUPS.map(g => `
          <button class="group-tab ${g.id === shopState.group ? "is-active" : ""}" data-group="${g.id}">
            ${esc(g.name)}
          </button>
        `).join("")}
      </div>
      <div class="filters__row">
        <div class="filters__chips" id="filtersChips"></div>
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
    
    container.innerHTML = `
      <button class="chip ${shopState.kind === "" ? "is-on" : ""}" data-kind="">
        Visa allt
      </button>
      ${subKinds.map(k => `
        <button class="chip ${shopState.kind === k ? "is-on" : ""}" data-kind="${esc(k)}">
          ${esc(k)} <small class="chip__count">${kindCount(k)}</small>
        </button>
      `).join("")}
    `;
    
    $$(".chip", container).forEach(c => {
      c.addEventListener("click", () => {
        const k = c.dataset.kind;
        shopState.kind = k;
        $$(".chip", container).forEach(x => x.classList.toggle("is-on", x === c));
        renderShopGrid();
        
        let url = `#/butik?group=${shopState.group}`;
        if (k) url += `&kind=${encodeURIComponent(k)}`;
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
      
      $$(".group-tab").forEach(t => t.classList.toggle("is-active", t === tab));
      renderSubChips();
      renderShopGrid();
      
      const url = `#/butik?group=${gId}`;
      history.replaceState(null, "", url);
    });
  });

  $("#brandSelect").addEventListener("change", e => { shopState.brand = e.target.value; renderShopGrid(); });
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

  app.innerHTML = `
  <div class="view pdp wrap">
    <nav class="pdp__crumbs mono-label" aria-label="Brödsmulor">
      <a href="#/">Hem</a> / <a href="#/butik">Butik</a> / <a href="#/butik?kind=${encodeURIComponent(p.kind)}">${esc(p.kind)}</a> / <span style="color:var(--ink-dim)">${esc(p.name)}</span>
    </nav>
    <div class="pdp__grid">
      <div class="pdp__gallery">
        <div class="pdp__main"><img id="pdpMain" src="${img(p.imgs[0], "@2x")}" alt="${esc(p.name)}"></div>
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
        ${p.desc ? `<p class="pdp__desc">${esc(p.desc)}</p>` : ""}
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

  // gallery
  $$(".pdp__thumb").forEach(t => t.addEventListener("click", () => {
    $$(".pdp__thumb").forEach(x => x.classList.toggle("is-on", x === t));
    const main = $("#pdpMain");
    const base = t.dataset.img;
    main.src = img(base, "@2x");
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

/* ---------------- router ---------------- */
function route() {
  const hash = location.hash || "#/";
  const [path, qs] = hash.slice(1).split("?");
  const params = new URLSearchParams(qs || "");
  closeCart(); closeSearch();

  $$("[data-nav]").forEach(a => a.classList.remove("is-active"));
  document.title = "PP PINGIS — Bordtennis på allvar";

  if (path === "/" || path === "") {
    $("[data-nav='home']")?.classList.add("is-active");
    app.innerHTML = homeView();
    bindQuickAdd(app);
    observeReveals();
    heroParallax();
    window.scrollTo({ top: 0, behavior: "instant" });
  } else if (path === "/butik") {
    $("[data-nav='shop']")?.classList.add("is-active");
    shopView(params);
    window.scrollTo({ top: 0, behavior: "instant" });
  } else if (path.startsWith("/produkt/")) {
    productView(path.split("/produkt/")[1]);
  } else {
    app.innerHTML = homeView();
    observeReveals();
  }
}

/* hero mouse parallax */
function heroParallax() {
  const el = $("#heroProduct");
  if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const stage = el.closest(".hero");
  stage.addEventListener("mousemove", e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.translate = `${x * 26}px ${y * 18}px`;
  });
  stage.addEventListener("mouseleave", () => { el.style.translate = "0 0"; });
}

/* nav scroll state */
addEventListener("scroll", () => {
  $("#nav").classList.toggle("nav--scrolled", scrollY > 24);
}, { passive: true });

addEventListener("hashchange", route);
renderCart();
route();
})();
