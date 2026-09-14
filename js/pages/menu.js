/* Today's menu: pick a lunch, see what it costs, confirm before the deadline.

   Three invariants worth stating, the first two learned from bugs found here:

   1. MONEY IS DERIVED, NEVER ACCUMULATED. A student eats one lunch a day, so
      the balance after ordering is a constant. An earlier version subtracted
      on every confirm while switching meals cleared the confirmed flag, so
      confirm → change your mind → confirm charged twice and could drive the
      balance negative. Deriving it makes a second charge impossible.

   2. RE-RENDERING MUST NOT EAT THE KEYBOARD. render() replaces innerHTML, so
      whatever had focus is destroyed. Every path that re-renders says what to
      focus afterwards, or a keyboard user is dumped back to the top of the
      document on every click.

   3. THE ORDER BELONGS TO THE SERVER. Confirming is a request, not a local
      flag: the button says it is working, and nothing on screen moves until
      S.api.placeOrder resolves. Success is read out of the response — the
      balance and the recorded meal both — so the page never shows an order
      the canteen does not have. Failure leaves every one of these variables
      untouched and puts the API layer's own Slovak into the note slot. */
SKYRO.page(function (S, root) {
  "use strict";

  var DEADLINE_HOUR = 14;
  var WINDOW_HOURS = 6; // ordering opens at 08:00

  /* The app is set on Monday 14 September 2026. The server wants the ISO
     date, not the Slovak label in the page header, so it is named here once
     rather than spelled out at the call site. */
  var TODAY = "2026-09-14";

  var me = S.STUDENTS.filter(function (s) { return s.id === S.CURRENT_STUDENT_ID; })[0];

  var selected = 4;
  var confirmed = false;
  var saving = false; // a placeOrder is in flight; further clicks are dropped
  var error = null;   // the last failed write, in the API layer's own Slovak
  var left = null; // seconds to the deadline; null until the clock starts

  function pad2(v) { return v < 10 ? "0" + v : "" + v; }

  /* What is left once today's lunch is paid for. Before the order exists that
     is a prediction, so it is subtracted here; afterwards the money has
     actually moved and me.balance is the figure the server sent back, which
     is shown as it stands. Subtracting from it again is exactly the double
     charge invariant 1 is about. */
  function balance() {
    return confirmed ? me.balance : Number((me.balance - S.LUNCH_PRICE).toFixed(2));
  }

  /* Once the order is confirmed the money has already left the account, so
     affordability is no longer a question about today — without this a
     student who spent their last 5,50 EUR on this very lunch would be told,
     the second it is ordered, that they cannot afford one. */
  function affordable() { return confirmed || me.balance >= S.LUNCH_PRICE; }
  function windowOpen() { return left === null || left > 0; }
  function canOrder() { return windowOpen() && affordable() && !confirmed && !saving; }

  function clock() {
    if (left === null) return "--:--:--";
    return pad2(Math.floor(left / 3600)) + ":" + pad2(Math.floor((left % 3600) / 60)) + ":" + pad2(left % 60);
  }

  function mealCard(m, i) {
    return '<button type="button" class="mcard ' + S.esc(m.tint) + '" data-i="' + i + '"' +
      ' aria-pressed="' + (i === selected) + '">' +
      '<span class="cat">' + S.esc(m.cat) + "</span>" +
      '<span class="disc">' + S.icon(i === selected ? "check" : m.ic) + "</span>" +
      '<span class="mn">' + S.esc(m.n) + "</span>" +
      '<span class="md">' + S.esc(m.d) + "</span>" +
      '<span class="rule"></span>' +
      '<span class="mf">' + m.a.map(S.tag).join("") +
        '<span class="no">Obed ' + (i + 1) + "</span></span></button>";
  }

  /* The note under the button must never promise something the deadline has
     already taken away. */
  function noteHtml() {
    /* A write that failed outranks anything else this slot has to say, and
       the words are the API layer's: already Slovak, already safe to show. */
    if (error) {
      return '<p class="note warn" role="alert">' + S.esc(error) + "</p>";
    }
    if (!windowOpen()) {
      return '<p class="note warn">Objednávanie na dnes je uzavreté. Rozpis už odišiel ' +
        "do kuchyne, zmeny rieši vedúca jedálne.</p>";
    }
    if (!affordable()) {
      return '<p class="note warn">Na obed nemáte dosť kreditu. Chýba ' +
        S.eur(Number((S.LUNCH_PRICE - me.balance).toFixed(2))) +
        " — požiadajte vedúcu jedálne o dobitie.</p>";
    }
    return '<p class="note">Objednávku môžete zmeniť až do 14:00. Potom sa rozpis ' +
      "odosiela do kuchyne.</p>";
  }

  function render(focusSel) {
    var m = S.MEALS[selected];
    var pct = left === null ? 0 : Math.min(100, 100 - (left / (WINDOW_HOURS * 3600)) * 100);

    root.innerHTML =
      S.pageHead("Dnešné menu", "Pondelok 14. septembra", S.iconBtn("notifications", "Oznámenia")) +
      '<div class="split main-aside-slim">' +
        "<div>" +
          '<div class="gl" id="meals-label">Vyberte si jedlo na dnes</div>' +
          '<div class="cards" id="meals" role="group" aria-labelledby="meals-label">' +
            S.MEALS.map(mealCard).join("") + "</div>" +
        "</div>" +

        /* Below 1280px this stops being a sidebar and becomes the phone's
           action bar, pinned to the bottom of the viewport. Otherwise the
           confirm button sits ~2000px below the fold and picking a meal
           appears to do nothing at all. */
        '<aside class="aside sticky stack l order-bar">' +
          '<div class="cdcard order-hide">' +
            '<div class="cdtop"><div>' +
              '<div class="cdlab">Uzávierka objednávok</div>' +
              '<div class="cdsub">' + (windowOpen() ? "okno sa zatvára o 14:00" : "okno je zatvorené") + "</div>" +
            '</div><div class="cdval" id="cd">' + clock() + "</div></div>" +
            '<div class="track"><i style="width:' + pct + '%"></i></div>' +
          "</div>" +

          '<div class="plain order-summary">' +
            '<div class="ph"><span class="pd">Vaša voľba</span>' +
              '<span class="pd money">' + S.eur(S.LUNCH_PRICE) + "</span></div>" +
            '<div class="dmeal"><span class="disc ' + S.esc(m.tint) + '">' + S.icon(m.ic) + "</span>" +
              '<div><div class="dn">' + S.esc(m.n) + "</div>" +
              '<div class="dsub">Obed ' + (selected + 1) + " · " + S.esc(m.cat) + "</div></div></div>" +
            '<div class="rule-line order-hide"></div>' +
            '<div class="row between order-hide"><span class="cdlab">Zostatok po objednávke</span>' +
              '<span class="money" style="font-size:15px;color:' +
                (affordable() ? "var(--ink)" : "var(--c-rose)") + '">' +
                S.eur(balance()) + "</span></div>" +
          "</div>" +

          '<button class="btn block" id="confirm"' + (canOrder() ? "" : " disabled") +
            (saving ? ' aria-busy="true"' : "") + ">" +
            S.icon(saving ? "progress_activity" : confirmed ? "check_circle" : "check") +
            (saving ? "Ukladá sa…" : confirmed ? "Objednávka potvrdená" : "Potvrdiť objednávku") +
            '<span class="qty">' + S.eur(S.LUNCH_PRICE) + "</span></button>" +

          /* The note slot is hidden in the phone's action bar, where there is
             room for the choice and the button and nothing else. A failed
             order is the one thing that has to be readable there too, so for
             as long as it is showing the slot keeps its place. */
          (error
            ? "<div>" + noteHtml() + "</div>"
            : '<div class="order-hide">' + noteHtml() + "</div>") +
        "</aside>" +
      "</div>";

    bind();

    /* Put the keyboard back where it was. Without this every click sends
       focus to <body> and a keyboard user restarts from the top. */
    if (focusSel) {
      var el = S.$(focusSel);
      if (el) el.focus();
    }
  }

  function bind() {
    S.$$("#meals .mcard").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-i"));
        if (i === selected) return;
        selected = i;
        /* Swapping meals is a swap, never a second order: `confirmed` is
           left alone, so the balance cannot move again. */
        render('#meals .mcard[data-i="' + i + '"]');
        /* The summary that changed may be off-screen on a phone, so say it. */
        S.announce(S.$("#live"), "Vybrané: " + S.MEALS[i].n + ", " + S.eur(S.LUNCH_PRICE) + ".");
      });
    });

    var confirmBtn = S.$("#confirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        /* canOrder() is false while a request is open, so a second click is
           dropped right here instead of queueing a second order behind the
           first. The disabled button makes that hard to do; a double click,
           a screen reader and a slow line make it easy again. */
        if (!canOrder()) return;

        /* Working, not done: the only thing that changes is the button. The
           balance, the meal and the confirmed state stay exactly as they are
           until the canteen says otherwise. */
        saving = true;
        error = null;
        render("#confirm");

        S.api.placeOrder(TODAY, selected).then(
          function (resp) {
            saving = false;
            confirmed = true;

            /* The server's figure, never ours. resp.charged tells us whether
               it actually debited — one lunch per student per day, so an
               order that replaces today's is an update and charges nothing —
               and either way resp.balance is what the account now holds. */
            me.balance = resp.balance;

            /* It also says which meal it recorded. That is the one to show,
               not the card the student may have clicked while waiting. */
            var mealId = Number(resp.mealId);
            if (S.MEALS[mealId]) selected = mealId;

            render("#confirm");
            S.announce(S.$("#live"), "Objednávka potvrdená. " + S.MEALS[selected].n +
              (resp.charged ? ". Odpísané " + S.eur(S.LUNCH_PRICE) : "") +
              ", zostatok " + S.eur(balance()) + ".");
          },
          /* Two-argument then rather than .catch(): a bug thrown while
             re-rendering above is a bug, and must not reach the student
             dressed up as a canteen that refused the order. */
          function (err) {
            /* Nothing was ordered and nothing was charged, so nothing here
               moves except the button, which goes back to being pressable.
               render() then puts the keyboard back on it. */
            saving = false;
            error = err && err.message;
            render("#confirm");
          }
        );
      });
    }
  }

  /* The clock starts only after the page is up, so the markup never ships a
     stale time. Only the digits are rewritten each second — a full render
     would destroy focus once per second. */
  function tick() {
    var now = new Date();
    var end = new Date(now);
    end.setHours(DEADLINE_HOUR, 0, 0, 0);
    var was = windowOpen();
    left = Math.max(0, Math.floor((end - now) / 1000));

    var cd = S.$("#cd");
    if (cd) cd.textContent = clock();

    /* The deadline passing changes what the page may offer, so that one
       moment does warrant a re-render. */
    if (was && !windowOpen()) render();
  }

  render();
  tick();
  window.setInterval(tick, 1000);
});
