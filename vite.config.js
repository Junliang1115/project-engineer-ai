import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { rm } from "node:fs/promises";

// Stored email and SharePoint PDFs live in public/request; they are served only through the API,
// so keep them out of the build output.
const dropStoredDocuments = {
  name: "drop-stored-documents",
  apply: "build",
  async closeBundle() {
    await rm(new URL("./dist/request", import.meta.url), { recursive: true, force: true });
  },
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), dropStoredDocuments],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
    },
  },
});
