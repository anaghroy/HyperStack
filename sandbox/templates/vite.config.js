import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    hmr: { clinetPort: 80, protocol: "ws" }, // tell the browser to connect HMR on port 80 (ingress)
    watch: {
      // must live inside `server`, not root
      usePolling: true,
      interval: 300,
      ignored: ["node_modules"],
    },
  },
});
