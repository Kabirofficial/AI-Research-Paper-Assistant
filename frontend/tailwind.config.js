/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Foundation: Warm Cream & Beige
        cream: {
          main: '#F1EBDD',
          secondary: '#E8E0D1',
          surface: '#FAF7EF',
          elevated: '#FFFDF7',
          border: '#C9C0B1',
          text: '#252722',
          muted: '#77766D',
        },
        // Secondary: Architectural Sky Blue
        sky: {
          primary: '#83B9D8',
          light: '#B7D8E9',
          deep: '#426F8C',
          pale: '#DCEAF0',
          hover: '#95C5E1',
        },
        // Complementary: Muted Red / Vermilion
        vermilion: {
          primary: '#C85B4A',
          soft: '#E8B4A8',
          pale: '#F1D9D2',
          deep: '#873F36',
          hover: '#B54E3E',
        },
        // Charcoal & Dark Neutrals
        charcoal: {
          main: '#252722',
          secondary: '#353830',
          border: '#55564E',
        },
        // Warm Dark Mode Theme Palette
        warmdark: {
          main: '#242520',
          surface: '#303129',
          elevated: '#393A31',
          text: '#F1EBDD',
          muted: '#B5B1A5',
          border: '#55564D',
          sky: '#83B9D8',
          vermilion: '#D47B6D',
        },
      },
      boxShadow: {
        'editorial-sm': '2px 2px 0px 0px #252722',
        'editorial': '3px 3px 0px 0px #252722',
        'editorial-lg': '4px 4px 0px 0px #252722',
        'editorial-sky': '3px 3px 0px 0px #426F8C',
        'editorial-red': '3px 3px 0px 0px #873F36',
        'editorial-soft': '2px 2px 0px 0px #C9C0B1',
        // Dark mode hard shadows
        'dark-editorial-sm': '2px 2px 0px 0px #0F100D',
        'dark-editorial': '3px 3px 0px 0px #0F100D',
        'dark-editorial-lg': '4px 4px 0px 0px #0F100D',
      },
      fontFamily: {
        display: [
          'Space Grotesk',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
        serif: [
          'DM Serif Display',
          'Playfair Display',
          'Georgia',
          'serif',
        ],
        mono: [
          'JetBrains Mono',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace',
        ],
      },
      borderRadius: {
        none: '0px',
        xs: '2px',
        sm: '3px',
        DEFAULT: '4px',
        md: '6px',
        lg: '8px',
      },
    },
  },
  plugins: [],
};
