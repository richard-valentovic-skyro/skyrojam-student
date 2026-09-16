/* Prihlásenie — username, then password or first-time setup.

   Apple's restraint: a centred column, light display type, fields that stand
   directly on the ground with no card or panel, and one field carrying its
   own submit.

   TWO STEPS, AND WHY THE PASSWORD BOX IS NOT ALWAYS THERE. The username is
   asked for on its own first. Only once GET /auth/status has answered does the
   screen know whether this person has a password to type or a first one to
   set, so step two is drawn from that answer instead of guessed. Showing a
   password field to someone who has never had a password is a dead end: there
   is nothing they can type that will work.

   A MISSING ROUTE FALLS BACK TO THE OLD SCREEN. If /auth/status is not there —
   an older backend, a proxy that eats it — S.api.authStatus resolves
   needsPassword:false and step two is the ordinary password field. Nobody is
   ever stranded on a set-password step by a network fault; that step opens
   only when the server says so out loud.

   NO PASSWORD IS EVER CHECKED IN THE BROWSER. That would be theatre — anyone
   can read this file. Passwords are collected, checked only for being present
   and long enough, and handed to the server. Who exists, whose password is
   right, whose code is valid, whose account is active and which app a person may enter are all
   answers only the server is allowed to give.

   THERE IS NO PASSWORD RESET. The backend implements no reset endpoint, so the
   screen does not offer one — a "Zabudli ste heslo?" link that leads nowhere
   is worse than no link. The help panel says who to ask instead.

   ROLE. A manager signing in here would land in a student app with a
   student nav and no admin screens. The server hands back the account it
   authenticated; if that account is a MANAGER the session is dropped again
   immediately and the screen says where to go instead.

   Until CONFIG.API_BASE is set this runs in mock mode against the fixtures in
   data.js: the username has to exist in the roster, passwords are not verified
   at all, and a visible notice says so — a sign-in screen that appeared to
   accept a password it never checked would be a lie. */
SKYRO.pageWithoutShell(function (S) {
  "use strict";

  var REMEMBER_KEY = "skyro.username";
  var HOME = "index.html";

  /* "user" -> "password" (has one) or "claim" (setting the first one). */
  var step = "user";

  var username = "";
  var password = "";
  var code = "";   // the claim code the manager handed over, first login only
  var pass1 = "";  // the password being chosen
  var pass2 = "";  // ...and typed again
  /* Off unless this device has been remembered before. School computers are shared, so opting in has to be deliberate. */
  var remember = false;
  var peek = false;
  var error = "";
  var helpOpen = false;
  var busy = false; // a request is in flight; a second submit is ignored

  var host = S.$("#page-content");

  /* ------------------------------------------------------------ remember */

  /* localStorage throws in some privacy modes — never let that break sign-in. */
  function readRemembered() {
    try {
      var v = window.localStorage.getItem(REMEMBER_KEY);
      if (v) { username = v; remember = true; }
    } catch (e) { /* ignore */ }
  }

  function writeRemembered() {
    try {
      /* The username only. A password never touches storage. */
      if (remember && username.trim()) window.localStorage.setItem(REMEMBER_KEY, username.trim());
      else window.localStorage.removeItem(REMEMBER_KEY);
    } catch (e) { /* ignore */ }
  }

  /* -------------------------------------------------------------- checks */

  /* Cheap local refusals, and the complete list of them: present, not an
     email, shaped like a username. Everything else — is this account real, is
     the password right, is the account active, may it enter this app — is the server's
     to answer, and is never guessed here. Returns a message, or "". */
  function usernameProblem(u) {
    var v = String(u).trim().toLowerCase();
    if (!v) return "Zadajte pou\u017e\u00edvate\u013esk\u00e9 meno.";
    if (v.indexOf("@") !== -1) return "Zadajte len pou\u017e\u00edvate\u013esk\u00e9 meno, bez @skyro.ai.";
    if (!S.looksLikeUsername(v)) {
      return "Pou\u017e\u00edvate\u013esk\u00e9 meno m\u00f4\u017ee obsahova\u0165 len p\u00edsmen\u00e1, \u010d\u00edslice, bodku, poml\u010dku a pod\u010diarkovn\u00edk.";
    }
    return "";
  }

  /* ------------------------------------------------------------- network

     acceptAccount is the one place a successful sign-in is turned into a
     session, whether it came from /auth/login or /auth/claim. Always resolves
     with "" (go) or the message to show; never rejects. */
  function acceptAccount(res) {
    var account = res && res.account;
    if (!account) return Promise.resolve("Prihl\u00e1senie zlyhalo. Sk\u00faste to znova.");

    /* Authenticated, but into the wrong app. The token is thrown away
       again rather than left lying in storage for the next page load. */
    if (account.role === "MANAGER") {
      return S.api.signOut().then(function () {
        return "Toto konto je mana\u017e\u00e9rske \u2014 pou\u017eite administr\u00e1ciu.";
      });
    }

    /* The account the server authenticated, not the one we typed — and
       identity only. A balance stored here would be read by the header on
       every later page and could not be invalidated when it changed. */
    S.session.set({
      id: account.id,
      name: account.name,
      username: account.username,
      role: account.role,
      /* classCode is the Slovak trieda and is part of who this is: the
         topbar shows it beside the name, and it does not go stale the way
         a balance does \u2014 a student changes class once a year, not once a
         lunch. An account with no trieda stores null and the header simply
         shows nothing. */
      classCode: account.classCode || null
    });
    return Promise.resolve("");
  }

  /* A 401 is answered with one fixed sentence, never the server's own wording:
     "unknown username" and "wrong password" have to be indistinguishable here,
     or this screen becomes a way to find out who has an account. Every other
     failure shows what the server said, which is already Slovak and already
     honest. */
  function loginError(err) {
    if (err && err.status === 401) return "Nespr\u00e1vne pou\u017e\u00edvate\u013esk\u00e9 meno alebo heslo.";
    return (err && err.message) || "Prihl\u00e1senie zlyhalo. Sk\u00faste to znova.";
  }

  /* The claim step can fail in ways a normal sign-in cannot, and each one has
     something the person can actually do about it. */
  function claimError(err) {
    var s = err && err.status;
    var c = err && err.code;
    if (s === 401) return "K\u00f3d na prv\u00e9 prihl\u00e1senie je nespr\u00e1vny alebo u\u017e bol pou\u017eit\u00fd.";
    if (s === 409) return "Toto konto u\u017e heslo m\u00e1 — prihl\u00e1ste sa n\u00edm.";
    if (s === 404 || s === 405 || s === 501 || c === "NOT_IMPLEMENTED") {
      return "Prv\u00e9 prihl\u00e1senie sa zatia\u013e ned\u00e1 dokon\u010di\u0165 v aplik\u00e1cii. " +
        "Heslo v\u00e1m nastav\u00ed ved\u00faca jed\u00e1lne.";
    }
    return (err && err.message) || "Nastavenie hesla zlyhalo. Sk\u00faste to znova.";
  }

  /* -------------------------------------------------------------- pieces */

  function bad() { return error ? " bad" : ""; }
  function invalid() { return error ? ' aria-invalid="true" aria-describedby="err"' : ""; }

  function errorHtml() {
    return error ? '<p class="aerr" id="err" role="alert">' + S.esc(error) + "</p>" : "";
  }

  function goBtn(ready, label, busyLabel) {
    return '<button class="ago" type="submit" id="submit"' +
      ' aria-label="' + (busy ? busyLabel : label) + '"' +
      (busy ? ' aria-busy="true"' : "") +
      (ready && !busy ? "" : " disabled") + ">" +
      S.icon(busy ? "hourglass_empty" : "arrow_forward") + "</button>";
  }

  function peekBtn() {
    return '<button class="apeek" type="button" id="peek" aria-pressed="' + peek + '"' +
      ' aria-label="' + (peek ? "Skry\u0165 heslo" : "Zobrazi\u0165 heslo") + '">' +
      S.icon(peek ? "visibility_off" : "visibility") + "</button>";
  }

  /* Step two opens with the name it is about — the field it was typed in is
     gone, and a password step that did not say whose password it wants is a
     small cruelty on a shared computer. */
  function whoHtml() {
    return '<div class="awho">' +
        '<span class="wu">' + S.esc(username.trim().toLowerCase()) + "</span>" +
        '<button class="wc" type="button" id="back">Zmeni\u0165</button>' +
      "</div>";
  }

  var HELP =
    "<p><b>Ak\u00e9 je moje meno?</b> Je to va\u0161a \u0161kolsk\u00e1 adresa bez @skyro.ai \u2014 " +
      "napr\u00edklad <b>meno.priezvisko</b>.</p>" +
    "<p><b>Prihlasujete sa prv\u00fdkr\u00e1t?</b> Po zadan\u00ed mena v\u00e1s aplik\u00e1cia sama " +
      "vyzve na nastavenie hesla. Potrebujete k tomu k\u00f3d od ved\u00facej jed\u00e1lne.</p>" +
    "<p><b>Nepam\u00e4t\u00e1te si heslo?</b> Hesl\u00e1 nastavuje ved\u00faca jed\u00e1lne \u2014 nov\u00e9 si " +
      "vy\u017eiadajte priamo u nej. Odkaz na zmenu hesla e-mailom neposielame.</p>" +
    "<p><b>St\u00e1le to nejde?</b> Nap\u00ed\u0161te ved\u00facej jed\u00e1lne alebo svojmu triednemu u\u010dite\u013eovi.</p>";

  function helpHtml() {
    return '<button class="alink" type="button" id="help" aria-expanded="' + helpOpen + '"' +
        ' aria-controls="helppanel">Nedar\u00ed sa v\u00e1m prihl\u00e1si\u0165?</button>' +
      (helpOpen ? '<div class="ahelp" id="helppanel">' + HELP + "</div>" : "");
  }

  function protoHtml() {
    if (!S.api.mock) return "";
    var extra = step === "claim"
      ? " K\u00f3d v uk\u00e1\u017eke je <b>obed2026</b>."
      : (step === "user"
          ? " Sk\u00faste <b>lenka.michalcova</b> pre prv\u00e9 prihl\u00e1senie."
          : " Heslo sa zatia\u013e nikde neoveruje.");
    return '<p class="aproto"><b>Uk\u00e1\u017eka bez servera.</b>' + extra + "</p>";
  }

  /* --------------------------------------------------------------- steps */

  function stepUserHtml() {
    return '<div class="astack">' +
        '<div class="afield' + bad() + '">' +
          '<span class="fl">' +
            '<span class="fk" id="fk-u">Pou\u017e\u00edvate\u013esk\u00e9 meno</span>' +
            '<input id="username" type="text" autocomplete="username" spellcheck="false"' +
              ' autocapitalize="none" aria-labelledby="fk-u"' + invalid() +
              ' placeholder="meno.priezvisko" value="' + S.esc(username) + '">' +
          "</span>" +
          goBtn(!!username.trim(), "Pokra\u010dova\u0165", "Overujeme meno\u2026") +
        "</div>" +
      "</div>";
  }

  function stepPasswordHtml() {
    return whoHtml() +
      '<div class="astack">' +
        '<div class="afield' + bad() + '">' +
          '<span class="fl">' +
            '<span class="fk" id="fk-p">Heslo</span>' +
            '<input id="password" type="' + (peek ? "text" : "password") + '"' +
              ' autocomplete="current-password" aria-labelledby="fk-p"' + invalid() +
              ' value="' + S.esc(password) + '">' +
          "</span>" +
          peekBtn() +
          /* The arrow is the submit, so the pending state lives on it: the
             icon and the accessible name both say a request is open, and it is
             disabled for as long as one is. */
          goBtn(!!password, "Prihl\u00e1si\u0165 sa", "Prihlasujeme v\u00e1s\u2026") +
        "</div>" +
      "</div>";
  }

  function stepClaimHtml() {
    var ready = !!(code.trim() && pass1 && pass2);
    return whoHtml() +
      '<p class="ahint">' + S.icon("key") +
        "<span>Prihlasujete sa prv\u00fdkr\u00e1t. Zadajte k\u00f3d, ktor\u00fd ste dostali od " +
        "ved\u00facej jed\u00e1lne, a zvo\u013ete si heslo.</span></p>" +
      '<div class="astack">' +
        '<div class="afield solo' + bad() + '">' +
          '<span class="fl">' +
            '<span class="fk" id="fk-c">K\u00f3d na prv\u00e9 prihl\u00e1senie</span>' +
            '<input id="code" type="text" autocomplete="one-time-code" spellcheck="false"' +
              ' autocapitalize="none" aria-labelledby="fk-c"' + invalid() +
              ' value="' + S.esc(code) + '">' +
          "</span>" +
        "</div>" +
        '<div class="afield">' +
          '<span class="fl">' +
            '<span class="fk" id="fk-n">Nov\u00e9 heslo</span>' +
            '<input id="pass1" type="' + (peek ? "text" : "password") + '"' +
              ' autocomplete="new-password" aria-labelledby="fk-n" value="' + S.esc(pass1) + '">' +
          "</span>" +
          peekBtn() +
        "</div>" +
        '<div class="afield">' +
          '<span class="fl">' +
            '<span class="fk" id="fk-n2">Heslo znova</span>' +
            '<input id="pass2" type="' + (peek ? "text" : "password") + '"' +
              ' autocomplete="new-password" aria-labelledby="fk-n2" value="' + S.esc(pass2) + '">' +
          "</span>" +
          goBtn(ready, "Nastavi\u0165 heslo a prihl\u00e1si\u0165 sa", "Nastavujeme heslo\u2026") +
        "</div>" +
      "</div>";
  }

  function formHtml() {
    var body = step === "user" ? stepUserHtml()
      : step === "claim" ? stepClaimHtml()
      : stepPasswordHtml();

    return '<form id="form" novalidate>' +
        body +
        errorHtml() +
        '<button class="acheck" type="button" id="remember" aria-pressed="' + remember + '">' +
          '<span class="bx">' + S.icon("check") + "</span>Zapam\u00e4ta\u0165 si ma</button>" +
      "</form>" +

      protoHtml() +
      '<div class="ahr"></div>' +
      helpHtml() +
      '<p class="afine" id="fine">' + "Prihlasujete sa \u0161kolsk\u00fdm menom a heslom. Heslo nikomu " +
        "neposielajte \u2014 \u0161kola v\u00e1s o\u0148 nikdy nepo\u017eiada." + "</p>";
  }

  /* -------------------------------------------------------------- render */

  function render(focusSel) {
    host.innerHTML =
      '<div class="alogin"></div>' +
      '<div class="awrap"><div class="acol">' +
        S.logoSvg("amark") +
        '<h1 class="atitle">Prihl\u00e1senie<br>do Skyro Obedov</h1>' +
        formHtml() +
      "</div></div>";
    bind();
    /* innerHTML threw away whatever had focus; every caller says where the
       keyboard goes next, or it lands on <body>. */
    if (focusSel) {
      var el = S.$(focusSel);
      if (el) el.focus();
    }
  }

  function goOn() {
    var next = S.session.intended();
    window.location.href = next || HOME;
  }

  /* ------------------------------------------------------------- submits */

  function val(sel) { var e = S.$(sel); return e ? e.value : ""; }

  function readFields() {
    if (step === "user") { username = val("#username"); return; }
    if (step === "claim") {
      code = val("#code"); pass1 = val("#pass1"); pass2 = val("#pass2");
      return;
    }
    password = val("#password");
  }

  function stepReady() {
    if (step === "user") return !!val("#username").trim();
    if (step === "claim") return !!(val("#code").trim() && val("#pass1") && val("#pass2"));
    return !!val("#password");
  }

  /* Step one. Nothing secret is sent and nothing is signed in — this only
     decides which second step to draw. */
  function submitUsername() {
    var u = username.trim().toLowerCase();
    var problem = usernameProblem(u);
    if (problem) { error = problem; render("#username"); return; }

    busy = true;
    render();
    S.api.authStatus(u).then(function (res) {
      busy = false;
      error = "";
      username = u;
      password = ""; code = ""; pass1 = ""; pass2 = "";
      step = res && res.needsPassword ? "claim" : "password";
      writeRemembered();
      render(step === "claim" ? "#code" : "#password");
    }, function (err) {
      busy = false;
      error = (err && err.message) || "Nepodarilo sa spoji\u0165 so serverom.";
      render("#username");
    });
  }

  function submitPassword() {
    busy = true;
    render(); // repaints the arrow as a pending state and disables it
    S.api.login(username.trim().toLowerCase(), password)
      .then(acceptAccount, loginError)
      .then(function (problem) {
        busy = false;
        if (problem) {
          error = problem;
          password = ""; // never keep a rejected password around
          render("#password");
          return;
        }
        writeRemembered();
        password = "";
        goOn();
      });
  }

  function submitClaim() {
    if (!code.trim()) { error = "Zadajte k\u00f3d na prv\u00e9 prihl\u00e1senie."; render("#code"); return; }
    if (pass1.length < 4) { error = "Heslo mus\u00ed ma\u0165 aspo\u0148 4 znaky."; render("#pass1"); return; }
    if (pass1 !== pass2) { error = "Hesl\u00e1 sa nezhoduj\u00fa."; render("#pass2"); return; }

    busy = true;
    render();
    S.api.claim(username.trim().toLowerCase(), code, pass1)
      .then(acceptAccount, claimError)
      .then(function (problem) {
        busy = false;
        if (problem) {
          error = problem;
          pass1 = ""; pass2 = "";
          render("#code");
          return;
        }
        writeRemembered();
        code = ""; pass1 = ""; pass2 = "";
        goOn();
      });
  }

  /* --------------------------------------------------------------- binds */

  function bind() {
    function clearError() {
      if (!error) return;
      error = "";
      S.$$(".afield").forEach(function (f) { f.classList.remove("bad"); });
      var e = S.$("#err");
      if (e) e.remove();
      S.$$("#form input").forEach(function (el) { el.removeAttribute("aria-invalid"); });
    }

    /* The arrow lives or dies on the whole step, so re-check on every
       keystroke in any of its fields. */
    function syncSubmit() {
      var go = S.$("#submit");
      if (go) go.disabled = busy || !stepReady();
    }

    S.$$("#form input").forEach(function (el) {
      el.addEventListener("input", function () { clearError(); syncSubmit(); });
    });
    syncSubmit();

    var pk = S.$("#peek");
    if (pk) pk.addEventListener("click", function () {
      readFields();
      peek = !peek;
      var target = step === "claim" ? "#pass1" : "#password";
      var el = S.$(target);
      var pos = el ? el.selectionStart : null;
      render(target);
      var ne = S.$(target);
      if (ne && pos != null) { try { ne.setSelectionRange(pos, pos); } catch (e) { /* ignore */ } }
    });

    /* Back to step one. Whatever was typed into a password box is dropped
       rather than carried to whoever is named next. */
    var back = S.$("#back");
    if (back) back.addEventListener("click", function () {
      step = "user";
      error = "";
      password = ""; code = ""; pass1 = ""; pass2 = "";
      render("#username");
    });

    S.$("#remember").addEventListener("click", function () {
      remember = !remember;
      S.$("#remember").setAttribute("aria-pressed", String(remember));
      writeRemembered();
    });

    S.$("#help").addEventListener("click", function () {
      helpOpen = !helpOpen;
      render("#help");
    });

    S.$("#form").addEventListener("submit", function (ev) {
      ev.preventDefault();
      /* A second submit while the first request is open is dropped, not
         queued. The disabled arrow makes that hard; Enter held down on a slow
         line makes it easy again. */
      if (busy) return;
      readFields();
      if (step === "user") submitUsername();
      else if (step === "claim") submitClaim();
      else submitPassword();
    });

    /* A default the caller's focusSel overrides, since render() focuses
       after this runs. */
    var first = S.$("#form input");
    if (first) first.focus();
  }

  /* Landing here always ends the current session — the rail's logout link is
     just a link to this page. */
  S.session.clear();

  readRemembered();
  render();
});
