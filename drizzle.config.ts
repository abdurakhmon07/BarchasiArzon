import { defineConfig } from "drizzle-kit";

// `npm run db:generate` turns src/db/schema.ts into SQL files in migrations/.
// Wrangler applies them to D1 (`npm run db:migrate:local` / `:dev` / `:prod`).
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/db/schema.ts",
  out: "./migrations",
});
