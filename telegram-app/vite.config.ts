import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the Mini App and the API share one address: Vite forwards /api
// to the local Worker (`npm run dev` in the project root, port 8787).
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.app"],
    proxy: {
      "/api": "http://localhost:8787",
    },
  },
});
