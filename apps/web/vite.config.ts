import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true, // This exposes the app to the LAN
    port: 5173
  },
  plugins: [react(), nodePolyfills(), tailwindcss()],
});
