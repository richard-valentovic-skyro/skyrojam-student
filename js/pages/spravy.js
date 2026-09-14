/* Chat with the canteen manager.

   THREAD is written from the student's side, so `from === "me"` is the violet
   right-hand bubble on this screen. (The admin app reads the same fixture from
   the other chair and flips it.)

   Two things the React build left silent: sending a message changed the page
   with no announcement at all — the new bubble simply appeared, which a screen
   reader user never learns about — and nothing kept the newest message in
   view. Both are handled below.

   The clock is only ever read inside send(), which cannot run before the first
   paint, so no stale time is ever shipped in the markup. */
(function (S) {
  "use strict";

  /* A working copy: sent messages are appended here, the fixture stays clean. */
  var items = S.THREAD.slice();

  var root = S.mount();

  function pad2(v) { return v < 10 ? "0" + v : "" + v; }

  function entry(it) {
    if (it.kind === "day") return '<div class="dm">' + S.esc(it.label) + "</div>";

    return '<div class="msg ' + (it.from === "me" ? "me" : "them") + '">' +
      S.esc(it.text) +
      '<span class="mt">' + S.esc(it.at) + "</span></div>";
  }

  function render() {
    root.innerHTML =
      S.pageHead("Katarína Vrábľová", "Vedúca jedálne", S.iconBtn("info", "Detaily vlákna")) +
      '<div style="display:flex;flex-direction:column;min-height:calc(100vh - 240px);max-width:860px">' +
        '<div class="thread grow" id="thread">' + items.map(entry).join("") + "</div>" +

        /* The composer floats over the thread, so it keeps its glass. */
        '<div class="row glass mt-m" style="position:sticky;bottom:0;margin-inline:-8px;' +
          'padding:12px 8px;border-radius:999px">' +
          '<input class="chatinput" id="draft" type="text" autocomplete="off"' +
            ' placeholder="Napíšte správu" aria-label="Napíšte správu">' +
          '<button class="send" type="button" id="send" aria-label="Odoslať">' +
            S.icon("arrow_upward") + "</button>" +
        "</div>" +
      "</div>";

    bind();
  }

  function bind() {
    var input = S.$("#draft", root);
    var sendBtn = S.$("#send", root);
    if (!input || !sendBtn) return;

    function send() {
      var text = input.value.trim();
      if (!text) { input.focus(); return; }

      var now = new Date();
      items.push({
        kind: "msg",
        from: "me",
        text: text,
        at: now.getHours() + ":" + pad2(now.getMinutes()),
      });

      render();
      S.$("#draft", root).focus(); // render() replaced the input under us
      scrollToEnd();
      S.announce(S.$("#live"), "Správa odoslaná.");
    }

    sendBtn.addEventListener("click", send);

    input.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      e.preventDefault(); // no form here, but stop any implicit submit
      send();
    });
  }

  /* The composer sticks to the bottom edge and covers whatever is under it, so
     the newest bubble is only really visible at the very end of the document. */
  function scrollToEnd() {
    window.scrollTo(0, document.documentElement.scrollHeight);
  }

  render();
})(window.SKYRO);
