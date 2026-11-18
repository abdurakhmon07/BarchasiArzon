import { drizzle } from "drizzle-orm/d1";
import * as schema from "./schema";

/** A Drizzle client on top of the D1 binding (cheap to create, one per request). */
export function getDb(d1: D1Database) {
  return drizzle(d1, { schema });
}

export type DB = ReturnType<typeof getDb>;
