/* Cavalier print generator (print.html). Plain JS, no build step.
 * Builds seat-back cards and hand-out cards with a driver's rider-referral QR code.
 * URL options: ?code=CODE  &layout=seatback|half|cards  &theme=dark|light  &half=2up|single
 *              &mode=prelaunch|live (preview override; normally read from js/config.js)
 * The QR always points at the RIDER page (SITE_URL from config, + ?ref=CODE). */
(function () {
  "use strict";

  var CFG = window.CAVALIER_CONFIG || {};
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var params = new URLSearchParams(location.search);

  /* ---------- helpers (same rules as app.js / driver.js) ---------- */
  function cleanRef(v) { return String(v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function launchTime() { var t = Date.parse(CFG.LAUNCH_DATE || ""); return isNaN(t) ? null : t; }
  function isLive() {
    var m = params.get("mode") || CFG.MODE;
    if (m === "live") return true;
    if (m === "prelaunch") return false;
    var t = launchTime(); return t !== null && Date.now() >= t;
  }
  function launchShort() { // "March 22"
    var t = launchTime(); if (t === null) return "";
    try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "long", day: "numeric" }).format(new Date(t)); }
    catch (e) { return ""; }
  }
  function siteBase() {
    var u = String(CFG.SITE_URL || "").trim();
    if (u) return u.replace(/\/?$/, "/");
    return location.origin + location.pathname.replace(/[^\/]*$/, "");
  }
  function riderUrl(code) { return siteBase() + (code ? "?ref=" + encodeURIComponent(code) : ""); }
  function displayHost() { return siteBase().replace(/^https?:\/\//, "").replace(/\/$/, ""); }
  var CODE_RE = /^[A-Z]{1,6}-[2-9A-HJKMNP-Z]{4}$/; // format made by the sign-up forms (NAME-7K3Q)

  /* ---------- copy (pre-launch vs live) ---------- */
  function copy() {
    var live = isLive(), d = launchShort();
    if (live) return {
      launch: "Now live in Albany. Download the app.",
      launchBand: "Now live in Albany",
      cta: "Scan to get the app",
      ctaSub: "Sign up, then download Cavalier.",
      cardFoot: "Now live in Albany"
    };
    return {
      launch: (d ? "Launching " + d + " in Albany." : "Launching soon in Albany.") + " Join the rider list.",
      launchBand: d ? "Launching " + d + " in Albany" : "Launching soon in Albany",
      cta: "Scan to join the rider list",
      ctaSub: "Be first to ride when we launch.",
      cardFoot: d ? "Launching " + d + " · Albany, NY" : "Launching soon · Albany, NY"
    };
  }

  /* ---------- QR (dark modules, no built-in margin; quiet zone comes from the white box) ---------- */
  function qrSvg(text) {
    if (typeof qrcode !== "function") return '<p class="qr-missing">QR unavailable</p>';
    var qr = qrcode(0, "M"); qr.addData(text); qr.make();
    var n = qr.getModuleCount(), d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (qr.isDark(r, c)) d += "M" + c + " " + r + "h1v1h-1z";
    return '<svg class="qr-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + n + " " + n + '" shape-rendering="crispEdges" role="img" aria-label="QR code: ' + esc(text) + '"><path fill="#000" d="' + d + '"/></svg>';
  }

  /* ---------- pieces ---------- */
  var MARK = '<img class="c-mark" src="assets/print/mark.svg" alt="">';
  var WORD = '<img class="c-word" src="assets/print/wordmark-white.png" alt="Cavalier">';
  var BENEFITS = [
    ["Upfront prices.", "Know your fare before you ride."],
    ["Set night rates.", "No surprise surge multipliers."],
    ["Local drivers.", "They keep more of every fare."]
  ];
  function benefitsHtml() {
    return '<ul class="p-benefits">' + BENEFITS.map(function (b) {
      return '<li><span class="p-tick" aria-hidden="true"></span><span><b>' + b[0] + "</b> " + b[1] + "</span></li>";
    }).join("") + "</ul>";
  }
  function codeLine(code) {
    return code
      ? '<p class="p-code"><span>Driver code</span> <b' + (code.length > 12 ? ' class="long"' : "") + ">" + esc(code) + "</b></p>"
      : '<p class="p-code"><b>' + esc(displayHost()) + "</b></p>";
  }

  function poster(size, code, url, t) {
    return '<article class="poster poster--' + size + '"><div class="p-panel">' +
      '<header class="p-brand">' + MARK + WORD + "</header>" +
      '<h2 class="p-head">Albany\u2019s local ride.<span>Save 20\u201330% on average<br>compared to other apps.</span></h2>' +
      benefitsHtml() +
      '<div class="p-qrblock">' +
        '<div class="p-qrbox">' + qrSvg(url) + "</div>" +
        '<div class="p-qrtext"><p class="p-cta">' + esc(t.cta) + '</p><p class="p-ctasub">' + esc(t.ctaSub) + "</p>" + codeLine(code) + "</div>" +
      "</div>" +
      '<p class="p-launch">' + esc(t.launch) + "</p>" +
      '<p class="p-ask">Questions about Cavalier? Ask your driver.</p>' +
      "</div></article>";
  }

  function cardFront(t) {
    return '<div class="hc hc--front"><div class="hc-in">' +
      '<div class="hc-brand">' + MARK + WORD + "</div>" +
      '<p class="hc-head">Albany\u2019s local ride.<span>Save 20\u201330% on average<br>compared to other apps.</span></p>' +
      '<p class="hc-foot"><span>' + esc(t.cardFoot) + "</span><span>" + esc(displayHost()) + "</span></p>" +
      "</div></div>";
  }
  function cardBack(code, url, t) {
    return '<div class="hc hc--back"><div class="hc-in">' +
      '<div class="hc-qr">' + qrSvg(url) + "</div>" +
      '<div class="hc-text"><p class="hc-cta">' + esc(t.cta) + '</p><p class="hc-sub">' + esc(t.launch.replace(/ (Join the rider list|Download the app)\.$/, "")) + "</p>" +
      (code ? '<p class="hc-code"><span>Driver code</span><b>' + esc(code) + '</b></p><p class="hc-url">' + esc(displayHost()) + "</p>" : '<p class="hc-code"><b>' + esc(displayHost()) + "</b></p>") +
      "</div></div></div>";
  }

  /* crop marks for the 10-up sheet (letter, 2 x 5 cards of 3.5 x 2 in; 0.75 in side, 0.5 in top margins) */
  function cropMarks() {
    var s = "", xs = [0.75, 4.25, 7.75], ys = [0.5, 2.5, 4.5, 6.5, 8.5, 10.5], g = 0.125; // gap so marks stay off the bleed
    xs.forEach(function (x) { s += line(x, 0.18, x, 0.5 - g) + line(x, 10.5 + g, x, 10.82); });
    ys.forEach(function (y) { s += line(0.26, y, 0.75 - g, y) + line(7.75 + g, y, 8.24, y); });
    function line(a, b, c, d) { return '<line x1="' + a + '" y1="' + b + '" x2="' + c + '" y2="' + d + '"/>'; }
    return '<svg class="crops" viewBox="0 0 8.5 11" aria-hidden="true"><g stroke="#000" stroke-width="0.006">' + s + "</g></svg>";
  }

  /* ---------- sheets ---------- */
  var PAGE = { seatback: "8.5in 11in", half2up: "11in 8.5in", halfsingle: "5.5in 8.5in", cards: "8.5in 11in" };

  function build(state) {
    var t = copy(), url = riderUrl(state.code), html = "", page;
    function sheet(cls, label, inner) {
      return '<div class="sheet-wrap"><p class="sheet-label no-print">' + label + '</p><div class="sheet-scale"><div class="sheet ' + cls + " theme-" + state.theme + '">' + inner + "</div></div></div>";
    }
    if (state.layout === "seatback") {
      page = PAGE.seatback;
      html = sheet("sheet--letter", "Seat-back card · 8.5 × 11 in", poster("letter", state.code, url, t));
    } else if (state.layout === "half") {
      if (state.half === "single") {
        page = PAGE.halfsingle;
        html = sheet("sheet--half", "Half-size card · 5.5 × 8.5 in", poster("half", state.code, url, t));
      } else {
        page = PAGE.half2up;
        html = sheet("sheet--letter-land", "2 half-size cards on one letter sheet (landscape) · cut on the dotted line",
          poster("half", state.code, url, t) + poster("half", state.code, url, t) + '<div class="cutline"></div>');
      }
    } else {
      page = PAGE.cards;
      var fronts = "", backs = "";
      for (var i = 0; i < 10; i++) { fronts += cardFront(t); backs += cardBack(state.code, url, t); }
      html = sheet("sheet--letter sheet--cards", "Sheet 1 of 2 · card fronts", '<div class="bleed"></div><div class="hc-grid">' + fronts + "</div>" + cropMarks()) +
             sheet("sheet--letter sheet--cards sheet--backs", "Sheet 2 of 2 · card backs (print on the back of sheet 1)", '<div class="hc-grid">' + backs + "</div>" + cropMarks());
    }
    $("#page-size").textContent = "@page { size: " + page + "; margin: 0; }";
    var pv = $("#pt-preview"); pv.className = "pt-preview layout-" + state.layout; pv.innerHTML = html;
    fit();
    return url;
  }

  /* scale real-size sheets down to fit the screen (print uses real size) */
  function fit() {
    $$(".sheet-scale").forEach(function (w) {
      var s = w.firstChild; s.style.transform = ""; w.style.height = "";
      var avail = Math.min(w.parentNode.clientWidth, 900), sw = s.offsetWidth;
      var k = Math.min(1, avail / sw);
      s.style.transform = "scale(" + k + ")"; w.style.width = sw * k + "px"; w.style.height = s.offsetHeight * k + "px";
    });
  }
  window.addEventListener("resize", fit);

  /* ---------- tips ---------- */
  var TIPS = {
    seatback: "Print on <b>letter</b> cardstock at <b>100% / Actual size</b> (turn off \u201cFit to page\u201d). Slide it into a clear seat-back holder.",
    half2up: "Print on <b>letter</b> cardstock, <b>landscape</b>, at <b>100% / Actual size</b>. Cut down the middle dotted line to get two 5.5 \u00d7 8.5 in cards.",
    halfsingle: "For print shops or 5.5 \u00d7 8.5 in paper. Print at <b>100% / Actual size</b>.",
    cards: "Print sheet 1 and sheet 2 on the <b>front and back</b> of one sheet of cardstock (double-sided, <b>flip on long edge</b>) at <b>100% / Actual size</b>. Cut on the crop marks. The layout matches standard 10-per-sheet 3.5 \u00d7 2 in business-card sheets; try one on plain paper first and hold it up to a light to check the backs line up."
  };

  /* ---------- state + UI ---------- */
  var state = {
    code: cleanRef(params.get("code") || params.get("ref")),
    layout: ({ seatback: 1, half: 1, cards: 1 })[params.get("layout")] ? params.get("layout") : "seatback",
    theme: params.get("theme") === "light" ? "light" : "dark",
    half: params.get("half") === "single" ? "single" : "2up"
  };
  if (!state.code && !params.has("code")) { try { state.code = cleanRef(localStorage.getItem("cavalier_my_ref_code")); } catch (e) { /* ignore */ } }

  var form = $("#pt-form"), codeIn = $("#pt-code"), noCode = $("#pt-nocode");
  codeIn.value = state.code; noCode.checked = !state.code && params.has("code");
  $$('input[name="layout"]').forEach(function (r) { r.checked = r.value === state.layout; });
  $$('input[name="theme"]').forEach(function (r) { r.checked = r.value === state.theme; });
  $$('input[name="half"]').forEach(function (r) { r.checked = r.value === state.half; });

  function render() {
    var url = build(state);
    $("#pt-url").textContent = url;
    $("#pt-half-opt").hidden = state.layout !== "half";
    $("#pt-tips").innerHTML = "<p>" + TIPS[state.layout === "half" ? "half" + state.half : state.layout] + "</p>";
    var w = $("#pt-warn"), msg = "";
    if (!state.code && !noCode.checked) msg = "No driver code entered, so these cards aren't linked to you. Enter your code above, or tick \u201cGeneral card\u201d.";
    else if (state.code && !CODE_RE.test(state.code)) msg = "Double-check this code. Sign-up codes look like NAME-7K3Q (letters, a dash, then 4 characters).";
    if (!String(CFG.SITE_URL || "").trim() && /^(localhost|127\.|file)/.test(location.hostname || "file")) msg += (msg ? " " : "") + "This page is running from a test address, so set SITE_URL in js/config.js before printing.";
    w.textContent = msg; w.hidden = !msg;
    var q = new URLSearchParams();
    q.set("code", state.code);
    if (state.layout !== "seatback") q.set("layout", state.layout);
    if (state.theme !== "dark") q.set("theme", state.theme);
    if (state.layout === "half" && state.half !== "2up") q.set("half", state.half);
    if (params.get("mode")) q.set("mode", params.get("mode"));
    try { history.replaceState(null, "", location.pathname + "?" + q.toString()); } catch (e) { /* file:// */ }
  }

  form.addEventListener("submit", function (e) { e.preventDefault(); state.code = noCode.checked ? "" : cleanRef(codeIn.value); codeIn.value = state.code; render(); });
  codeIn.addEventListener("input", function () { var c = cleanRef(codeIn.value); if (c !== codeIn.value) codeIn.value = c; if (c) noCode.checked = false; });
  codeIn.addEventListener("change", function () { state.code = noCode.checked ? "" : cleanRef(codeIn.value); render(); });
  noCode.addEventListener("change", function () { if (noCode.checked) { codeIn.value = ""; state.code = ""; } render(); });
  $$('input[name="layout"],input[name="theme"],input[name="half"]').forEach(function (r) {
    r.addEventListener("change", function () { state[r.name] = r.value; render(); });
  });
  $("#pt-print").addEventListener("click", function () { window.print(); });
  window.addEventListener("beforeprint", function () { $$(".sheet").forEach(function (s) { s.style.transform = ""; }); });
  window.addEventListener("afterprint", fit);

  render();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
})();
