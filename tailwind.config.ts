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
        // Semantic category colors
        category: {
          work: "hsl(var(--category-work))",
          sport: "hsl(var(--category-sport))",
          health: "hsl(var(--category-health))",
          study: "hsl(var(--category-study))",
          reading: "hsl(var(--category-reading))",
          social: "hsl(var(--category-social))",
          photo: "hsl(var(--category-photo))",
          other: "hsl(var(--category-other))",
        },
        // Intensity scale for heatmaps/progress (GREEN ALLOWED)
        intensity: {
          none: "hsl(var(--intensity-none))",
          low: "hsl(var(--intensity-low))",
          medium: "hsl(var(--intensity-medium))",
          high: "hsl(var(--intensity-high))",
        },
        // State colors (success uses brand green)
        state: {
          success: "hsl(var(--state-success))",
          warning: "hsl(var(--state-warning))",
          error: "hsl(var(--state-error))",
          info: "hsl(var(--state-info))",
        },
        // Brand green - ONLY for intentional use: CTAs, progress, active states
        brand: {
          green: "hsl(var(--brand-green))",
          greenLight: "hsl(var(--brand-green-light))",
          greenDark: "hsl(var(--brand-green-dark))",
        },
        // Semantic theme tokens
        theme: {
          bg: "hsl(var(--theme-bg))",
          bgElevated: "hsl(var(--theme-bg-elevated))",
          cardBg: "hsl(var(--theme-card-bg))",
          textPrimary: "hsl(var(--theme-text-primary))",
          textSecondary: "hsl(var(--theme-text-secondary))",
          textTertiary: "hsl(var(--theme-text-tertiary))",
          accentPrimary: "hsl(var(--theme-accent-primary))",
          accentHighlight: "hsl(var(--theme-accent-highlight))",
          borderSubtle: "hsl(var(--theme-border-subtle))",
          tabBg: "hsl(var(--theme-tab-bg))",
          tabIconActive: "hsl(var(--theme-tab-icon-active))",
          tabIconInactive: "hsl(var(--theme-tab-icon-inactive))",
          inputBg: "hsl(var(--theme-input-bg, var(--muted)))",
          inputBorder: "hsl(var(--theme-input-border, var(--input)))",
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
