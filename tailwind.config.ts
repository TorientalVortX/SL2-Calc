import type { Config } from 'tailwindcss'
import { colors, fontSize } from './src/design/tokens'

/**
 * Colour lives in `src/design/tokens.ts` — edit it there, not here.
 * Tailwind's default palette is only *extended*, never replaced, so existing
 * `gray-*` call sites keep working while they are migrated to semantic tokens.
 */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
        // sm: '640px', (default)
        // md: '768px', (default)
        // lg: '1024px', (default)
        // xl: '1280px', (default)
        // 2xl: '1536px', (default)
      },
      fontFamily: {
        // Turn 1 design typography. Barlow Condensed is the label face (uppercase,
        // tracked, 9–10px); JetBrains Mono carries every numeric value.
        'sans': ['Barlow', 'system-ui', '-apple-system', 'sans-serif'],
        'condensed': ['Barlow Condensed', 'Barlow', 'sans-serif'],
        'mono': ['JetBrains Mono', 'ui-monospace', 'monospace'],
        'display': ['Barlow Condensed', 'Barlow', 'sans-serif'],
      },
      // The design's type scale is denser than Tailwind's default. Named by px so
      // the layout work can be literal against the design document. Defined in
      // `tokens.ts` because `cx` needs the same list — see the note there.
      fontSize,
      borderRadius: {
        '2': '2px',
        '3': '3px',
        '5': '5px',
        '6': '6px',
        '7': '7px',
        '8': '8px',
        '9': '9px',
        '10': '10px',
      },
      letterSpacing: {
        // The uppercase label treatment, used 73 times in the design.
        'label': '0.22em',
        'tag': '0.16em',
        'tight-value': '-0.03em',
      },
      // The legacy `dark-*` / `accent-*` groups are gone: every call site now uses
      // a semantic token, so nothing referenced them any more.
      colors,
      animation: {
        'fade-in': 'fadeIn 0.6s ease-in-out',
        'slide-up': 'slideUp 0.6s ease-out',
        'glow': 'glow 2s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(96, 165, 250, 0.5)' },
          '50%': { boxShadow: '0 0 40px rgba(96, 165, 250, 0.8)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
} satisfies Config
