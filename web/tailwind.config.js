/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        'soft-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.08)',
        'glow-sky': '0 0 20px rgba(14, 165, 233, 0.15)',
        'glow-rose': '0 0 20px rgba(225, 29, 72, 0.15)',
      },
      colors: {
        // Fallbacks for standard CSS variables
        bgDark: "var(--bg-dark)",
        panelBg: "var(--panel-bg)",
        borderSubtle: "var(--border-subtle)",
        accentBlue: "var(--accent-blue)",
        statusGreen: "var(--status-green)",
        statusRed: "var(--status-red)",
        statusYellow: "var(--status-yellow)",
        textSecondary: "var(--text-secondary)",
      }
    },
  },
  plugins: [],
}
