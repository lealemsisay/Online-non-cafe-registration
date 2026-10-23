module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Official Dilla University Brand Palette (from du.edu.et official portal theme)
        dillaGreen: '#1a5c3a',           // Primary University Green
        dillaDarkGreen: '#0d3d26',       // Deep Dark Forest Green (Top bar, Header, Footer)
        dillaSecondaryGreen: '#2d7a4f',   // Mid Green
        dillaLightGreen: '#e8f5e9',       // Light Mint Green Tint
        dillaGold: '#c9a944',            // Official Dilla Academic Gold
        dillaGoldDark: '#b08e2f',        // Rich Gold
        dillaGoldLight: '#fbf5e6',       // Soft Gold Tint
        // Aliased for seamless compatibility across existing components
        dillaNavy: '#0d3d26',            // Maps to official dark forest green
        dillaDeepNavy: '#062014',        // Maps to darkest forest green
        dillaTeal: '#2d7a4f',            // Maps to official mid green
        dillaWhite: '#ffffff',
        dillaGray: '#f8faf9',            // Crisp, academic off-white
        dillaMuted: '#4a4a68',           // Official text-light
        dillaDarkGray: '#1a1a2e',        // Official text-dark
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'du': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'du-card': '0 2px 8px rgba(13, 61, 38, 0.06)',
      },
    },
  },
  plugins: [],
}