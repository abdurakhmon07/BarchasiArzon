import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// In development the Mini App and the API share one address: Vite forwards /api
// to the barchasi-arzon server, so only Vite needs a public https tunnel.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [".trycloudflare.com", ".ngrok-free.app", ".ngrok.app"],
    proxy: {
      "/api": "http://localhost:3005",
    },
  },
});
