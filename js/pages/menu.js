/* Today's menu: pick a lunch, see what it costs, confirm before the deadline.

   The React build had a bug here worth not repeating: it kept `balance` as an
   accumulator and subtracted on every confirm, while switching meals cleared
   the confirmed flag. Two clicks — confirm, change your mind, confirm — charged
   twice for one lunch, and repeating it drove the balance negative.

   A student eats one lunch a day, so the balance after ordering is a constant,
   not a running total. It is derived from `confirmed` here and never
   accumulated, which makes a second charge impossible by construction. */
(function (S) {
  "use strict";

  var DEADLINE_HOUR = 14;
  var WINDOW_HOURS = 6; // ordering opens at 08:00

  var me = S.STUDENTS.filter(function (s) { return s.id === S.CURRENT_STUDENT_ID; })[0];

  var selected = 4;
  var confirmed = false;
  var left = null; // seconds to the deadline; null until the clock starts

  var root = S.mount();

  function pad2(v) { return v < 10 ? "0" + v : "" + v; }
  function balance() { return confirmed ? Number((me.balance - S.LUNCH_PRICE).toFixed(2)) : me.balance; }
  function affordable() { return me.balance >= S.LUNCH_PRICE; }
  function windowOpen() { return left === null || left > 0; }
  function canOrder() { return windowOpen() && affordable() && !confirmed; }

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

  function render() {
    var m = S.MEALS[selected];
    var pct = left === null ? 0 : Math.min(100, 100 - (left / (WINDOW_HOURS * 3600)) * 100);

    root.innerHTML =
      S.pageHead("Dnešné menu", "Pondelok 14. septembra", S.iconBtn("notifications", "Oznámenia")) +
      '<div class="split main-aside-slim">' +
        "<div>" +
          '<div class="gl">Vyberte si jedlo na dnes</div>' +
          '<div class="cards" id="meals">' + S.MEALS.map(mealCard).join("") + "</div>" +
        "</div>" +

        '<aside class="aside sticky stack l">' +
          '<div class="cdcard">' +
            '<div class="cdtop"><div>' +
              '<div class="cdlab">Uzávierka objednávok</div>' +
              '<div class="cdsub">' + (windowOpen() ? "okno sa zatvára o 14:00" : "okno je zatvorené") + "</div>" +
            '</div><div class="cdval" id="cd">' + clock() + "</div></div>" +
            '<div class="track"><i style="width:' + pct + '%"></i></div>' +
          "</div>" +

          '<div class="plain">' +
            '<div class="ph"><span class="pd">Vaša voľba</span>' +
              '<span class="pd money">' + S.eur(S.LUNCH_PRICE) + "</span></div>" +
            '<div class="dmeal"><span class="disc ' + S.esc(m.tint) + '">' + S.icon(m.ic) + "</span>" +
              '<div><div class="dn">' + S.esc(m.n) + "</div>" +
              '<div class="dsub">Obed ' + (selected + 1) + " · " + S.esc(m.cat) + "</div></div></div>" +
            '<div class="rule-line"></div>' +
            '<div class="row between"><span class="cdlab">Zostatok po objednávke</span>' +
              '<span class="money" style="font-size:15px;color:' +
                (affordable() ? "var(--ink)" : "var(--c-rose)") + '">' +
                S.eur(Number((me.balance - S.LUNCH_PRICE).toFixed(2))) + "</span></div>" +
          "</div>" +

          '<button class="btn block" id="confirm"' + (canOrder() ? "" : " disabled") + ">" +
            S.icon(confirmed ? "check_circle" : "check") +
            (confirmed ? "Objednávka potvrdená" : "Potvrdiť objednávku") +
            '<span class="qty">' + S.eur(S.LUNCH_PRICE) + "</span></button>" +

          (affordable()
            ? '<p class="note">Objednávku môžete zmeniť až do uzávierky. Po 14:00 sa rozpis odosiela do kuchyne.</p>'
            : '<p class="note warn">Na obed nemáte dosť kreditu. Chýba ' +
              S.eur(Number((S.LUNCH_PRICE - me.balance).toFixed(2))) +
              " — požiadajte vedúcu jedálne o dobitie.</p>") +
        "</aside>" +
      "</div>";

    bind();
  }

  function bind() {
    S.$$("#meals .mcard").forEach(function (btn) {
      btn.addEventListener("click", function () {
        selected = Number(btn.getAttribute("data-i"));
        /* Swapping meals is a swap, never a second order: `confirmed` is left
           alone, so the balance cannot move again. */
        render();
      });
    });

    var confirmBtn = S.$("#confirm");
    if (confirmBtn) {
      confirmBtn.addEventListener("click", function () {
        if (!canOrder()) return;
        confirmed = true;
        render();
        S.$("#confirm").focus(); // keep keyboard users where they were
        S.announce(S.$("#live"), "Objednávka potvrdená. " + S.MEALS[selected].n +
          ". Odpísané " + S.eur(S.LUNCH_PRICE) + ", zostatok " + S.eur(balance()) + ".");
      });
    }
  }

  /* The clock starts only after the page is up, so the markup never ships a
     stale time. */
  function tick() {
    var now = new Date();
    var end = new Date(now);
    end.setHours(DEADLINE_HOUR, 0, 0, 0);
    left = Math.max(0, Math.floor((end - now) / 1000));

    var cd = S.$("#cd");
    if (cd) cd.textContent = clock();
  }

  render();
  tick();
  render();
  window.setInterval(tick, 1000);
})(window.SKYRO);
