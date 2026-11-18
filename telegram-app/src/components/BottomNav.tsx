import { t, type TextKey } from "../i18n";
import { haptic } from "../telegram";
import { useShop } from "../shop";
import type { Language, Tab } from "../types";

const TABS: { tab: Tab; icon: string; key: TextKey }[] = [
  { tab: "home", icon: "🏠", key: "navHome" },
  { tab: "catalog", icon: "📦", key: "navCatalog" },
  { tab: "deals", icon: "🔥", key: "navDeals" }, // the raised centre button
  { tab: "favorites", icon: "❤️", key: "navFavorites" },
  { tab: "cart", icon: "🛒", key: "navCart" },
];

/** Bottom menu. Aksiyalar sits in the middle as a big round button; the cart shows its count. */
export default function BottomNav({ lang, active, onChange }: { lang: Language; active: Tab; onChange: (tab: Tab) => void }) {
  const { cart } = useShop();
  return (
    <nav className="bottomnav">
      {TABS.map(({ tab, icon, key }) => (
        <button
          key={tab}
          className={`navitem ${tab === "deals" ? "navcenter" : ""} ${active === tab ? "on" : ""}`}
          aria-current={active === tab ? "page" : undefined}
          onClick={() => {
            haptic();
            onChange(tab);
          }}
        >
          <span className="navicon">{icon}</span>
          {t(lang, key)}
          {tab === "cart" && cart.totalQuantity > 0 && <i className="navbadge">{cart.totalQuantity}</i>}
        </button>
      ))}
    </nav>
  );
}
