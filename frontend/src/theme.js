// Shared design tokens — Cosmic Mart Mission Control
// Visual world: Celestial Atlas (Norton's Star Atlas / Uranometria)
// Status colors map to stellar spectral classes.
// Violet is reserved exclusively for AI/agent system elements.
export const theme = {
  color: {
    bg:           '#0A0E2A',   // deep navy — atlas ground
    surface:      '#12183A',   // elevated panel
    surface2:     '#1A2048',   // deeper elevation
    card:         '#12183A',   // card surface
    cardBorder:   '#2A3260',   // panel border
    border:       '#1E2650',   // subtle inner dividers
    text:         '#E8EDF8',   // cool white (atlas paper)
    textMuted:    '#7A85B0',   // muted blue-gray
    textDim:      '#3A4470',   // barely visible
    primary:      '#6840FF',   // violet — AI/agent system only
    primaryHover: '#7A52FF',
    primarySoft:  '#8A60FF',
    secondary:    '#00C8E8',   // cyan — approved / A-type star
    accentBlue:   '#3B82F6',
    success:      '#00C8E8',   // cyan = approved (A-type)
    warning:      '#F5A020',   // amber = flagged/pending (K-type)
    danger:       '#FF4B6A',   // rose = declined (M-type)
  },
  font: {
    heading: "'Space Grotesk', system-ui, sans-serif",
    body:    "'Inter', system-ui, sans-serif",
  },
  radius: { sm: 5, md: 8, lg: 12 },
  shadow: { card: '0 8px 32px rgba(0,0,0,0.7)' },
}

export default theme
