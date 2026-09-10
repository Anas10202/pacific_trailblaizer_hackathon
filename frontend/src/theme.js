// Shared design tokens for the Cosmic Mart dashboard — mirrors the CSS custom
// properties in index.css and the palette used by cosmic-customer-demo.html,
// so both surfaces stay visually in sync.
export const theme = {
  color: {
    bg: '#0a0b14',
    surface: '#12141f',
    surface2: '#161829',
    card: '#1a1d2e',
    cardBorder: '#2a2d40',
    border: '#1e2133',
    text: '#e8eaf0',
    textMuted: '#7b82a0',
    textDim: '#545b76',
    primary: '#7c6fff',
    primaryHover: '#8f84ff',
    primarySoft: '#9b8fff',
    secondary: '#ff6b9d',
    accentBlue: '#3b82f6',
    success: '#00d4aa',
    warning: '#f5a623',
    danger: '#ff5470',
  },
  font: {
    heading: "'Poppins', system-ui, sans-serif",
    body: "'Open Sans', system-ui, sans-serif",
  },
  radius: { sm: 6, md: 10, lg: 16 },
  shadow: { card: '0 8px 24px rgba(0,0,0,0.35)' },
}

export default theme
