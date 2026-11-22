/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,jsx,mdx}",
    "./src/components/**/*.{js,jsx,mdx}",
    "./src/app/**/*.{js,jsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
      colors: {
        alabaster: {
          DEFAULT: "var(--alabaster)",
          deep: "var(--alabaster-deep)",
        },
        paper: {
          DEFAULT: "var(--paper)",
          pure: "var(--paper-pure)",
        },
        rule: {
          DEFAULT: "var(--rule)",
          strong: "var(--rule-strong)",
        },
        ink: {
          DEFAULT: "var(--ink)",
          soft: "var(--ink-soft)",
          muted: "var(--ink-muted)",
        },
        spruce: {
          DEFAULT: "var(--spruce)",
          btn: "var(--spruce-btn)",
          hover: "var(--spruce-hover)",
          "btn-ink": "var(--spruce-btn-ink)",
          tint: "var(--spruce-tint)",
          "tint-strong": "var(--spruce-tint-strong)",
          border: "var(--spruce-border)",
        },
        ochre: {
          DEFAULT: "var(--ochre)",
          tint: "var(--ochre-tint)",
          border: "var(--ochre-border)",
        },
        terracotta: {
          DEFAULT: "var(--terracotta)",
          btn: "var(--terracotta-btn)",
          hover: "var(--terracotta-hover)",
          tint: "var(--terracotta-tint)",
          border: "var(--terracotta-border)",
        },
        "slate-blue": {
          DEFAULT: "var(--slate-blue)",
          tint: "var(--slate-tint)",
          border: "var(--slate-border)",
        },
      },
    },
  },
  plugins: [],
};
