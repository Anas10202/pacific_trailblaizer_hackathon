// Status badge colors — celestial atlas spectral class palette
// cyan = approved/confirmed/resolved (A-type)
// amber = open/pending/in-transit/delayed (K-type)
// rose = escalated/declined/negative (M-type)
// violet = AI/agent/fulfilled/app/email

const styles = {
  resolved:  { background: '#071A28', color: '#00C8E8' },
  fulfilled: { background: '#0E0C22', color: '#8A60FF' },
  escalated: { background: '#1A0818', color: '#FF4B6A' },
  high:      { background: '#1A0818', color: '#FF4B6A' },
  open:      { background: '#1A1200', color: '#F5A020' },
  gold:      { background: '#1A1200', color: '#F5A020' },
  silver:    { background: '#12183A', color: '#7A85B0' },
  basic:     { background: '#0A0E2A', color: '#3A4470' },
  negative:  { background: '#1A0818', color: '#FF4B6A' },
  twitter:   { background: '#081428', color: '#1DA1F2' },
  email:     { background: '#0E0C22', color: '#6840FF' },
  social:    { background: '#081428', color: '#1DA1F2' },
  app:       { background: '#0E0C22', color: '#6840FF' },
  confirmed: { background: '#071A28', color: '#00C8E8' },
  delivered: { background: '#0E0C22', color: '#8A60FF' },
  delayed:   { background: '#1A1200', color: '#F5A020' },
  in_transit:{ background: '#1A1200', color: '#F5A020' },
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
