import { defineConfig } from "vite";
import foundryvtt from "vite-plugin-foundryvtt";

import MANIFEST from "./src/system.json";

const substitutions = {
  download: process.env.ARCHIVE_URL,
  manifest: process.env.MANIFEST_URL,
};
if (process.env.CI) MANIFEST.packs.splice(0, 1);
const buildPacks = process.env.FVTT_BUILD_PACKS !== "0";

export default defineConfig({
  base: "/systems/hellpiercers/",
  server: {
    port: 30001,
    open: "/",
    proxy: {
      "^(?!/systems/hellpiercers/)": "http://localhost:30000/",
      "/socket.io": {
        target: "ws://localhost:30000",
        ws: true,
      },
    },
  },
  build: {
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      name: "hellpiercers",
      entry: "src/hellpiercers.mjs",
      formats: ["es"],
      fileName: "hellpiercers",
    },
    rolldownOptions: { output: { keepNames: true } },
  },
  css: { devSourcemap: true },
  plugins: [
    foundryvtt(MANIFEST, { substitutions, buildPacks }),
    {
      name: "css-layers",
      apply: "serve",
      transform(code, id) {
        if (id.endsWith("hellpiercers.scss")) return `\n\n@layer system {\n\n${code}\n\n}\n`;
      },
    },
    {
      name: "fvtt-launch",
      configureServer() {
        import("node:child_process").then(p =>
          p.spawn("fvtt", ["--config", "./fvttrc.yml", "launch"])
        );
      },
    },
  ],
});
