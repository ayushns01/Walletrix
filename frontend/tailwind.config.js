module.exports = {
  content: [
    "./app/**/*.{js,jsx}",
    "./pages/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Aurora design language — see app/tokens.css
        wx: {
          bg: 'var(--wx-bg)',
          surface: 'var(--wx-surface)',
          'surface-strong': 'var(--wx-surface-strong)',
          ink: 'var(--wx-ink)',
          dim: 'var(--wx-dim)',
          line: 'var(--wx-line)',
          'line-strong': 'var(--wx-line-strong)',
          accent: 'var(--wx-accent)',
          'accent-soft': 'var(--wx-accent-soft)',
          green: 'var(--wx-green)',
          'green-soft': 'var(--wx-green-soft)',
          red: 'var(--wx-red)',
          'red-soft': 'var(--wx-red-soft)',
          amber: 'var(--wx-amber)',
        },
      },
      borderRadius: {
        wx: 'var(--wx-radius)',
        'wx-sm': 'var(--wx-radius-sm)',
      },
      fontFamily: {
        sans: ['var(--wx-font-display)'],
        mono: ['var(--wx-font-mono)'],
      },
      boxShadow: {
        'wx-glow': '0 0 36px -8px var(--wx-accent)',
        'wx-glow-lg': '0 8px 56px -8px var(--wx-accent)',
        'wx-panel': '0 30px 90px -30px rgba(0, 0, 0, 0.8)',
      },
      transitionTimingFunction: {
        wx: 'var(--wx-ease)',
      },
      animation: {
        'wx-pulse': 'wx-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        'wx-pulse': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
      },
    },
  },
  plugins: [],
}
