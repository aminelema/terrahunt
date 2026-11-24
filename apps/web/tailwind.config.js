/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#07111F',
          900: '#0B192C',
          800: '#0F243E',
          700: '#173459',
        },
      },
    },
  },
  plugins: [],
};
