import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#ed4c4c',
          dark: '#b12a2a',
          light: '#faa09a'
        },
        peach: '#faa09a',
        'light-peach': '#ffd0cd',
        offwhite: '#ffffff'
      },
      fontFamily: {
        sans: ['Figtree', 'ui-sans-serif', 'system-ui'],
        display: ['Grandstander', 'cursive']
      }
    }
  },
  plugins: []
};

export default config;
