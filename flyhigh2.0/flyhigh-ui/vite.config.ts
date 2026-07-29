import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Explicit base path — critical for S3/CloudFront deployments.
  // Set VITE_BASE_URL env var if deploying to a subpath.
  base: process.env.VITE_BASE_URL || "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  // Dev server proxy: routes /api calls to the Spring Boot backend
  // so local development works without CORS headaches.
  server: {
    host: "127.0.0.1", // force IPv4 — avoids IPv6 ::1 excluded port issue
    proxy: {
      "/api": {
        target: "http://localhost:8081",
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Split vendor deps into separate cacheable chunks for better
        // CloudFront cache hit ratios (content-hashed filenames).
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          socket: ["socket.io-client"],
        },
      },
    },
  },
})
