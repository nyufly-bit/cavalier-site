/* Cavalier sign-up site — plain JS, no build step. Settings live in js/config.js. */
(function () {
  "use strict";

  var CFG = window.CAVALIER_CONFIG || {};
  var LS = { ref: "cavalier_ref", subs: "cavalier_submissions", myCode: "cavalier_my_ref_code" };
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- helpers ---------- */
  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }
  function launchTime() { var t = Date.parse(CFG.LAUNCH_DATE || ""); return isNaN(t) ? null : t; }
  function isLive() {
    if (CFG.MODE === "live") return true;
    if (CFG.MODE === "prelaunch") return false;
    var t = launchTime(); return t !== null && Date.now() >= t;
  }
  function fmtLaunch() {
    var t = launchTime(); if (t === null) return "";
    try {
      return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(t));
    } catch (e) { return new Date(t).toDateString(); }
  }
  function cleanRef(v) { return String(v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20); }
  function digits(v) { return String(v || "").replace(/\D/g, ""); }
  function normPhone(v) { var d = digits(v); if (d.length === 11 && d[0] === "1") d = d.slice(1); return d.length === 10 ? d : null; }
  function prettyPhone(d) { return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6); }
  function device() {
    var ua = navigator.userAgent || "";
    if (/iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "other";
  }

  /* ---------- referral capture (?ref=CODE) ---------- */
  var params = new URLSearchParams(location.search);
  var urlRef = cleanRef(params.get("ref"));
  if (urlRef) store(LS.ref, urlRef);
  var activeRef = urlRef || cleanRef(store(LS.ref));
  if (activeRef) { $("#ref-code-label").textContent = activeRef; $("#ref-note").hidden = false; }

  /* ---------- launch date / countdown ---------- */
  var launchStr = fmtLaunch();
  if (isLive()) $("#launch-pill").textContent = "Now live in Albany, NY";
  else if (launchStr) $("#launch-pill").textContent = "Launching in Albany · " + launchStr;
  else $("#launch-pill").textContent = "Launching soon in Albany, NY";

  var countdowns = [];
  function tick() {
    var t = launchTime(); if (t === null) return;
    var ms = Math.max(0, t - Date.now());
    var s = Math.floor(ms / 1000);
    var v = { d: Math.floor(s / 86400), h: Math.floor(s % 86400 / 3600), m: Math.floor(s % 3600 / 60), s: s % 60 };
    countdowns.forEach(function (el) {
      $$("[data-cd]", el).forEach(function (n) { var k = n.getAttribute("data-cd"); n.textContent = k === "d" ? v[k] : String(v[k]).padStart(2, "0"); });
    });
  }
  function showCountdown(el) {
    if (launchTime() === null || isLive()) return;
    el.hidden = false; if (countdowns.indexOf(el) < 0) countdowns.push(el); tick();
  }
  showCountdown($("#hero-countdown"));
  setInterval(tick, 1000);

  /* ---------- rider form (home page is rider-only; drivers use /drive) ---------- */
  function showForm(focus) {
    $("#thanks").hidden = true; $("#panel-rider").hidden = false;
    $("#ref-note").hidden = !activeRef;
    if (focus) {
      $("#signup").scrollIntoView({ behavior: "smooth", block: "start" });
      $("#r-name").focus({ preventScroll: true });
    }
  }
  $$("[data-focus-form]").forEach(function (a) {
    a.addEventListener("click", function (e) { e.preventDefault(); showForm(true); });
  });

  /* ---------- validation ---------- */
  function setErr(input, errEl, msg) {
    if (errEl) errEl.textContent = msg || "";
    if (input) { input.setAttribute("aria-invalid", msg ? "true" : "false"); if (errEl) input.setAttribute("aria-describedby", errEl.id); }
    return !msg;
  }
  function validate(form) {
    var p = "r", ok = true, first = null;
    function check(id, msg) { var i = $("#" + p + "-" + id), e = $("#" + p + "-" + id + "-err"); var good = setErr(i, e, msg); if (!good) { ok = false; first = first || i; } }
    var name = form.name.value.trim();
    check("name", name.length < 2 ? "Please enter your name." : "");
    check("phone", normPhone(form.phone.value) ? "" : "Please enter a 10-digit US mobile number.");
    check("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()) ? "" : "Please enter a valid email address.");
    if (first) first.focus();
    return ok;
  }
  $$(".form input").forEach(function (i) { i.addEventListener("input", function () { if (i.getAttribute("aria-invalid") === "true") { i.setAttribute("aria-invalid", "false"); var e = document.getElementById(i.getAttribute("aria-describedby")); if (e) e.textContent = ""; } }); });
  $$('input[type="tel"]').forEach(function (i) { i.addEventListener("blur", function () { var d = normPhone(i.value); if (d) i.value = prettyPhone(d); }); });

  /* ---------- submit ---------- */
  function send(payload) {
    var url = (CFG.FORM_ENDPOINT || "").trim();
    if (!url) {
      var list = []; try { list = JSON.parse(store(LS.subs) || "[]"); } catch (e) {}
      list.push(payload); store(LS.subs, JSON.stringify(list));
      console.info("[Cavalier dev] No FORM_ENDPOINT set in js/config.js — sign-up saved only in this browser's localStorage (key: " + LS.subs + ").", payload);
      return Promise.resolve();
    }
    var isAppsScript = /script\.google(usercontent)?\.com/.test(url);
    return fetch(url, {
      method: "POST",
      // Apps Script can't answer CORS preflights, so send JSON as text/plain there.
      headers: isAppsScript ? { "Content-Type": "text/plain;charset=utf-8" } : { "Content-Type": "application/json", "Accept": "application/json" },
      body: JSON.stringify(payload),
      redirect: "follow"
    }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.text().then(function (t) {
        var j = null; try { j = JSON.parse(t); } catch (e) { /* non-JSON reply is fine */ }
        if (j && j.ok === false) throw new Error(j.error || "Rejected by server");
      });
    });
  }

  $$(".form").forEach(function (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = $(".form-status", form); status.textContent = "";
      if (form.website.value) return; // honeypot: silently ignore bots
      if (!validate(form)) return;
      var type = form.getAttribute("data-type");
      var payload = {
        type: type,
        name: form.name.value.trim(),
        phone: "+1" + normPhone(form.phone.value),
        email: form.email.value.trim().toLowerCase(),
        optIn: form.optIn.checked,
        referredBy: activeRef || "",
        submittedAt: new Date().toISOString(),
        page: location.href.split("#")[0]
      };
      if (type === "rider") payload.area = form.area.value.trim();
      var btn = $('button[type="submit"]', form), label = btn.textContent;
      btn.disabled = true; btn.textContent = "Sending…";
      send(payload).then(function () {
        form.reset();
        showThanks(type, payload);
      }).catch(function (err) {
        console.error("[Cavalier] Sign-up failed:", err);
        status.textContent = "Sorry, something went wrong. Please check your connection and try again.";
      }).then(function () { btn.disabled = false; btn.textContent = label; });
    });
  });

  /* ---------- thank-you screen ---------- */
  function storeButtons(type) {
    var ios = (type === "driver" && CFG.DRIVER_IOS_URL) || CFG.IOS_URL;
    var and = (type === "driver" && CFG.DRIVER_ANDROID_URL) || CFG.ANDROID_URL;
    var box = $("#store-btns"); box.innerHTML = "";
    if (ios) box.insertAdjacentHTML("beforeend", '<a class="btn" href="' + encodeURI(ios) + '">Download on the App Store</a>');
    if (and) box.insertAdjacentHTML("beforeend", '<a class="btn" href="' + encodeURI(and) + '">Get it on Google Play</a>');
    box.hidden = !(ios || and);
    return { ios: ios, android: and };
  }

  function showThanks(type, p) {
    $("#panel-rider").hidden = true; $("#ref-note").hidden = true;
    var live = isLive(), first = p.name.split(/\s+/)[0];
    $("#thanks-title").textContent = live ? "Thanks, " + first + "!" : "You're on the list, " + first + "!";
    $("#thanks-countdown").hidden = true; $("#thanks-launch").textContent = "";
    var links = storeButtons(type);

    if (!live) {
      $("#thanks-msg").textContent = "We'll let you know as soon as the Cavalier app is ready to download.";
      if (launchStr) { $("#thanks-launch").textContent = "Launching " + launchStr; showCountdown($("#thanks-countdown")); }
    } else {
      var dev = device(), target = dev === "ios" ? links.ios : dev === "android" ? links.android : "";
      if (type === "rider" && target) {
        $("#thanks-msg").textContent = "Taking you to the app store to download Cavalier…";
        setTimeout(function () { location.href = target; }, 1800);
      } else if (links.ios || links.android) {
        $("#thanks-msg").textContent = "Download the app to get started.";
      } else {
        $("#thanks-msg").textContent = "The app is almost ready — we'll text or email you the download link.";
      }
    }

    var t = $("#thanks"); t.hidden = false; t.focus({ preventScroll: true });
    $("#signup").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  $("#another").addEventListener("click", function () { showForm(true); });

  /* ---------- footer ---------- */
  $("#year").textContent = new Date().getFullYear();
  if (CFG.CONTACT_EMAIL) { var fc = $("#footer-contact"); fc.innerHTML = 'Questions? <a href="mailto:' + encodeURI(CFG.CONTACT_EMAIL) + '"></a>'; fc.querySelector("a").textContent = CFG.CONTACT_EMAIL; fc.hidden = false; }
})();
