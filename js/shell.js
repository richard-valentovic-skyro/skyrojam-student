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

     3. THE PAGE NEVER WAITS FOR IT. The read the header makes runs beside
        the page, never in front of it. If it fails the header simply stays
        quiet.

     4. ONE READ, ONE NUMBER. GET /menu/today already answers with
        balanceCents, so the home screen hands that number over itself
        (S.ownsBalance) and the shell makes no call at all there. Two reads
        of one balance can disagree; one cannot.

   WHO IS SIGNED IN comes from the session the login screen wrote — identity
   only, never a balance. The account carries classCode (the Slovak trieda),
   and it sits beside the name because that is how a canteen tells two
   Matejs apart. */
window.SKYRO = window.SKYRO || {};
(function (S) {
  "use strict";

  /* /tyzden and /tyzden.html are the same page; the nav speaks filenames. */
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
  /* The balance is a control, not a label: tapping it is the obvious gesture
     for "how much do I have and how do I get more", and a student who cannot
     find that out will ask the canteen the same question in person.

     It does NOT top up. Only a manager can move money — the API has one
     top-up route and it is manager-only — so the panel says who to ask
     rather than offering a button that could not work. */
  function balanceHtml() {
    return '<button class="bal money" id="bal" type="button" hidden' +
      ' aria-expanded="false" aria-controls="balpanel">' +
      S.icon("account_balance_wallet") +
      '<span class="sr-only">Zostatok na účte: </span>' +
      '<span class="balv"></span></button>' +
      '<div class="balpanel" id="balpanel" role="dialog" aria-modal="false"' +
      ' aria-labelledby="balpanel-h" hidden></div>';
  }

  /* Rebuilt on every open so it always shows the balance currently on screen
     rather than one captured when the page loaded. */
  function balancePanelHtml(cents) {
    var left = S.lunchesLeft(cents);
    var price = S.eur(S.LUNCH_PRICE_CENTS);
    var short = cents < S.LUNCH_PRICE_CENTS;

    return '<div class="balhead">' +
        '<span class="pd" id="balpanel-h">Zostatok na účte</span>' +
        '<button class="sq" type="button" id="balclose" aria-label="Zavrieť">' +
          S.icon("close") + "</button>" +
      "</div>" +
      '<p class="balbig" style="color:' +
        (short ? "var(--c-rose)" : "var(--ink)") + '">' + S.esc(S.eur(cents)) + "</p>" +
      '<p class="balsub">' +
        (short
          ? "Nestačí ani na jeden obed (" + S.esc(price) + ")."
          : "Vystačí na " + left + " " + S.pluralObed(left) + " po " + S.esc(price) + ".") +
      "</p>" +
      '<div class="rule-line"></div>' +
      '<p class="note" style="padding:0">Kredit dobíja <b>vedúca jedálne</b>. ' +
        "Peniaze jej odovzdajte v jedálni a pripíše ich na váš účet — v aplikácii " +
        "sa dobiť nedá.</p>";
  }

  /* Name and trieda, out of the session. The class is a second span inside
     .wn rather than more text in it, so the rule that hides the name below
     560px hides the class with it and the corner never crowds; it stays
     hidden until there is a real trieda to show, exactly like the balance. */
  function identityHtml(app) {
    var who = (S.session && S.session.get && S.session.get()) || null;
    var name = (who && who.name) || app.account || "";
    var cls = (who && who.classCode) || "";
    /* The space inside the span, not only the margin: without a character
       between them a screen reader reads "Matej Hrušovský3.A" as one word,
       and so does anything else that takes the element's text. */
    return '<span class="wn">' + S.esc(name) +
      '<span class="wc" style="margin-left:5px;font-size:13.5px;font-weight:600;' +
      'color:var(--ink-3)"' + (cls ? "" : " hidden") + ">" +
      (cls ? " " + S.esc(cls) : "") + "</span></span>";
  }

  function topbar(app) {
    return '<header class="topbar glass">' +
      '<span class="beta">Beta</span>' +
      '<div class="tbend">' +
        balanceHtml() +
        '<div class="who"><span class="av">' + S.icon("person") + "</span>" +
        identityHtml(app) +
        S.icon("expand_more", "cv") + "</div>" +
      "</div></header>";
  }

  /* A session written before classCode existed has no trieda in it, and /me
     carries one. Filling it in costs no extra request — it is the same
     response the balance comes from — and nothing is invented: an account
     with no trieda leaves the slot hidden. */
  function updateClassCode(code) {
    var slot = S.$(".who .wc");
    if (!slot || !code) return;
    slot.textContent = " " + String(code);  // the separator, same as above
    slot.hidden = false;
  }

  /* The one way the balance on screen ever changes. A page that has just
     ordered, changed or cancelled calls this with the balance the server
     returned; it is not announced here because the page that made the money
     move says so itself, and two voices reading one number talk over each
     other. Safe to call from a page with no topbar — it does nothing. */
  function updateBalance(cents) {
    var slot = S.$("#bal");
    if (!slot) return;

    /* A NUMBER OR NOTHING. Number(null) is 0 and Number("") is 0, so a caller
       whose read failed and passes null would otherwise post "0,00 €" in the
       header and send a student to the canteen office over nothing. Anything
       that is not a finite number means we learned nothing, and what stands
       stays — rule 2: nothing is invented. */
    var out = S.$(".balv", slot);
    if (!out || typeof cents !== "number" || !isFinite(cents)) return;

    out.textContent = S.eur(cents);
    slot.hidden = false;
  }

  /* The opposite move, and the only other thing that touches the slot: what
     stands is now known to be wrong. A write went through — money moved — and
     the read that would have said what the account holds did not answer. An
     empty slot says "we do not know", which is true; the number from before
     the order says the account holds 5,50 € more than it does, which is not.
     A later successful read fills it back in. */
  function balanceCentsOnScreen() {
    var out = S.$(".balv");
    var txt = out ? out.textContent : "";
    /* Read back what is displayed rather than keeping a second copy that
       could disagree with it — rule 1: one balance, not two. */
    var m = /-?[\d\s ]+,\d\d/.exec(String(txt));
    if (!m) return null;
    var n = Number(m[0].replace(/[\s ]/g, "").replace(",", "."));
    return isFinite(n) ? Math.round(n * 100) : null;
  }

  function closeBalance() {
    var btn = S.$("#bal"), panel = S.$("#balpanel");
    if (!panel || panel.hidden) return;
    panel.hidden = true;
    if (btn) { btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    document.removeEventListener("keydown", onBalanceKey);
    document.removeEventListener("click", onBalanceOutside, true);
  }

  function onBalanceKey(e) {
    if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); closeBalance(); }
  }

  function onBalanceOutside(e) {
    var panel = S.$("#balpanel"), btn = S.$("#bal");
    if (!panel || panel.hidden) return;
    if (panel.contains(e.target) || (btn && btn.contains(e.target))) return;
    closeBalance();
  }

  function openBalance() {
    var btn = S.$("#bal"), panel = S.$("#balpanel");
    if (!btn || !panel) return;
    var cents = balanceCentsOnScreen();
    if (cents === null) return;          // nothing known, nothing to explain

    panel.innerHTML = balancePanelHtml(cents);
    panel.hidden = false;
    btn.setAttribute("aria-expanded", "true");

    var close = S.$("#balclose");
    if (close) { close.addEventListener("click", closeBalance); close.focus(); }
    document.addEventListener("keydown", onBalanceKey);
    document.addEventListener("click", onBalanceOutside, true);
  }

  function bindBalance() {
    var btn = S.$("#bal");
    if (!btn) return;
    btn.addEventListener("click", function () {
      if (S.$("#balpanel") && !S.$("#balpanel").hidden) closeBalance();
      else openBalance();
    });
  }

  function clearBalance() {
    var slot = S.$("#bal");
    if (!slot) return;
    var out = S.$(".balv", slot);
    if (out) out.textContent = "";
    slot.hidden = true;
  }

  /* At most one /me per page load, and never a cached balance: the session
     holds an identity only. A manager can top the account up at the window,
     and another tab can order, between two page loads — a number cached at
     sign-in goes stale with nothing to invalidate it.

     A page that is already fetching the balance as part of its own data says
     so by setting S.ownsBalance before boot runs, and the shell then makes no
     call at all. GET /menu/today answers with balanceCents, so the home
     screen does exactly that: one read, one number, nothing to disagree with.
     Whoever fetched it ends at updateBalance either way, so there is still
     one place where a balance reaches the screen. */
  function fillBalance() {
    if (S.ownsBalance) return;      // the page has it; a second read can only disagree
    if (!S.api || !S.api.me) return;

    S.api.me().then(function (acc) {
      if (!acc) return;
      if (typeof acc.balanceCents === "number") updateBalance(acc.balanceCents);
      /* Free of charge, out of the same response: a session written before
         classCode existed gets its trieda filled in. */
      updateClassCode(acc.classCode);
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

    bindBalance();

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

  Object.assign(S, {
    mount: mount, currentFile: currentFile,
    updateBalance: updateBalance, clearBalance: clearBalance,
    updateClassCode: updateClassCode
  });
  revealIconsWhenReady();
})(window.SKYRO);
