/* What this app is: its nav, who is signed in, where the logo points.
   The admin app has its own copy of this file with its own config. */
window.SKYRO = window.SKYRO || {};
window.SKYRO.APP = {
  home: "index.html",
  account: "Matej Hrušovský",
  navLabel: "Navigácia študenta",
  nav: [
    { href: "index.html",       icon: "restaurant_menu",         label: "Menu" },
    { href: "tyzden.html",      icon: "calendar_month",          label: "Týždeň" },
    { href: "objednavky.html",  icon: "receipt_long",            label: "Objednávky" },
    { href: "kredit.html",      icon: "account_balance_wallet",  label: "Kredit" },
    { href: "oznamy.html",      icon: "campaign",                label: "Oznamy" },
    { href: "spravy.html",      icon: "forum",                   label: "Správy" }
  ]
};
