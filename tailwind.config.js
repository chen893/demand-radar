/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{tsx,ts,jsx,js}"],
  theme: {
    extend: {
      colors: {
        brand: {
          start: "#6EE7B7", // Teal 300
          end: "#3B82F6",   // Blue 500
          secondary: "#FECACA", // Red 200
          text: "#1F2937",    // Gray 800
          accent: "#EC4899",  // Pink 500
        },
        status: {
          success: "#16A34A", // Green 600
          warning: "#FBBF24", // Amber 400
          error: "#EF4444",   // Red 500
        },
        // Keep existing primary for backward compatibility if needed, or we can replace usage later
        primary: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",
          600: "#2563eb",
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
      },
      fontFamily: {
        montserrat: ['Montserrat', 'sans-serif'],
        poppins: ['Poppins', 'sans-serif'],
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    },
  },
  plugins: [],
};
