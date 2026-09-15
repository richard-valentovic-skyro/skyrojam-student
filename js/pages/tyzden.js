/* This week: five day tiles, the week's schedule, and the detail of whichever
   day is selected.

   WHAT THIS PAGE IS NOT IS AN ORDERING SCREEN. Ordering lives on today's menu,
   where the price, the balance and the server's own answer to POST /orders all
   are. A second confirm button here would be a second place that can disagree
   with the canteen about what a student ordered, so every path that could
   order is a link to index.html instead.

   Everything else on the page is the server's word, reported as it stands:

   1. WHETHER A DAY IS OPEN is day.open and nothing else. There is no clock
      here, no deadline constant and no countdown — the previous build derived
      the window from the browser's own time, which put a phone with a wrong
      timezone an hour out of step with the kitchen.

   2. WHETHER A MEAL CAN STILL BE TAKEN is capacity and orderCount. capacity 0
      means unlimited; otherwise orderCount >= capacity is sold out and the
      meal says so rather than looking available until the order is refused.

   3. WHAT THE STUDENT ORDERED is day.myOrder — including a cancelled one. The
      chip and the tile marker describe what stands NOW, so a cancelled order
      leaves the day looking open again and the cancellation is stated in the
      panel instead of being dressed up as an order.

   4. A HOLIDAY IS NOT A MISSED DEADLINE. day.isServing === false means the
      canteen is not cooking that day; it arrives with meals: [] and open:
      false, and "Menu zatiaľ nie je zverejnené" would be a promise nobody
      intends to keep. Every line about such a day says the kitchen is shut.

   One piece of state: `active`, the index into the week. The tiles and the
   rows are two controls for that same value, so both carry aria-pressed; the
   panel they drive sits far from the row that was clicked, so every selection
   is also announced. */
var page = function (S, root) {
  "use strict";

  var days = (S.__week && S.__week.days) || [];

  /* The state of an order, in the design system's vocabulary. An order row
     from /orders carries a ready-made chip and it is used as it came; the
     myOrder inside /menu/week carries only a status, so S.STATUS_CHIP — the
     same table the server keeps — turns that into the same words. A status
     neither knows is reported as unknown rather than guessed at.

     Not S.chip: ui.js loads after data.js and takes that name for the markup
     helper, so the data layer's version is out of reach here. */
  function orderChip(o) {
    if (o && o.chip && o.chip.l) return o.chip;
    var key = String((o && o.status) || "").toUpperCase();
    return (S.STATUS_CHIP && S.STATUS_CHIP[key]) || { st: "open", l: "Stav neznámy" };
  }

  /* The canteen is not cooking at all. Different from a closed day, and it
     comes from the server, never from a calendar we keep. */
  function holiday(d) {
    return !!d && d.isServing === false;
  }

  /* A cancelled order is not an order any more: it leaves no marker on the
     tile, does not claim the day, and does not stop an open day from offering
     the way back to the menu. AUTO_CANCELLED counts — the system dropped the
     lunch, which for the student is the same fact. */
  function cancelled(o) {
    return !!o && (o.status === "CANCELLED" || o.status === "AUTO_CANCELLED");
  }

  function activeOrder(d) {
    var o = d && d.myOrder;
    return o && !cancelled(o) ? o : null;
  }

  function cancelledOrder(d) {
    var o = d && d.myOrder;
    return cancelled(o) ? o : null;
  }

  /* The day worth landing on: the first one still open, because that is the
     only day anything can be done about; failing that the last day that has
     an order, because that is the last thing that happened. */
  function initial() {
    var i;
    for (i = 0; i < days.length; i++) if (days[i].open) return i;
    for (i = days.length - 1; i >= 0; i--) if (activeOrder(days[i])) return i;
    return 0;
  }

  var active = initial();

  /* One source for the chip and for the word the live region reads out, so
     the two can never describe the same day differently. The neutral grey
     chip carries both open and closed: the word is what differs. */
  function dayState(d) {
    var o = activeOrder(d);
    if (o) return orderChip(o);
    if (holiday(d)) return { st: "open", l: "Nevarí sa" };
    return { st: "open", l: d.open ? "Otvorené" : "Uzavreté" };
  }

  function dayChip(d) {
    var s = dayState(d);
    return S.chip(s.st, s.l);
  }

  function soldOut(m) {
    return m.capacity > 0 && m.orderCount >= m.capacity;
  }

  /* myOrder carries the meal's name; the day's own meals carry everything
     else. When both are in the response prefer the full record — the same
     server, more of it — and fall back to the name alone for past days, which
     arrive with meals: []. */
  function orderedMeal(d, o) {
    var full = (d.meals || []).filter(function (m) {
      return m.mealOnDayId === o.mealOnDayId;
    })[0];
    if (full) return full;
    return {
      name: (o.meal && o.meal.name) || "Obed",
      slot: o.slot,
      category: o.meal && o.meal.category,
      allergens: [],
      capacity: 0,
      orderCount: 0
    };
  }

  /* S.allergenLabel is the one place that knows "veg" means vegetarian and a
     bare number is an EU annex code; the tag markup is the design system's. */
  function allergenTag(a) {
    return '<span class="tag' + (a === "veg" ? " veg" : "") + '">' +
      S.esc(S.allergenLabel(a)) + "</span>";
  }

  /* Never the raw enum: S.category turns it into Slovak, a tint and an icon,
     and degrades to a neutral card if the server adds a category we have not
     styled yet. A meal whose category did not come with it (an order from a
     past day) simply does not claim one. */
  function mealSub(m) {
    var parts = [];
    if (m.slot) parts.push("Obed " + m.slot);
    if (m.category) parts.push(S.category(m.category).label);
    return parts.join(" · ");
  }

  /* `state` is off for the meal the student has already ordered: their seat is
     taken, so "Vypredané" beside their own lunch would read as bad news about
     an order that is perfectly safe. */
  function mealBlock(m, state) {
    var c = S.category(m.category);
    var out = state && soldOut(m);
    var tags = (m.allergens || []).map(allergenTag).join("");

    return '<div class="dmeal">' +
      '<span class="disc ' + S.esc(c.tint) + '">' + S.icon(c.icon) + "</span>" +
      "<div>" +
        '<div class="dn">' + S.esc(m.name) + "</div>" +
        '<div class="dsub">' + S.esc(mealSub(m)) +
          (state && m.capacity > 0
            ? " · obsadené " + S.esc(m.orderCount) + "/" + S.esc(m.capacity)
            : "") + "</div>" +
        (tags || out
          ? '<div class="row tight wrap mt-s">' +
              tags + (out ? S.chip("bad", "Vypredané") : "") + "</div>"
          : "") +
      "</div></div>";
  }

  /* The one action this page has, and it is a link. */
  function menuLink(label, block) {
    return '<a class="btn' + (block ? " block" : "") + '" href="index.html"' +
      ' style="text-decoration:none">' + S.icon("restaurant_menu") +
      S.esc(label) + "</a>";
  }

  /* ---------------------------------------------------------- the week list */

  function rowText(d) {
    var o = activeOrder(d);
    if (o) {
      var m = orderedMeal(d, o);
      return { main: m.name, sub: mealSub(m) };
    }

    var c = cancelledOrder(d);
    if (c) {
      return {
        main: "Objednávka zrušená",
        sub: (c.meal && c.meal.name) ? c.meal.name : "Na tento deň nemáte obed"
      };
    }

    /* Before the two lines about ordering: on a holiday there is nothing to
       order, nothing was published and nothing is late. */
    if (holiday(d)) return { main: "Nevarí sa", sub: "Jedáleň v tento deň nevarí" };

    var count = (d.meals || []).length;
    if (!d.open) return { main: "Bez objednávky", sub: "Objednávanie je uzavreté" };
    if (!count) return { main: "Bez objednávky", sub: "Menu zatiaľ nie je zverejnené" };
    return { main: "Bez objednávky", sub: count + " " + S.plural(count) + " v ponuke" };
  }

  /* "Ut 15" is all the tile has room for and all a sighted reader needs
     beside the other four. The accessible name is the server's own
     shortLabel — "15. septembra 2026" — so the button is not announced as an
     abbreviation and a bare number; the full label, weekday and all, is what
     the panel shows and what the live region reads on selection. */
  function dayTile(d, i) {
    var name = d.shortLabel || d.label || "";
    return '<button type="button" class="day" data-i="' + i + '"' +
      (name ? ' aria-label="' + S.esc(name) + '"' : "") +
      ' aria-pressed="' + (i === active) + '">' +
      '<span class="dw">' + S.esc(d.weekday) + "</span>" +
      '<span class="dd">' + S.esc(d.dateNumber) + "</span>" +
      '<span class="dt' + (activeOrder(d) ? " done" : "") + '"></span></button>';
  }

  /* .orow is styled for a div, so a button needs the four declarations a UA
     stylesheet would otherwise impose. */
  function weekRow(d, i) {
    var t = rowText(d);
    return '<button type="button" class="orow" data-i="' + i + '"' +
      ' aria-pressed="' + (i === active) + '"' +
      ' style="text-align:left;border:0;font-family:inherit;cursor:pointer">' +
      '<span class="od"><span class="ow">' + S.esc(d.weekday) + "</span>" +
        '<span class="on">' + S.esc(d.dateNumber) + "</span></span>" +
      '<span class="oi"><span class="om">' + S.esc(t.main) + "</span>" +
        '<span class="os">' + S.esc(t.sub) + "</span></span>" +
      dayChip(d) + "</button>";
  }

  /* -------------------------------------------------------------- the panel */

  /* What is left to say once the ordered meal has been shown. Nothing here is
     an action on a closed day. */
  function orderNote(d, o) {
    /* Vydané is the end of the line whatever the day says, so this branch
       does not repeat day.open's word for it. */
    if (o.status === "SERVED") {
      return '<p class="note">Obed bol vydaný.</p>';
    }
    if (holiday(d)) {
      return '<p class="note">Jedáleň v tento deň nevarí, takže sa tento obed ' +
        "nevydá. Ozvite sa vedúcej jedálne.</p>";
    }
    if (!d.open) {
      return '<p class="note">Objednávanie na tento deň je uzavreté. ' +
        "Objednávku už nezmeníte.</p>";
    }
    return '<div class="mt-m">' + menuLink("Zmeniť v dnešnom menu", true) + "</div>" +
      '<p class="note mt-s">Kým je deň otvorený, objednávku zmeníte alebo ' +
      "zrušíte v dnešnom menu.</p>";
  }

  function panel(d) {
    var o = activeOrder(d);
    var c = cancelledOrder(d);
    var meals = d.meals || [];
    var body;

    if (o) {
      body = mealBlock(orderedMeal(d, o), false) +
        '<div class="rule-line"></div>' + orderNote(d, o);

    } else if (holiday(d)) {
      /* No menu, no deadline, nothing to wait for — and no link to a menu
         that will never be published. */
      body = '<p class="pempty"><b>V tento deň sa nevarí</b>' +
        (c ? "Objednávka na tento deň bola zrušená. " : "") +
        "Jedáleň v tento deň nevarí — obedy sa nevydávajú a objednať sa nedá.</p>";

    } else if (d.open) {
      body =
        (c ? '<p class="note mb-m">Objednávka na tento deň bola zrušená.</p>' : "") +
        (meals.length
          ? meals.map(function (m) { return mealBlock(m, true); })
                 .join('<div class="rule-line"></div>')
          : '<p class="pempty"><b>Menu ešte nie je zverejnené</b>' +
            "Jedlá na tento deň sem pribudnú, len čo ich jedáleň doplní.</p>") +
        '<div class="mt-m">' + menuLink("Otvoriť dnešné menu", true) + "</div>" +
        '<p class="note mt-s">Obedy sa objednávajú v dnešnom menu.</p>';

    } else {
      /* Closed and nothing ordered: the calm end of the story. No button, no
         link, nothing that suggests this day can still be changed. */
      /* "ste zrušili" would be a claim about who did it, and AUTO_CANCELLED
         is the system dropping the lunch, not the student. The passive is
         the only wording true of both. */
      body = '<p class="pempty"><b>Objednávanie je uzavreté</b>' +
        (c ? "Objednávka na tento deň bola zrušená. " : "") +
        "Na tento deň si obed už neobjednáte.</p>";
    }

    return '<div class="' + (o ? "plain" : "plain dash") + '">' +
      '<div class="ph"><span class="pd">' + S.esc(d.label) + "</span>" +
        dayChip(d) + "</div>" +
      body + "</div>";
  }

  /* --------------------------------------------------------------- the page */

  function head() {
    var n = days.filter(activeOrder).length;
    return S.pageHead("Tento týždeň",
      n ? n + " " + S.pluralObed(n) + " tento týždeň" : "Zatiaľ bez objednávky");
  }

  function render(focusSel) {
    if (!days.length) {
      root.innerHTML = head() +
        '<div class="empty">' + S.icon("calendar_month") +
          "Rozpis na tento týždeň ešte nie je zverejnený.<br>" +
          "Skúste to neskôr alebo sa pozrite na dnešné menu." +
          '<div class="mt-m">' + menuLink("Otvoriť dnešné menu") + "</div>" +
        "</div>";
      return;
    }

    root.innerHTML =
      head() +

      '<div class="days" id="days" role="group" aria-label="Výber dňa">' +
        days.map(dayTile).join("") + "</div>" +

      '<div class="split main-aside mt-m">' +
        "<div>" +
          '<div class="gl">Rozpis týždňa</div>' +
          '<div class="stack" id="week">' + days.map(weekRow).join("") + "</div>" +
        "</div>" +

        '<aside class="aside sticky">' + panel(days[active]) + "</aside>" +
      "</div>";

    bind();

    /* innerHTML threw the old nodes away, so focus goes back where it was —
       without this a click sends the keyboard to the top of the document. */
    if (focusSel) {
      var el = S.$(focusSel);
      if (el) el.focus();
    }
  }

  function bind() {
    S.$$("#days .day").concat(S.$$("#week .orow")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-i"));
        if (i === active) return;
        active = i;
        var where = btn.classList.contains("day") ? "#days .day" : "#week .orow";
        render(where + '[data-i="' + i + '"]');
        speak();
      });
    });
  }

  /* The panel sits off to the side, so say what landed in it. */
  function speak() {
    var d = days[active];
    var t = rowText(d);
    S.announce(S.$("#live"),
      d.label + ". " + t.main + (t.sub ? ", " + t.sub : "") + ". " + dayState(d).l + ".");
  }

  render();
};

/* The week arrives before anything is drawn: boot holds the spinner until this
   settles and shows its own retry if it does not. */
page.load = function (S) {
  return S.api.menuWeek().then(function (data) { S.__week = data; });
};

SKYRO.page(page);
