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

export function hapticSuccess() {
  try {
    tg?.HapticFeedback?.notificationOccurred("success");
  } catch {
    /* older Telegram clients */
  }
}

/** Telegram's own alert when available (looks native), browser alert otherwise. */
export function showAlert(text: string) {
  if (tg?.showAlert && tg.isVersionAtLeast?.("6.2")) tg.showAlert(text);
  else alert(text);
}

/** Telegram's own yes/no dialog when available, browser confirm otherwise. */
export function confirmDialog(text: string): Promise<boolean> {
  if (tg?.showConfirm && tg.isVersionAtLeast?.("6.2")) return new Promise((resolve) => tg.showConfirm(text, resolve));
  return Promise.resolve(confirm(text));
}
