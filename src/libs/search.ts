/**
 * Products are searched through one lower-cased text column, filled here.
 * JavaScript's toLowerCase handles Cyrillic and Uzbek letters; SQLite's lower() only does A–Z.
 */
export function buildSearchText(names: Array<string | null | undefined>): string {
  return names
    .filter((n): n is string => Boolean(n && n.trim()))
    .map((n) => n.trim().toLowerCase())
    .join(" | ");
}

/** User input → a safe LIKE pattern: %, _ and \ are matched literally (used with ESCAPE '\'). */
export function likePattern(query: string): string {
  return `%${query.trim().toLowerCase().replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}
