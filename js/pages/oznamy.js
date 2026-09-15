/* Oznamy — the canteen's notice board.

   The feed is GET /announcements and is rendered in exactly the order the
   server sent it. "Newest first" is the server's decision; sorting again here
   would only be a second opinion that can disagree with the admin app.

   An important notice is the same card with a violet edge, a lilac ground and
   a "Dôležité" chip above the title. The chip carries real text, so the
   emphasis survives greyscale and does not rest on colour alone.

   Each <article> is labelled by its own heading. The React build rendered
   every notice as a bare <article> with no accessible name, so a screen reader
   stepping through the feed heard "article, article, article" and had to enter
   each one to find out what it was.

   Two things this page deliberately does not have:

   1. NO "MARK AS READ". Nothing on the server records what a student has read,
      so the old icon button answered nothing at all and only looked like it
      worked. A control that cannot do its job is worse than no control.

   2. NO WRITES OF ANY KIND, so nothing here re-renders and no state has to be
      threaded through a focus selector. The page paints once, out of what the
      loader fetched. */
var page = function (S, root) {
  "use strict";

  var list = S.__announcements || [];

  /* createdAt + ", " + author, but an announcement that arrives without an
     author must not render a line ending in a stray comma. */
  function meta(p) {
    return [p.createdAt, p.author].filter(function (part) {
      return part !== null && part !== undefined && String(part) !== "";
    }).map(S.esc).join(", ");
  }

  function post(p, i) {
    /* Indexed, not p.id: the id is the server's and only has to be unique
       among announcements, while this has to be unique in the document. */
    var titleId = "post-" + i;

    return '<article class="post' + (p.important ? " imp" : "") + '" aria-labelledby="' + titleId + '">' +
      (p.important ? S.chip("imp", "Dôležité") : "") +
      '<h3 class="pt" id="' + titleId + '">' + S.esc(p.title) + "</h3>" +
      '<p class="pb">' + S.esc(p.body) + "</p>" +
      '<div class="pm">' + meta(p) + "</div>" +
      "</article>";
  }

  /* An empty board is a normal state at the start of a school year, not a
     failure — the retry screen belongs to boot, this does not borrow it. */
  function emptyHtml() {
    return '<div class="empty">' + S.icon("campaign") +
      "Zatiaľ tu nie sú žiadne oznamy.<br>" +
      "Nové oznamy z jedálne sa zobrazia na tomto mieste.</div>";
  }

  function render() {
    root.innerHTML =
      S.pageHead("Oznamy", "Školská jedáleň") +
      '<div class="stack l" id="posts" style="max-width:900px">' +
        (list.length ? list.map(post).join("") : emptyHtml()) +
      "</div>";
  }

  render();
};

/* boot shows the spinner until this settles, and its own retry if it does
   not, so nothing below the loader has to think about failure. */
page.load = function (S) {
  return S.api.announcements().then(function (data) {
    S.__announcements = (data && data.announcements) || [];
  });
};

SKYRO.page(page);
