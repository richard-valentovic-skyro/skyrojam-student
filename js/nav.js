/* What this app is: its nav and who is signed in.
   The admin app has its own copy with its own config. */
window.SKYRO = window.SKYRO || {};
window.SKYRO.APP = {
  home: "index.html",
  account: "",
  navLabel: "Navigácia študenta",
  nav: [
    { href: "index.html",      icon: "restaurant_menu", label: "Menu" },
    { href: "tyzden.html",     icon: "calendar_month",  label: "Týždeň" },
    { href: "objednavky.html", icon: "receipt_long",    label: "Objednávky" },
    { href: "oznamy.html",     icon: "campaign",        label: "Oznamy" }
  ]
};
