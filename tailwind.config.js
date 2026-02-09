/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#1a1a1a', // Dark Gray/Black
        surface: '#252525',
        primary: '#f5c518', // IMDb-like yellow/orange often provided in movie themes
        secondary: '#e50914', // Netflix Red accent
        text: '#eeb'
      },
    },
  },
  plugins: [],
}
