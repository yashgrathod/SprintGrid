import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        background: "#ffffff",
        foreground: "#111827", // gray-900
        border: "#e5e7eb", // gray-200
        primary: "#2563eb", // blue-600 (strictly one accent)
        primaryHover: "#1d4ed8", // blue-700
        muted: "#f9fafb", // gray-50
        mutedForeground: "#6b7280", // gray-500
      },
      boxShadow: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      },
      borderRadius: {
        DEFAULT: '0.25rem', // Strict 4px slightly rounded borders
      }
    },
  },
  plugins: [],
};
export default config;
