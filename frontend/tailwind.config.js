/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        portal: {
          navy: '#0f172a',
          'navy-dark': '#090d16',
          'navy-light': '#1e293b',
          blue: '#1d4ed8',
          'blue-accent': '#2563eb',
          'blue-light': '#eff6ff',
          surface: '#f8fafc',
          border: '#e2e8f0',
        }
      }
    },
  },
  plugins: [],
}
