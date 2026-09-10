import Overview from './pages/Overview'
import { theme } from './theme'

function LogoMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2.5c2.8 1.6 4.5 4.6 4.5 8.5 0 2-1 4.5-2.2 6l-2.3 2.5-2.3-2.5C8.5 15.5 7.5 13 7.5 11c0-3.9 1.7-6.9 4.5-8.5Z" />
      <circle cx="12" cy="10.5" r="1.8" />
      <path d="M8.3 16.8 6 20.5l4-1.3M15.7 16.8 18 20.5l-4-1.3" />
    </svg>
  )
}

export default function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: theme.color.bg, color: theme.color.text, fontFamily: theme.font.body }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 32px', background: theme.color.surface,
        borderBottom: `1px solid ${theme.color.border}`, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: `linear-gradient(135deg,${theme.color.primary},${theme.color.secondary})`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}><LogoMark /></div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3, fontFamily: theme.font.heading }}>Cosmic Mart</div>
            <div style={{ fontSize: 10, color: theme.color.textMuted }}>Return Management · Multi-Agent System</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: theme.color.success }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: theme.color.success, display: 'inline-block', animation: 'pulse 2s infinite' }} />
          AI Agents Active
        </div>
      </nav>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
      `}</style>
      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        <Overview />
      </main>
    </div>
  )
}
