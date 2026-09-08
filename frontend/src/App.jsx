import { useState } from 'react'
import Overview from './pages/Overview'
import Scenarios from './pages/Scenarios'
import Customers from './pages/Customers'
import Inventory from './pages/Inventory'
import VOC from './pages/VOC'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'scenarios', label: 'Scenarios' },
  { id: 'customers', label: 'Customers' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'voc', label: 'VOC & CSAT' },
]

export default function App() {
  const [active, setActive] = useState('overview')

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 28px', background: '#12141f',
        borderBottom: '1px solid #2a2d40', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: 'linear-gradient(135deg,#7c6fff,#ff6b9d)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
          }}>🚀</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>Cosmic Mart</div>
            <div style={{ fontSize: 10, color: '#7b82a0' }}>Customer Satisfaction · Multi-Agent System</div>
          </div>
        </div>

        <div style={{
          display: 'flex', gap: 2, background: '#0a0b14',
          borderRadius: 10, padding: 4,
        }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              padding: '7px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
              background: active === t.id ? '#1f2235' : 'transparent',
              color: active === t.id ? '#e8eaf0' : '#7b82a0',
              fontSize: 12, fontWeight: 500, fontFamily: 'Inter,sans-serif',
              transition: 'all .15s',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#00d4aa' }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%', background: '#00d4aa',
            display: 'inline-block', animation: 'pulse 2s infinite',
          }} />
          10/10 Resolved · Sep 2026
        </div>
      </nav>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>

      <main style={{ flex: 1, padding: '24px 28px', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        {active === 'overview' && <Overview />}
        {active === 'scenarios' && <Scenarios />}
        {active === 'customers' && <Customers />}
        {active === 'inventory' && <Inventory />}
        {active === 'voc' && <VOC />}
      </main>
    </div>
  )
}
