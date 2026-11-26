import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const API_TARGET = process.env.TURFTAP_API_URL ?? "http://localhost:3000";

export default defineConfig({
  plugins: [tanstackRouter({ target: "react", autoCodeSplitting: true }), react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    proxy: { "/v1": { target: API_TARGET, changeOrigin: true } },
  },
  test: {
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: false,
    // Far from the venues' Colombo time, so code that uses the browser's time zone by mistake fails.
    env: { TZ: "America/New_York" },
  },
});
