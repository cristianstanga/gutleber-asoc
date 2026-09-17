/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Marca "Gutleber & Co." (2026-09-17) — monocromática
        petroleo:   '#000000',  // negro — primario (antes azul petróleo)
        acero:      '#8A8A8A',  // gris medio — acento (antes azul acero)
        crema:      '#E9E9E7',  // fondo neutro — gris claro
        blancoRoto: '#F7F7F5',  // fondo claro — sin cambios
      },
      fontFamily: {
        display: ['Poppins', 'system-ui', 'sans-serif'],
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
