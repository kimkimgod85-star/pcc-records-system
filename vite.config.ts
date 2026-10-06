import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  // Set VITE_BASE=/pcc-records-system/ when building for GitHub Pages.
  base: process.env.VITE_BASE || '/',
  // Serve files from the `PCC/` folder as static assets (logo/background).
  // Example URLs: `/PCC%20LOGO.png`, `/PCC1.jpg`
  publicDir: 'PCC',
  plugins: [
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
})
