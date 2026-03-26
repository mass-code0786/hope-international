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
        bg: '#0a0a0a',
        card: '#151515',
        cardSoft: '#1c1c1c',
        accent: '#d4af37',
        accentSoft: '#f0d77a',
        success: '#22c55e',
        danger: '#ef4444',
        text: '#f5f5f5',
        muted: '#9ca3af'
      },
      borderRadius: {
        xl2: '1.25rem'
      },
      boxShadow: {
        soft: '0 10px 30px rgba(0,0,0,0.35)'
      }
    }
  },
  plugins: []
};

export default config;
