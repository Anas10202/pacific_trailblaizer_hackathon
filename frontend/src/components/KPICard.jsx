export default function KPICard({ label, value, sub, icon, accent = '#7c6fff' }) {
  return (
    <div style={{
      background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 14,
      padding: '18px 20px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: accent, borderRadius: '2px 2px 0 0',
      }} />
      <div style={{ position: 'absolute', right: 16, top: 16, fontSize: 22, opacity: .2 }}>{icon}</div>
      <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 6 }}>{sub}</div>}
    </div>
  )
}
