/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        ink: {
          950: "#020711",
          900: "#06101d",
          850: "#071525",
          800: "#0b1b2c",
          700: "#10263c",
        },
        cyanline: "#23d3ee",
        tealglow: "#17e6c3",
        risk: "#ff6b3a",
        good: "#33d17a",
      },
      boxShadow: {
        glow: "0 0 24px rgba(35, 211, 238, 0.18)",
        panel: "0 18px 60px rgba(0, 0, 0, 0.36)",
      },
      animation: {
        "pulse-node": "pulseNode 2.8s ease-in-out infinite",
        "dash-flow": "dashFlow 9s linear infinite",
      },
      keyframes: {
        pulseNode: {
          "0%, 100%": { opacity: "0.75", transform: "scale(1)" },
          "50%": { opacity: "1", transform: "scale(1.35)" },
        },
        dashFlow: {
          to: { strokeDashoffset: "-80" },
        },
      },
    },
  },
  plugins: [],
};
