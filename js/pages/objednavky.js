/* Order history: every lunch this student has ordered, newest first.

   The list arrives flat and already sorted, and it is shown in exactly that
   order. The previous build grouped the rows by week on the client, which
   meant the page had an opinion about where one week ends — a second source
   of truth for something the server is better placed to decide. If grouping
   comes back it comes back in the response.

   GET /orders answers, per row, with: id, mealOnDayId, date (a bare ISO
   "YYYY-MM-DD"), slot, meal { id, name, category }, status and a ready-made
   chip. That is all. There is no weekday, no day number and no Slovak date
   label the way /menu/week sends them, so the date tile is derived from the
   date string itself — see dateParts(), which reads the string and never the
   clock. Nothing on this page knows what day it is today, which is exactly
   right: a history does not change when midnight passes.

   The page is a read-out and nothing else: no state, no writes, no timers,
   nothing that can change after the first paint. So render() runs once and
   there is no bind() step to re-attach and no focus to put back.

   There is no cancel button here on purpose. Cancelling is only allowed while
   the day is still open, and /orders does not say which of these days are —
   a control that can only find out by being refused is not a control. The day
   that can still be changed is today's, and today's menu owns it. */
var page = function (S, root) {
  "use strict";

  var orders = (S.__orders && S.__orders.orders) || [];

  /* Every order row carries the server's own chip — { st: "ok"|"warn"|"bad"|
     "open", l: "Objednané" } — already in Slovak and already matching what
     the manager's screen shows for the same order. It is used as it came,
     because mapping the status a second time here is how two screens start
     disagreeing about one lunch.

     S.STATUS_CHIP is the same table the server keeps, and is the fallback for
     a row that arrives without a chip. Not S.chip: ui.js loads after data.js
     and takes that name for the markup helper, so the data layer's version is
     out of reach from a page. */
  function orderChip(o) {
    if (o && o.chip && o.chip.l) return o.chip;
    var key = String((o && o.status) || "").toUpperCase();
    return (S.STATUS_CHIP && S.STATUS_CHIP[key]) || { st: "open", l: "Stav neznámy" };
  }

  /* The server's own vocabulary, so a date built here reads exactly like the
     ones /menu/week sends: "Ut", "15. septembra 2026". */
  var DAY_SHORT = ["Ne", "Po", "Ut", "St", "Št", "Pi", "So"];
  var MONTH_GEN = [
    "januára", "februára", "marca", "apríla", "mája", "júna",
    "júla", "augusta", "septembra", "októbra", "novembra", "decembra"
  ];

  /* "2026-09-15" -> { weekday: "Ut", dateNumber: 15, label: "15. septembra 2026" }

     THE DAY NUMBER IS READ OUT OF THE STRING, not out of a Date. The month
     and the year come from the string too, and the only thing a Date is used
     for is the weekday — built with Date.UTC and read with getUTCDay, so it
     cannot shift. new Date("2026-09-15").getDate() is the 14th anywhere west
     of Greenwich, and a history that renamed every lunch by one day would be
     worse than no history at all.

     No clock is read anywhere here: this is a pure transform of a string the
     server sent. A date in an unexpected shape yields empty strings and the
     row still renders with its meal and its chip. */
  function dateParts(iso) {
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso == null ? "" : iso).slice(0, 10));
    if (!m) return { weekday: "", dateNumber: "", label: "" };

    var y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    var month = MONTH_GEN[mo - 1];
    if (!month || d < 1 || d > 31) return { weekday: "", dateNumber: "", label: "" };

    return {
      weekday: DAY_SHORT[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()] || "",
      dateNumber: d,
      label: d + ". " + month + " " + y
    };
  }

  /* The tile beside the row carries the weekday and the day number, so the
     line under the meal name is the full Slovak date, which of the day's
     meals this was, and what kind of dish it is — category arrives as a
     Slovak label ("Hydina"), so it is shown as it came. */
  function rowSub(o, when) {
    var meal = o.meal || {};
    return [
      when.label,
      o.slot ? "Obed " + o.slot : "",
      meal.category || ""
    ].filter(function (part) { return part !== ""; }).join(" · ");
  }

  function row(o) {
    var meal = o.meal || {};
    var when = dateParts(o.date);
    var c = orderChip(o);

    return '<div class="orow">' +
      '<span class="od"><span class="ow">' + S.esc(when.weekday) + "</span>" +
        '<span class="on">' + S.esc(when.dateNumber) + "</span></span>" +
      '<span class="oi"><span class="om">' + S.esc(meal.name || "Obed") + "</span>" +
        '<span class="os">' + S.esc(rowSub(o, when)) + "</span></span>" +
      S.chip(c.st, c.l) +
      "</div>";
  }

  /* The same anatomy boot.js uses for its own empty state: icon, one bold
     line, one calm sentence, one way onward. */
  function emptyHtml() {
    return '<div class="empty">' + S.icon("receipt_long") +
      "<b>Zatiaľ žiadne objednávky</b>" +
      '<p class="boot-msg">Prvý obed sa v tomto prehľade objaví hneď, ako ho ' +
        "objednáte.</p>" +
      '<a class="btn" href="index.html" style="text-decoration:none">' +
        S.icon("restaurant_menu") + "Otvoriť dnešné menu</a>" +
      "</div>";
  }

  function render() {
    var n = orders.length;

    root.innerHTML =
      S.pageHead("Moje objednávky", n + " " + S.pluralZaznam(n)) +
      /* Three short columns: past ~980px the meal name stretches into a line
         too wide to scan, so the list keeps a readable measure. */
      '<div style="max-width:980px">' +
        (n
          ? '<div class="stack">' + orders.map(row).join("") + "</div>"
          : emptyHtml()) +
      "</div>";
  }

  render();
};

/* Nothing is rendered until the history is in: boot holds the spinner while
   this runs and shows its own retry, in Slovak, if it fails. The response is
   { count, orders } — the count is the server's own and is not used for the
   subtitle, which counts the rows actually on screen. */
page.load = function (S) {
  return S.api.myOrders().then(function (data) { S.__orders = data; });
};

SKYRO.page(page);
