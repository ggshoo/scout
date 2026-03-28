/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        card: {
          green: '#2d5a27',
          red: '#b91c1c',
          back: '#1e3a5f',
        },
      },
    },
  },
  plugins: [],
};
