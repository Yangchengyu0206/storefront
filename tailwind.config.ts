import TypographyPlugin from "@tailwindcss/typography";
import FormPlugin from "@tailwindcss/forms";
import ContainerQueriesPlugin from "@tailwindcss/container-queries";
import { type Config } from "tailwindcss";

/**
 * Storefront design tokens.
 *
 * The store belongs to the merchant, not to the platform, so nothing here
 * hardcodes a brand colour. Every hue routes through a CSS variable declared
 * in `src/app/globals.css`, which means a deployment can be re-themed by
 * overriding a handful of variables instead of editing components.
 *
 * Locks (taste-skill §4.2 / §4.4):
 *   COLOR    one accent (`accent`), one neutral family (`ink`). Semantic
 *            colours exist only for real state (sold out, error, success).
 *   SHAPE    control 6px · card 12px · sheet 16px · pill full. Nothing else.
 *   SHADOW   tinted to the ink hue, never pure black.
 */
const config: Config = {
	content: ["./src/**/*.{ts,tsx}"],
	theme: {
		extend: {
			fontFamily: {
				// `--font-sans` / `--font-mono` are set by next/font in layout.tsx.
				// CJK falls through to the platform face on purpose: a webfont
				// covering Traditional Chinese is ~10 MB and would gate first paint
				// on a storefront where LCP is revenue.
				sans: [
					"var(--font-sans)",
					"-apple-system",
					"BlinkMacSystemFont",
					"Segoe UI Variable Text",
					"PingFang TC",
					"Microsoft JhengHei UI",
					"Microsoft JhengHei",
					"Noto Sans TC",
					"sans-serif",
				],
				mono: ["var(--font-mono)", "SFMono-Regular", "Consolas", "monospace"],
			},
			colors: {
				// Merchant accent. Override --accent-* per deployment to re-theme.
				accent: {
					DEFAULT: "rgb(var(--accent) / <alpha-value>)",
					fg: "rgb(var(--accent-fg) / <alpha-value>)",
					subtle: "rgb(var(--accent-subtle) / <alpha-value>)",
				},
				// Single neutral family. Do not mix in Tailwind's stock gray/zinc/stone.
				ink: {
					50: "rgb(var(--ink-50) / <alpha-value>)",
					100: "rgb(var(--ink-100) / <alpha-value>)",
					200: "rgb(var(--ink-200) / <alpha-value>)",
					300: "rgb(var(--ink-300) / <alpha-value>)",
					400: "rgb(var(--ink-400) / <alpha-value>)",
					500: "rgb(var(--ink-500) / <alpha-value>)",
					600: "rgb(var(--ink-600) / <alpha-value>)",
					700: "rgb(var(--ink-700) / <alpha-value>)",
					800: "rgb(var(--ink-800) / <alpha-value>)",
					900: "rgb(var(--ink-900) / <alpha-value>)",
					950: "rgb(var(--ink-950) / <alpha-value>)",
				},
			},
			borderRadius: {
				control: "0.375rem",
				card: "0.75rem",
				sheet: "1rem",
			},
			boxShadow: {
				// Tinted to the ink hue rather than rgba(0,0,0,…).
				card: "0 1px 2px rgb(var(--ink-950) / 0.06)",
				lift: "0 8px 24px -8px rgb(var(--ink-950) / 0.14), 0 2px 6px -2px rgb(var(--ink-950) / 0.08)",
				sheet: "0 20px 40px -12px rgb(var(--ink-950) / 0.18)",
			},
			transitionTimingFunction: {
				standard: "cubic-bezier(0.2, 0, 0, 1)",
			},
			keyframes: {
				"fade-up": {
					from: { opacity: "0", transform: "translateY(6px)" },
					to: { opacity: "1", transform: "none" },
				},
			},
			animation: {
				"fade-up": "fade-up 260ms cubic-bezier(0.2, 0, 0, 1) both",
			},
		},
	},
	plugins: [TypographyPlugin, FormPlugin, ContainerQueriesPlugin],
};

export default config;
