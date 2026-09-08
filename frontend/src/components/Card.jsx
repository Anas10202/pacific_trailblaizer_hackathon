export default function Card({ title, children, style = {} }) {
  return (
    <div style={{
      background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 14, padding: 20, ...style,
    }}>
      {title && (
        <div style={{
          fontSize: 10, fontWeight: 600, color: '#7b82a0',
          textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 16,
        }}>{title}</div>
      )}
      {children}
    </div>
  )
}
