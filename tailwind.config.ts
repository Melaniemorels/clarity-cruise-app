import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        luxury: {
          emerald: "hsl(var(--luxury-emerald))",
          emeraldLight: "hsl(var(--luxury-emerald-light))",
          emeraldDark: "hsl(var(--luxury-emerald-dark))",
          chocolate: "hsl(var(--luxury-chocolate))",
          navy: "hsl(var(--luxury-navy))",
          white: "hsl(var(--luxury-white))",
          black: "hsl(var(--luxury-black))",
        },
        theme: {
          bg: "hsl(var(--theme-bg))",
          bgElevated: "hsl(var(--theme-bg-elevated))",
          cardBg: "hsl(var(--theme-card-bg))",
          textPrimary: "hsl(var(--theme-text-primary))",
          textSecondary: "hsl(var(--theme-text-secondary))",
          accentPrimary: "hsl(var(--theme-accent-primary))",
          accentHighlight: "hsl(var(--theme-accent-highlight))",
          borderSubtle: "hsl(var(--theme-border-subtle))",
          tabBg: "hsl(var(--theme-tab-bg))",
          tabIconActive: "hsl(var(--theme-tab-icon-active))",
          tabIconInactive: "hsl(var(--theme-tab-icon-inactive))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
