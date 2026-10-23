import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import fs from "fs";
import path from "path";

// Check if HTTPS certificates exist
const certPath = path.resolve(__dirname, "certs/cert.pem");
const keyPath = path.resolve(__dirname, "certs/key.pem");
const hasCerts = fs.existsSync(certPath) && fs.existsSync(keyPath);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    https: hasCerts
      ? {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        }
      : false,
    hmr: {
      port: 3000,
      protocol: hasCerts ? "wss" : "ws",
    },
  },
});
