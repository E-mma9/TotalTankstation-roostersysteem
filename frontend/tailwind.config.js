/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['Figtree', 'sans-serif'],
      },
      colors: {
        brand: {
          50:  '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        stone: {
          25: '#FAFAF8',
          50: '#F7F6F3',
        },
        ink: {
          DEFAULT: '#1A1916',
          soft:    '#766F65',
          muted:   '#A09890',
        },
        warm: {
          border: '#E8E3DA',
          hover:  '#F0EDE8',
        },
      },
      boxShadow: {
        card:     '0 1px 4px rgba(26,25,22,0.06), 0 1px 2px rgba(26,25,22,0.04)',
        'card-hover': '0 4px 16px rgba(26,25,22,0.10), 0 1px 4px rgba(26,25,22,0.06)',
        'card-lift': '0 8px 24px rgba(26,25,22,0.12), 0 2px 6px rgba(26,25,22,0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      animation: {
        'fade-up': 'fadeUp 0.4s ease both',
        'fade-in': 'fadeIn 0.3s ease both',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
