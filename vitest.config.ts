import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ["test/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    // The suite spawns a worker per file; on a busy machine a heavy simulation or render can pass the
    // 5s default without being wrong.
    testTimeout: 20_000,
    setupFiles: ["./test/setup.ts"],
    restoreMocks: true,
    pool: "threads",
    maxWorkers: 1,
    fileParallelism: false,
  },
});
