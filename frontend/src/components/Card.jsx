import { theme } from '../theme'

export default function Card({ title, children, style = {} }) {
  return (
    <div style={{
      background: theme.color.card, border: `1px solid ${theme.color.cardBorder}`, borderRadius: theme.radius.lg, padding: 20, ...style,
    }}>
      {title && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: theme.color.textMuted,
          textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 16,
        }}>{title}</div>
      )}
      {children}
    </div>
  )
}
