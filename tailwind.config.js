/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html", // Vite's main HTML file is in the root
    "./src/**/*.{js,ts,jsx,tsx}", // This line tells Tailwind to scan all JS, TS, JSX, TSX files in the src folder
  ],
  theme: {
    extend: {
      fontFamily: {
        inter: ['Inter', 'sans-serif'], // Ensure 'Inter' font is defined if you're using it
      },
    },
  },
  plugins: [],
}