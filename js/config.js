/*
 * ===================== CAVALIER SITE SETTINGS =====================
 * This is the only file you need to edit for day-to-day changes.
 * After editing, re-upload / commit the site and refresh the page.
 * ==================================================================
 */
window.CAVALIER_CONFIG = {
  // ⚠️ PLACEHOLDER — set your real launch date and time (Albany time).
  // Format: "YYYY-MM-DDTHH:MM:SS-04:00" (use -04:00 Mar–Nov, -05:00 Nov–Mar).
  // Leave as "" to hide the date and countdown ("Launching soon").
  LAUNCH_DATE: "2027-03-22T09:00:00-04:00",

  // "auto"      = pre-launch until LAUNCH_DATE, then live automatically
  // "prelaunch" = always show the waitlist experience
  // "live"      = always send people to the app stores after sign-up
  MODE: "auto",

  // App store links — empty until your Ridy/BetterSuite apps are published.
  IOS_URL: "",      // e.g. "https://apps.apple.com/app/idXXXXXXXXX"
  ANDROID_URL: "",  // e.g. "https://play.google.com/store/apps/details?id=com.cavalier.rider"
  DRIVER_IOS_URL: "",     // optional separate driver app links
  DRIVER_ANDROID_URL: "",

  // Where sign-ups are sent (Google Apps Script web app URL, Formspree, etc.).
  // Empty = demo mode: sign-ups are only saved in this browser (localStorage).
  FORM_ENDPOINT: "",

  // Public address of the rider page. Printed QR codes (print.html) always point here,
  // even if you open print.html from a test address, so cards keep working after you move hosts.
  // Leave "" to use whatever address print.html is opened from.
  SITE_URL: "https://cavalierride.com/",

  // Contact shown in the footer. Leave "" to hide.
  CONTACT_EMAIL: ""
};
