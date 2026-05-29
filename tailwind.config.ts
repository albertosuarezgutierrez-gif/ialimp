import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Plus Jakarta Sans', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        indigo: {
          DEFAULT: '#4f46e5',
          dark:    '#3730a3',
          light:   '#eef2ff',
          muted:   '#818cf8',
        },
      },
      borderRadius: {
        xl:  '14px',
        '2xl': '20px',
        '3xl': '24px',
      },
    },
  },
  plugins: [],
}

export default config
