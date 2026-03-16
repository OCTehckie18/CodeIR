import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    proxy: {
      "/ollama-external": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama-external/, ""),
      },
    },
  },
});
