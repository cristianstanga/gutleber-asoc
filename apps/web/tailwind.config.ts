import type { Config } from 'tailwindcss'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca "Gutleber & Co." (2026-09-17) — monocromática. Los nombres de los
        // tokens quedaron de la paleta azul anterior por compatibilidad con ~1000
        // usos en el código; lo que cambia acá es el valor hex, no el nombre.
        carbon:     '#121212',   // negro — sidebar / fondos dark
        petroleo:   '#000000',   // negro puro — primario (antes azul petróleo)
        champagne:  '#A0A0A0',   // gris medio — acento secundario (antes azul acero; el dorado NO vuelve)
        crema:      '#E9E9E7',   // gris claro — fondos claros
        blancoRoto: '#F7F7F5',   // off-white — sin cambios
        piedra:     '#2B2B2B',   // nav activo — gris muy oscuro
        arena:      '#CFCFCF',   // texto secundario sobre fondos dark
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config
