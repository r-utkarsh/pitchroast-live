/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Dark tokens from the PitchRoast design system.
        ink: {
          950: '#070b14', // bg
          925: '#101a33', // overlay (composer)
          900: '#0e1524', // surface
          850: '#141c30', // raised
          800: '#1e2842', // line
          700: '#26314f', // line-strong
          500: '#8793b0', // fg-subtle
          300: '#a3afc9', // fg-muted
          100: '#e9eef9', // fg
        },
        accent: {
          300: '#93b4ff', // accent-fg
          400: '#5b8dff', // accent-edge
          500: '#2563eb', // accent
          600: '#1d4ed8', // accent-hover
          700: '#12244f', // accent-soft
        },
        tag: {
          hook: '#fcd34d',
          clarity: '#7dd3fc',
          fix: '#fda4af',
        },
        flame: '#fb923c',
        ok: '#4ade80',
        field: '#56648a',
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Consolas',
          'Liberation Mono',
          'monospace',
        ],
      },
      borderRadius: {
        card: '14px',
        xl: '16px',
        '2xl': '20px',
      },
      boxShadow: {
        glow: '0 8px 20px rgba(37, 99, 235, 0.35)',
        raise: '0 12px 32px rgba(2, 6, 23, 0.55)',
        float: '0 24px 60px rgba(2, 6, 23, 0.6)',
      },
    },
  },
  plugins: [],
};
