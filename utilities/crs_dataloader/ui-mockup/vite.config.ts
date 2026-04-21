import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import path from "path"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    // Force a single copy of every package that carries React context.
    // ui-mockup installs its own copy while the workspace package
    // digit-datagrid pulls a parallel copy from /opt/egov/ccrs/node_modules.
    // Without dedupe, two Context objects exist and provider/consumer miss.
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "ra-core",
      "react-router-dom",
      "react-router",
      "react-hook-form",
      "@tanstack/react-query",
    ],
  },
  server: {
    allowedHosts: ["crs-mockup.egov.theflywheel.in"],
  },
})
