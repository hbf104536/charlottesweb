import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        web: {
          bg: "#05070d",
          panel: "#0b0f1a",
          line: "#7dd3fc",
          glow: "#38bdf8",
          accent: "#a855f7",
        },
      },
      boxShadow: {
        glow: "0 0 12px rgba(56, 189, 248, 0.55), 0 0 28px rgba(56, 189, 248, 0.25)",
      },
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      keyframes: {
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "pulse-glow": "pulse-glow 1.6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
