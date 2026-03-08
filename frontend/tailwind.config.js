/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{html,js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#1E3A8A", // deep blue
        accent: "#2563EB", // brighter blue
        overlay: "#0F172A", // dark bluish overlay
      },
      backgroundImage: {
        "gradient-main": "linear-gradient(to bottom right, #1E3A8A, #2563EB)",
      },
    },
  },
  plugins: [],
};
