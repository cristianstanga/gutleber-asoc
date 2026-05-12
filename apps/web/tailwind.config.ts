import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon: '#2C2C2A',
        piedra: '#8C7B6B',
        arena: '#C4B09A',
        crema: '#F0E8DC',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
