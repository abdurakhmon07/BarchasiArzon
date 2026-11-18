import { tg } from "./telegram";

/**
 * "Recently viewed" product ids, newest first.
 * Saved in Telegram CloudStorage (per user and bot, follows them to every device);
 * falls back to localStorage on old Telegram versions.
 */
const KEY = "recent_products";
const MAX = 10;

const cloud = tg?.isVersionAtLeast?.("6.9") ? tg.CloudStorage : null;

function readLocal(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function parse(raw: string | null | undefined): string[] {
  try {
    const ids = JSON.parse(raw ?? "[]");
    return Array.isArray(ids) ? ids.filter((x) => typeof x === "string").slice(0, MAX) : [];
  } catch {
    return [];
  }
}

export function loadRecent(): Promise<string[]> {
  if (!cloud) return Promise.resolve(parse(readLocal()));
  return new Promise((resolve) => {
    cloud.getItem(KEY, (err, value) => resolve(err ? parse(readLocal()) : parse(value)));
  });
}

function save(ids: string[]) {
  const raw = JSON.stringify(ids);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* private mode */
  }
  cloud?.setItem(KEY, raw);
}

/** Moves `id` to the front and returns the new list. */
export function rememberViewed(current: string[], id: string): string[] {
  const next = [id, ...current.filter((x) => x !== id)].slice(0, MAX);
  save(next);
  return next;
}
