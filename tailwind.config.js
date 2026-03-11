/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FEFDFB',
          100: '#FBF9F5',
          200: '#F5F1EB',
          300: '#E8E0D4',
          400: '#D4C9B9',
        },
        ink: {
          900: '#1C1917',
          800: '#292524',
          700: '#44403C',
          500: '#78716C',
          400: '#A8A29E',
          300: '#D6D3D1',
        },
        burnt: {
          DEFAULT: '#D4451A',
          50: '#FFF7ED',
          100: '#FFEDD5',
          200: '#FED7AA',
          400: '#FB923C',
          500: '#EA580C',
          600: '#D4451A',
          700: '#C2410C',
          800: '#9A3412',
        },
      },
      fontFamily: {
        sans: ['"Pretendard Variable"', 'Pretendard', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'Roboto', '"Helvetica Neue"', '"Segoe UI"', '"Apple SD Gothic Neo"', '"Noto Sans KR"', '"Malgun Gothic"', '"Apple Color Emoji"', '"Segoe UI Emoji"', '"Segoe UI Symbol"', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
    },
  },
  plugins: [],
}
