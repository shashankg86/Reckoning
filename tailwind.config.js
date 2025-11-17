/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        orange: {
          50: '#fff7ed',
          100: '#ffedd5',
          200: '#fed7aa',
          300: '#fdba74',
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
          700: '#c2410c',
          800: '#9a3412',
          900: '#7c2d12',
        },
        // CRED-like dark theme colors
        dark: {
          bg: {
            primary: '#0C0C0D',     // Main background - almost black
            secondary: '#18181B',   // Card/surface background
            tertiary: '#1F1F23',    // Elevated surfaces
          },
          border: {
            primary: '#27272A',     // Subtle borders
            secondary: '#2A2A2D',   // Slightly lighter borders
          },
          text: {
            primary: '#FAFAFA',     // Primary text - almost white
            secondary: '#A1A1AA',   // Secondary text - light gray
            tertiary: '#71717A',    // Tertiary text - muted gray
          }
        }
      },
      backgroundColor: {
        // Override default gray colors in dark mode with CRED-like colors
        'dark-primary': '#0C0C0D',
        'dark-secondary': '#18181B',
        'dark-tertiary': '#1F1F23',
      },
      borderColor: {
        'dark-primary': '#27272A',
        'dark-secondary': '#2A2A2D',
      },
      textColor: {
        'dark-primary': '#FAFAFA',
        'dark-secondary': '#A1A1AA',
        'dark-tertiary': '#71717A',
      }
    },
  },
  plugins: [],
};
