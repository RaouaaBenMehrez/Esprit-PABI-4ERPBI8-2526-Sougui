/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'sougui-bg': '#0d0b08',
        'sougui-surface': '#16130e',
        'sougui-surface-light': '#1e1a14',
        'sougui-gold': '#c9a84c',
        'sougui-gold-light': '#e4c875',
        'sougui-gold-dim': '#7a5e28',
        'sougui-copper': '#b87333',
        'sougui-cream': '#f5ede0',
        'sougui-text': '#e8dcc8',
        'sougui-text-dim': '#8a7a62',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans: ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        'sougui': '14px',
      }
    },
  },
  plugins: [],
}
