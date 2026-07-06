import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        carbon:     '#091E2E',   // azul muy oscuro — sidebar / fondos dark
        petroleo:   '#0D3B4E',   // azul petróleo primario
        champagne:  '#7FA1BB',   // acero claro (el dorado fue retirado 2026-07-06)
        crema:      '#E7EBEE',   // gris claro — fondos claros
        blancoRoto: '#F7F7F5',   // off-white
        // aliases para compatibilidad con clases existentes
        piedra:     '#1A4A63',   // nav activo — azul medio
        arena:      '#B8D2E0',   // texto secundario sobre fondos dark
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
