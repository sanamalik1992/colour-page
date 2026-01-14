import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Warm purple/pink primary (from PDF)
        primary: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7C3AED',
        },
        // Pink accent
        accent: {
          400: '#F472B6',
          500: '#EC4899',
          600: '#DB2777',
        },
        // Gray scale (unchanged)
        gray: {
          50: '#F9FAFB',
          100: '#F3F4F6',
          200: '#E5E7EB',
          300: '#D1D5DB',
          400: '#9CA3AF',
          500: '#6B7280',
          700: '#374151',
          900: '#111827',
        },
      },
      fontFamily: {
        sans: [
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1.5' }],      // 12px
        'sm': ['0.875rem', { lineHeight: '1.5' }],     // 14px
        'base': ['1rem', { lineHeight: '1.5' }],       // 16px
        'xl': ['1.25rem', { lineHeight: '1.375' }],    // 20px - card title
        '5xl': ['3rem', { lineHeight: '1.25' }],       // 48px - hero H1
      },
      spacing: {
        // 4px base unit from PDF
        '18': '4.5rem', // 72px
        '22': '5.5rem', // 88px
      },
      borderRadius: {
        'lg': '8px',      // buttons, inputs
        'xl': '12px',     // cards
        '2xl': '16px',    // modals
        'full': '9999px', // pills, avatars
      },
      boxShadow: {
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
      },
      animation: {
        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
        'border-flow': 'border-flow 3s linear infinite',
        'zoom-in-95': 'zoom-in-95 300ms ease-out',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 5px rgba(168, 85, 247, 0.5), 0 0 20px rgba(168, 85, 247, 0.3)',
          },
          '50%': {
            boxShadow: '0 0 20px rgba(168, 85, 247, 0.8), 0 0 40px rgba(168, 85, 247, 0.5)',
          },
        },
        'border-flow': {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
        'zoom-in-95': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config