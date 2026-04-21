/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Backgrounds
        'sougui-bg':           '#05080f',
        'sougui-surface':      '#0a0f1e',
        'sougui-surface-light':'#0f1628',
        'sougui-panel':        '#111827',

        // Bleus Sougui  
        'sougui-blue':         '#1e5aff',
        'sougui-blue-light':   '#4d7fff',
        'sougui-blue-dim':     '#0f2d80',
        'sougui-electric':     '#3d7eff',

        // Accents dorés (héritage)
        'sougui-gold':         '#c9a84c',
        'sougui-gold-light':   '#e4c875',
        'sougui-gold-dim':     '#7a5e28',
        'sougui-copper':       '#b87333',

        // Textes
        'sougui-cream':        '#e8eef8',
        'sougui-text':         '#cbd5e8',
        'sougui-text-dim':     '#4d6080',
        'sougui-text-muted':   '#2d3f5e',
      },
      fontFamily: {
        serif: ['Playfair Display', 'serif'],
        sans:  ['DM Sans', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        'sougui': '14px',
      },
      boxShadow: {
        'blue-glow':  '0 0 30px rgba(30,90,255,0.2)',
        'blue-soft':  '0 8px 32px rgba(30,90,255,0.12)',
        'panel':      '0 4px 24px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'gradient-blue':    'linear-gradient(135deg, #1e5aff 0%, #0f2d80 100%)',
        'gradient-surface': 'linear-gradient(135deg, #0a0f1e 0%, #0f1628 100%)',
        'gradient-glow':    'radial-gradient(ellipse at center, rgba(30,90,255,0.15) 0%, transparent 70%)',
      },
    },
  },
  plugins: [],
}
