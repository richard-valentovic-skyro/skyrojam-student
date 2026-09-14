import type { AppConfig } from "@/shared/types";

export const STUDENT: AppConfig = {
  home: "/",
  account: "Matej Hrušovský",
  navLabel: "Navigácia študenta",
  nav: [
    { href: "/", icon: "restaurant_menu", label: "Menu" },
    { href: "/tyzden", icon: "calendar_month", label: "Týždeň" },
    { href: "/objednavky", icon: "receipt_long", label: "Objednávky" },
    { href: "/kredit", icon: "account_balance_wallet", label: "Kredit" },
    { href: "/oznamy", icon: "campaign", label: "Oznamy" },
    { href: "/spravy", icon: "forum", label: "Správy" },
  ],
};
