/* Today's menu — the student's home screen: what the canteen is cooking
   today, which of it is theirs, and the one write that changes that.

   Four things this page must never get wrong. The first three are bugs the
   version it replaces actually shipped:

   1. THE SERVER OWNS THE DAY. No clock, no deadline constant, no countdown.
      day.open is a fact the server sends; when it is false nothing here is
      pressable and the page says so plainly. A browser on a school laptop
      does not get a vote on when the kitchen closes.

   2. ORDERING IS BY mealOnDayId. Not a meal id, not an index into whatever
      array happened to be rendered. The selection is that one string, so a
      menu that changes under us can never turn a click on "Šošovicová
      polievka" into an order for whatever is fourth today.

   3. NOTHING MOVES UNTIL THE SERVER SAYS SO. A write disables its control,
      says "Ukladá sa…", and leaves the meals, the order and the balance
      exactly as they are until the API resolves. On failure the only thing
      that changes is the sentence under the button. A second click while a
      write is open is dropped here rather than queued behind the first.

   4. A CHANGE IS NOT A PURCHASE. Once today's order exists the money has
      already moved; swapping meals releases one seat and takes another and
      costs nothing. The button, the price and the wording all have to say
      that, or the student believes they are paying twice.

   5. A HOLIDAY IS NOT A MISSED DEADLINE. day.isServing === false means the
      canteen is not cooking that day at all; day.open === false with
      isServing true means the ordering window has passed. Both leave the
      page unpressable, and they are told apart in every sentence — a student
      who reads "uzávierka uplynula" on a school holiday goes looking for a
      deadline that never existed.

   Money is integer cents end to end and is only ever read through S.eur().
   The balance itself lives in the topbar — this page never draws one. GET
   /menu/today already answers with balanceCents, so the balance arrives with
   the menu in one read and is handed straight to the header; only after a
   write does this page go and ask again. */
var page = function (S, root) {
  "use strict";

  var data    = S.__menu || {};
  var day     = data.day || {};
  var meals   = data.meals || [];
  /* A cancelled order is not an order; anything else the server still
     considers today's is one, and is shown as such. */
  var myOrder = data.myOrder && data.myOrder.status !== "CANCELLED" ? data.myOrder : null;

  /* The balance rides along with the menu, so there is no second read for it
     and nothing that can disagree with it. null means "we do not know" —
     after a read that failed, the only honest thing to do is stop gating on
     it and let the server refuse. */
  var balanceCents = typeof data.balanceCents === "number" ? data.balanceCents : null;

  /* The two facts that decide whether this page offers anything at all, and
     which of the two closed days this is. Both are the server's. */
  var open = day.open === true;
  var holiday = day.isServing === false;

  var selected = null;  // a mealOnDayId, never an index
  var busy = null;      // "primary" | "cancel" while that control's write is open
  var error = null;     // the last refusal, in Slovak, shown under the button

  /* ------------------------------------------------------------ reading */

  function mealById(id) {
    var found = null;
    meals.forEach(function (m) { if (m.mealOnDayId === id) found = m; });
    return found;
  }

  function isMine(m) {
    return !!(myOrder && m && myOrder.mealOnDayId === m.mealOnDayId);
  }

  /* capacity 0 is unlimited. The seat we already hold is counted in
     orderCount, so a full meal we ordered ourselves is not sold out *to us* —
     without this the student's own lunch goes grey the moment it fills. */
  function soldOut(m) {
    return !!m && m.capacity > 0 && m.orderCount >= m.capacity && !isMine(m);
  }

  function seatsLeft(m) {
    return Math.max(0, Number(m.capacity || 0) - Number(m.orderCount || 0));
  }

  function selectable(m) { return !soldOut(m); }

  function knownBalance() {
    return typeof balanceCents === "number" ? balanceCents : null;
  }

  /* An order that already exists is paid for, so affordability stops being a
     question about today — otherwise a student who spent their last 5,50 €
     on this very lunch is told, the second it is ordered, that they cannot
     afford one. An unknown balance is not a refusal: the server decides. */
  function affordable() {
    if (myOrder) return true;
    var b = knownBalance();
    return b === null || b >= S.LUNCH_PRICE_CENTS;
  }

  function missingCents() {
    var b = knownBalance();
    return b === null ? 0 : Math.max(0, S.LUNCH_PRICE_CENTS - b);
  }

  /* The order exists but we were not told its id, so there is nothing to
     address a change or a cancel to. Rare, and better said than pretended. */
  function orderAddressable() { return !!(myOrder && myOrder.id); }

  /* What the action area is for, right now. Everything below reads this
     rather than re-deriving the same three conditions five times. */
  function mode() {
    if (holiday || !open) return "closed";
    if (!selected) return "idle";
    if (!myOrder) return "order";
    return selected === myOrder.mealOnDayId ? "ordered" : "change";
  }

  /* The meal the summary should describe, and the meal the order sits on.
     An order for something not in today's list still has a name to show. */
  function view(m, fallbackName, fallbackSlot) {
    var cat = S.category(m ? m.category : null);
    return {
      name: m ? m.name : fallbackName,
      slot: m ? m.slot : fallbackSlot,
      label: cat.label,
      tint: cat.tint,
      icon: cat.icon
    };
  }

  function selectedView() {
    var m = mealById(selected);
    return m ? view(m) : null;
  }

  function orderedView() {
    if (!myOrder) return null;
    var m = mealById(myOrder.mealOnDayId);
    if (m) return view(m);
    var meal = myOrder.meal || {};
    return view(null, meal.name, myOrder.slot);
  }

  /* Pick an opening selection: the order if there is one, otherwise the first
     meal that can still be had. A sold-out meal is never the selection. */
  function initSelection() {
    if (myOrder && mealById(myOrder.mealOnDayId)) {
      selected = myOrder.mealOnDayId;
      return;
    }
    selected = null;
    meals.forEach(function (m) {
      if (selected === null && selectable(m)) selected = m.mealOnDayId;
    });
  }

  /* ------------------------------------------------------------- markup */

  /* The API sends allergens as plain strings; the label is the data layer's
     to decide, the markup is the design system's. "veg" is the green one. */
  function allergenTag(a) {
    return '<span class="tag' + (a === "veg" ? " veg" : "") + '">' +
      S.esc(S.allergenLabel(a)) + "</span>";
  }

  function mealCard(m) {
    var cat = S.category(m.category);
    var gone = soldOut(m);
    var sel = m.mealOnDayId === selected;
    var press = open && !gone;

    return '<button type="button" class="mcard ' + S.esc(cat.tint) + (gone ? " gone" : "") + '"' +
      ' data-id="' + S.esc(m.mealOnDayId) + '"' +
      ' aria-pressed="' + (sel ? "true" : "false") + '"' +
      (press ? "" : " disabled") + ">" +
      '<span class="cat">' + S.esc(cat.label) + "</span>" +
      '<span class="disc">' + S.icon(gone ? "block" : sel ? "check" : cat.icon) + "</span>" +
      '<span class="mn">' + S.esc(m.name) + "</span>" +
      '<span class="md">' + S.esc(m.desc) + "</span>" +
      '<span class="rule"></span>' +
      '<span class="mf">' +
        (m.allergens || []).map(allergenTag).join("") +
        (gone ? S.chip("bad", "Vypredané") : isMine(m) ? S.chip("ok", "Objednané") : "") +
        /* A limit is worth watching before it runs out, so the count is on
           the card the whole time — until it is nil, when the chip above has
           already said it and "ostáva 0" is only noise. */
        (m.capacity > 0 && !gone
          ? '<span class="cap">ostáva ' + S.esc(seatsLeft(m)) + " z " + S.esc(m.capacity) + "</span>"
          : "") +
        '<span class="no">Obed ' + S.esc(m.slot) + "</span>" +
      "</span></button>";
  }

  /* Two empty days that look the same and mean opposite things: on a holiday
     there is nothing to wait for, so nothing here invites the student back. */
  function emptyHtml() {
    if (holiday) {
      return '<div class="empty">' + S.icon("event_busy") +
        "<b>V tento deň sa nevarí</b>" +
        '<p class="boot-msg">Jedáleň v tento deň nevarí a obedy sa nevydávajú. ' +
        "Pozrite si zvyšok týždňa.</p>" +
        '<a class="btn" href="tyzden.html" style="text-decoration:none">' +
          S.icon("calendar_month") + "Otvoriť týždeň</a>" +
        "</div>";
    }
    return '<div class="empty">' + S.icon("restaurant_menu") +
      "<b>Na tento deň nie je zostavené menu</b>" +
      '<p class="boot-msg">Ponuku pripravuje vedúca jedálne. Skúste to neskôr.</p></div>';
  }

  function summaryHtml() {
    var m = mode();
    var sel = selectedView();
    var ord = orderedView();
    var shown = m === "closed" ? (ord || sel) : sel;

    var head, right;
    if (m === "change") {
      head = "Nová voľba";
      right = "";
    } else if (myOrder) {
      head = "Vaša objednávka";
      right = S.chip("ok", "Objednané");
    } else {
      head = "Vaša voľba";
      /* One lunch, one price. Shown before the order, not after it — the
         money has moved by then and repeating it reads like a second bill. */
      right = '<span class="pd money">' + S.esc(S.eur(S.LUNCH_PRICE_CENTS)) + "</span>";
    }

    var body = shown
      ? '<div class="dmeal"><span class="disc ' + S.esc(shown.tint) + '">' + S.icon(shown.icon) + "</span>" +
          '<div><div class="dn">' + S.esc(shown.name) + "</div>" +
          '<div class="dsub">Obed ' + S.esc(shown.slot) + " · " + S.esc(shown.label) + "</div></div></div>"
      : '<p class="note">' +
          (myOrder ? "Objednávku nevieme zobraziť." : "Dnes nemáte objednaný obed.") + "</p>";

    /* In change mode the panel shows where the student is going, so it also
       has to keep saying where they are — the order is still the old meal
       until the server says otherwise. */
    var footer = m === "change" && ord
      ? '<div class="rule-line"></div>' +
        '<div class="row between"><span class="cdlab">Teraz objednané</span>' +
        '<span style="font-size:12.5px;font-weight:800;text-align:right">' + S.esc(ord.name) + "</span></div>"
      : "";

    return '<div class="plain order-summary">' +
      '<div class="ph"><span class="pd">' + S.esc(head) + "</span>" + right + "</div>" +
      body + footer + "</div>";
  }

  function primaryHtml() {
    var m = mode();
    var working = busy === "primary";
    var ic, label, qty = "";

    if (m === "change") {
      ic = "swap_horiz";
      label = "Zmeniť obed";
    } else if (m === "ordered") {
      ic = "check_circle";
      label = "Obed je objednaný";
    } else {
      ic = "check";
      label = "Objednať obed";
      qty = '<span class="qty">' + S.esc(S.eur(S.LUNCH_PRICE_CENTS)) + "</span>";
    }

    var disabled = busy !== null || m === "closed" || m === "idle" || m === "ordered" ||
      (m === "order" && !affordable()) ||
      (m === "change" && !orderAddressable());

    return '<button class="btn block" id="confirm" type="button"' +
      (disabled ? " disabled" : "") + (working ? ' aria-busy="true"' : "") + ">" +
      S.icon(working ? "progress_activity" : ic) +
      (working ? "Ukladá sa…" : S.esc(label)) +
      (working ? "" : qty) + "</button>";
  }

  function cancelHtml() {
    if (!open || !myOrder || !orderAddressable()) return "";
    var working = busy === "cancel";
    return '<button class="btn soft block" id="cancel" type="button"' +
      (busy !== null ? " disabled" : "") + (working ? ' aria-busy="true"' : "") + ">" +
      S.icon(working ? "progress_activity" : "close") +
      (working ? "Ukladá sa…" : "Zrušiť objednávku") + "</button>";
  }

  /* One slot, one sentence, in priority order: a refusal outranks everything,
     then the day, then the money, then what the button is about to do. */
  function noteHtml() {
    if (error) return '<p class="note warn" role="alert">' + S.esc(error) + "</p>";

    /* Before the deadline sentence, never instead of it by accident: the
       kitchen is not late, it is closed. */
    if (holiday) {
      return '<p class="note">V tento deň jedáleň nevarí. Obedy sa nevydávajú, ' +
        "takže si na tento deň nič neobjednáte.</p>";
    }
    if (!open) {
      return '<p class="note">Objednávanie na tento deň je uzavreté. Rozpis už odišiel ' +
        "do kuchyne — zmeny rieši vedúca jedálne.</p>";
    }
    if (myOrder && !orderAddressable()) {
      return '<p class="note">Objednávka je zapísaná. Ak ju chcete zmeniť alebo zrušiť, ' +
        "obnovte stránku.</p>";
    }
    if (!meals.length) return "";
    if (!selected) {
      return '<p class="note">Všetky dnešné jedlá sú vypredané. Skúste to zajtra ' +
        "alebo sa spýtajte vedúcej jedálne.</p>";
    }
    if (mode() === "order" && !affordable()) {
      return '<p class="note warn">Na obed nemáte dosť kreditu. Chýba ' +
        S.esc(S.eur(missingCents())) + " — požiadajte vedúcu jedálne o dobitie.</p>";
    }
    if (mode() === "change") {
      return '<p class="note">Zmena jedla je bez ďalšej platby — obed máte zaplatený.</p>';
    }
    if (myOrder) {
      return '<p class="note">Objednávku môžete zmeniť alebo zrušiť, kým je deň otvorený.</p>';
    }
    return '<p class="note">Obed stojí ' + S.esc(S.eur(S.LUNCH_PRICE_CENTS)) +
      " a odpíše sa z kreditu pri objednaní.</p>";
  }

  /* --------------------------------------------------------------- view */

  function render(focus) {
    var head = holiday
      ? S.chip("open", "V tento deň sa nevarí")
      : open
        ? S.chip("ok", "Objednávanie je otvorené")
        : S.chip("open", "Objednávanie je uzavreté");

    /* With no menu and no order there is nothing to summarise and nothing to
       press, so the sidebar — and the column it would sit in — goes away
       rather than standing there holding a dead button. */
    var aside = meals.length > 0 || !!myOrder;

    root.innerHTML =
      S.pageHead("Dnešné menu", day.label || "Dnes", head) +
      '<div class="split' + (aside ? " main-aside-slim" : "") + '">' +
        "<div>" +
          '<div class="gl" id="meals-label">' +
            (open && meals.length ? "Vyberte si jedlo na dnes" : "Dnešná ponuka") + "</div>" +
          (meals.length
            ? '<div class="cards" id="meals" role="group" aria-labelledby="meals-label">' +
                meals.map(mealCard).join("") + "</div>"
            : emptyHtml()) +
        "</div>" +

        /* Below 1280px the sidebar becomes the phone's action bar, pinned to
           the bottom — otherwise the button sits ~2000px below the fold and
           picking a meal appears to do nothing. A closed day has no action,
           so it stays an ordinary block rather than a bar with nothing in it. */
        (aside ?
        '<aside class="aside sticky stack l' + (open ? " order-bar" : "") + '">' +
          summaryHtml() +
          (open ? (meals.length ? primaryHtml() : "") + cancelHtml() : "") +
          /* The note slot is hidden in the phone's action bar, where there is
             room for the choice and the button and nothing else. A refusal is
             the one thing that has to be readable there too. */
          (error ? "<div>" + noteHtml() + "</div>"
                 : '<div class="order-hide">' + noteHtml() + "</div>") +
        "</aside>" : "") +
      "</div>";

    bind();
    if (focus) applyFocus(focus);
  }

  /* render() replaces innerHTML, so whatever had focus is destroyed. Every
     path that re-renders says where the keyboard should land, and the chain
     below guarantees it lands somewhere — never on <body>. */
  function applyFocus(focus) {
    var el = null;
    if (focus.card) {
      S.$$("#meals .mcard").forEach(function (b) {
        if (b.getAttribute("data-id") === focus.card) el = b;
      });
    } else if (focus.sel) {
      el = S.$(focus.sel);
    }
    if (!el || el.disabled) el = S.$("#confirm");
    if (!el || el.disabled) el = root; // <main tabindex="-1">
    if (el && el.focus) el.focus();
  }

  function bind() {
    S.$$("#meals .mcard").forEach(function (btn) {
      btn.addEventListener("click", function () {
        /* A disabled button fires no click in a browser; this is the same
           rule stated where it can be read, for the day the markup slips. */
        if (busy !== null || !open || btn.disabled) return;
        var id = btn.getAttribute("data-id");
        var m = mealById(id);
        if (!m || !selectable(m) || id === selected) return;

        /* Choosing is local and free: it changes what the button will do,
           never what the canteen has recorded. */
        selected = id;
        error = null;
        render({ card: id });
        S.announce(S.$("#live"), "Vybrané: " + m.name + ".");
      });
    });

    var primary = S.$("#confirm");
    if (primary) {
      primary.addEventListener("click", function () {
        if (primary.disabled) return;
        var m = mode();
        if (m === "order") placeOrder();
        else if (m === "change") changeOrder();
      });
    }

    var drop = S.$("#cancel");
    if (drop) {
      drop.addEventListener("click", function () {
        if (drop.disabled) return;
        cancelOrder();
      });
    }
  }

  /* -------------------------------------------------------------- writes */

  /* POST, PATCH and DELETE all answer { id, status } and say nothing about
     money, so a balance that just changed has to be read back. At load it
     came with the menu; here the smallest thing that carries it is /me, and
     this is the only call this page makes beyond /menu/today and the write
     itself. A read that fails does not turn a successful order into a failed
     one — it only means we stop claiming to know what the account holds, so
     the sentence that would have named the balance goes unsaid. */
  function refreshBalance() {
    return S.api.me().then(
      function (acc) {
        if (acc && typeof acc.balanceCents === "number") {
          balanceCents = acc.balanceCents;
          showBalance();
        }
        return acc;
      },
      function () {
        /* The order stands — the server said so — but what the account now
           holds is no longer something we know. The header is emptied rather
           than left showing the number from before the money moved. */
        balanceCents = null;
        if (typeof S.clearBalance === "function") S.clearBalance();
        return null;
      }
    );
  }

  /* The one line that puts a balance in the topbar. The number is the
     server's, passed through untouched — no arithmetic, here or anywhere.
     An unknown balance is not a zero balance: a menu that came without one
     leaves the header exactly as it found it — empty at first paint — rather
     than posting a 0,00 € nobody's account holds. (A read that fails after a
     write is the other case, and that one empties the header instead: there
     the number on screen is known to be wrong, not merely unknown.) */
  function showBalance() {
    if (balanceCents === null) return;
    if (typeof S.updateBalance === "function") S.updateBalance(balanceCents);
  }

  /* Every write goes through here so the rules hold in one place: one write
     at a time, the control says it is working, and on failure nothing on
     screen moves except the sentence under the button. */
  function submit(which, call, busyFocus, failFocus, done) {
    if (busy !== null) return;

    busy = which;
    error = null;
    /* The control that was pressed is disabled for the duration, and a
       disabled button cannot hold focus — so the keyboard is parked on the
       meal card the write is about, which stays pressable throughout. */
    render(busyFocus);

    call().then(function (resp) {
      /* The new balance is part of what just happened, so it is fetched
         before anything is redrawn — the header and the page then change
         at the same moment instead of a beat apart. */
      return refreshBalance().then(function () { return resp; });
    }).then(
      function (resp) {
        busy = null;
        done(resp);
      },
      /* Two-argument then rather than .catch(): a bug thrown while rendering
         success must not reach the student dressed as a refused order. */
      function (err) {
        busy = null;
        error = refusal(err);
        /* Nothing was ordered and nothing was charged, so nothing moves but
           the sentence — and the keyboard goes back on the control to retry. */
        render(failFocus);
      }
    );
  }

  /* err.message is always honest Slovak. These three cases have something
     more useful to say about what to do next. */
  function refusal(err) {
    var code = err && err.code;
    if (code === "SOLD_OUT") return "Toto jedlo sa medzitým vypredalo. Vyberte si, prosím, iné.";
    if (code === "INSUFFICIENT_FUNDS") {
      return "Na obed nemáte dosť kreditu. O dobitie požiadajte vedúcu jedálne.";
    }
    if (code === "DEADLINE") {
      return "Objednávanie na tento deň sa medzitým uzavrelo. Obnovte stránku.";
    }
    return (err && err.message) || "Nastala chyba. Skúste to znova.";
  }

  /* A confirmed write has consequences the page can state exactly: one seat
     moves, and it is ours. This is bookkeeping after the fact, not an
     optimistic guess — nothing here runs unless the server already agreed. */
  function takeSeat(id, delta) {
    var m = mealById(id);
    if (m) m.orderCount = Math.max(0, Number(m.orderCount || 0) + delta);
  }

  function recordOrder(resp, mealOnDayId) {
    var m = mealById(mealOnDayId);
    myOrder = {
      id: resp && resp.id ? resp.id : null,
      mealOnDayId: mealOnDayId,
      slot: m ? m.slot : null,
      status: (resp && resp.status) || "ORDERED",
      meal: m ? { name: m.name, category: m.category } : {}
    };
    meals.forEach(function (x) { x.orderedByMe = x.mealOnDayId === mealOnDayId; });
    selected = mealOnDayId;
  }

  function balanceSentence() {
    var b = knownBalance();
    return b === null ? "" : " Zostatok " + S.eur(b) + ".";
  }

  function placeOrder() {
    var id = selected;
    submit(
      "primary",
      function () { return S.api.placeOrder(id); },
      { card: id },
      { sel: "#confirm" },
      function (resp) {
        takeSeat(id, 1);
        recordOrder(resp, id);
        render({ card: id });
        S.announce(S.$("#live"), "Obed objednaný: " + ((mealById(id) || {}).name || "") +
          ". Odpísané " + S.eur(S.LUNCH_PRICE_CENTS) + "." + balanceSentence());
      }
    );
  }

  function changeOrder() {
    var id = selected;
    var from = myOrder.mealOnDayId;
    submit(
      "primary",
      function () { return S.api.changeOrder(myOrder.id, id); },
      { card: id },
      { sel: "#confirm" },
      function (resp) {
        /* One seat released, one taken, and no money in either direction. */
        takeSeat(from, -1);
        takeSeat(id, 1);
        recordOrder(resp, id);
        render({ card: id });
        S.announce(S.$("#live"), "Objednávka zmenená na " + ((mealById(id) || {}).name || "") +
          ". Bez ďalšej platby.");
      }
    );
  }

  function cancelOrder() {
    var from = myOrder.mealOnDayId;
    submit(
      "cancel",
      function () { return S.api.cancelOrder(myOrder.id); },
      { card: from },
      { sel: "#cancel" },
      function () {
        takeSeat(from, -1);
        myOrder = null;
        meals.forEach(function (x) { x.orderedByMe = false; });
        /* The released seat may be the only one on the menu; re-deriving the
           selection is how a sold-out day stays impossible to order from. */
        if (!selected || !selectable(mealById(selected))) initSelection();
        render({ sel: "#confirm" });
        S.announce(S.$("#live"), "Objednávka zrušená." + balanceSentence());
      }
    );
  }

  initSelection();
  showBalance();
  render();
};

/* One read, one spinner, one number. GET /menu/today answers with the day,
   the meals, this student's order AND balanceCents, so the account costs no
   second request — and two reads of one balance can disagree while one
   cannot. The shell is told to keep its hands off the header (below) before
   boot runs, so nothing else asks. */
page.load = function (S) {
  return S.api.menuToday().then(function (data) { S.__menu = data || {}; });
};

/* Read by the shell at mount, which happens after this file is evaluated and
   before page.load runs: this page fills the topbar's balance itself. */
SKYRO.ownsBalance = true;

SKYRO.page(page);
