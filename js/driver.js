/* Cavalier driver page (drive.html). Plain JS, no build step. Settings live in js/config.js.
 * Uses the same localStorage keys, referral code format, and FORM_ENDPOINT as js/app.js (the rider page). */
(function () {
  "use strict";

  var CFG = window.CAVALIER_CONFIG || {};
  var LS = { ref: "cavalier_ref", subs: "cavalier_submissions", myCode: "cavalier_my_ref_code" };
  var CAP = 75, RATE = 0.20; // weekly cap and per-fare percentage shown in the calculator
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- helpers (same as app.js) ---------- */
  function store(key, val) { try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; } }
  function launchTime() { var t = Date.parse(CFG.LAUNCH_DATE || ""); return isNaN(t) ? null : t; }
  function isLive() {
    if (CFG.MODE === "live") return true;
    if (CFG.MODE === "prelaunch") return false;
    var t = launchTime(); return t !== null && Date.now() >= t;
  }
  function fmtLaunch() {
    var t = launchTime(); if (t === null) return "";
    try { return new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", year: "numeric" }).format(new Date(t)); }
    catch (e) { return new Date(t).toDateString(); }
  }
  function cleanRef(v) { return String(v || "").toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 20); }
  function digits(v) { return String(v || "").replace(/\D/g, ""); }
  function normPhone(v) { var d = digits(v); if (d.length === 11 && d[0] === "1") d = d.slice(1); return d.length === 10 ? d : null; }
  function prettyPhone(d) { return "(" + d.slice(0, 3) + ") " + d.slice(3, 6) + "-" + d.slice(6); }
  function money(n) { return "$" + Math.round(n).toLocaleString("en-US"); }
  function money2(n) { return "$" + (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }); }
  function siteBase() { return location.origin + location.pathname.replace(/[^\/]*$/, ""); }

  /* ---------- referral prefill (?ref=CODE) ---------- */
  var params = new URLSearchParams(location.search);
  var urlRef = cleanRef(params.get("ref"));
  var refInput = $("#d-ref");
  if (urlRef) refInput.value = urlRef;
  refInput.addEventListener("input", function () { var c = cleanRef(refInput.value); if (c !== refInput.value) refInput.value = c; });

  /* ---------- launch date / countdown ---------- */
  var launchStr = fmtLaunch();
  if (isLive()) $("#launch-pill").textContent = "Now live in Albany, NY";
  else if (launchStr) $("#launch-pill").textContent = "Launching in Albany · " + launchStr;
  else $("#launch-pill").textContent = "Launching soon in Albany, NY";
  if (launchStr && !isLive()) $("#faq-launch").textContent = "We're planning to launch on " + launchStr + ", once the rider waitlist is ready. Everyone who signs up will hear about it first by text and email.";

  var countdowns = [];
  function tick() {
    var t = launchTime(); if (t === null) return;
    var s = Math.floor(Math.max(0, t - Date.now()) / 1000);
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

  /* ---------- earnings calculator ---------- */
  var range = $("#calc-range");
  function calc() {
    var fares = Number(range.value) || 0;
    var fee = Math.min(fares * RATE, CAP), keep = fares - fee;
    $("#calc-fares").textContent = money(fares);
    $("#calc-fee").textContent = money2(fee);
    $("#calc-keep").textContent = money2(keep);
    $("#calc-fee-note").textContent = fares * RATE >= CAP ? "capped at $75 this week" : "20% of your fares";
    $("#calc-pct").textContent = fares ? Math.floor(keep / fares * 100) + "% of your fares" : "—";
    var feePct = fares ? fee / fares * 100 : 0;
    $("#calc-bar-fee").style.width = feePct + "%";
    $("#calc-bar-keep").style.width = (fares ? 100 - feePct : 0) + "%";
    range.style.setProperty("--fill", (fares / Number(range.max) * 100) + "%");
    range.setAttribute("aria-valuetext", money(fares) + " in fares: Cavalier takes " + money2(fee) + ", you keep " + money2(keep));
  }
  range.addEventListener("input", calc);
  calc();

  /* ---------- validation ---------- */
  var form = $("#driver-form");
  function setErr(input, errEl, msg) {
    if (errEl) errEl.textContent = msg || "";
    if (input) { input.setAttribute("aria-invalid", msg ? "true" : "false"); if (errEl) input.setAttribute("aria-describedby", errEl.id); }
    return !msg;
  }
  function validate() {
    var ok = true, first = null;
    function check(id, msg) { var i = $("#d-" + id), e = $("#d-" + id + "-err"); if (!setErr(i, e, msg)) { ok = false; first = first || i; } }
    function group(name, errId, msg) {
      var picked = $$('input[name="' + name + '"]:checked', form).length > 0;
      $("#" + errId).textContent = picked ? "" : msg;
      if (!picked) { ok = false; first = first || $('input[name="' + name + '"]', form); }
    }
    check("name", form.name.value.trim().length < 2 ? "Please enter your name." : "");
    check("phone", normPhone(form.phone.value) ? "" : "Please enter a 10-digit US mobile number.");
    check("email", /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.value.trim()) ? "" : "Please enter a valid email address.");
    check("area", form.area.value.trim().length < 2 ? "Please enter your city or area." : "");
    var y = parseInt(form.vehicleYear.value, 10), max = new Date().getFullYear() + 1;
    check("year", y >= 1990 && y <= max ? "" : "Please enter a vehicle year between 1990 and " + max + ".");
    check("make", form.vehicleMake.value.trim() ? "" : "Please enter the vehicle make.");
    check("model", form.vehicleModel.value.trim() ? "" : "Please enter the vehicle model.");
    group("currentlyDrives", "d-drives-err", "Please pick at least one option.");
    group("hoursPerWeek", "d-hours-err", "Please pick one.");
    if (first) first.focus();
    return ok;
  }
  $$("input", form).forEach(function (i) { i.addEventListener("input", function () { if (i.getAttribute("aria-invalid") === "true") { i.setAttribute("aria-invalid", "false"); var e = document.getElementById(i.getAttribute("aria-describedby")); if (e) e.textContent = ""; } }); });
  $$('input[name="currentlyDrives"]').forEach(function (c) {
    c.addEventListener("change", function () {
      $("#d-drives-err").textContent = "";
      if (!c.checked) return;
      $$('input[name="currentlyDrives"]').forEach(function (o) { if ((c.value === "None") !== (o.value === "None")) o.checked = false; });
    });
  });
  $$('input[name="hoursPerWeek"]').forEach(function (c) { c.addEventListener("change", function () { $("#d-hours-err").textContent = ""; }); });
  $("#d-phone").addEventListener("blur", function () { var d = normPhone(this.value); if (d) this.value = prettyPhone(d); });

  /* ---------- referral code generation (same format as app.js) ---------- */
  function makeCode(name) {
    var base = (name.trim().split(/\s+/)[0] || "").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "DRIVE";
    var abc = "23456789ABCDEFGHJKMNPQRSTUVWXYZ", out = "", buf = new Uint32Array(4);
    (window.crypto || window.msCrypto).getRandomValues(buf);
    for (var i = 0; i < 4; i++) out += abc[buf[i] % abc.length];
    return base + "-" + out;
  }
  // A driver's referral link points at the RIDER page, because riders are who sign up through seat-back cards.
  function riderLink(code) { return siteBase() + "?ref=" + encodeURIComponent(code); }
  function driverLink(code) { return siteBase() + "drive.html?ref=" + encodeURIComponent(code); }

  /* ---------- submit ---------- */
  function send(payload) {
    var url = (CFG.FORM_ENDPOINT || "").trim();
    if (!url) {
      var all = []; try { all = JSON.parse(store(LS.subs) || "[]"); } catch (e) { all = []; }
      all.push(payload); store(LS.subs, JSON.stringify(all));
      console.info("[Cavalier] Demo mode (no FORM_ENDPOINT set). Saved in localStorage (key: " + LS.subs + ").", payload);
      return Promise.resolve();
    }
    var isAppsScript = /script\.google(usercontent)?\.com/.test(url);
    return fetch(url, {
      method: "POST",
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

  var current = null;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = $(".form-status", form); status.textContent = "";
    if (form.website.value) return; // honeypot
    if (!validate()) return;
    var hours = $('input[name="hoursPerWeek"]:checked', form);
    var payload = {
      type: "driver",
      name: form.name.value.trim(),
      phone: "+1" + normPhone(form.phone.value),
      email: form.email.value.trim().toLowerCase(),
      area: form.area.value.trim(),
      vehicleYear: parseInt(form.vehicleYear.value, 10),
      vehicleMake: form.vehicleMake.value.trim(),
      vehicleModel: form.vehicleModel.value.trim(),
      currentlyDrives: $$('input[name="currentlyDrives"]:checked', form).map(function (c) { return c.value; }).join(", "),
      hoursPerWeek: hours ? hours.value : "",
      heardAbout: form.heardAbout.value,
      optIn: form.optIn.checked,
      referredBy: cleanRef(form.refCode.value),
      submittedAt: new Date().toISOString(),
      page: location.href.split("#")[0]
    };
    payload.referralCode = makeCode(payload.name);
    payload.referralLink = riderLink(payload.referralCode);
    var btn = $('button[type="submit"]', form), label = btn.textContent;
    btn.disabled = true; btn.textContent = "Sending…";
    send(payload).then(function () {
      store(LS.myCode, payload.referralCode);
      form.reset(); if (urlRef) refInput.value = urlRef;
      showThanks(payload);
    }).catch(function (err) {
      console.error("[Cavalier] Sign-up failed:", err);
      status.textContent = "Sorry, something went wrong. Please check your connection and try again.";
    }).then(function () { btn.disabled = false; btn.textContent = label; });
  });

  /* ---------- thank-you screen ---------- */
  function storeButtons() {
    var ios = CFG.DRIVER_IOS_URL || CFG.IOS_URL, and = CFG.DRIVER_ANDROID_URL || CFG.ANDROID_URL;
    var box = $("#store-btns"); box.innerHTML = "";
    if (ios) box.insertAdjacentHTML("beforeend", '<a class="btn" href="' + encodeURI(ios) + '">Download on the App Store</a>');
    if (and) box.insertAdjacentHTML("beforeend", '<a class="btn" href="' + encodeURI(and) + '">Get it on Google Play</a>');
    box.hidden = !(ios || and);
    return !!(ios || and);
  }
  function showThanks(p) {
    current = p;
    $("#driver-panel").hidden = true;
    var live = isLive(), first = p.name.split(/\s+/)[0];
    $("#thanks-title").textContent = live ? "Thanks, " + first + "!" : "You're on the list, " + first + "!";
    $("#thanks-countdown").hidden = true; $("#thanks-launch").textContent = "";
    var hasApps = storeButtons();
    if (!live) {
      $("#thanks-msg").textContent = "You're signed up as a founding driver. We'll reach out with requirements and next steps before launch.";
      if (launchStr) { $("#thanks-launch").textContent = "Launching " + launchStr; showCountdown($("#thanks-countdown")); }
    } else {
      $("#thanks-msg").textContent = hasApps ? "Download the driver app to get started." : "The app is almost ready. We'll text or email you the download link.";
    }
    $("#my-ref-code").textContent = p.referralCode;
    $("#my-ref-link").value = p.referralLink;
    renderQR(p.referralLink);
    $("#print-cards").href = "print.html?code=" + encodeURIComponent(p.referralCode);
    var t = $("#thanks"); t.hidden = false; t.focus({ preventScroll: true });
    $("#signup").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function renderQR(text) {
    var box = $("#qr"), dl = $("#download-qr");
    if (typeof qrcode !== "function") { box.textContent = "QR unavailable"; return; }
    var qr = qrcode(0, "M"); qr.addData(text); qr.make();
    var svg = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    box.innerHTML = svg;
    dl.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg.replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" '));
  }
  function copyText(text, btn, doneLabel, label) {
    var done = function () { btn.textContent = doneLabel; setTimeout(function () { btn.textContent = label; }, 1600); };
    var fallback = function () { var i = $("#my-ref-link"); var old = i.value; i.value = text; i.select(); document.execCommand("copy"); i.value = old; done(); };
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  $("#copy-link").addEventListener("click", function () { copyText($("#my-ref-link").value, this, "Copied!", "Copy"); });
  $("#share-link").addEventListener("click", function () {
    var url = $("#my-ref-link").value;
    if (navigator.share) navigator.share({ title: "Ride with Cavalier", text: "Join Cavalier, Albany's local ride, with my code:", url: url }).catch(function () {});
    else $("#copy-link").click();
  });
  $("#share-driver").addEventListener("click", function () {
    if (!current) return;
    var url = driverLink(current.referralCode), b = this, label = b.textContent;
    if (navigator.share) navigator.share({ title: "Drive for Cavalier", text: "Cavalier is launching in Albany. 20% per fare until $75 for the week, then you keep 100%:", url: url }).catch(function () {});
    else copyText(url, b, "Driver link copied!", label);
  });
  $("#another").addEventListener("click", function () {
    $("#thanks").hidden = true; $("#driver-panel").hidden = false; current = null;
    $("#signup").scrollIntoView({ block: "start" }); $("#d-name").focus({ preventScroll: true });
  });

  /* ---------- footer ---------- */
  $("#year").textContent = new Date().getFullYear();
  if (CFG.CONTACT_EMAIL) { var fc = $("#footer-contact"); fc.innerHTML = 'Questions? <a href="mailto:' + encodeURI(CFG.CONTACT_EMAIL) + '"></a>'; fc.querySelector("a").textContent = CFG.CONTACT_EMAIL; fc.hidden = false; }
})();
