import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        progress: "progress 1.5s ease-in-out infinite",
      },
      boxShadow: {
        custom: "0px 0px 24px 0px #00000029",
      },
      backgroundImage: {
        "custom-gradient":
          "linear-gradient(90deg, #FAFAFA 0%, #FAFAFA 51.82%, rgba(254, 254, 254, 0.6) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animated")],
} satisfies Config;
