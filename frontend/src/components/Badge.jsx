const styles = {
  resolved:  { background: '#0d2e1e', color: '#00d4aa' },
  fulfilled: { background: '#1a1a3e', color: '#9b8fff' },
  escalated: { background: '#2e1010', color: '#e74c3c' },
  high:      { background: '#2e1010', color: '#ff7c7c' },
  open:      { background: '#2e1f0a', color: '#f39c12' },
  gold:      { background: '#2e2200', color: '#ffd166' },
  silver:    { background: '#1a1f2e', color: '#b0b7c3' },
  basic:     { background: '#1a1a1a', color: '#7b82a0' },
  negative:  { background: '#2e1010', color: '#e74c3c' },
  twitter:   { background: '#0a1f2e', color: '#1da1f2' },
  email:     { background: '#1a1a3e', color: '#7c6fff' },
  social:    { background: '#0a1f2e', color: '#1da1f2' },
  app:       { background: '#1a1a3e', color: '#7c6fff' },
  confirmed: { background: '#0d2e1e', color: '#00d4aa' },
  delivered: { background: '#1a1a3e', color: '#9b8fff' },
  delayed:   { background: '#2e1010', color: '#ff7c7c' },
  in_transit:{ background: '#2e2200', color: '#ffd166' },
}

export default function Badge({ variant, children }) {
  const s = styles[variant] || styles.basic
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 9px', borderRadius: 20,
      fontSize: 10, fontWeight: 600, ...s,
    }}>{children}</span>
  )
}
