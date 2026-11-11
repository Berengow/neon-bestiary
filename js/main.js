(function () {
  "use strict";

  var WORKS = window.WORKS || [];
  var FILTERS = window.FILTERS || [];
  var ARTIST = window.ARTIST || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pad = function (n) { return (n < 10 ? "0" : "") + n; };
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };

  // каталожный номер = порядок в списке
  WORKS.forEach(function (w, i) { w.no = pad(i + 1); });
  var byId = {};
  WORKS.forEach(function (w) { byId[w.id] = w; });

  function metaLine(w) {
    return [w.tech, w.year].filter(Boolean).join(" · ");
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ---------------- Зал I ---------------- */
  var track = $("#hallTrack");
  var hallWorks = WORKS.filter(function (w) { return w.hall; });

  track.innerHTML = hallWorks.map(function (w) {
    return (
      '<article class="exhibit" style="--c:' + w.color + ";--ar:" + w.w + "/" + w.h + ";--arn:" + (w.w / w.h).toFixed(4) + '">' +
        '<a class="exhibit__frame" href="#work-' + w.id + '" data-open="' + w.id + '" data-view aria-label="Открыть работу «' + esc(w.title) + '»">' +
          '<img src="img/thumb/' + w.id + '.jpg" alt="' + esc(w.title) + '" loading="lazy" decoding="async" width="' + w.w + '" height="' + w.h + '">' +
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
      '<h3 class="h2">В коллекции — <span class="grad-text">' + WORKS.length + " работ</span></h3>" +
      '<a class="btn btn--glow" href="#collection">Смотреть все <span aria-hidden="true">↓</span></a>' +
    "</article>";

  /* ---------------- Зал II: коллекция ---------------- */
  var grid = $("#grid");
  grid.innerHTML = WORKS.map(function (w, i) {
    return (
      '<a class="card reveal" href="#work-' + w.id + '" data-open="' + w.id + '" data-tags="' + w.tags.join(" ") + '" data-view ' +
        'style="--c:' + w.color + ";--ar:" + w.w + "/" + w.h + ";transition-delay:" + (i % 3) * 90 + 'ms">' +
        '<img src="img/thumb/' + w.id + '.jpg" alt="' + esc(w.title) + '" loading="lazy" decoding="async" width="' + w.w + '" height="' + w.h + '">' +
        '<div class="card__info">' +
          '<span class="card__num">№ ' + w.no + "</span>" +
          '<h3 class="card__title">' + esc(w.title) + "</h3>" +
        "</div>" +
      "</a>"
    );
  }).join("");

  var filtersEl = $("#filters");
  filtersEl.innerHTML = FILTERS.map(function (f, i) {
    var count = f.key === "all" ? WORKS.length : WORKS.filter(function (w) { return w.tags.indexOf(f.key) > -1; }).length;
    return '<button class="filter" type="button" role="tab" data-filter="' + f.key + '" aria-selected="' + (i === 0) + '">' +
      esc(f.label) + "<sup>" + count + "</sup></button>";
  }).join("");

  // Masonry: раскладываем карточки по колонкам (каждую — в самую короткую), сохраняя порядок чтения
  var cards = $$(".card", grid);
  var colCount = 0;

  function wantedCols() {
    var w = grid.clientWidth;
    return w >= 1400 ? 4 : w >= 860 ? 3 : 2;
  }

  function layoutGrid(force) {
    var n = wantedCols();
    if (n === colCount && !force) return;
    colCount = n;
    var cols = [], heights = [];
    var extra = window.innerWidth <= 760 ? 0.4 : 0.08; // подпись под карточкой на телефоне
    for (var c = 0; c < n; c++) {
      var col = document.createElement("div");
      col.className = "masonry__col";
      cols.push(col);
      heights.push(0);
    }
    cards.forEach(function (card) {
      if (card.classList.contains("is-hidden")) { cols[n - 1].appendChild(card); return; }
      var idx = heights.indexOf(Math.min.apply(null, heights));
      var w = byId[card.getAttribute("data-open")];
      cols[idx].appendChild(card);
      heights[idx] += w.h / w.w + extra;
    });
    grid.innerHTML = "";
    cols.forEach(function (col) { grid.appendChild(col); });
  }
  layoutGrid();

  filtersEl.addEventListener("click", function (e) {
    var btn = e.target.closest(".filter");
    if (!btn) return;
    var key = btn.getAttribute("data-filter");
    $$(".filter", filtersEl).forEach(function (b) { b.setAttribute("aria-selected", b === btn); });
    var shown = 0;
    cards.forEach(function (card) {
      var show = key === "all" || card.getAttribute("data-tags").split(" ").indexOf(key) > -1;
      card.classList.toggle("is-hidden", !show);
      card.classList.remove("is-entering");
      card.classList.add("is-visible");
      if (show && !reduceMotion) {
        void card.offsetWidth;
        card.style.animationDelay = (shown++ % 8) * 60 + "ms";
        card.classList.add("is-entering");
      }
    });
    layoutGrid(true);
  });

  /* ---------------- Появление при прокрутке ---------------- */
  if ("IntersectionObserver" in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("is-visible");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    $$(".reveal").forEach(function (el) { io.observe(el); });
  } else {
    $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* ---------------- Навигация ---------------- */
  var nav = $("#nav");

  /* ---------------- Горизонтальный зал (pin + scroll) ---------------- */
  var hall = $("#hall");
  var viewport = $(".hall__viewport");
  var progress = $("#hallProgress");
  var hallDist = 0;
  var isMobile = function () { return window.innerWidth <= 760; };

  function layoutHall() {
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
    var total = hall.offsetHeight - window.innerHeight;
    var p = total > 0 ? clamp(-r.top / total, 0, 1) : 0;
    track.style.transform = "translate3d(" + (-p * hallDist).toFixed(1) + "px,0,0)";
    progress.style.transform = "scaleX(" + p.toFixed(4) + ")";
  }

  // картины зала грузим заранее, когда посетитель подходит к залу (иначе lazy-load «проявляет» их уже на виду)
  function preloadHall() {
    $$("img", track).forEach(function (img) { img.loading = "eager"; });
  }
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
      nav.classList.toggle("is-scrolled", window.scrollY > 40);
      updateHall();
      ticking = false;
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  var resizeT;
  window.addEventListener("resize", function () {
    clearTimeout(resizeT);
    resizeT = setTimeout(function () { layoutHall(); layoutGrid(); }, 120);
  });
  window.addEventListener("load", layoutHall);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutHall);
  layoutHall();
  onScroll();

  /* ---------------- Параллакс в hero ---------------- */
  var stage = $(".hero__stage");
  var floats = $$(".float-card");
  if (stage && !reduceMotion && window.matchMedia("(hover: hover)").matches) {
    var hero = $(".hero");
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

  /* ---------------- Курсор ---------------- */
  var cursor = $(".cursor");
  if (cursor && window.matchMedia("(hover: hover) and (pointer: fine)").matches && !reduceMotion) {
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
      var view = e.target.closest("[data-view], [data-open]");
      var link = e.target.closest("a, button");
      cursor.classList.toggle("is-view", !!view && !document.body.classList.contains("lb-open"));
      cursor.classList.toggle("is-link", !view && !!link);
    });
    document.addEventListener("mouseleave", function () { mx = my = -100; });
  }

  /* ---------------- Лайтбокс ---------------- */
  var lb = $("#lightbox");
  var lbImg = $(".lightbox__img", lb);
  var lbNum = $(".lightbox__num", lb);
  var lbTitle = $(".lightbox__title", lb);
  var lbMeta = $(".lightbox__meta", lb);
  var lbNote = $(".lightbox__note", lb);
  var lbList = WORKS;
  var lbIndex = 0;
  var lastFocus = null;

  function visibleGridList() {
    return $$(".card", grid).filter(function (c) { return !c.classList.contains("is-hidden"); })
      .map(function (c) { return byId[c.getAttribute("data-open")]; })
      .sort(function (a, b) { return WORKS.indexOf(a) - WORKS.indexOf(b); });
  }

  function show(i) {
    lbIndex = (i + lbList.length) % lbList.length;
    var w = lbList[lbIndex];
    lb.style.setProperty("--c", w.color);
    lbImg.classList.add("is-loading");
    lbImg.alt = w.title;
    lbImg.src = "img/thumb/" + w.id + ".jpg";
    var full = new Image();
    full.onload = function () {
      if (lbList[lbIndex] === w) lbImg.src = full.src;
    };
    full.src = "img/full/" + w.id + ".jpg";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { lbImg.classList.remove("is-loading"); });
    });
    lbNum.textContent = "№ " + w.no + " из " + WORKS.length;
    lbTitle.textContent = w.title;
    lbMeta.textContent = metaLine(w);
    lbNote.textContent = w.note;
    try { history.replaceState(null, "", "#work-" + w.id); } catch (e) { /* file:// */ }
    // подгружаем соседей
    [lbIndex + 1, lbIndex - 1].forEach(function (j) {
      var n = lbList[(j + lbList.length) % lbList.length];
      (new Image()).src = "img/full/" + n.id + ".jpg";
    });
  }

  function openWork(id, list) {
    lbList = list && list.length ? list : WORKS;
    var i = lbList.indexOf(byId[id]);
    if (i < 0) { lbList = WORKS; i = WORKS.indexOf(byId[id]); }
    if (i < 0) return;
    lastFocus = document.activeElement;
    lb.hidden = false;
    document.body.classList.add("lb-open");
    if (cursor) cursor.classList.remove("is-view");
    show(i);
    $(".lb-close", lb).focus({ preventScroll: true });
  }

  function closeLb() {
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
  $(".lb-prev", lb).addEventListener("click", function () { show(lbIndex - 1); });
  $(".lb-next", lb).addEventListener("click", function () { show(lbIndex + 1); });
  lbImg.addEventListener("click", function () { show(lbIndex + 1); });

  document.addEventListener("keydown", function (e) {
    if (lb.hidden) return;
    if (e.key === "Escape") closeLb();
    else if (e.key === "ArrowRight") show(lbIndex + 1);
    else if (e.key === "ArrowLeft") show(lbIndex - 1);
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
    var dx = e.changedTouches[0].clientX - tx;
    var dy = e.changedTouches[0].clientY - ty;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3) show(lbIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  // открыть работу по ссылке вида #work-13
  var m = location.hash.match(/^#work-(\d+)$/);
  if (m && byId[m[1]]) setTimeout(function () { openWork(m[1]); }, 300);

  /* ---------------- Поделиться ---------------- */
  var toast = $("#toast"), toastT;
  function say(msg) {
    toast.textContent = msg;
    toast.classList.add("is-on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove("is-on"); }, 2400);
  }

  function siteUrl() { return location.href.split("#")[0]; }
  var shareTitle = "Неоновый бестиарий — онлайн-выставка Юлии Деревцовой";

  function copy(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { say("Ссылка скопирована ✺"); });
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
    if (navigator.share) {
      navigator.share({ title: text, text: text, url: url }).catch(function () {});
    } else {
      copy(url);
    }
  });

  $("#year").textContent = new Date().getFullYear();
})();
