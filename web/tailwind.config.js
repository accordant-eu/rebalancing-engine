/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // We'll map standard tailwind classes to our CSS variables for smooth migration
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
