import type { Config } from "tailwindcss";

// Palette: cool fog paper, deep ink, cobalt for actions, marigold only for the ticket accent.
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        fog: "#E8EDF0",
        paper: "#F7F9FA",
        ink: { DEFAULT: "#121A24", soft: "#4A5663", faint: "#8A95A1" },
        cobalt: { DEFAULT: "#2E4BD8", dark: "#2339A8" },
        marigold: "#F2B230",
        alert: "#B3261E",
      },
      fontFamily: {
        display: ['"Iowan Old Style"', '"Palatino Linotype"', "Palatino", "Georgia", "serif"],
        sans: ["ui-sans-serif", "system-ui", '"Segoe UI"', "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
