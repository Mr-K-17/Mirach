/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  darkMode: "media",
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        surface: "var(--color-surface)",
        text: "var(--color-text)",
        textMuted: "var(--color-text-muted)",
        border: "var(--color-border)",
        borderStrong: "var(--color-border-strong)",
        accent: "var(--color-accent)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)"
      },
      borderRadius: {
        control: "8px",
        card: "12px",
        bubble: "16px"
      }
    }
  },
  plugins: []
};
