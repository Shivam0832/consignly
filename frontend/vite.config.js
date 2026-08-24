import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Lets the frontend call relative "/api/..." paths in dev without CORS
      // fuss. In production, set VITE_API_URL instead (see src/api/client.js).
      "/api": {
        target: process.env.VITE_DEV_API_TARGET || "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
