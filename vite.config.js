import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "TABIGO",
        short_name: "TABIGO",
        description: "Plan any trip, anywhere.",
        theme_color: "#26344A",
        background_color: "#E9DEC4",
        display: "standalone",
        icons: [],
      },
    }),
  ],
});
