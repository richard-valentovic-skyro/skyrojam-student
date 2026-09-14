/* This week: five day tiles, the week's schedule, and the detail of whichever
   day is selected.

   One piece of state — `active`, the index into S.WEEK. The tiles and the rows
   are two controls for that same value, so both carry aria-pressed; the React
   build put the selected state on the tiles only and left the rows with nothing
   but a hover shadow, which told a screen-reader user nothing about which day
   the panel on the right was describing. The panel is also far from the row you
   clicked, so every selection is announced. */
(function (S) {
  "use strict";

  var active = 0;

  var root = S.mount();

  /* Slovak dates here are all in September; the fixtures carry the day number
     only, so the month is spelled out once. */
  function dayLabel(d) { return d.w + " " + d.d + ". septembra"; }

  function mealOf(d) { return d.i === null ? null : S.MEALS[d.i]; }

  function dayTile(d, i) {
    return '<button type="button" class="day" data-i="' + i + '"' +
      ' aria-pressed="' + (i === active) + '">' +
      '<span class="dw">' + S.esc(d.w) + "</span>" +
      '<span class="dd">' + S.esc(d.d) + "</span>" +
      '<span class="dt' + (d.i !== null ? " done" : "") + '"></span></button>';
  }

  /* .orow is styled for a div, so a button needs the four declarations that a
     UA stylesheet would otherwise impose. Same inline style the React build
     used. */
  function weekRow(d, i) {
    var m = mealOf(d);
    return '<button type="button" class="orow" data-i="' + i + '"' +
      ' aria-pressed="' + (i === active) + '"' +
      ' style="text-align:left;border:0;font-family:inherit;cursor:pointer">' +
      '<span class="od"><span class="ow">' + S.esc(d.w) + "</span>" +
        '<span class="on">' + S.esc(d.d) + "</span></span>" +
      '<span class="oi"><span class="om">' +
        S.esc(m ? m.n : "Zatiaľ bez objednávky") + "</span>" +
        '<span class="os">' + S.esc(m ? m.cat : "Objednávka je otvorená") +
        "</span></span>" +
      S.chip(d.st, d.l) + "</button>";
  }

  function panel(d) {
    var m = mealOf(d);

    return '<div class="' + (m ? "plain" : "plain dash") + '">' +
      '<div class="ph"><span class="pd">' + S.esc(dayLabel(d)) + "</span>" +
        S.chip(d.st, d.l) + "</div>" +

      (m
        ? '<div class="dmeal"><span class="disc ' + S.esc(m.tint) + '">' + S.icon(m.ic) + "</span>" +
            '<div><div class="dn">' + S.esc(m.n) + "</div>" +
            '<div class="dsub">' + S.esc(m.d) + "</div></div></div>" +
          '<div class="row tight mt-m">' +
            '<button class="btn soft grow">' + S.icon("swap_horiz") + "Zmeniť</button>" +
            '<button class="btn soft grow">' + S.icon("close") + "Zrušiť</button></div>"

        : '<p class="pempty"><b>Objednávka je otvorená</b>' +
            "Na tento deň si ešte môžete vybrať jedlo. Okno sa zatvára deň vopred o 14:00.</p>" +
          '<div class="mt-m"><button class="btn block">' + S.icon("add") +
            "Objednať obed</button></div>") +

      "</div>";
  }

  function render() {
    var d = S.WEEK[active];

    root.innerHTML =
      S.pageHead("Tento týždeň", "14. až 18. septembra", S.iconBtn("tune", "Filtre")) +

      '<div class="days" id="days" role="group" aria-label="Výber dňa">' +
        S.WEEK.map(dayTile).join("") + "</div>" +

      '<div class="split main-aside mt-m">' +
        "<div>" +
          '<div class="gl">Rozpis týždňa</div>' +
          '<div class="stack" id="week">' + S.WEEK.map(weekRow).join("") + "</div>" +
        "</div>" +

        '<aside class="aside sticky">' + panel(d) + "</aside>" +
      "</div>";

    bind();
  }

  /* innerHTML threw the old nodes away, so the listeners go back on — and so
     does focus, otherwise a click sends the keyboard back to the top of the
     document. */
  function bind() {
    S.$$("#days .day").concat(S.$$("#week .orow")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var i = Number(btn.getAttribute("data-i"));
        if (i === active) return;
        active = i;
        var sel = "[data-i=\"" + i + "\"]";
        var where = btn.classList.contains("day") ? "#days .day" : "#week .orow";
        render();
        var back = S.$(where + sel);
        if (back) back.focus();
        speak();
      });
    });
  }

  /* The detail panel sits off to the side, so say what landed in it. */
  function speak() {
    var d = S.WEEK[active], m = mealOf(d);
    S.announce(S.$("#live"), dayLabel(d) + ". " +
      (m ? m.n + ", " + m.cat : "Zatiaľ bez objednávky") + ". " + d.l + ".");
  }

  render();
})(window.SKYRO);
