/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        petroleo:   '#0D3B4E',  // primario
        acero:      '#7FA1BB',  // acento
        crema:      '#E7EBEE',  // fondo neutro
        blancoRoto: '#F7F7F5',  // fondo claro
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Helvetica Neue', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
