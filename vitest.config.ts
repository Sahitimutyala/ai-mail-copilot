import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

// Unit tests cover the pure mail-service core (lib/gmail/*): query building,
// MIME construction, and payload parsing — the logic worth locking down.
export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: { "@": resolve(__dirname, ".") },
  },
});
