/* Raghad Beauty storefront engine.
   createStore(S, dict) is isomorphic: html() renders the whole page on the
   server from Supabase data, hydrate() wires the same DOM in the browser
   (cart, checkout, WhatsApp handoff, reviews, 3D hero). */
import { IC, RB_MARK } from './icons';
import { Silk } from './silk';

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => { n = Math.round(n * 100) / 100; return n % 1 ? n.toFixed(2).replace(/0$/, '') : String(n); };
const byId = (list, id) => (list || []).find((x) => x.id === id);
const lum = (h) => { const n = parseInt(String(h).slice(1), 16); return (0.2126 * (n >> 16 & 255) + 0.7152 * (n >> 8 & 255) + 0.0722 * (n & 255)) / 255; };
const digits = (v) => String(v || '').replace(/\D/g, '');

export function createStore(S, dict) {
  const set = S.settings;
  const t = (k, vars) => { let s = dict[k] || k; if (vars) for (const v in vars) s = s.replace('{' + v + '}', vars[v]); return s; };
  const money = (n) => '<span class="money"><i>' + esc(set.currency) + '</i>' + num(n) + '</span>';
  const plain = (n) => num(n) + ' ' + set.currency;
  const prod = (id) => byId(S.products, id);
  const priced = (p) => p.price != null && p.price > 0;
  const canBuy = (p) => p.available && priced(p);
  const wa = digits(set.whatsapp);
  const regions = S.regions.filter((r) => r.active);
  const pays = S.payments.filter((x) => x.active);
  const minOrder = Number(set.minOrder) || 0;
  const catalog = S.products;
  let featured = catalog.filter((p) => p.featured && p.available).slice(0, 6);
  if (!featured.length) featured = catalog.filter((p) => p.available).slice(0, 5);
  const hasHero = !!(byId(S.sections, 'hero') || { visible: true }).visible && S.hero.visible && featured.length > 0;
  const nav = S.nav.filter((n) => n.visible);

  /* ---------- derived product text ---------- */
  const hairLabel = (p) => !p.hair.length ? '' : p.hair.includes('all') ? t('allHair') : p.hair.map((h) => (byId(S.hairTypes, h) || { name: h }).name).join('، ');
  const needChips = (p) => p.need.map((n) => { const x = byId(S.needs, n); return x ? '<span class="chip">' + (IC[x.icon] || IC.drop) + esc(x.name) + '</span>' : ''; }).join('');
  const curlOf = (p) => { const v = p.hair.filter((h) => h !== 'all').map((h) => (byId(S.hairTypes, h) || { curl: 0.45 }).curl); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0.45; };
  const fullName = (p) => { const b = byId(S.brands, p.brand); return (b ? b.name + ' ' : '') + p.name; };
  const priceHTML = (p) => priced(p) ? money(p.price) + (p.compareAt ? '<span class="was ltr">' + num(p.compareAt) + '</span>' : '') : '<span class="count">' + t('priceSoon') + '</span>';
  const stars = (n) => { let s = ''; for (let i = 1; i <= 5; i++) s += '<span class="' + (i <= Math.round(n) ? '' : 'off') + '">' + IC.star + '</span>'; return '<span class="stars" role="img" aria-label="' + n + ' من 5">' + s + '</span>'; };
  const brandHTML = '<a class="brand" href="#top">' + RB_MARK + '<span>' + esc(set.storeNameAr) + '<small class="ltr">' + esc(set.storeName) + '</small></span></a>';

  /* ---------- pure HTML builders ---------- */
  function ctl(p, q) {
    if (!p.available) return '<span class="count">' + t('soldout') + '</span>';
    if (!priced(p)) return '';
    if (!q) return '<button class="addb" data-add="' + p.id + '" aria-label="' + t('add') + ': ' + esc(p.name) + '">' + IC.plus + '</button>';
    return '<span class="stepper"><button data-dec="' + p.id + '" aria-label="إنقاص الكمية">' + (q === 1 ? IC.trash : IC.minus) + '</button><b>' + q + '</b><button data-inc="' + p.id + '" aria-label="زيادة الكمية">' + IC.plus + '</button></span>';
  }
  function gridHTML(F, qtyOf) {
    const q = F.q.trim().toLowerCase();
    const list = catalog.filter((p) => {
      if (F.hair && !p.hair.includes(F.hair) && !p.hair.includes('all')) return false;
      if (F.need === 'family') { if (!p.family) return false; } else if (F.need && !p.need.includes(F.need)) return false;
      if (q && !(p.name + ' ' + p.nameAr + ' ' + p.summary + ' ' + p.actives).toLowerCase().includes(q)) return false;
      return true;
    }).sort((a, b) => (b.available ? 1 : 0) - (a.available ? 1 : 0));
    return {
      count: list.length,
      html: list.length ? list.map((p) => '<article class="pc' + (p.available ? '' : ' out') + '"><div class="field" style="--c:' + esc(p.bg) + '" data-open="' + p.id + '" data-out="' + t('soldout') + '" role="button" tabindex="0" aria-label="' + t('details') + ': ' + esc(p.name) + '">' +
        '<div class="tags">' + needChips(p) + '</div>' + (p.img ? '<img loading="lazy" decoding="async" width="640" height="740" src="' + esc(p.img) + '" alt="' + esc(fullName(p)) + ' ' + esc(p.size) + '">' : '') + '</div>' +
        '<div class="body"><h3><button data-open="' + p.id + '" class="ltr">' + esc(p.name) + '</button></h3><div class="ar">' + esc(p.nameAr) + (hairLabel(p) ? ' - ' + esc(hairLabel(p)) : '') + '</div>' +
        '<div class="foot"><span>' + priceHTML(p) + '</span><span data-ctl="' + p.id + '">' + ctl(p, qtyOf(p.id)) + '</span></div></div></article>').join('') : '<p class="empty">' + t('noResults') + '</p>'
    };
  }
  const heroInfo = (p) => ({
    name: '<div><bdi class="ltr">' + esc(fullName(p)) + '</bdi></div><span>' + esc(p.nameAr) + ' - ' + esc(p.summary) + '</span>',
    price: priced(p) ? money(p.price) : '',
    chips: needChips(p) + (hairLabel(p) ? '<span class="chip">' + (IC['hair_' + p.hair[0]] || IC.hair_all) + esc(hairLabel(p)) + '</span>' : '')
  });
  const heroVars = (p) => '--hbg:' + p.bg + ';--hink:' + (lum(p.bg) < 0.46 ? '#ffffff' : set.ink);
  const photoBtn = (src) => '<button data-shot aria-label="تكبير الصورة"><img loading="lazy" src="' + esc(src) + '" alt="صورة نتيجة من الزبونة"></button>';
  function reviewsHTML(mine) {
    const ok = S.reviews;
    const card = (r, wait) => { const p = prod(r.product); return '<article class="rv"><div class="who"><b>' + esc(r.name) + '</b>' + stars(r.rating) + '</div><div class="on">' + (p ? '<span class="ltr">' + esc(p.name) + '</span> - ' : '') + '<span class="ltr">' + esc(r.date) + '</span> ' + (wait ? '<span class="badge wait">بانتظار المراجعة - تظهر لك فقط</span>' : '') + '</div><p>' + esc(r.text) + '</p>' + (r.photos && r.photos.length ? '<div class="shots">' + r.photos.map(photoBtn).join('') + '</div>' : '') + '</article>'; };
    const avg = ok.length ? ok.reduce((a, r) => a + r.rating, 0) / ok.length : 0;
    return {
      score: ok.length ? '<b>' + avg.toFixed(1) + '</b><div>' + stars(avg) + '<div class="on">' + ok.length + ' تقييم</div></div>' : '',
      list: (mine || []).map((r) => card(r, true)).join('') + ok.map((r) => card(r, false)).join('') || '<p class="empty">لا توجد تقييمات بعد. كوني أول من يشارك تجربته.</p>'
    };
  }
  function socialsHTML(withWa) {
    const s = S.socials.filter((x) => x.visible && x.url);
    const waLink = withWa && wa ? '<a href="https://wa.me/' + wa + '" target="_blank" rel="noopener" aria-label="واتساب">' + IC.whatsapp + '</a>' : '';
    return s.length || waLink ? '<div class="socials">' + waLink + s.map((x) => { const known = IC[x.platform] && x.platform !== 'link'; return '<a href="' + esc(x.url) + '" target="_blank" rel="noopener" aria-label="' + esc(x.label) + '">' + (IC[x.platform] || IC.link) + (known ? '' : '<span>' + esc(x.label) + '</span>') + '</a>'; }).join('') + '</div>' : '';
  }
  const sections = {
    hero() {
      if (!hasHero) return '';
      const p = featured[0], h = heroInfo(p);
      return '<section class="hero" id="hero" aria-roledescription="carousel" aria-label="منتجات مختارة"><div class="htext"><h1>' + esc(S.hero.title) + '</h1><p class="lede">' + esc(S.hero.text) + '</p></div>' +
        '<div class="stage" id="stage"><img class="still" id="still" alt="" src="' + esc(p.img) + '"><canvas id="silk" aria-hidden="true"></canvas></div>' +
        '<div class="hinfo" aria-live="polite"><div class="chips" id="hchips">' + h.chips + '</div><div class="row"><div class="pname" id="hname">' + h.name + '</div><div id="hprice">' + h.price + '</div></div>' +
        '<div class="acts"><button class="btn" id="hadd"' + (canBuy(p) ? '' : ' disabled') + '>' + IC.bag + '<span>' + (priced(p) ? t('add') : t('priceSoon')) + '</span></button><button class="btn ghost" id="hmore">' + t('details') + '</button></div>' +
        '<div class="rail" id="rail">' + featured.map((f, i) => '<button style="--c:' + esc(f.bg) + '" data-hero="' + i + '" aria-current="' + (i === 0) + '" aria-label="' + esc(fullName(f)) + '"><img src="' + esc(f.thumb || f.img) + '" alt=""></button>').join('') + '</div></div></section>';
    },
    promo() {
      const pr = S.promos.filter((p) => p.visible);
      return pr.length ? '<div class="promo" id="promo">' + pr.map((p) => '<span>' + IC[p.code ? 'tag' : 'truck'] + esc(p.text) + (p.code ? ' <b class="ltr">' + esc(p.code) + '</b>' : '') + '</span>').join('') + '</div>' : '';
    },
    catalog() {
      const g = gridHTML({ hair: '', need: '', q: '' }, () => 0);
      return '<section class="sec" id="catalog"><h2>' + esc(S.copy.catalogTitle) + '</h2><p class="sub">' + esc(S.copy.catalogText) + '</p><div class="finder">' +
        '<div class="flabel" id="fl-hair">نوع الشعر</div><div class="fgroup" role="group" aria-labelledby="fl-hair"><button class="fbtn" data-fhair="" aria-pressed="true">' + IC.hair_all + t('all') + '</button>' + S.hairTypes.map((h) => '<button class="fbtn" data-fhair="' + h.id + '" aria-pressed="false">' + (IC['hair_' + h.id] || IC.hair_wavy) + esc(h.name) + '</button>').join('') + '</div>' +
        '<div class="flabel" id="fl-need">ما يحتاجه شعرك</div><div class="fgroup" role="group" aria-labelledby="fl-need"><button class="fbtn" data-fneed="" aria-pressed="true">' + t('all') + '</button>' + S.needs.map((n) => '<button class="fbtn" data-fneed="' + n.id + '" aria-pressed="false">' + (IC[n.icon] || IC.drop) + esc(n.name) + '</button>').join('') + (catalog.some((p) => p.family) ? '<button class="fbtn" data-fneed="family" aria-pressed="false">' + t('family') + '</button>' : '') + '</div>' +
        '<div class="fbar"><label class="searchbox">' + IC.search + '<span class="sr">' + t('search') + '</span><input id="q" type="search" placeholder="' + t('search') + '" autocomplete="off"></label><span class="count" id="count">' + t('results', { n: g.count }) + '</span><button class="clear" id="clear" hidden>' + t('clear') + '</button></div></div>' +
        '<div class="grid" id="grid">' + g.html + '</div></section>';
    },
    how() {
      const ic = { mask: 'jar', leavein: 'feather', cowash: 'drop', cream: 'brush' };
      return S.usageGuide.length ? '<section class="sec" id="how"><h2>' + esc(S.copy.howTitle) + '</h2><p class="sub">' + esc(S.copy.howText) + '</p><ul class="how">' + S.usageGuide.map((u) => '<li>' + (IC[ic[u.id]] || IC.jar).replace('<svg', '<svg style="width:30px;height:30px;color:var(--accent)"') + '<b>' + esc(u.title) + '</b><p>' + esc(u.text) + '</p></li>').join('') + '</ul></section>' : '';
    },
    reviews() {
      const r = reviewsHTML([]);
      return '<section class="sec" id="reviews"><div class="rv-head"><div><h2>' + esc(S.copy.reviewsTitle) + '</h2><p class="sub">' + esc(S.copy.reviewsText) + '</p></div><div class="score" id="score">' + r.score + '</div></div>' +
        '<div class="rv-wrap"><div class="rv-list" id="rvlist">' + r.list + '</div><form class="rv-form" id="rvform" novalidate><h3>اكتبي تقييمك</h3>' +
        '<div class="fld" id="f-rate"><span>تقييمك للمنتج</span><div class="rate" role="radiogroup" aria-label="التقييم بالنجوم">' + [1, 2, 3, 4, 5].map((i) => '<button type="button" role="radio" aria-checked="false" aria-label="' + i + ' نجوم" data-rate="' + i + '">' + IC.star + '</button>').join('') + '</div></div>' +
        '<div class="two"><label class="fld" id="f-rname"><span>اسمك</span><input name="name" autocomplete="given-name" maxlength="40"></label><label class="fld"><span>المنتج</span><select name="product">' + catalog.map((p) => '<option value="' + p.id + '">' + esc(p.name) + '</option>').join('') + '</select></label></div>' +
        '<label class="fld" id="f-rtext"><span>تجربتك</span><textarea name="text" maxlength="500" placeholder="كيف كان شعرك قبل وبعد؟"></textarea></label>' +
        '<div class="fld"><span>صور النتيجة <em>(اختياري، حتى 3 صور)</em></span><div class="thumbs" id="rthumbs"><label class="drop" id="rdrop">' + IC.camera + '<input type="file" accept="image/*" multiple class="sr" id="rfile"></label></div></div>' +
        '<button class="btn dark" type="submit" id="rvsend">إرسال التقييم</button><p class="hint">تظهر التقييمات للجميع بعد موافقة الإدارة.</p></form></div></section>';
    },
    contact() {
      const so = socialsHTML();
      if (!wa && !so) return '';
      return '<section class="sec" id="contact"><div class="contact"><h2>' + esc(S.copy.contactTitle) + '</h2><p>' + esc(S.copy.contactText) + '</p>' + (wa ? '<a class="btn wa" target="_blank" rel="noopener" href="https://wa.me/' + wa + '">' + IC.whatsapp + 'محادثة على واتساب</a>' : '') + so + '</div></section>';
    }
  };

  function html() {
    const vars = '--accent:' + set.accent + ';--ink:' + set.ink + ';--paper:' + set.paper + ';' + (hasHero ? heroVars(featured[0]) : '');
    return '<div class="rb" id="top-anchor" style="' + esc(vars) + '"><div style="position:relative"><header class="top' + (hasHero ? '' : ' stuck') + '" id="top"' + (hasHero ? '' : ' style="position:sticky;animation:none"') + '>' + brandHTML +
      '<nav aria-label="القائمة الرئيسية">' + nav.map((n) => '<a href="' + esc(n.target) + '">' + esc(n.label) + '</a>').join('') + '</nav><span class="sp"></span>' +
      '<button class="icon-btn cart-btn" id="cartbtn" aria-label="فتح السلة">' + IC.bag + '<span class="n" id="cartn">0</span></button></header>' +
      '<main>' + S.sections.map((s) => s.visible && sections[s.id] ? sections[s.id]() : '').join('') + '</main></div>' +
      '<footer><div class="cols"><div>' + brandHTML + '<p class="about">' + esc(S.footer.about) + '</p></div>' +
      '<div><h4>المتجر</h4><ul>' + nav.map((n) => '<li><a href="' + esc(n.target) + '">' + esc(n.label) + '</a></li>').join('') + '</ul></div>' +
      '<div><h4>تواصل</h4><ul>' + (set.email ? '<li><a class="ltr" href="mailto:' + esc(set.email) + '">' + esc(set.email) + '</a></li>' : '') + (set.orderNote ? '<li>' + esc(set.orderNote) + '</li>' : '') + '</ul>' + socialsHTML(true) + '</div></div>' +
      '<div class="legal"><span>' + esc(S.footer.creditLabel) + ' <a href="' + esc(S.footer.designerUrl) + '" target="_blank" rel="noopener">' + esc(S.footer.designerName) + '</a></span><span>' + esc(S.footer.rights) + ' © <span class="ltr">' + new Date().getFullYear() + '</span> <a class="ltr" href="' + esc(S.footer.creditUrl) + '" target="_blank" rel="noopener">' + esc(S.footer.creditName) + '</a></span></div></footer>' +
      '<button class="dock" id="dock" aria-label="فتح السلة"><span class="pile" id="pile"></span><span class="lbl" id="docklbl"></span><span class="go">عرض السلة</span></button>' +
      '<div class="scrim" id="scrim"></div><aside class="sheet" id="cart" role="dialog" aria-modal="true" aria-label="السلة وإتمام الطلب"></aside><aside class="sheet pdsheet" id="pd" role="dialog" aria-modal="true" aria-label="تفاصيل المنتج"></aside>' +
      '<div class="toast" id="toast" role="status"></div><div class="lightbox" id="lb"><button class="icon-btn" aria-label="إغلاق">' + IC.close + '</button><div class="in" id="lbin"></div></div></div>';
  }

  /* ---------- browser side ---------- */
  function hydrate(host, api) {
    const ac = new AbortController(), sig = { signal: ac.signal };
    const on = (el, ev, fn, o) => el && el.addEventListener(ev, fn, Object.assign({}, sig, o || {}));
    const $ = (s, r) => (r || host).querySelector(s);
    const $$ = (s, r) => Array.from((r || host).querySelectorAll(s));
    const rb = $('.rb');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const today = () => new Date().toISOString().slice(0, 10);
    const timers = [];
    const tint = (c) => { let m = document.querySelector('meta[name="theme-color"]'); if (!m) { m = document.createElement('meta'); m.name = 'theme-color'; document.head.appendChild(m); } m.content = c; };

    /* cart */
    const CK = 'rb_cart_v1';
    let cart = { items: [], coupon: null, couponMsg: '', region: '', payment: '', customer: { name: '', phone: '', city: '', address: '', notes: '' } };
    try { const cr = JSON.parse(localStorage.getItem(CK)); if (cr && cr.items) cart = Object.assign(cart, cr); } catch (e) {}
    cart.items = cart.items.filter((i) => { const p = prod(i.id); return p && canBuy(p); });
    const persist = () => { try { localStorage.setItem(CK, JSON.stringify(cart)); } catch (e) {} };
    const qtyOf = (id) => (byId(cart.items, id) || { qty: 0 }).qty;
    const count = () => cart.items.reduce((a, i) => a + i.qty, 0);
    const payOf = () => byId(pays, cart.payment);
    function totals() {
      const sub = cart.items.reduce((a, i) => a + prod(i.id).price * i.qty, 0), c = cart.coupon;
      let discount = 0, short = 0;
      if (c) { if (c.min && sub < c.min) short = c.min - sub; else discount = Math.round((c.type === 'percent' ? sub * c.value / 100 : Math.min(c.value, sub)) * 100) / 100; }
      const reg = byId(regions, cart.region), fee = reg ? reg.fee : null;
      return { sub, c, discount, short, reg, fee, total: Math.max(0, sub - discount) + (fee || 0) };
    }

    let toastT;
    const toast = (m) => { const el = $('#toast'); el.textContent = m; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); };
    let openSheet = null, lastFocus = null;
    function open(id) {
      if (openSheet) $('#' + openSheet).classList.remove('on'); else lastFocus = document.activeElement;
      openSheet = id; $('#' + id).classList.add('on'); $('#scrim').classList.add('on'); document.body.classList.add('lock');
      $('#dock').classList.remove('show'); $('#toast').classList.remove('on');
      const f = $('#' + id + ' [data-close]'); if (f) setTimeout(() => f.focus({ preventScroll: true }), 60);
    }
    function close() {
      if (!openSheet) return;
      $('#' + openSheet).classList.remove('on'); $('#scrim').classList.remove('on'); document.body.classList.remove('lock'); openSheet = null;
      refreshBadges(); if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }
    on($('#scrim'), 'click', close);
    on($('#lb'), 'click', () => $('#lb').classList.remove('on'));

    function setQty(id, q, from) {
      const p = prod(id); if (!p || !canBuy(p)) return;
      const it = byId(cart.items, id), was = it ? it.qty : 0;
      q = Math.max(0, Math.min(20, q));
      if (!q) cart.items = cart.items.filter((i) => i.id !== id); else if (it) it.qty = q; else cart.items.push({ id, qty: q });
      persist();
      $$('[data-ctl="' + id + '"]').forEach((el) => { el.innerHTML = ctl(p, q); });
      if (q > was) { fly(p, from); if (navigator.vibrate) navigator.vibrate(12); if (!was && !openSheet) toast('أضيف ' + p.name + ' إلى السلة'); }
      refreshBadges();
      if (openSheet === 'cart') renderCart();
      if (openSheet === 'pd') pdFoot();
      if (hasHero) heroBtn();
    }
    function refreshBadges() {
      const n = count(), tt = totals();
      $('#cartn').textContent = n; $('#cartbtn').classList.toggle('has', n > 0);
      $('#pile').innerHTML = cart.items.slice(-3).map((i) => { const p = prod(i.id); return '<img src="' + esc(p.thumb || p.img) + '" alt="">'; }).join('');
      $('#docklbl').innerHTML = n + (n === 1 ? ' منتج' : ' منتجات') + '<small>' + money(tt.sub) + '</small>';
      $('#dock').classList.toggle('show', n > 0 && !openSheet);
    }
    function fly(p, from) {
      const dock = $('#dock'), tgt = getComputedStyle(dock).display !== 'none' ? dock : $('#cartbtn');
      if (tgt === dock) { dock.classList.remove('bump'); void dock.offsetWidth; dock.classList.add('bump'); }
      if (reduce || !from || !from.getBoundingClientRect || !document.body.animate) return;
      const a = from.getBoundingClientRect(), b = tgt.getBoundingClientRect();
      const im = document.createElement('img'); im.src = p.thumb || p.img; im.className = 'fly'; im.style.left = (a.left + a.width / 2 - 30) + 'px'; im.style.top = (a.top + a.height / 2 - 35) + 'px';
      rb.appendChild(im);
      const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
      im.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 70) + 'px) scale(.9) rotate(-14deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.3) rotate(10deg)', opacity: 0.2 }], { duration: 620, easing: 'cubic-bezier(.4,0,.6,1)' }).onfinish = () => im.remove();
    }

    /* catalog */
    const F = { hair: '', need: '', q: '' };
    function renderGrid() {
      const grid = $('#grid'); if (!grid) return;
      const g = gridHTML(F, qtyOf);
      $('#count').textContent = t('results', { n: g.count }); $('#clear').hidden = !(F.hair || F.need || F.q.trim()); grid.innerHTML = g.html;
    }
    function setFilter(k, v) { F[k] = v; $$('[data-f' + k + ']').forEach((b) => b.setAttribute('aria-pressed', String(b.getAttribute('data-f' + k) === v))); renderGrid(); }
    on($('#q'), 'input', (e) => { F.q = e.target.value; renderGrid(); });
    on($('#clear'), 'click', () => { $('#q').value = ''; F.q = ''; setFilter('hair', ''); setFilter('need', ''); });

    /* product detail */
    let pdId = null, pdQty = 1;
    function pdFoot() {
      const p = prod(pdId), el = $('#pdfoot'); if (!el) return;
      el.innerHTML = !p.available ? '<button class="btn block" disabled>' + t('soldout') + '</button>' : !priced(p) ? '<button class="btn block" disabled>' + t('priceSoon') + '</button>' :
        '<span class="stepper"><button data-pdq="-1" aria-label="إنقاص الكمية">' + IC.minus + '</button><b>' + pdQty + '</b><button data-pdq="1" aria-label="زيادة الكمية">' + IC.plus + '</button></span><button class="btn" data-pdadd>' + IC.bag + '<span>' + t('add') + ' - </span>' + money(p.price * pdQty) + '</button>';
      const note = $('#pdin'), inCart = qtyOf(p.id); if (note) note.textContent = inCart ? 'في سلتك الآن: ' + inCart : '';
    }
    function openPD(id) {
      const p = prod(id); if (!p) return; pdId = id; pdQty = 1;
      const tx = { light: 1, medium: 2, 'medium-heavy': 3, heavy: 4 }[p.texture] || 0; let g = '';
      for (let i = 1; i <= 4; i++) g += '<i class="' + (i <= tx ? 'on' : '') + '"></i>';
      const b = byId(S.brands, p.brand), c = byId(S.categories, p.category);
      const needs = p.need.map((n) => (byId(S.needs, n) || { name: '' }).name).filter(Boolean).join(' و');
      let facts = '';
      if (needs) facts += '<div class="fact"><small>نوع المنتج</small><b>' + esc(needs) + '</b></div>';
      if (p.hair.length) facts += '<div class="fact"><small>يناسب</small><b>' + esc(hairLabel(p)) + '</b></div>';
      if (tx) facts += '<div class="fact"><small>القوام</small><b>' + esc(S.labels.textures[p.texture]) + ' <span class="gauge">' + g + '</span></b></div>';
      if (p.size) facts += '<div class="fact"><small>الحجم</small><b><span class="ltr">' + esc(p.size) + '</span></b></div>';
      if (p.usage.length) facts += '<div class="fact wide"><small>طريقة الاستخدام</small><b>' + p.usage.map((u) => esc(S.labels.usages[u] || u)).join('، ') + '</b></div>';
      if (p.actives) facts += '<div class="fact wide"><small>المواد الفعالة</small><b>' + esc(p.actives) + '</b></div>';
      $('#pd').innerHTML = '<div class="sh-head"><h2>' + esc(p.name) + '</h2><button class="icon-btn" data-close aria-label="إغلاق">' + IC.close + '</button></div>' +
        '<div class="sh-body"><div class="pd"><div class="pd-stage" id="pdstage" style="--c:' + esc(p.bg) + '"><div class="tilt" id="pdtilt">' + (p.img ? '<img src="' + esc(p.img) + '" alt="' + esc(fullName(p)) + '">' : '') + '</div><div class="glare"></div></div>' +
        '<div class="pd-body"><div><div class="bl">' + (b ? '<span class="ltr">' + esc(b.name + (p.line ? ' ' + p.line : '')) + '</span>' : '') + (c ? ' - ' + esc(c.name) : '') + '</div><h2><span class="ltr">' + esc(p.name) + '</span><span>' + esc(p.nameAr) + '</span></h2></div>' +
        '<p class="sm">' + esc(p.summary) + '</p><div class="facts">' + facts + '</div>' + (p.benefits.length ? '<ul class="bens">' + p.benefits.map((x) => '<li>' + IC.check + '<span>' + esc(x) + '</span></li>').join('') + '</ul>' : '') +
        '<div class="pd-foot" id="pdfoot"></div><p class="src"><span id="pdin" style="font-weight:700;color:var(--ok)"></span> ' + esc(set.orderNote) + '</p></div></div></div>';
      pdFoot(); open('pd');
      const stage = $('#pdstage'), tilt = $('#pdtilt');
      const mv = (e) => { const r = stage.getBoundingClientRect(), pt = e.touches ? e.touches[0] : e, x = (pt.clientX - r.left) / r.width - 0.5, y = (pt.clientY - r.top) / r.height - 0.5; tilt.style.transform = 'rotateY(' + (x * 26) + 'deg) rotateX(' + (-y * 16) + 'deg) translateZ(20px)'; stage.style.setProperty('--gx', (50 + x * 80) + '%'); stage.style.setProperty('--gy', (40 + y * 80) + '%'); };
      if (!reduce) { stage.addEventListener('pointermove', mv); stage.addEventListener('touchmove', mv, { passive: true }); }
      const rs = () => { tilt.style.transform = ''; };
      stage.addEventListener('pointerleave', rs); stage.addEventListener('touchend', rs);
    }

    /* cart sheet */
    let step = 1, errs = {}, busy = false;
    function sumHTML(tt) {
      return '<div class="sum"><div><span>' + t('cart.subtotal') + '</span>' + money(tt.sub) + '</div>' +
        (tt.discount ? '<div class="disc"><span>' + t('cart.discount') + ' <span class="ltr">' + esc(tt.c.code) + '</span></span><span class="ltr">-' + money(tt.discount) + '</span></div>' : '') +
        '<div><span>' + t('cart.delivery') + (tt.reg ? ' - ' + esc(tt.reg.name) : '') + '</span>' + (!regions.length ? '<span class="mut">' + t('cart.deliveryLater') + '</span>' : tt.fee == null ? '<span class="mut">' + t('cart.pickRegion') + '</span>' : tt.fee ? money(tt.fee) : '<span>مجانا</span>') + '</div>' +
        '<div class="tot"><span>' + (tt.fee == null ? 'المجموع قبل التوصيل' : t('cart.total')) + '</span>' + money(tt.total) + '</div></div>';
    }
    const phoneFmt = (v) => { const d = digits(v).replace(/^972/, '0'); return /^05\d{8}$/.test(d) ? d.slice(0, 3) + '-' + d.slice(3) : v.trim(); };
    function message(tt) {
      const c = cart.customer, L = [];
      L.push('*طلب جديد - ' + set.storeName + '*', '', '*الزبونة*', 'الاسم: ' + c.name, 'الهاتف: ' + phoneFmt(c.phone), '', '*المنتجات*');
      cart.items.forEach((i, k) => { const p = prod(i.id); L.push((k + 1) + '. ' + p.nameAr + ' - ' + fullName(p) + ' ' + p.size, '   الكمية ' + i.qty + ' × ' + plain(p.price) + ' = ' + plain(p.price * i.qty)); });
      L.push('', '*الحساب*', 'مجموع المنتجات: ' + plain(tt.sub));
      if (tt.discount) L.push('كوبون ' + tt.c.code + ': -' + plain(tt.discount));
      L.push(tt.reg ? 'التوصيل (' + tt.reg.name + '): ' + (tt.fee ? plain(tt.fee) : 'مجانا') : 'التوصيل: يحدد عند التأكيد');
      L.push('*' + (tt.reg ? 'المجموع النهائي: ' : 'المجموع قبل التوصيل: ') + plain(tt.total) + '*', '', '*التوصيل*');
      if (tt.reg) L.push('المنطقة: ' + tt.reg.name);
      L.push('البلدة: ' + c.city); if (c.address) L.push('العنوان: ' + c.address);
      const pay = payOf(); if (pay) L.push('', '*الدفع*', 'الطريقة: ' + pay.name + (pay.number ? ' (إلى الرقم ' + pay.number + ')' : ''));
      if (c.notes) L.push('', '*ملاحظات*', c.notes);
      return L.join('\n');
    }
    const waURL = (tt) => 'https://wa.me/' + wa + '?text=' + encodeURIComponent(message(tt));
    const isPickup = (r) => !!r && r.fee === 0 && /استلام/.test(r.name);
    const fld = (k, label, attrs, opt) => '<label class="fld' + (errs[k] ? ' bad' : '') + '"><span>' + label + (opt ? ' <em>(اختياري)</em>' : '') + '</span><input data-c="' + k + '" value="' + esc(cart.customer[k]) + '" ' + attrs + (errs[k] ? ' aria-invalid="true"' : '') + '>' + (errs[k] ? '<span class="err">' + errs[k] + '</span>' : '') + '</label>';
    const radios = (name, list, sel, body) => '<div class="regions" role="radiogroup">' + list.map((r) => '<label class="reg"><input type="radio" name="' + name + '" value="' + esc(r.id) + '"' + (sel === r.id ? ' checked' : '') + '>' + body(r) + '</label>').join('') + '</div>';

    function renderCart() {
      const el = $('#cart'), tt = totals(); let body = '', foot = '';
      const titles = ['', t('cart.title'), 'تفاصيل التوصيل', t('cart.review'), 'خطوة أخيرة في واتساب'];
      if (!cart.items.length) step = 1;
      if (!cart.items.length) {
        body = '<div class="empty" style="padding-top:70px">' + IC.bag.replace('<svg', '<svg style="width:54px;height:54px;opacity:.35"') + '<p style="margin:14px 0 20px">' + t('cart.empty') + '</p><button class="btn dark" data-close>' + t('cart.browse') + '</button></div>';
      } else if (step === 1) {
        body = cart.items.map((i) => { const p = prod(i.id); return '<div class="line"><div class="ph" style="--c:' + esc(p.bg) + '"><img src="' + esc(p.thumb || p.img) + '" alt=""></div><div><h4 class="ltr">' + esc(p.name) + '</h4><div class="each">' + esc(p.nameAr) + ' - ' + money(p.price) + ' للقطعة</div><div class="ctl"><span class="stepper"><button data-dec="' + p.id + '" aria-label="إنقاص الكمية">' + IC.minus + '</button><b>' + i.qty + '</b><button data-inc="' + p.id + '" aria-label="زيادة الكمية">' + IC.plus + '</button></span><button class="rm" data-rm="' + p.id + '" aria-label="إزالة ' + esc(p.name) + '">' + IC.trash + '</button></div></div><div class="lt">' + money(p.price * i.qty) + '</div></div>'; }).join('') +
          '<form class="coupon" id="cform"><input id="cin" aria-label="' + t('cart.coupon') + '" placeholder="' + t('cart.coupon') + '" value="' + esc(tt.c ? tt.c.code : '') + '" autocomplete="off" autocapitalize="characters"><button class="btn dark"' + (busy ? ' disabled' : '') + '>' + t('cart.apply') + '</button></form>' +
          (tt.c ? '<div class="cmsg ' + (tt.short ? 'no' : 'ok') + '" role="status">' + (tt.short ? '' : IC.check) + '<span>' + (tt.short ? 'هذا الكوبون للطلبات من ' + plain(tt.c.min) + ' وما فوق. ينقصك ' + plain(tt.short) + '.' : 'تم تطبيق ' + esc(tt.c.code) + (tt.c.type === 'percent' ? ' (خصم ' + num(tt.c.value) + '%)' : ' (خصم ' + plain(tt.c.value) + ')')) + '</span><button class="clear" data-couponx>' + t('cart.remove') + '</button></div>' : cart.couponMsg ? '<div class="cmsg no" role="status"><span>' + esc(cart.couponMsg) + '</span></div>' : '');
        const lack = minOrder - tt.sub;
        foot = sumHTML(tt) + (!wa ? '<p class="notice info">' + t('order.soon') + '</p>' : lack > 0 ? '<p class="notice" role="status">الحد الأدنى للطلب ' + money(minOrder) + '. أضيفي منتجات بقيمة ' + money(lack) + ' لإكمال الطلب.</p><button class="btn block" disabled>' + t('cart.next') + '</button>' : '<button class="btn block" data-step="2">' + t('cart.next') + '</button>');
      } else if (step === 2) {
        body = (regions.length ? '<div class="gtitle">منطقة التوصيل</div>' + (set.deliveryNote ? '<p class="hint" style="margin:-4px 0 10px">' + esc(set.deliveryNote) + '</p>' : '') + radios('reg', regions, cart.region, (r) => '<span>' + esc(r.name) + '<small>' + esc([r.towns, r.eta].filter(Boolean).join(' - ')) + '</small></span>' + (r.fee ? money(r.fee) : '<b>مجانا</b>')) + (errs.region ? '<p class="errline" style="margin-top:8px">' + errs.region + '</p>' : '') : '') +
          (pays.length ? '<div class="gtitle">طريقة الدفع</div>' + radios('pay', pays, cart.payment, (m) => '<span>' + esc(m.name) + '<small>' + esc(m.note) + (m.number ? ' <bdi class="ltr" style="font-weight:700">' + esc(m.number) + '</bdi>' : '') + '</small></span>') + (errs.payment ? '<p class="errline" style="margin-top:8px">' + errs.payment + '</p>' : '') : '') +
          '<div class="gtitle">بياناتك</div><div style="display:grid;gap:14px">' + fld('name', 'الاسم الكامل', 'autocomplete="name" maxlength="60"') + fld('phone', 'رقم الهاتف', 'type="tel" inputmode="tel" dir="ltr" style="text-align:right" autocomplete="tel" placeholder="05X-XXXXXXX" maxlength="16"') + fld('city', 'البلدة / المدينة', 'autocomplete="address-level2" maxlength="60"') + fld('address', 'الشارع ورقم البيت', 'autocomplete="street-address" maxlength="120"', isPickup(tt.reg)) +
          '<label class="fld"><span>ملاحظات للطلب <em>(اختياري)</em></span><textarea data-c="notes" maxlength="300" placeholder="مثلا: أفضل وقت للتوصيل">' + esc(cart.customer.notes) + '</textarea></label></div>';
        foot = sumHTML(tt) + '<button class="btn block" data-step="3">' + t('cart.review') + '</button>';
      } else if (step === 3) {
        const pm = payOf();
        body = '<div class="gtitle">ملخص الطلب</div>' + sumHTML(tt) + (pm ? '<div class="sum" style="margin-top:8px"><div><span>طريقة الدفع</span><b>' + esc(pm.name) + '</b></div></div>' + (pm.number ? '<p class="hint">' + esc(pm.note) + ' <bdi class="ltr" style="font-weight:700">' + esc(pm.number) + '</bdi></p>' : '') : '') +
          '<div class="gtitle">الرسالة التي سترسل إلى رغد</div><div class="wa-prev"><div class="to">' + IC.whatsapp + '<span>إلى: <span class="ltr">+' + wa + '</span></span></div><div class="bubble" dir="auto">' + esc(message(tt)).replace(/\*([^*\n]+)\*/g, '<b>$1</b>') + '</div></div>' +
          '<p class="notice info" style="margin-top:14px">سيفتح واتساب وفيه هذه الرسالة جاهزة. الطلب لا يرسل تلقائيا: اضغطي زر الإرسال داخل واتساب، ثم تؤكد رغد الطلب معك.</p>';
        foot = '<a class="btn wa block" id="wago" target="_blank" rel="noopener" href="' + esc(waURL(tt)) + '">' + IC.whatsapp + t('wa.open') + '</a>';
      } else {
        body = '<div class="notice"><b>الطلب لم يرسل بعد من جهتنا.</b><br>فتحنا لك واتساب مع رسالة الطلب. يكتمل الطلب فقط بعد أن تضغطي إرسال داخل واتساب وترد عليك رغد بالتأكيد.</div><div style="display:grid;gap:10px;margin-top:18px"><a class="btn wa block" target="_blank" rel="noopener" href="' + esc(waURL(tt)) + '">' + IC.whatsapp + 'فتح واتساب مرة أخرى</a><button class="btn ghost block" id="copymsg">نسخ نص الطلب</button><button class="btn dark block" id="donecart">أرسلت الرسالة، أفرغي السلة</button></div><p class="hint" style="margin-top:14px">سلتك محفوظة كما هي إلى أن تختاري إفراغها.</p>';
      }
      el.innerHTML = '<div class="sh-head">' + (step > 1 && cart.items.length ? '<button class="icon-btn" data-step="' + (step === 4 ? 3 : step - 1) + '" aria-label="' + t('cart.back') + '">' + IC.prev + '</button>' : '') + '<h2>' + titles[step] + '</h2><button class="icon-btn" data-close aria-label="إغلاق">' + IC.close + '</button></div>' +
        (cart.items.length && step < 4 ? '<div class="steps" aria-hidden="true"><i class="on"></i><i class="' + (step > 1 ? 'on' : '') + '"></i><i class="' + (step > 2 ? 'on' : '') + '"></i></div><div class="steplbl">الخطوة ' + step + ' من 3</div>' : '') +
        '<div class="sh-body" id="cbody">' + body + '</div>' + (foot ? '<div class="sh-foot">' + foot + '</div>' : '');
    }
    function validate() {
      const c = cart.customer, tt = totals(); errs = {};
      if (regions.length && !tt.reg) errs.region = 'اختاري منطقة التوصيل لحساب رسوم التوصيل.';
      if (pays.length && !payOf()) errs.payment = 'اختاري طريقة الدفع.';
      if (c.name.trim().length < 3) errs.name = 'اكتبي اسمك الكامل.';
      if (!/^(?:\+?972|0)5\d{8}$/.test(c.phone.replace(/[\s\-()]/g, ''))) errs.phone = 'اكتبي رقم هاتف صحيحا، مثل 0501234567.';
      if (c.city.trim().length < 2) errs.city = 'اكتبي اسم البلدة أو المدينة.';
      if (!isPickup(tt.reg) && c.address.trim().length < 3) errs.address = 'اكتبي الشارع ورقم البيت ليصل الطلب.';
      return !Object.keys(errs).length;
    }
    function goStep(n) {
      if (n >= 2 && (!wa || totals().sub < minOrder)) { step = 1; return renderCart(); }
      if (n === 3 && !validate()) { step = 2; renderCart(); const bad = $('#cart [aria-invalid], #cart .errline'); if (bad) { bad.scrollIntoView({ block: 'center', behavior: reduce ? 'auto' : 'smooth' }); if (bad.focus) bad.focus({ preventScroll: true }); } return; }
      if (n !== 2) errs = {};
      step = n; renderCart(); $('#cbody').scrollTop = 0;
    }
    const openCart = () => { step = 1; errs = {}; renderCart(); open('cart'); };
    on($('#cartbtn'), 'click', openCart); on($('#dock'), 'click', openCart);
    async function applyCoupon(code) {
      code = code.trim().toUpperCase(); cart.coupon = null; cart.couponMsg = '';
      if (!code) { persist(); return renderCart(); }
      busy = true; renderCart();
      try {
        const r = await api.checkCoupon(code);
        if (r && r.status === 'ok') cart.coupon = { code: r.code, type: r.type, value: Number(r.value), min: Number(r.min) };
        else cart.couponMsg = r && r.status === 'expired' ? 'انتهت صلاحية هذا الكوبون.' : 'الكوبون "' + code + '" غير موجود. تأكدي من كتابته.';
      } catch (e) { cart.couponMsg = 'تعذر التحقق من الكوبون. تأكدي من الاتصال وحاولي مرة أخرى.'; }
      busy = false; persist(); if (openSheet === 'cart') renderCart();
    }

    /* reviews */
    const MK = 'rb_my_reviews_v1'; let mine = [], rrate = 0, rphotos = [];
    try { mine = (JSON.parse(localStorage.getItem(MK)) || []).filter((r) => Date.now() - r.at < 14 * 864e5); } catch (e) {}
    function renderReviews() { if (!$('#rvlist')) return; const r = reviewsHTML(mine); $('#score').innerHTML = r.score; $('#rvlist').innerHTML = r.list; }
    function setRate(n) { rrate = n; $$('[data-rate]').forEach((b) => { b.classList.toggle('on', +b.dataset.rate <= n); b.setAttribute('aria-checked', String(+b.dataset.rate === n)); }); const e = $('#f-rate .err'); if (e) e.remove(); }
    function drawThumbs() {
      $$('#rthumbs .t').forEach((x) => x.remove());
      rphotos.forEach((ph, i) => { const d = document.createElement('div'); d.className = 't'; d.innerHTML = '<img src="' + ph.url + '" alt="صورة ' + (i + 1) + '"><button type="button" class="x" data-rmphoto="' + i + '" aria-label="حذف الصورة">' + IC.close + '</button>'; $('#rthumbs').insertBefore(d, $('#rdrop')); });
      $('#rdrop').style.display = rphotos.length >= 3 ? 'none' : '';
    }
    on($('#rfile'), 'change', (e) => {
      Array.from(e.target.files).slice(0, 3 - rphotos.length).forEach((f) => {
        if (!/^image\//.test(f.type)) return toast('يمكن رفع الصور فقط.');
        const im = new Image(), src = URL.createObjectURL(f);
        im.onload = () => { const s = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * s); c.height = Math.round(im.height * s); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(src); c.toBlob((blob) => { if (blob && rphotos.length < 3) { rphotos.push({ blob, url: URL.createObjectURL(blob) }); drawThumbs(); } }, 'image/jpeg', 0.8); };
        im.onerror = () => toast('تعذر قراءة هذه الصورة.');
        im.src = src;
      });
      e.target.value = '';
    });
    on($('#rvform'), 'submit', async (e) => {
      e.preventDefault();
      const f = e.target; let bad = null;
      $$('.err', f).forEach((x) => x.remove()); $$('.bad', f).forEach((x) => x.classList.remove('bad'));
      const fail = (sel, msg) => { const w = $(sel); w.classList.add('bad'); const s = document.createElement('span'); s.className = 'err'; s.textContent = msg; w.appendChild(s); bad = bad || w; };
      if (!rrate) fail('#f-rate', 'اختاري عدد النجوم.');
      if (f.name.value.trim().length < 2) fail('#f-rname', 'اكتبي اسمك ليظهر مع التقييم.');
      if (f.text.value.trim().length < 10) fail('#f-rtext', 'اكتبي جملة أو اثنتين عن تجربتك (10 أحرف على الأقل).');
      if (bad) { const i = $('input,textarea,button', bad); if (i) i.focus(); return; }
      const btn = $('#rvsend'), r = { name: f.name.value.trim(), product: f.product.value, rating: rrate, text: f.text.value.trim() };
      btn.disabled = true; btn.textContent = 'جار الإرسال...';
      try {
        await api.submitReview(r, rphotos.map((p) => p.blob));
        mine.unshift(Object.assign({ date: today(), at: Date.now(), photos: [] }, r)); mine = mine.slice(0, 5);
        try { localStorage.setItem(MK, JSON.stringify(mine)); } catch (x) {}
        f.reset(); rphotos = []; drawThumbs(); setRate(0); renderReviews(); toast('استلمنا تقييمك. سيظهر بعد المراجعة.');
        $('#rvlist').scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
      } catch (x) { toast('تعذر إرسال التقييم. تأكدي من الاتصال وحاولي مرة أخرى.'); }
      btn.disabled = false; btn.textContent = 'إرسال التقييم';
    });

    /* hero */
    let hi = 0, silk = null, lastTouch = 0;
    function heroBtn() { const p = featured[hi], q = qtyOf(p.id), b = $('#hadd'); b.disabled = !canBuy(p); $('span', b).textContent = !priced(p) ? t('priceSoon') : q ? t('added') + ' (' + q + ') - أضيفي أخرى' : t('add'); }
    function setHero(i, user) {
      i = (i + featured.length) % featured.length; if (user) lastTouch = Date.now(); if (i === hi) return;
      hi = i; const p = featured[i], h = heroInfo(p), hero = $('#hero');
      if (!$('#top').classList.contains('stuck')) tint(p.bg);
      rb.style.setProperty('--hbg', p.bg); rb.style.setProperty('--hink', lum(p.bg) < 0.46 ? '#ffffff' : set.ink);
      hero.classList.add('swap');
      timers.push(setTimeout(() => { $('#hname').innerHTML = h.name; $('#hprice').innerHTML = h.price; $('#hchips').innerHTML = h.chips; heroBtn(); hero.classList.remove('swap'); }, reduce ? 0 : 220));
      $$('#rail button').forEach((b, k) => b.setAttribute('aria-current', String(k === i)));
      $('#still').src = p.img;
      if (silk) silk.set({ src: p.img, r1: p.r1, r2: p.r2, curl: curlOf(p) });
    }
    if (hasHero) {
      heroBtn(); tint(featured[0].bg);
      on($('#hadd'), 'click', () => { const p = featured[hi]; lastTouch = Date.now(); setQty(p.id, qtyOf(p.id) + 1, $('#stage')); });
      on($('#hmore'), 'click', () => openPD(featured[hi].id));
      /* Opening the product uses the browser's own click, which never fires for a
         scroll or a drag. Touch handling here is only for the sideways swipe. */
      const stage = $('#stage'); let touch = null, swiped = 0;
      on(stage, 'touchstart', (e) => { const p = e.touches[0]; touch = e.touches.length === 1 ? { x: p.clientX, y: p.clientY } : null; }, { passive: true });
      on(stage, 'touchcancel', () => { touch = null; });
      on(stage, 'touchend', (e) => {
        if (!touch || !e.changedTouches[0]) return;
        const p = e.changedTouches[0], dx = p.clientX - touch.x, dy = p.clientY - touch.y; touch = null;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy) * 1.5) { swiped = Date.now(); setHero(hi + (dx > 0 ? 1 : -1), true); }
      });
      on(stage, 'click', () => { if (Date.now() - swiped > 400) openPD(featured[hi].id); });
      stage.style.cursor = 'pointer';
      on($('#hero'), 'pointermove', (e) => { if (e.pointerType === 'mouse' && silk) silk.tilt(e.clientX / innerWidth * 2 - 1, e.clientY / innerHeight * 2 - 1); });
      timers.push(setTimeout(() => {
        if (ac.signal.aborted) return;
        silk = Silk($('#silk'), { reduce, maxDpr: innerWidth < 720 ? 1.75 : 2, onReady: () => stage.classList.add('live'), onFail: () => { stage.classList.remove('live'); if (silk) silk.stop(); } });
        if (!silk) return;
        const p = featured[hi]; silk.set({ src: p.img, r1: p.r1, r2: p.r2, curl: curlOf(p) });
        let vis = true;
        if ('IntersectionObserver' in window) { const io = new IntersectionObserver((en) => { vis = en[0].isIntersecting; vis && !document.hidden ? silk.start() : silk.stop(); }, { threshold: 0.05 }); io.observe($('#hero')); ac.signal.addEventListener('abort', () => io.disconnect()); } else silk.start();
        on(document, 'visibilitychange', () => { document.hidden || !vis ? silk.stop() : silk.start(); });
        let rz; on(window, 'resize', () => { clearTimeout(rz); rz = setTimeout(silk.resize, 120); });
        if (S.hero.autoplay && !reduce && featured.length > 1) timers.push(setInterval(() => { if (vis && !document.hidden && !openSheet && Date.now() - lastTouch > 12000) setHero(hi + 1); }, 6500));
        ac.signal.addEventListener('abort', () => silk.stop());
      }, 60));
      let tick = false;
      on(window, 'scroll', () => { if (tick) return; tick = true; requestAnimationFrame(() => { tick = false; const h = $('#hero'); const st = scrollY > h.offsetTop + h.offsetHeight - 70; if (st !== $('#top').classList.contains('stuck')) { $('#top').classList.toggle('stuck', st); tint(st ? set.paper : featured[hi].bg); } }); }, { passive: true });
    }

    /* delegated events */
    on(host, 'click', (e) => {
      const el = e.target.closest('[data-add],[data-inc],[data-dec],[data-rm],[data-open],[data-close],[data-step],[data-fhair],[data-fneed],[data-hero],[data-pdq],[data-pdadd],[data-couponx],[data-rate],[data-shot],[data-rmphoto],#copymsg,#donecart,#wago,a[href="#top"]');
      if (!el) return; const d = el.dataset;
      if ('add' in d) return setQty(d.add, qtyOf(d.add) + 1, el.closest('.pc') ? $('.field img', el.closest('.pc')) : el);
      if ('inc' in d) return setQty(d.inc, qtyOf(d.inc) + 1, el);
      if ('dec' in d) return setQty(d.dec, qtyOf(d.dec) - 1);
      if ('rm' in d) return setQty(d.rm, 0);
      if ('open' in d) return openPD(d.open);
      if ('close' in d) return close();
      if ('step' in d) return goStep(+d.step);
      if ('fhair' in d) return setFilter('hair', d.fhair);
      if ('fneed' in d) return setFilter('need', d.fneed);
      if ('hero' in d) return setHero(+d.hero, true);
      if ('pdq' in d) { pdQty = Math.max(1, Math.min(20, pdQty + (+d.pdq))); return pdFoot(); }
      if ('pdadd' in d) { setQty(pdId, qtyOf(pdId) + pdQty, $('#pdtilt img')); pdQty = 1; return pdFoot(); }
      if ('couponx' in d) { cart.coupon = null; cart.couponMsg = ''; persist(); return renderCart(); }
      if ('rate' in d) return setRate(+d.rate);
      if ('shot' in d) { e.stopPropagation(); $('#lbin').innerHTML = '<img src="' + esc(el.querySelector('img').src) + '" alt="صورة نتيجة من الزبونة">'; return $('#lb').classList.add('on'); }
      if ('rmphoto' in d) { rphotos.splice(+d.rmphoto, 1); return drawThumbs(); }
      if (el.id === 'wago') { timers.push(setTimeout(() => { step = 4; renderCart(); }, 400)); return; }
      if (el.id === 'copymsg') { const m = message(totals()); (navigator.clipboard ? navigator.clipboard.writeText(m) : Promise.reject()).then(() => toast('تم نسخ نص الطلب'), () => toast('تعذر النسخ. انسخي النص من المعاينة.')); return; }
      if (el.id === 'donecart') { cart.items = []; cart.coupon = null; persist(); close(); renderGrid(); refreshBadges(); if (hasHero) heroBtn(); return toast('تم إفراغ السلة'); }
      if (el.matches('a[href="#top"]')) { e.preventDefault(); scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); }
    });
    on(document, 'keydown', (e) => {
      if (e.key === 'Escape') { if ($('#lb').classList.contains('on')) $('#lb').classList.remove('on'); else close(); }
      if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.field[data-open]')) { e.preventDefault(); openPD(e.target.dataset.open); }
    });
    on(host, 'submit', (e) => { if (e.target.id === 'cform') { e.preventDefault(); applyCoupon($('#cin').value); } });
    on(host, 'input', (e) => {
      const k = e.target.dataset && e.target.dataset.c; if (!k) return;
      cart.customer[k] = e.target.value; persist();
      if (errs[k]) { delete errs[k]; const f = e.target.closest('.fld'); f.classList.remove('bad'); const m = $('.err', f); if (m) m.remove(); e.target.removeAttribute('aria-invalid'); }
    });
    on(host, 'change', (e) => {
      const n = e.target.name; if (n !== 'reg' && n !== 'pay') return;
      if (n === 'reg') { cart.region = e.target.value; delete errs.region; } else { cart.payment = e.target.value; delete errs.payment; }
      persist(); const sc = $('#cbody').scrollTop; renderCart(); $('#cbody').scrollTop = sc;
    });

    if (cart.items.length) renderGrid();
    if (mine.length) renderReviews();
    refreshBadges();
    if (cart.coupon) api.checkCoupon(cart.coupon.code).then((r) => { if (!r || r.status !== 'ok') { cart.coupon = null; persist(); } }).catch(() => {});

    return () => { ac.abort(); timers.forEach((x) => { clearTimeout(x); clearInterval(x); }); document.body.classList.remove('lock'); };
  }

  return { html, hydrate };
}
