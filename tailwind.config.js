/** @type {import('tailwindcss').Config} */
export default { // Note: Vite uses 'export default' instead of 'module.exports'
  content: [
    "./index.html", // Vite's main HTML file is in the root
    "./src/**/*.{js,ts,jsx,tsx}", // Scan all JS/TS/JSX/TSX files in src
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}