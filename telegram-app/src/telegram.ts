/** The Telegram Mini App SDK object (loaded by the <script> in index.html). */
export const tg = window.Telegram?.WebApp;

/** Signed data Telegram passes to the app; empty when opened in a normal browser. */
export const initData = tg?.initData ?? "";

export function haptic(type: "light" | "medium" = "light") {
  try {
    tg?.HapticFeedback?.impactOccurred(type);
  } catch {
    /* older Telegram clients */
  }
}
