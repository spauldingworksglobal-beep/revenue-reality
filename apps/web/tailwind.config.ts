import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2420",
        paper: "#faf9f6",
        accent: "#2c5f4f",
      },
    },
  },
  plugins: [],
};
export default config;
