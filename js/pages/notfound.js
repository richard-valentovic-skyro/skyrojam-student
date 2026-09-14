/* 404. The React build shipped Next.js's own default page here: unstyled,
   in English, outside the app shell and with no link anywhere — a dead end for
   a student who mistyped an address.

   This one keeps the rail and the topbar, says what happened in Slovak, and
   always offers the way back to today's menu. */
(function (S) {
  "use strict";

  var root = S.mount();

  root.innerHTML =
    '<div class="empty">' +
      S.icon("search_off") +
      /* h1 is capped at 20ch and left-aligned by default; centre its box so it
         sits over the icon rather than off to the side. */
      '<h1 style="margin-inline:auto;color:var(--ink)">Stránka sa nenašla</h1>' +
      "Stránka, ktorú hľadáte, neexistuje alebo bola presunutá.<br>" +
      "Skontrolujte adresu alebo sa vráťte na dnešné menu." +
      '<div class="mt-m">' +
        '<a class="btn" href="index.html" style="text-decoration:none">' +
          S.icon("arrow_back") + "Späť na dnešné menu</a>" +
      "</div>" +
    "</div>";
})(window.SKYRO);
