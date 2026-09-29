/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#fdf6e3',
        moss: '#5a8a3c',
        'moss-dark': '#3d6128',
        coral: '#e85d4a',
        'coral-light': '#f28b7d',
        butter: '#f4c542',
        lavender: '#b8a0d6',
        'lavender-dark': '#8b6bb5',
        sky: '#7ab8d4',
        bark: '#2d1b00',
        petal: '#ffb3c6',
        mint: '#a8e6cf',
      },
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        display: ['"VT323"', 'monospace'],
      },
      boxShadow: {
        pixel: '4px 4px 0px #2d1b00',
        'pixel-sm': '2px 2px 0px #2d1b00',
        'pixel-lg': '6px 6px 0px #2d1b00',
        'pixel-moss': '4px 4px 0px #3d6128',
        'pixel-coral': '4px 4px 0px #c0392b',
        'pixel-inset': 'inset 2px 2px 0px #2d1b00',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
