/* Order history: every lunch this student has ordered, newest week first.

   The page is a read-out and nothing else — no state, no timers, nothing that
   can change after the first paint — so `render()` runs once and there is no
   bind() step to re-attach.

   The record count in the sub-line is counted from the rows on every render
   rather than stored next to them. It is the same reason menu.js derives the
   balance instead of accumulating it: a second copy of a number is a second
   thing that can drift out of date. */
SKYRO.page(function (S, root) {
  "use strict";

  function count() {
    return S.ORDERS.reduce(function (n, g) { return n + g.rows.length; }, 0);
  }

  function row(o) {
    return '<div class="orow">' +
      '<span class="od"><span class="ow">' + S.esc(o.w) + "</span>" +
        '<span class="on">' + S.esc(o.d) + "</span></span>" +
      '<span class="oi"><span class="om">' + S.esc(o.meal) + "</span>" +
        '<span class="os">' + S.esc(o.sub) + "</span></span>" +
      S.chip(o.st, o.l) +
      "</div>";
  }

  /* A <section> is exposed as a landmark only once it has a name, so each week
     is labelled by the .gl heading it already shows. */
  function group(g, i) {
    var id = "og-" + i;
    return '<section class="mb-m" aria-labelledby="' + id + '">' +
      '<div class="gl" id="' + id + '">' + S.esc(g.group) + "</div>" +
      '<div class="stack">' + g.rows.map(row).join("") + "</div>" +
      "</section>";
  }

  function render() {
    root.innerHTML =
      S.pageHead("Moje objednávky", count() + " " + S.pluralZaznam(count()),
                 S.iconBtn("download", "Stiahnuť prehľad")) +
      /* Three short columns: past ~980px the meal name stretches into a line
         too wide to scan, so the list keeps a readable measure. */
      '<div style="max-width:980px">' + S.ORDERS.map(group).join("") + "</div>";
  }

  render();
});
