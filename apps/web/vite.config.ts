import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const dir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@relay/shared": path.resolve(dir, "../../packages/shared/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
