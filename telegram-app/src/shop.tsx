import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, api } from "./api";
import { t } from "./i18n";
import { haptic, hapticSuccess, showAlert } from "./telegram";
import type { Cart, Language, Product } from "./types";

/**
 * Favorites and cart, shared by every screen (cards, product page, cart screen).
 * The server is the source of truth: every change returns fresh data from it.
 */
interface Shop {
  favorites: Product[];
  isFavorite: (id: string) => boolean;
  toggleFavorite: (product: Product) => void;
  reloadFavorites: () => void;

  cart: Cart;
  quantityOf: (id: string) => number;
  setQuantity: (product: Product, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  busy: boolean; // a cart change is on its way
}

const EMPTY_CART: Cart = { lines: [], totalQuantity: 0, totalAmount: 0 };
const ShopContext = createContext<Shop | null>(null);

export function ShopProvider({ lang, children }: { lang: Language; children: ReactNode }) {
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [cart, setCart] = useState<Cart>(EMPTY_CART);
  const [busy, setBusy] = useState(false);

  const reloadFavorites = useCallback(() => {
    api
      .favorites()
      .then((list) => {
        setFavorites(list);
        setFavoriteIds(new Set(list.map((p) => p.id)));
      })
      .catch(() => undefined);
  }, []);

  // Names in the cart and favorites come back in the user's language, so reload when it changes.
  useEffect(() => {
    reloadFavorites();
    api.cart().then(setCart).catch(() => undefined);
  }, [lang, reloadFavorites]);

  const toggleFavorite = useCallback(
    (product: Product) => {
      haptic();
      const adding = !favoriteIds.has(product.id);
      // Show the change at once; undo it if the server says no.
      setFavoriteIds((ids) => {
        const next = new Set(ids);
        if (adding) next.add(product.id);
        else next.delete(product.id);
        return next;
      });
      setFavorites((list) => (adding ? [product, ...list] : list.filter((p) => p.id !== product.id)));
      (adding ? api.addFavorite(product.id) : api.removeFavorite(product.id)).catch(reloadFavorites);
    },
    [favoriteIds, reloadFavorites]
  );

  const quantities = useMemo(() => new Map(cart.lines.map((l) => [l.product.id, l.quantity])), [cart]);

  const setQuantity = useCallback(
    async (product: Product, quantity: number) => {
      haptic();
      setBusy(true);
      try {
        const wasEmpty = !quantities.has(product.id);
        setCart(await api.setCartQuantity(product.id, quantity));
        if (wasEmpty && quantity > 0) hapticSuccess();
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) showAlert(t(lang, "unavailable"));
        else showAlert(t(lang, "error"));
        api.cart().then(setCart).catch(() => undefined);
      } finally {
        setBusy(false);
      }
    },
    [lang, quantities]
  );

  const clearCart = useCallback(async () => {
    setBusy(true);
    try {
      setCart(await api.clearCart());
    } finally {
      setBusy(false);
    }
  }, []);

  const value: Shop = {
    favorites,
    isFavorite: (id) => favoriteIds.has(id),
    toggleFavorite,
    reloadFavorites,
    cart,
    quantityOf: (id) => quantities.get(id) ?? 0,
    setQuantity,
    clearCart,
    busy,
  };
  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
}

export function useShop(): Shop {
  const shop = useContext(ShopContext);
  if (!shop) throw new Error("useShop must be used inside <ShopProvider>");
  return shop;
}
