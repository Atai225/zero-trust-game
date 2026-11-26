/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0A0C10',
        panel: '#11151C',
        panel2: '#0D1117',
        line: '#1E293B',
        amber: { neon: '#F59E0B' },
        safe: '#10B981',
        threat: '#EF4444',
        sys: '#06B6D4',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"Fira Code"', 'ui-monospace', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        wave: { '0%,100%': { transform: 'scaleY(0.25)' }, '50%': { transform: 'scaleY(1)' } },
        slideIn: { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blink: { '0%,49%': { opacity: '1' }, '50%,100%': { opacity: '0' } },
        flicker: { '0%,100%': { opacity: '1' }, '50%': { opacity: '0.97' } },
      },
      animation: {
        wave: 'wave 1s ease-in-out infinite',
        slideIn: 'slideIn .25s ease-out',
        blink: 'blink 1s step-end infinite',
        flicker: 'flicker 3s infinite',
      },
    },
  },
  plugins: [],
};
