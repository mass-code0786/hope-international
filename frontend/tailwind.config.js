/** @type {import('tailwindcss').Config} */
const config = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        bg: '#f8fafc',
        card: '#ffffff',
        cardSoft: '#f1f5f9',
        accent: '#0ea5e9',
        accentSoft: '#ffffff',
        success: '#22c55e',
        danger: '#ef4444',
        text: '#0f172a',
        muted: '#64748b'
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      boxShadow: {
        soft: '0 4px 12px rgba(0, 0, 0, 0.05)'
      }
    }
  },
  plugins: []
};

export default config;
