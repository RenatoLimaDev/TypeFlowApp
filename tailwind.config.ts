import type { Config } from "tailwindcss";

export default {
  content: ["./src/**/*.{ts,tsx,html}"],
  theme: {
    extend: {
      fontFamily: {
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Cascadia Code",
          "Courier New",
          "monospace",
        ],
      },
      colors: {
        accent: "#7dd3fc",
        surface: "rgba(10,10,14,0.92)",
      },
      keyframes: {
        blink: { "0%,100%": { opacity: "1" }, "50%": { opacity: "0" } },
        slideUp: {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        fadeIn: {
          from: { opacity: "0", transform: "translateY(3px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        cardIn: {
          from: { opacity: "0", transform: "translateY(10px) scale(0.96)" },
          to: { opacity: "1", transform: "translateY(0) scale(1)" },
        },
      },
      animation: {
        blink: "blink 1.1s step-end infinite",
        slideUp: "slideUp 260ms cubic-bezier(0.22,1,0.36,1) both",
        fadeIn: "fadeIn 160ms ease both",
        cardIn: "cardIn 320ms cubic-bezier(0.22,1,0.36,1) both",
      },
    },
  },
  plugins: [],
} satisfies Config;
