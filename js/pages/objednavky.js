/* Order history: every lunch this student has ordered, newest first.

   The list arrives flat and already sorted, and it is shown in exactly that
   order. The previous build grouped the rows by week on the client, which
   meant the page had an opinion about where one week ends — a second source
   of truth for something the server is better placed to decide. If grouping
   comes back it comes back in the response.

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

  /* The three statuses the API sends. An unfamiliar one is reported as
     unknown rather than rendered as a raw enum or quietly dropped. */
  var STATUS = {
    ORDERED:   { state: "ok",  label: "Objednané" },
    SERVED:    { state: "ok",  label: "Vydané" },
    CANCELLED: { state: "bad", label: "Zrušené" }
  };

  function statusChip(status) {
    var s = STATUS[status] || { state: "open", label: "Stav neznámy" };
    return S.chip(s.state, s.label);
  }

  /* The date tile already carries the weekday and the day number, so the line
     under the meal name is the full Slovak date plus which of the day's meals
     this was. */
  function rowSub(o) {
    var parts = [];
    if (o.label) parts.push(o.label);
    if (o.meal && o.meal.slot) parts.push("Obed " + o.meal.slot);
    return parts.join(" · ");
  }

  function row(o) {
    var meal = o.meal || {};
    return '<div class="orow">' +
      '<span class="od"><span class="ow">' + S.esc(o.weekday) + "</span>" +
        '<span class="on">' + S.esc(o.dateNumber) + "</span></span>" +
      '<span class="oi"><span class="om">' + S.esc(meal.name || "Obed") + "</span>" +
        '<span class="os">' + S.esc(rowSub(o)) + "</span></span>" +
      statusChip(o.status) +
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
   this runs and shows its own retry, in Slovak, if it fails. */
page.load = function (S) {
  return S.api.myOrders().then(function (data) { S.__orders = data; });
};

SKYRO.page(page);
