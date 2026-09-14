/* Chat with the canteen manager.

   THREAD is written from the student's side, so `from === "me"` is the violet
   right-hand bubble on this screen. (The admin app reads the same fixture from
   the other chair and flips it.)

   Two things the React build left silent: sending a message changed the page
   with no announcement at all — the new bubble simply appeared, which a screen
   reader user never learns about — and nothing kept the newest message in
   view. Both are handled below.

   Sending now goes through S.api.sendMessage, and three rules follow from it:

   1. THE BUBBLE COMES FROM THE SERVER. It is appended out of the response —
      its text and its timestamp both — never out of an object built here. No
      clock is read on this page at all any more, so the two sides of the
      conversation cannot disagree about when something was said.

   2. NOTHING IS CLEARED UNTIL THE SERVER SAYS SO. A failed send leaves every
      character in the box. That is why the failure path never re-renders: the
      <input> the student typed into is the one element here that has to
      survive, so the busy state and the error line are put on in place, and
      only a confirmed send rebuilds the thread.

   3. ONE MESSAGE AT A TIME. A second tap while the first is still travelling
      is dropped, not queued — a double tap must not post twice. */
SKYRO.page(function (S, root) {
  "use strict";

  /* This screen is one thread: the student and the canteen. The id is what
     the API is addressed with, and it does not change while the page is up. */
  var CONVERSATION_ID = "canteen";

  /* A working copy: sent messages are appended here, the fixture stays clean. */
  var items = S.THREAD.slice();

  var sending = false; // a send is in flight; further taps are dropped
  var error = "";      // what the last failed send had to say, in its own Slovak

  function entry(it) {
    if (it.kind === "day") return '<div class="dm">' + S.esc(it.label) + "</div>";

    return '<div class="msg ' + (it.from === "me" ? "me" : "them") + '">' +
      S.esc(it.text) +
      '<span class="mt">' + S.esc(it.at) + "</span></div>";
  }

  /* The arrow becomes a progress glyph and the button stops answering. A
     round 44px button has no room for "Odosielame…" on screen, so the state
     is carried by the icon and by the accessible name together. */
  function sendHtml() {
    return '<button class="send" type="button" id="send" aria-label="' +
      (sending ? "Odosielame…" : "Odoslať") + '"' +
      (sending ? ' disabled aria-busy="true"' : "") + ">" +
      S.icon(sending ? "progress_activity" : "arrow_upward") + "</button>";
  }

  /* role="alert", because the student is waiting on this answer and it has to
     interrupt. The words are the API layer's own: already Slovak, already
     safe to show, and never replaced by a sentence invented here. */
  function errorHtml() {
    return error
      ? '<p class="note warn" id="send-error" role="alert">' + S.esc(error) + "</p>"
      : "";
  }

  function render(focusSel) {
    root.innerHTML =
      S.pageHead("Katarína Vrábľová", "Vedúca jedálne", S.iconBtn("info", "Detaily vlákna")) +
      '<div style="display:flex;flex-direction:column;min-height:calc(100vh - 240px);max-width:860px">' +
        '<div class="thread grow" id="thread">' + items.map(entry).join("") + "</div>" +

        /* A failed send is reported between the thread and the composer, so
           the message that did not go out is named right above the box that
           still holds it. */
        errorHtml() +

        /* The composer floats over the thread, so it keeps its glass. */
        '<div class="row glass mt-m" style="position:sticky;bottom:0;margin-inline:-8px;' +
          'padding:12px 8px;border-radius:999px">' +
          '<input class="chatinput" id="draft" type="text" autocomplete="off"' +
            ' placeholder="Napíšte správu" aria-label="Napíšte správu"' +
            (sending ? " readonly" : "") + ">" +
          sendHtml() +
        "</div>" +
      "</div>";

    bind();

    /* innerHTML threw away whatever had focus. Every caller that re-renders
       says where the keyboard goes next, or it lands on <body>. */
    if (focusSel) {
      var el = S.$(focusSel, root);
      if (el) el.focus();
    }
  }

  /* The busy state goes on in place rather than through render(), because
     render() would replace the <input> mid-write and take the typed text with
     it. A later render() paints exactly the same thing — both read `sending`
     and `error` — so the two paths cannot drift apart. */
  function markBusy() {
    var btn = S.$("#send", root);
    var input = S.$("#draft", root);
    if (btn) {
      btn.disabled = true;
      btn.setAttribute("aria-busy", "true");
      btn.setAttribute("aria-label", "Odosielame…");
      btn.innerHTML = S.icon("progress_activity");
    }
    /* readonly, not disabled: the student can still select and copy what they
       wrote while it is on its way. */
    if (input) input.readOnly = true;
    paintError();
  }

  function markIdle() {
    var btn = S.$("#send", root);
    var input = S.$("#draft", root);
    if (btn) {
      btn.disabled = false;
      btn.removeAttribute("aria-busy");
      btn.setAttribute("aria-label", "Odoslať");
      btn.innerHTML = S.icon("arrow_upward");
    }
    if (input) input.readOnly = false;
  }

  /* The line sits between the thread and the composer, so it is put back
     exactly there — after #thread — and the composer needs no id of its own. */
  function paintError() {
    var old = S.$("#send-error", root);
    if (old && old.parentNode) old.parentNode.removeChild(old);
    if (!error) return;
    var thread = S.$("#thread", root);
    if (thread) thread.insertAdjacentHTML("afterend", errorHtml());
  }

  function bind() {
    var input = S.$("#draft", root);
    var sendBtn = S.$("#send", root);
    if (!input || !sendBtn) return;

    function send() {
      /* Dropped, not queued. The disabled button makes a second click hard;
         a double tap, a screen reader and a slow line make it easy again. */
      if (sending) return;

      var text = input.value.trim();
      if (!text) { input.focus(); return; }

      /* Working, not sent: the only things that change are the button and the
         input. The thread stays exactly as it is until the canteen answers. */
      sending = true;
      error = "";
      markBusy();

      S.api.sendMessage(CONVERSATION_ID, text).then(
        function (resp) {
          sending = false;
          error = "";

          /* The bubble the canteen recorded, not the one typed here — so the
             time under it is the server's and nothing appears in the thread
             that the server does not have. */
          var msg = resp && resp.message;
          if (msg) items.push(msg);

          /* Confirmed, so the box may finally be emptied: render() rebuilds
             it without a value and puts the keyboard back into it. */
          render("#draft");
          scrollToEnd();
          S.announce(S.$("#live"), "Správa odoslaná.");
        },
        /* Two-argument then rather than .catch(): a bug thrown while
           re-rendering above is a bug, and must not reach the student dressed
           up as a canteen that refused the message. */
        function (err) {
          /* Nothing was sent, so nothing on the page moves: the thread is
             untouched and every character is still in the box, one click away
             from a second try. */
          sending = false;
          error = (err && err.message) || "Nastala chyba. Skúste to znova.";
          markIdle();
          paintError();
          input.focus();
        }
      );
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
});
