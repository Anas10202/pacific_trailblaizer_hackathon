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
        padding: '12px 32px', background: theme.color.surface,
        borderBottom: `1px solid ${theme.color.cardBorder}`, position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo tile — violet gradient, atlas-appropriate circle shape */}
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: `linear-gradient(135deg, ${theme.color.primary}, #4A28D8)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 0 1px ${theme.color.primary}60, 0 0 16px ${theme.color.primary}30`,
          }}><LogoMark /></div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, letterSpacing: -0.2, fontFamily: theme.font.heading }}>Cosmic Mart</div>
            <div style={{ fontSize: 9.5, color: theme.color.textMuted, letterSpacing: '.4px', textTransform: 'uppercase' }}>Mission Control · Multi-Agent</div>
          </div>
        </div>
        {/* AI agents badge — violet, the AI system color */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          fontSize: 10, fontWeight: 700, color: '#8A60FF',
          background: '#0E0C20', border: '1px solid #6840FF35',
          borderRadius: 20, padding: '5px 14px',
          letterSpacing: '.5px', textTransform: 'uppercase',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6840FF', display: 'inline-block', flexShrink: 0, animation: 'pulse 2s infinite' }} />
          AI Agents Active
        </div>
      </nav>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
      `}</style>
      <main style={{ flex: 1, padding: '24px 32px', maxWidth: 1320, margin: '0 auto', width: '100%' }}>
        <Overview />
      </main>
    </div>
  )
}
