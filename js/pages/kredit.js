/* My credit: what is on the account, what a lunch costs, and every movement
   that got it there.

   The balance shown here is the one the canteen keeps on the account — it is
   read from the student record, never summed up from the ledger rows below.
   The ledger is a history the kitchen writes; re-adding it client-side would
   give two numbers that disagree the moment one row is late. Everything the
   page derives (how many lunches are left, whether the credit is too low)
   comes out of that single balance through S.lunchesLeft. */
SKYRO.page(function (S, root) {
  "use strict";

  var me = S.STUDENTS.filter(function (s) { return s.id === S.CURRENT_STUDENT_ID; })[0];
  var entries = S.LEDGER.filter(function (l) { return l.studentId === me.id; });

  /* Slovak counts lunches in three shapes: 1 obed, 2–4 obedy, 5+ obedov. */
  function obed(n) { return n === 1 ? "obed" : n < 5 ? "obedy" : "obedov"; }

  function ledRow(l) {
    var up = l.amount > 0;
    return '<div class="led ' + (up ? "up" : "down") + '">' +
      '<span class="ldisc">' + S.icon(up ? "add" : "restaurant") + "</span>" +
      '<span class="li">' +
        '<span class="ll">' + S.esc(l.label) + "</span>" +
        '<span class="lt">' + S.esc(l.at) +
          (l.by ? " · " + S.esc(l.by) : "") + "</span>" +
      "</span>" +
      '<span class="la">' + (up ? "+" : "") + S.eur(l.amount) + "</span>" +
    "</div>";
  }

  function render() {
    var left = S.lunchesLeft(me.balance);
    var low = me.balance < S.LUNCH_PRICE;

    root.innerHTML =
      S.pageHead("Môj kredit", me.trieda + " · " + me.email) +
      '<div class="split aside-main">' +
        '<div class="stack l">' +
          '<div class="hero">' +
            '<div class="hl">Zostatok na účte</div>' +
            '<div class="hn">' + S.eur(me.balance) + "</div>" +
            '<div class="hd">' + S.icon(low ? "warning" : "restaurant") +
              (low
                ? "Nestačí na obed (" + S.eur(S.LUNCH_PRICE) + ")"
                : "Vystačí na " + left + " " + obed(left)) +
            "</div>" +
          "</div>" +

          '<div class="plain">' +
            '<div class="ph"><span class="pd">Cena obeda</span>' +
              '<span class="pd money">' + S.eur(S.LUNCH_PRICE) + "</span></div>" +
            '<p class="pempty"><b>Kredit dobíja školská jedáleň</b>' +
              "Peniaze odovzdajte vedúcej jedálne, ktorá ich pripíše na váš účet. " +
              "Suma sa odpočíta pri potvrdení objednávky.</p>" +
          "</div>" +
        "</div>" +

        '<div class="plain">' +
          '<div class="ph"><span class="pd">Pohyby na účte</span>' +
            '<span class="pd">' + entries.length + " záznamov</span></div>" +
          (entries.length === 0
            ? '<p class="pempty"><b>Zatiaľ žiadne pohyby</b>' +
              "Po prvom dobití kreditu sa tu objaví záznam.</p>"
            : entries.map(ledRow).join("")) +
        "</div>" +
      "</div>";
  }

  /* Nothing here is interactive — one render and the page is done, so there is
     no bind() step to run after the innerHTML write. */
  render();
});
