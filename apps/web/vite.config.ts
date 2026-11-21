import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import tailwindcss from "@tailwindcss/vite";
import mkcert from 'vite-plugin-mkcert';
import fs from 'fs';

export default defineConfig({
  server: {
    https:{
      key: fs.readFileSync('../certs/192.168.1.26+2-key.pem'),
      cert: fs.readFileSync('../certs/192.168.1.26+2.pem'),
    },
    host: '0.0.0.0', 
    port: 5173,
  },
  plugins: [react(), nodePolyfills(), tailwindcss(), mkcert()],
});
