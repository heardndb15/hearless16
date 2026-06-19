/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: "#F8FAFC",
        bgCard: "#FFFFFF",
        bgCardHover: "#EBF5FF",
        accent: "#0066FF",
        accentGlow: "rgba(0, 102, 255, 0.15)",
        purpleBrand: "#00A3FF",
        textBrand: "#0F172A",
        textSecondary: "#475569",
        textMuted: "#64748B",
        borderBrand: "#E2E8F0",
        sos: "#EF4444",
        successBrand: "#22C55E",
      },
      fontFamily: {
        syne: ["Syne", "sans-serif"],
        dm: ["DM Sans", "sans-serif"],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
