(function () {
  "use strict";

  var WORKS = window.WORKS || [];
  var FILTERS = window.FILTERS || [];
  var ARTIST = window.ARTIST || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var SLIDE_MS = 5000;

  /* ---------------- утилиты ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var rand = function (n) { return Math.floor(Math.random() * n); };

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function plural(n, forms) {
    var a = n % 100, b = n % 10;
    if (a > 10 && a < 15) return forms[2];
    if (b === 1) return forms[0];
    if (b > 1 && b < 5) return forms[1];
    return forms[2];
  }
  function metaLine(w) { return [w.tech, w.year].filter(Boolean).join(" · "); }
  function hue(hex) {
    var r = parseInt(hex.substr(1, 2), 16) / 255, g = parseInt(hex.substr(3, 2), 16) / 255, b = parseInt(hex.substr(5, 2), 16) / 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min, h = 0;
    if (!d) return 0;
    if (max === r) h = ((g - b) / d) % 6; else if (max === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h *= 60;
    return h < 0 ? h + 360 : h;
  }
  // <picture> с WebP и JPEG-запасом
  function pic(id, kind, alt, w, attrs) {
    return '<picture><source type="image/webp" srcset="img/' + kind + "/" + id + '.webp">' +
      '<img src="img/' + kind + "/" + id + '.jpg" alt="' + esc(alt) + '" width="' + w.w + '" height="' + w.h + '" decoding="async" ' + (attrs || 'loading="lazy"') + "></picture>";
  }
  var WEBP = (function () {
    try { return document.createElement("canvas").toDataURL("image/webp").indexOf("data:image/webp") === 0; } catch (e) { return false; }
  })();
  var EXT = WEBP ? ".webp" : ".jpg";

  WORKS.forEach(function (w, i) { w.no = pad(i + 1); });
  var byId = {};
  WORKS.forEach(function (w) { byId[w.id] = w; });
  var total = WORKS.length;

  /* ---------------- счётчики работ ---------------- */
  $$("[data-total]").forEach(function (el) { el.textContent = total + " " + plural(total, ["работа", "работы", "работ"]); });
  $$("[data-total-label]").forEach(function (el) { el.textContent = plural(total, ["работа на выставке", "работы на выставке", "работ на выставке"]); });
  var statTotal = $(".stats [data-count]");
  if (statTotal) { statTotal.setAttribute("data-count", total); statTotal.textContent = total; }

  /* ---------------- лента с названиями ---------------- */
  var titlesTape = $("#titlesTape");
  if (titlesTape) {
    var once = WORKS.map(function (w) { return "<span>" + esc(w.title) + "</span><i>✺</i>"; }).join("");
    titlesTape.innerHTML = once + once;
  }

  /* ---------------- Зал I ---------------- */
  var track = $("#hallTrack");
  var hallWorks = WORKS.filter(function (w) { return w.hall; });

  track.innerHTML = hallWorks.map(function (w) {
    return (
      '<article class="exhibit" style="--c:' + w.color + ";--ar:" + w.w + "/" + w.h + ";--arn:" + (w.w / w.h).toFixed(4) + '">' +
        '<a class="exhibit__frame" href="#work-' + w.id + '" data-open="' + w.id + '" aria-label="Открыть работу «' + esc(w.title) + '»">' +
          pic(w.id, "thumb", w.title, w) +
          (w.isNew ? '<span class="badge">новое</span>' : "") +
        "</a>" +
        '<div class="exhibit__label">' +
          '<span class="exhibit__num">№ ' + w.no + (metaLine(w) ? " · " + esc(metaLine(w)) : "") + "</span>" +
          '<h3 class="exhibit__title">' + esc(w.title) + "</h3>" +
          '<p class="exhibit__note">' + esc(w.note) + "</p>" +
        "</div>" +
      "</article>"
    );
  }).join("") +
    '<article class="exhibit exhibit--end">' +
      '<p class="eyebrow">Это ещё не всё</p>' +
      '<h3 class="h2">В коллекции — <span class="grad-text">' + total + " " + plural(total, ["работа", "работы", "работ"]) + "</span></h3>" +
      '<a class="btn btn--glow" href="#collection">Смотреть все <span aria-hidden="true">↓</span></a>' +
    "</article>";
  $("#hallAll").textContent = "/ " + pad(hallWorks.length);

  /* ---------------- Зал II: коллекция ---------------- */
  var grid = $("#grid");
  grid.innerHTML = WORKS.map(function (w, i) {
    return (
      '<a class="card reveal" href="#work-' + w.id + '" data-open="' + w.id + '" data-tags="' + w.tags.join(" ") + (w.isNew ? " new" : "") + '" ' +
        'style="--c:' + w.color + ";--ar:" + w.w + "/" + w.h + ";transition-delay:" + (i % 3) * 90 + 'ms">' +
        pic(w.id, "thumb", w.title, w) +
        (w.isNew ? '<span class="badge">новое</span>' : "") +
        '<div class="card__info">' +
          '<span class="card__num">№ ' + w.no + "</span>" +
          '<h3 class="card__title">' + esc(w.title) + "</h3>" +
        "</div>" +
      "</a>"
    );
  }).join("");

  var filtersEl = $("#filters");
  filtersEl.innerHTML = FILTERS.map(function (f, i) {
    var count = f.key === "all" ? total : WORKS.filter(function (w) {
      return f.key === "new" ? w.isNew : w.tags.indexOf(f.key) > -1;
    }).length;
    if (!count) return "";
    return '<button class="filter" type="button" data-filter="' + f.key + '" aria-pressed="' + (i === 0) + '">' +
      esc(f.label) + "<sup>" + count + "</sup></button>";
  }).join("");

  var cardsAll = $$(".card", grid);
  var cardsOrder = cardsAll.slice();
  var colCount = 0;
  var gridCount = $("#gridCount");

  function wantedCols() {
    var w = grid.clientWidth;
    return w >= 1400 ? 4 : w >= 860 ? 3 : 2;
  }

  // Masonry: каждую карточку — в самую короткую колонку, сохраняя порядок чтения
  function layoutGrid(force) {
    var n = wantedCols();
    if (n === colCount && !force) return;
    colCount = n;
    var cols = [], heights = [];
    var extra = window.innerWidth <= 760 ? 0.4 : 0.08;
    for (var c = 0; c < n; c++) {
      var col = document.createElement("div");
      col.className = "masonry__col";
      cols.push(col);
      heights.push(0);
    }
    cardsOrder.forEach(function (card) {
      if (card.classList.contains("is-hidden")) { cols[n - 1].appendChild(card); return; }
      var idx = heights.indexOf(Math.min.apply(null, heights));
      var w = byId[card.getAttribute("data-open")];
      cols[idx].appendChild(card);
      heights[idx] += w.h / w.w + extra;
    });
    grid.innerHTML = "";
    cols.forEach(function (col) { grid.appendChild(col); });
  }

  function visibleCards() {
    return cardsOrder.filter(function (c) { return !c.classList.contains("is-hidden"); });
  }
  function visibleGridList() {
    return visibleCards().map(function (c) { return byId[c.getAttribute("data-open")]; });
  }
  function updateCount() {
    var n = visibleCards().length;
    gridCount.textContent = n === total ? "Все " + total + " " + plural(total, ["работа", "работы", "работ"])
      : "Показано " + n + " из " + total;
  }

  function animateIn() {
    if (reduceMotion) return;
    var shown = 0;
    visibleCards().forEach(function (card) {
      card.classList.remove("is-entering");
      void card.offsetWidth;
      card.style.animationDelay = (shown++ % 10) * 55 + "ms";
      card.classList.add("is-entering");
    });
  }

  var currentFilter = "all";
  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter");
    if (!btn) return;
    currentFilter = btn.getAttribute("data-filter");
    $$(".filter", filtersEl).forEach(function (b) { b.setAttribute("aria-pressed", b === btn); });
    cardsAll.forEach(function (card) {
      var show = currentFilter === "all" || card.getAttribute("data-tags").split(" ").indexOf(currentFilter) > -1;
      card.classList.toggle("is-hidden", !show);
      card.classList.add("is-visible");
    });
    layoutGrid(true);
    animateIn();
    updateCount();
  });

  $$(".seg button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var mode = btn.getAttribute("data-sort");
      $$(".seg button").forEach(function (b) { b.setAttribute("aria-pressed", b === btn); });
      cardsOrder = cardsAll.slice();
      if (mode === "hue") {
        cardsOrder.sort(function (a, b) {
          return hue(byId[a.getAttribute("data-open")].color) - hue(byId[b.getAttribute("data-open")].color);
        });
      }
      cardsAll.forEach(function (c) { c.classList.add("is-visible"); });
      layoutGrid(true);
      animateIn();
    });
  });

  $("#randomBtn").addEventListener("click", function () {
    var list = visibleGridList();
    if (list.length) openWork(list[rand(list.length)].id, list);
  });

  layoutGrid();
  updateCount();

  /* ---------------- 3D-наклон карточек ---------------- */
  if (finePointer && !reduceMotion) {
    cardsAll.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add("is-tilt");
        card.style.transform = "perspective(900px) rotateX(" + ((0.5 - py) * 9).toFixed(2) + "deg) rotateY(" + ((px - 0.5) * 11).toFixed(2) + "deg) translateY(-6px)";
        card.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        card.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("is-tilt");
        card.style.transform = "";
      });
    });
  }

  /* ---------------- появление при прокрутке + счётчики ---------------- */
  function countUp(el) {
    var to = parseInt(el.getAttribute("data-count"), 10) || 0;
    if (reduceMotion || to < 2) { el.textContent = to; return; }
    var t0 = null;
    requestAnimationFrame(function step(t) {
      if (t0 === null) t0 = t;
      var k = Math.min(1, (t - t0) / 1300);
      el.textContent = Math.round(to * (1 - Math.pow(1 - k, 3)));
      if (k < 1) requestAnimationFrame(step);
    });
  }

  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var el = en.target;
        el.classList.add("is-visible");
        io.unobserve(el);
        // задержка нужна только для появления — потом убираем, чтобы наведение реагировало мгновенно
        if (el.style.transitionDelay) setTimeout(function () { el.style.transitionDelay = ""; }, 1300);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });

    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        countUp(en.target);
        cio.unobserve(en.target);
      });
    }, { threshold: 0.6 });
    $$("[data-count]").forEach(function (el) { el.textContent = "0"; cio.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- навигация, прогресс, кнопка «наверх» ---------------- */
  var nav = $("#nav");
  var scrollbar = $("#scrollbar");
  var totop = $("#totop");
  var navLinks = $$(".nav__links a[data-section]");
  var sections = navLinks.map(function (a) { return document.getElementById(a.getAttribute("data-section")); });

  function updateNav() {
    var y = window.scrollY, vh = window.innerHeight;
    var docH = document.documentElement.scrollHeight - vh;
    nav.classList.toggle("is-scrolled", y > 40);
    scrollbar.style.transform = "scaleX(" + (docH > 0 ? clamp(y / docH, 0, 1) : 0).toFixed(4) + ")";
    totop.classList.toggle("is-on", y > vh * 1.5);
    var line = vh * 0.45;
    sections.forEach(function (sec, i) {
      var r = sec.getBoundingClientRect();
      navLinks[i].classList.toggle("is-active", r.top <= line && r.bottom > line);
    });
  }
  totop.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" }); });

  /* ---------------- мобильное меню ---------------- */
  var burger = $("#burger"), menu = $("#menu");
  function setMenu(open) {
    menu.hidden = !open;
    burger.setAttribute("aria-expanded", open);
    burger.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
    document.body.classList.toggle("menu-open", open);
  }
  burger.addEventListener("click", function () { setMenu(menu.hidden); });
  menu.addEventListener("click", function (e) { if (e.target.closest("a")) setMenu(false); });

  /* ---------------- горизонтальный зал ---------------- */
  var hall = $("#hall");
  var hallSticky = $("#hallSticky");
  var viewport = $(".hall__viewport");
  var progress = $("#hallProgress");
  var hallNow = $("#hallNow");
  var exhibits = $$(".exhibit:not(.exhibit--end)", track);
  var centers = [];
  var hallDist = 0, hallIdx = -1;
  var isMobile = function () { return window.innerWidth <= 760; };

  function setHallIndex(i) {
    if (i === hallIdx) return;
    hallIdx = i;
    hallNow.textContent = pad(i + 1);
    hallSticky.style.setProperty("--hc", hallWorks[i].color);
  }

  function layoutHall() {
    centers = exhibits.map(function (e) { return e.offsetLeft + e.offsetWidth / 2; });
    if (isMobile()) {
      hall.style.height = "";
      track.style.transform = "";
      hallDist = 0;
      return;
    }
    hallDist = Math.max(0, track.scrollWidth - viewport.clientWidth);
    hall.style.height = window.innerHeight + hallDist + "px";
    updateHall();
  }

  function updateHall() {
    if (!hallDist) return;
    var r = hall.getBoundingClientRect();
    var totalH = hall.offsetHeight - window.innerHeight;
    var p = totalH > 0 ? clamp(-r.top / totalH, 0, 1) : 0;
    var x = p * hallDist;
    track.style.transform = "translate3d(" + (-x).toFixed(1) + "px,0,0)";
    progress.style.transform = "scaleX(" + p.toFixed(4) + ")";
    var mid = x + viewport.clientWidth / 2, best = 0, bestD = Infinity;
    centers.forEach(function (c, i) { var d = Math.abs(c - mid); if (d < bestD) { bestD = d; best = i; } });
    setHallIndex(best);
  }
  setHallIndex(0);

  // картины зала грузим заранее, когда посетитель подходит к залу
  function preloadHall() { $$("img", track).forEach(function (img) { img.loading = "eager"; }); }
  if ("IntersectionObserver" in window) {
    var hallIO = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { preloadHall(); hallIO.disconnect(); }
    }, { rootMargin: "1200px 0px" });
    hallIO.observe(hall);
  } else {
    preloadHall();
  }

  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      updateNav();
      updateHall();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { layoutHall(); layoutGrid(); onScroll(); }, 120);
  });
  window.addEventListener("load", layoutHall);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHall);
  layoutHall();
  onScroll();

  /* ---------------- hero: параллакс и живой коллаж ---------------- */
  var floats = $$(".float-card");
  var hero = $(".hero");
  if (!reduceMotion && finePointer) {
    hero.addEventListener("mousemove", function (e) {
      var x = e.clientX / window.innerWidth - 0.5;
      var y = e.clientY / window.innerHeight - 0.5;
      floats.forEach(function (el) {
        var d = parseFloat(el.getAttribute("data-depth")) || 1;
        el.style.setProperty("--mx", (-x * 28 * d).toFixed(1) + "px");
        el.style.setProperty("--my", (-y * 22 * d).toFixed(1) + "px");
      });
    });
    hero.addEventListener("mouseleave", function () {
      floats.forEach(function (el) { el.style.setProperty("--mx", "0px"); el.style.setProperty("--my", "0px"); });
    });
  }

  if (!reduceMotion && floats.length) {
    var swapBusy = false;
    setInterval(function () {
      if (swapBusy || document.hidden || !lb.hidden) return;
      if (hero.getBoundingClientRect().bottom < 0) return;
      var shown = floats.map(function (f) { return f.getAttribute("data-open"); });
      var pool = WORKS.filter(function (w) { return shown.indexOf(w.id) < 0; });
      var card = floats[rand(floats.length)];
      if (card.matches(":hover") || !pool.length) return;
      var w = pool[rand(pool.length)];
      var img = new Image();
      swapBusy = true;
      img.alt = "";
      img.className = "is-entering";
      img.onload = function () {
        card.appendChild(img);
        card.setAttribute("data-open", w.id);
        void img.offsetWidth; // фиксируем стартовое состояние, чтобы сработал плавный переход
        img.classList.remove("is-entering");
        setTimeout(function () {
          $$("picture, img", card).forEach(function (old) { if (old !== img && old.parentNode === card) card.removeChild(old); });
          swapBusy = false;
        }, 1300);
      };
      img.onerror = function () { swapBusy = false; };
      img.src = "img/thumb/" + w.id + EXT;
    }, 4200);
  }

  /* ---------------- курсор ---------------- */
  var cursor = $(".cursor");
  var ringLabel = $(".cursor__ring em");
  var lb = $("#lightbox");
  if (cursor && finePointer && !reduceMotion) {
    document.body.classList.add("has-cursor");
    var dot = $(".cursor__dot"), ring = $(".cursor__ring");
    var mx = -100, my = -100, rx = -100, ry = -100;
    document.addEventListener("mousemove", function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = "translate3d(" + mx + "px," + my + "px,0)";
    });
    (function loop() {
      rx += (mx - rx) * 0.18; ry += (my - ry) * 0.18;
      ring.style.transform = "translate3d(" + rx.toFixed(1) + "px," + ry.toFixed(1) + "px,0)";
      requestAnimationFrame(loop);
    })();
    document.addEventListener("mouseover", function (e) {
      var view = e.target.closest("[data-open], [data-cursor]");
      if (view && !lb.hidden && !lb.contains(view)) view = null;
      var link = e.target.closest("a, button");
      if (view) ringLabel.textContent = view.getAttribute("data-cursor") || "смотреть";
      cursor.classList.toggle("is-view", !!view);
      cursor.classList.toggle("is-link", !view && !!link);
    });
    document.addEventListener("mouseleave", function () { mx = my = -100; });
  }

  /* ---------------- живые глаза ---------------- */
  var eyes = [];
  $$("[data-eye]").forEach(function (slot, i) {
    var c = slot.getAttribute("data-eye") || "#2ee6d6";
    var almond = "M6,35 Q60,-6 114,35 Q60,76 6,35Z";
    slot.innerHTML =
      '<svg class="eye" viewBox="0 0 120 70" style="--lid:' + c + '" aria-hidden="true">' +
        '<defs><clipPath id="eyeClip' + i + '"><path d="' + almond + '"/></clipPath></defs>' +
        '<path class="eye__white" d="' + almond + '"/>' +
        '<g clip-path="url(#eyeClip' + i + ')">' +
          '<g class="eye__look">' +
            '<circle cx="60" cy="35" r="17" fill="' + c + '"/>' +
            '<circle cx="60" cy="35" r="15.5" fill="none" stroke="rgba(0,0,0,.28)" stroke-width="3"/>' +
            '<circle cx="60" cy="35" r="7.5" fill="#0c0910"/>' +
            '<circle cx="65.5" cy="29.5" r="3.2" fill="#fff"/>' +
          "</g>" +
          '<rect class="eye__lid eye__lid--top" x="0" y="-40" width="120" height="40"/>' +
          '<rect class="eye__lid eye__lid--bot" x="0" y="70" width="120" height="40"/>' +
        "</g>" +
        '<path class="eye__line" d="M6,35 Q60,-6 114,35"/>' +
        '<path class="eye__line" d="M33,19.6 L26,10 M49,15.3 L46,5 M60,14.5 L60,4 M71,15.3 L74,5 M87,19.6 L94,10"/>' +
      "</svg>";
    eyes.push({ el: $("svg", slot), look: $(".eye__look", slot) });
  });

  function lookAt(x, y) {
    eyes.forEach(function (eye) {
      var r = eye.el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > window.innerHeight) return;
      var dx = x - (r.left + r.width / 2), dy = y - (r.top + r.height / 2);
      var a = Math.atan2(dy, dx), f = Math.min(1, Math.hypot(dx, dy) / 260);
      eye.look.style.transform = "translate(" + (Math.cos(a) * 13 * f).toFixed(2) + "px," + (Math.sin(a) * 7 * f).toFixed(2) + "px)";
    });
  }
  if (eyes.length) {
    var eyeTick = false, lastMove = 0;
    if (finePointer) {
      document.addEventListener("mousemove", function (e) {
        lastMove = Date.now();
        if (eyeTick) return;
        eyeTick = true;
        requestAnimationFrame(function () { lookAt(e.clientX, e.clientY); eyeTick = false; });
      });
    }
    if (!reduceMotion) {
      // без мыши (телефон) или в покое — глаза осматриваются сами
      setInterval(function () {
        if (Date.now() - lastMove < 3000) return;
        eyes.forEach(function (eye) {
          eye.look.style.transform = "translate(" + (Math.random() * 24 - 12).toFixed(1) + "px," + (Math.random() * 12 - 6).toFixed(1) + "px)";
        });
      }, 1800);
      eyes.forEach(function (eye) {
        (function blink() {
          setTimeout(function () {
            eye.el.classList.add("is-blink");
            setTimeout(function () { eye.el.classList.remove("is-blink"); blink(); }, 140);
          }, 1800 + Math.random() * 4500);
        })();
      });
    }
  }

  /* ---------------- лайтбокс ---------------- */
  var lbImg = $("#lbImg");
  var lbWrap = $("#lbWrap");
  var lbAmbient = $("#lbAmbient");
  var lbCounter = $("#lbCounter");
  var lbNum = $(".lightbox__num", lb);
  var lbTitle = $(".lightbox__title", lb);
  var lbMeta = $(".lightbox__meta", lb);
  var lbNote = $(".lightbox__note", lb);
  var lbStrip = $("#lbStrip");
  var playBtn = $(".lb-play", lb);
  var zoomBtn = $(".lb-zoom", lb);
  var fullBtn = $(".lb-full", lb);
  var timer = $(".lb-timer", lb);
  var lbList = WORKS, lbIndex = 0, lastFocus = null;
  var zoomed = false, playing = false, slideT = null;

  timer.style.setProperty("--slide", SLIDE_MS / 1000 + "s");
  if (!(lb.requestFullscreen || lb.webkitRequestFullscreen)) fullBtn.hidden = true;

  function buildStrip() {
    lbStrip.innerHTML = lbList.map(function (w, i) {
      return '<button type="button" data-idx="' + i + '" style="--sc:' + w.color + '" aria-label="' + esc(w.title) + '">' +
        '<img src="img/mini/' + w.id + EXT + '" alt="" width="54" height="54"></button>';
    }).join("");
  }
  lbStrip.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-idx]");
    if (b) show(parseInt(b.getAttribute("data-idx"), 10));
  });

  function setZoom(on) {
    zoomed = on;
    lbWrap.classList.toggle("is-zoomed", on);
    zoomBtn.setAttribute("aria-pressed", on);
    lbWrap.setAttribute("data-cursor", on ? "уменьшить" : "увеличить");
    if (ringLabel && cursor.classList.contains("is-view")) ringLabel.textContent = lbWrap.getAttribute("data-cursor");
    if (on) setPlay(false);
    else { lbImg.style.setProperty("--ox", "50%"); lbImg.style.setProperty("--oy", "50%"); }
  }
  function setOrigin(e) {
    var r = lbWrap.getBoundingClientRect();
    var x = (e.clientX - r.left - lbImg.offsetLeft) / lbImg.offsetWidth;
    var y = (e.clientY - r.top - lbImg.offsetTop) / lbImg.offsetHeight;
    lbImg.style.setProperty("--ox", (clamp(x, 0, 1) * 100).toFixed(1) + "%");
    lbImg.style.setProperty("--oy", (clamp(y, 0, 1) * 100).toFixed(1) + "%");
  }
  lbWrap.addEventListener("click", function (e) {
    if (!zoomed) setOrigin(e);
    setZoom(!zoomed);
  });
  lbWrap.addEventListener("pointermove", function (e) { if (zoomed) setOrigin(e); });

  function schedule() {
    clearTimeout(slideT);
    timer.classList.remove("is-running");
    if (!playing) return;
    void timer.offsetWidth;
    timer.classList.add("is-running");
    slideT = setTimeout(function () { show(lbIndex + 1); }, SLIDE_MS);
  }
  function setPlay(on) {
    playing = on;
    playBtn.setAttribute("aria-pressed", on);
    if (on && zoomed) setZoom(false);
    schedule();
  }
  playBtn.addEventListener("click", function () { setPlay(!playing); });
  zoomBtn.addEventListener("click", function () { setZoom(!zoomed); });
  fullBtn.addEventListener("click", function () {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      (lb.requestFullscreen || lb.webkitRequestFullscreen).call(lb);
    }
  });

  function show(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    var w = lbList[lbIndex];
    if (zoomed) setZoom(false);
    lb.style.setProperty("--c", w.color);
    lbAmbient.style.backgroundImage = "url(img/mini/" + w.id + EXT + ")";
    lbImg.classList.add("is-loading");
    lbImg.alt = w.title;
    lbImg.onerror = function () { if (lbImg.src.indexOf(".webp") > -1) lbImg.src = lbImg.src.replace(".webp", ".jpg"); };
    lbImg.src = "img/thumb/" + w.id + EXT;
    var full = new Image();
    full.onload = function () { if (lbList[lbIndex] === w) lbImg.src = full.src; };
    full.onerror = function () { if (full.src.indexOf(".webp") > -1) full.src = full.src.replace(".webp", ".jpg"); };
    full.src = "img/full/" + w.id + EXT;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { lbImg.classList.remove("is-loading"); });
    });

    lbCounter.innerHTML = "<b>" + pad(lbIndex + 1) + "</b> / " + pad(lbList.length);
    lbNum.innerHTML = "№ " + w.no + " из " + total + (w.isNew ? ' <span class="badge">новое</span>' : "");
    lbTitle.textContent = w.title;
    lbMeta.textContent = metaLine(w);
    lbNote.textContent = w.note;

    $$("button", lbStrip).forEach(function (b, j) { b.setAttribute("aria-current", j === lbIndex); });
    var cur = lbStrip.children[lbIndex];
    if (cur) lbStrip.scrollTo({ left: cur.offsetLeft - lbStrip.clientWidth / 2 + cur.offsetWidth / 2, behavior: reduceMotion ? "auto" : "smooth" });

    try { history.replaceState(null, "", "#work-" + w.id); } catch (e) { /* file:// */ }
    [lbIndex + 1, lbIndex - 1].forEach(function (j) {
      var n = lbList[(j + lbList.length) % lbList.length];
      (new Image()).src = "img/full/" + n.id + EXT;
    });
    if (playing) schedule();
  }

  function openWork(id, list) {
    lbList = list && list.length ? list : WORKS;
    var i = lbList.indexOf(byId[id]);
    if (i < 0) { lbList = WORKS; i = WORKS.indexOf(byId[id]); }
    if (i < 0) return;
    lastFocus = document.activeElement;
    buildStrip();
    lb.hidden = false;
    document.body.classList.add("lb-open");
    if (cursor) cursor.classList.remove("is-view");
    show(i);
    $(".lb-close", lb).focus({ preventScroll: true });
  }

  function closeLb() {
    setPlay(false);
    setZoom(false);
    if (document.fullscreenElement) document.exitFullscreen().catch(function () {});
    lb.hidden = true;
    document.body.classList.remove("lb-open");
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) { /* file:// */ }
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-open]");
    if (!el || lb.contains(el)) return;
    e.preventDefault();
    var id = el.getAttribute("data-open");
    var list = el.classList.contains("card") ? visibleGridList()
      : el.classList.contains("exhibit__frame") ? hallWorks : WORKS;
    openWork(id, list);
  });

  $(".lb-close", lb).addEventListener("click", closeLb);
  $(".lightbox__bg", lb).addEventListener("click", closeLb);
  $(".lightbox__figure", lb).addEventListener("click", function (e) { if (e.target === e.currentTarget) closeLb(); });
  $(".lb-prev", lb).addEventListener("click", function () { show(lbIndex - 1); });
  $(".lb-next", lb).addEventListener("click", function () { show(lbIndex + 1); });

  document.addEventListener("keydown", function (e) {
    if (!menu.hidden && e.key === "Escape") { setMenu(false); return; }
    if (!$("html").classList.contains("intro-done") && $("html").classList.contains("intro-on")) {
      $("html").classList.add("intro-done");
    }
    if (lb.hidden) return;
    var k = e.key.toLowerCase();
    if (e.key === "Escape") { if (zoomed) setZoom(false); else closeLb(); }
    else if (e.key === "ArrowRight") show(lbIndex + 1);
    else if (e.key === "ArrowLeft") show(lbIndex - 1);
    else if (e.key === " " && !e.target.closest("a, button")) { e.preventDefault(); setPlay(!playing); }
    else if (k === "z" || k === "я") setZoom(!zoomed);
    else if ((k === "f" || k === "а") && !fullBtn.hidden) fullBtn.click();
    else if (e.key === "Tab") {
      var f = $$("button, a[href]", lb).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });

  var tx = 0, ty = 0;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (zoomed || e.target.closest(".lb-strip")) return;
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(lbIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // открыть работу по ссылке вида #work-13
  var m = location.hash.match(/^#work-(\d+)$/);
  if (m && byId[m[1]]) setTimeout(function () { openWork(m[1]); }, 300);

  /* ---------------- интро: клик — пропустить ---------------- */
  var intro = $("#intro");
  if (intro) intro.addEventListener("click", function () { document.documentElement.classList.add("intro-done"); });

  /* ---------------- поделиться ---------------- */
  var toast = $("#toast"), toastT;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove("is-on"); }, 2400);
  }
  function siteUrl() { return /^https?:/.test(location.protocol) ? location.href.split("#")[0] : ARTIST.site; }
  var shareTitle = "Неоновый бестиарий — онлайн-выставка Юлии Деревцовой";

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { say("Ссылка скопирована ✺"); }, function () { say(text); });
    }
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); say("Ссылка скопирована ✺"); } catch (e) { say(text); }
    document.body.removeChild(ta);
    return Promise.resolve();
  }

  $$("[data-share]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      var url = siteUrl();
      var kind = btn.getAttribute("data-share");
      if (kind === "vk") {
        window.open("https://vk.com/share.php?url=" + encodeURIComponent(url) + "&title=" + encodeURIComponent(shareTitle), "_blank", "noopener,width=640,height=520");
      } else if (kind === "tg") {
        window.open("https://t.me/share/url?url=" + encodeURIComponent(url) + "&text=" + encodeURIComponent(shareTitle), "_blank", "noopener");
      } else {
        copy(url);
      }
    });
  });

  $(".lb-share", lb).addEventListener("click", function () {
    var w = lbList[lbIndex];
    var url = siteUrl() + "#work-" + w.id;
    var text = "«" + w.title + "» — " + ARTIST.name;
    if (navigator.share) navigator.share({ title: text, text: text, url: url }).catch(function () {});
    else copy(url);
  });

  /* ---------------- разметка для поисковиков (schema.org) ---------------- */
  try {
    var ld = document.createElement("script");
    ld.type = "application/ld+json";
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ImageGallery",
      name: "Неоновый бестиарий",
      description: "Онлайн-выставка художницы " + ARTIST.name + ": " + total + " " + plural(total, ["работа", "работы", "работ"]) + ".",
      url: ARTIST.site,
      inLanguage: "ru",
      author: { "@type": "Person", name: ARTIST.name, sameAs: [ARTIST.profile, ARTIST.group] },
      hasPart: WORKS.map(function (w) {
        var o = {
          "@type": "VisualArtwork",
          name: w.title,
          description: w.note,
          image: ARTIST.site + "img/full/" + w.id + ".jpg",
          url: ARTIST.site + "#work-" + w.id,
          creator: { "@type": "Person", name: ARTIST.name }
        };
        if (w.tech) o.artMedium = w.tech;
        return o;
      })
    });
    document.head.appendChild(ld);
  } catch (e) { /* не критично */ }

  $("#year").textContent = new Date().getFullYear();
})();
