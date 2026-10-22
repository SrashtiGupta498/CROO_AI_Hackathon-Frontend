import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: Number(env.PORT) || 3000,
      host: "0.0.0.0",
    },
    plugins: [
      react(),
      tailwindcss(), // 👈 THIS replaces tailwind.config.js
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    build: {
      rollupOptions: {
        output: {
          // Split the always-loaded framework libs into their own long-lived
          // chunk so they cache across app-code deploys.
          manualChunks: {
            "react-vendor": ["react", "react-dom", "react-router-dom"],
            "redux-vendor": ["@reduxjs/toolkit", "react-redux"],
          },
        },
      },
    },
  };
});
