# Skyro Obedy — Študent

Lunch ordering for Skyro (skyro.ai), a Slovak high school. Pure HTML, CSS and
JavaScript: no framework, no build step, no dependencies.

## Run

Open `index.html` in a browser. That is the whole setup — it works from
`file://` with no server.

To serve it locally instead:

```bash
python3 -m http.server 8090   # then http://localhost:8090
```

## Deploy — Cloudflare Pages

| Setting | Value |
|---|---|
| Build command | *(leave empty)* |
| Build output directory | `/` (this folder) |
| Framework preset | None |

There is nothing to compile. Pages serves `404.html` automatically for
unmatched paths, and `_headers` sets the security and caching rules.

## Pages

| File | Screen |
|---|---|
| `index.html` | Today's menu — pick a lunch, see the price and your balance, confirm before 08:00 that morning |
| `tyzden.html` | The week — a tile per day, detail panel for the selected one |
| `objednavky.html` | Order history, grouped by week |
| `kredit.html` | Balance, what it covers, and every movement on the account |
| `oznamy.html` | Announcements from the canteen |
| `spravy.html` | Chat with the canteen manager |
| `prihlasenie.html` | Login |
| `404.html` | Not found |

## How it is put together

```
index.html            each page loads the same five core scripts, then its own
css/skyro.css         the design system (colours, cards, rail, chips, glass)
css/layout.css        page layout + fixes; replaces what Tailwind used to do
js/logo.js            the Skyro wordmark as inline SVG
js/data.js            ALL application data (see "Connecting a backend")
js/ui.js              helpers: $, esc, icon, chip, pageHead, announce
js/nav.js             this app's identity: nav items, who is signed in
js/shell.js           renders the rail and topbar; S.mount() returns <main>
js/pages/<name>.js    one file per page, an IIFE over window.SKYRO
```

Every page script follows the same shape:

```js
(function (S) {
  "use strict";
  var root = S.mount();          // draws the chrome, returns <main>
  function render() { root.innerHTML = "..."; bind(); }
  function bind()   { /* re-attach listeners after every render */ }
  render();
})(window.SKYRO);
```

Two rules worth keeping: everything interpolated into `innerHTML` goes through
`S.esc()`, and money always goes through `S.eur()` — never format it by hand.

## Connecting a backend

**All data lives in `js/data.js` and nothing else reads data from anywhere
else.** That file is the only thing that has to change.

It currently defines these on `window.SKYRO`:

| Symbol | What it is |
|---|---|
| `MEALS` | today's menu — name, description, category, tint, allergens, icon, portions |
| `WEEK` | the five school days and what is ordered for each |
| `ORDERS` | order history, grouped |
| `POSTS` | announcements |
| `CONVS`, `THREAD` | conversations and messages |
| `STUDENTS`, `LEDGER` | accounts, balances, and credit movements |
| `CURRENT_STUDENT_ID` | who is signed in |
| `LUNCH_PRICE`, `eur()`, `lunchesLeft()` | money |

To wire up a real API, replace the literal arrays with fetches and keep the
same shapes. The page scripts do not need to change.

Two invariants the backend must hold, both learned from bugs found here:

1. **A lunch is charged once per (student, day).** Changing your meal before the
   deadline is an *update*, not a second debit. The UI derives the post-order
   balance rather than subtracting repeatedly, precisely so a second charge is
   impossible — the server must enforce the same thing.
2. **The ledger is the record.** A balance that disagrees with the sum of its
   movements is a bug. Derive the balance from the ledger server-side.
