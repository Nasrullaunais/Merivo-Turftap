import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const REPO_ROOT = "../..";
const EMULATOR_PORT = 5175;

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, REPO_ROOT, "");
  return {
    plugins: [react()],
    define: { __WHATSAPP_APP_SECRET__: JSON.stringify(env.WHATSAPP_APP_SECRET ?? "") },
    server: {
      port: EMULATOR_PORT,
      strictPort: true,
      proxy: {
        "/webhook": { target: `http://localhost:${env.N8N_PORT ?? 5679}`, changeOrigin: true },
      },
    },
  };
});
