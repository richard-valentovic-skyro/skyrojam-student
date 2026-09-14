/* Announcements: the canteen's notice board, newest first.

   An important notice is the same card with a violet edge, a lilac ground and
   a "Dôležité" chip above the title. The chip carries real text, so the
   emphasis survives greyscale and does not rest on colour alone.

   The React build rendered every notice as a bare <article> with no
   accessible name, so a screen reader stepping through the articles heard
   "article, article, article" and had to enter each one to find out what it
   was. Each article is labelled by its own heading here. */
(function (S) {
  "use strict";

  var root = S.mount();

  function post(p, i) {
    var titleId = "post-" + i;

    return '<article class="post' + (p.imp ? " imp" : "") + '" aria-labelledby="' + titleId + '">' +
      (p.imp ? S.chip("imp", "Dôležité") : "") +
      '<h3 class="pt" id="' + titleId + '">' + S.esc(p.t) + "</h3>" +
      '<p class="pb">' + S.esc(p.b) + "</p>" +
      '<div class="pm">' + S.esc(p.m) + "</div>" +
      "</article>";
  }

  function render() {
    root.innerHTML =
      S.pageHead("Oznamy", "Školská jedáleň", S.iconBtn("mark_email_read", "Označiť prečítané")) +
      '<div class="stack l" id="posts" style="max-width:900px">' +
        S.POSTS.map(post).join("") +
      "</div>";

    bind();
  }

  function bind() {
    /* Nothing on the page changes when the notices are marked read — there is
       no unread state to clear yet — but a control that answers nothing at all
       reads as broken, so it at least confirms itself to the live region. */
    var readBtn = S.$(".iconbtn", root);
    if (readBtn) {
      readBtn.addEventListener("click", function () {
        S.announce(S.$("#live"), "Oznamy sú označené ako prečítané.");
      });
    }
  }

  render();
})(window.SKYRO);
