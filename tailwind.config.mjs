/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:       '#2C6B9E',
          'blue-dark': '#204F78',
          black:      '#0D0D0D',
          gray:       '#F5F5F5',
          mute:       '#888888',
        },
      },
      fontFamily: {
        oswald: ['Oswald', 'sans-serif'],
      },
    },
  },
  plugins: [],
}