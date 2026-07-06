import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon:    '#1A1A18',
        petroleo:  '#0F2233',
        champagne: '#C8A96B',
        crema:     '#F5EFE3',
        // aliases para compatibilidad con clases existentes
        piedra:    '#0F2233',
        arena:     '#C8A96B',
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
