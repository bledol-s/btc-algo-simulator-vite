import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from 'tailwindcss'; // Import tailwindcss
import autoprefixer from 'autoprefixer'; // Import autoprefixer

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/btc-algo-simulator-vite/', // Crucial for GitHub Pages. Must match your repo name with leading and trailing slash
  css: { // Add this new 'css' section
    postcss: {
      plugins: [
        tailwindcss, // Reference the imported tailwindcss
        autoprefixer, // Reference the imported autoprefixer
      ],
    },
  },
})