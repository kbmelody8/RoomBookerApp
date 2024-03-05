/** @type {import('tailwindcss').Config} */
module.exports = {
  // purge: ['./views/**/*.ejs'],
  content: ['./views/**/*.ejs'],
  mode: "jit",
  darkMode: "media", // or 'media' or 'class'
  theme: {
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
}