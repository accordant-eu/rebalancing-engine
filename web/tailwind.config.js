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
        'soft': '0 4px 20px -2px rgba(0, 0, 0, 0.03)',
        'soft-hover': '0 12px 30px -4px rgba(0, 0, 0, 0.08)',
        'glow-teal': '0 0 20px rgba(20, 184, 166, 0.15)',
        'glow-blue': '0 0 20px rgba(59, 130, 246, 0.15)',
        'glass': '0 4px 30px rgba(0, 0, 0, 0.05)',
        'glass-inset': 'inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'glass-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.8) 0%, rgba(255,255,255,0.4) 100%)',
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
