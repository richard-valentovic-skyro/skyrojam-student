/* Renders the chrome every page shares: the violet rail and the glass topbar.
   Each page carries only its own content; this fills in the rest and marks
   the current nav item from the filename.

   THE BALANCE LIVES HERE NOW. There is no credit page any more, so what the
   account holds is a permanent part of the header rather than a screen a
   student has to go and look at. Three rules keep that honest:

     1. NO ARITHMETIC. The balance is integer cents from the server, read
        exactly once through S.eur(). Nothing here adds an order to it or
        subtracts a lunch from it — a page that just changed it hands over
        the number the server sent back, through S.updateBalance(cents).

     2. NOTHING IS INVENTED. The slot stays empty until a real number
        arrives. A header showing "0,00 €" because /me has not answered yet
        would send a student to the canteen office over nothing.

     3. THE PAGE NEVER WAITS FOR IT. The session already carries the balance
        whenever sign-in returned one; only an account that arrived without
        one costs a request, and that request runs beside the page, never in
        front of it. If it fails the header simply stays quiet. */
window.SKYRO = window.SKYRO || {};
(function (S) {
  "use strict";

  /* /kredit and /kredit.html are the same page; the nav speaks filenames. */
  function currentFile() {
    var f = window.location.pathname.split("/").pop();
    if (!f) return "index.html";
    return f.indexOf(".") === -1 ? f + ".html" : f;
  }

  function rail(app, here) {
    var items = app.nav.map(function (it) {
      var active = it.href === here;
      return '<a class="rbtn" href="' + S.esc(it.href) + '" title="' + S.esc(it.label) + '"' +
        ' aria-label="' + S.esc(it.label) + '"' + (active ? ' aria-current="page"' : "") + ">" +
        S.icon(it.icon) +
        (it.badge ? '<span class="railbadge">' + S.esc(it.badge) + "</span>" : "") +
        "</a>";
    }).join("");

    return '<nav class="rail" aria-label="' + S.esc(app.navLabel) + '">' +
      '<a href="' + S.esc(app.home) + '" aria-label="Skyro Obedy">' + S.logoSvg("logo") + "</a>" +
      '<div class="railnav">' + items + "</div>" +
      '<div class="railfoot">' +
        '<a class="rbtn" href="prihlasenie.html" title="Odhlásiť sa" aria-label="Odhlásiť sa">' +
          S.icon("logout") + "</a>" +
      "</div></nav>";
  }

  /* The slot, drawn empty and hidden. "28,00 €" on its own is unlabelled to
     a screen reader — in a canteen app it could as easily be a price — so
     the reading is spelled out beside it. */
  function balanceHtml() {
    return '<span class="bal money" id="bal" hidden>' +
      S.icon("account_balance_wallet") +
      '<span class="sr-only">Zostatok na účte: </span>' +
      '<span class="balv"></span></span>';
  }

  function topbar(app) {
    return '<header class="topbar glass">' +
      '<span class="beta">Beta</span>' +
      '<div class="tbend">' +
        balanceHtml() +
        '<div class="who"><span class="av">' + S.icon("person") + "</span>" +
        '<span class="wn">' + S.esc(app.account) + "</span>" +
        S.icon("expand_more", "cv") + "</div>" +
      "</div></header>";
  }

  /* The one way the balance on screen ever changes. A page that has just
     ordered, changed or cancelled calls this with the balance the server
     returned; it is not announced here because the page that made the money
     move says so itself, and two voices reading one number talk over each
     other. Safe to call from a page with no topbar — it does nothing. */
  function updateBalance(cents) {
    var slot = S.$("#bal");
    if (!slot) return;

    var v = Number(cents);
    var out = S.$(".balv", slot);
    if (!out || !isFinite(v)) return; // we know nothing new; leave what stands

    out.textContent = S.eur(v);
    slot.hidden = false;
  }

  /* Whatever sign-in already knew, immediately; one /me only if it knew
     nothing. Both paths end at updateBalance, so there is still exactly one
     place where a balance reaches the screen. */
  function fillBalance() {
    var account = S.session && S.session.get ? S.session.get() : null;
    if (account && typeof account.balanceCents === "number") {
      updateBalance(account.balanceCents);
      return;
    }
    if (!S.api || !S.api.me) return;

    S.api.me().then(function (acc) {
      if (acc && typeof acc.balanceCents === "number") updateBalance(acc.balanceCents);
    }, function () {
      /* An empty slot is the honest outcome of a failed read. The page's own
         loader shows the retry if the data the page needs is missing too. */
    });
  }

  /* Call once per page. Returns the element page content should render into. */
  function mount() {
    var app = S.APP, here = currentFile();
    var host = document.body;

    var skip = '<a class="skip" href="#obsah">Preskočiť na obsah</a>';
    var content = S.$("#page-content");
    var inner = content ? content.innerHTML : "";

    host.innerHTML = skip +
      '<div class="mesh"></div>' +
      rail(app, here) +
      '<div class="main">' + topbar(app) +
      '<main class="page" id="obsah" tabindex="-1">' + inner + "</main></div>" +
      '<div id="live" role="status" aria-live="polite" class="sr-only"></div>';

    /* After the chrome exists, and never before the page: this is the only
       read the shell makes, and the page is already rendering around it. */
    fillBalance();

    return S.$("#obsah");
  }

  /* Reveal icons only once the ligature font can render them. Any failure
     path — no document.fonts, a timeout, an offline school wifi — reveals
     them anyway rather than leaving the UI iconless. */
  function revealIconsWhenReady() {
    var show = function () { document.documentElement.classList.add("fonts-ready"); };
    window.setTimeout(show, 3000); // never hide icons for longer than this
    if (!document.fonts || !document.fonts.load) { show(); return; }
    document.fonts.load('24px "Material Symbols Outlined"').then(show, show);
  }

  Object.assign(S, { mount: mount, currentFile: currentFile, updateBalance: updateBalance });
  revealIconsWhenReady();
})(window.SKYRO);
