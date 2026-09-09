import Overview from './pages/Overview'

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#0a0b14', color: '#e8eaf0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', background: '#12141f',
        borderBottom: '1px solid #1e2133', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#7c6fff,#ff6b9d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🚀</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>Cosmic Mart</div>
            <div style={{ fontSize: 10, color: '#7b82a0' }}>Return Management · Multi-Agent System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#00d4aa' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          AI Agents Active
        </div>
      </nav>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #12141f; }
        ::-webkit-scrollbar-thumb { background: #2a2d40; border-radius: 3px; }
      `}</style>
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        <Overview />
      </main>
    </div>
  )
}
