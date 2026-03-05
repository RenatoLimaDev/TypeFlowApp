import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Default config builds the card window (entry point for Tauri)
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  // Tauri expects a fixed port in dev
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
  },
  build: {
    rollupOptions: {
      input: {
        card: resolve(__dirname, "src/windows/card/index.html"),
        viewer: resolve(__dirname, "src/windows/viewer/index.html"),
        onboarding: resolve(__dirname, "src/windows/onboarding/index.html"),
      },
    },
    outDir: "dist",
    emptyOutDir: true,
  },
  envPrefix: ["VITE_", "TAURI_"],
});
