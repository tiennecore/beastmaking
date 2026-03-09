/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        prep: '#EAB308',
        hang: '#DC2626',
        restRep: '#2563EB',
        restSet: '#9333EA',
        restRound: '#16A34A',
      },
    },
  },
  plugins: [],
};
