/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          hover: 'var(--color-primary-hover)',
          light: 'var(--color-primary-light)',
          dark: 'var(--color-primary-dark)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
        },
        lad: {
          DEFAULT: 'var(--color-primary)',
          50: 'var(--color-primary-light)',
          100: 'var(--color-primary-light)',
          200: 'var(--color-primary-light)',
          300: 'var(--color-primary-light)',
          400: 'var(--color-primary)',
          500: 'var(--color-primary)',
          600: 'var(--color-primary)',
          700: 'var(--color-primary-hover)',
          800: 'var(--color-primary-dark)',
          900: 'var(--color-primary-dark)',
          950: 'var(--color-primary-dark)',
        },
      },
    },
  },
  plugins: [],
}
