/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gray: {
          50:  '#f8f9fc',
          100: '#f0f1f5',
          200: '#e2e4ec',
          300: '#c8ccd9',
          400: '#9399b0',
          500: '#6b7188',
          600: '#4f5468',
          700: '#353849',
          750: '#292c3d',
          800: '#1e2030',
          850: '#181a27',
          900: '#13141e',
          950: '#0d0e17',
        },
      },
    },
  },
  plugins: [],
};
