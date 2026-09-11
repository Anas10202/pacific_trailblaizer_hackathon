import { useEffect, useState } from 'react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import Badge from '../components/Badge'
import Card from '../components/Card'
import { fetchCustomers } from '../api'

const TIER_COLOR = { Gold: '#FFB020', Silver: '#909090', Basic: '#505A60' }
const TIER_BG = { Gold: '#2e2200', Silver: '#1a1f2e', Basic: '#1a1a1a' }
const EMOJIS = ['👨‍💼', '👩‍💻', '🧑‍🎨', '👩‍💼', '🧑‍🔬', '👨‍🎓', '🧑‍💻', '👩‍🎓', '👨‍🚀', '🧑‍🚀']
const TIER_MAX = { Gold: 10000, Silver: 5000, Basic: 1000 }

function LoyaltyRing({ pts, tier }) {
  const max = TIER_MAX[tier] || 1000
  const pct = Math.min(100, (pts / max) * 100)
  const r = 28, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  const color = TIER_COLOR[tier]
  return (
    <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
      <svg width={68} height={68} viewBox="0 0 68 68" style={{ position: 'absolute' }}>
        <circle cx={34} cy={34} r={r} fill="none" stroke="#282828" strokeWidth={6} />
        <circle cx={34} cy={34} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`}
          strokeLinecap="round" transform="rotate(-90 34 34)" />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 700, color }}>{tier[0]}</div>
      </div>
    </div>
  )
}

export default function Customers() {
  const [customers, setCustomers] = useState([])
  const [selected, setSelected] = useState(null)

  useEffect(() => { fetchCustomers().then(setCustomers) }, [])

  if (!customers.length) return <div style={{ color: '#505A60', padding: 40, textAlign: 'center' }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        {['Gold', 'Silver', 'Basic'].map(tier => {
          const count = customers.filter(c => c.loyalty_tier === tier).length
          return (
            <div key={tier} style={{ background: '#1C1C1C', border: '1px solid #282828', borderRadius: 14, padding: '16px 20px' }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#505A60', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>{tier} Tier</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: TIER_COLOR[tier] }}>{count}</div>
              <div style={{ fontSize: 11, color: '#505A60', marginTop: 4 }}>customers</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {customers.map((c, i) => (
          <div key={c.id} onClick={() => setSelected(c)} style={{
            background: '#1C1C1C', border: `1px solid ${selected?.id === c.id ? '#6840FF' : '#282828'}`,
            borderRadius: 14, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 14,
            cursor: 'pointer', transition: 'border-color .15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#6840FF'}
            onMouseLeave={e => e.currentTarget.style.borderColor = selected?.id === c.id ? '#6840FF' : '#282828'}>
            <div style={{
              width: 42, height: 42, borderRadius: '50%', flexShrink: 0,
              background: TIER_BG[c.loyalty_tier], display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
            }}>{EMOJIS[i]}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</div>
              <div style={{ fontSize: 10, color: '#505A60', marginBottom: 3 }}>{c.market}</div>
              <Badge variant={c.loyalty_tier.toLowerCase()}>{c.loyalty_tier}</Badge>
            </div>
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: TIER_COLOR[c.loyalty_tier] }}>{c.loyalty_points.toLocaleString()} pts</div>
              <LoyaltyRing pts={c.loyalty_points} tier={c.loyalty_tier} />
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1C1C1C', border: '1px solid #282828', borderRadius: 18,
            width: 420, padding: 28,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{selected.name}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#505A60', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            {[
              { label: 'Market', val: selected.market },
              { label: 'Email', val: selected.email },
              { label: 'Loyalty Tier', val: selected.loyalty_tier },
              { label: 'Loyalty Points', val: `${selected.loyalty_points.toLocaleString()} pts` },
              { label: 'Next Tier Gap', val: (() => {
                const next = selected.loyalty_tier === 'Basic' ? 1000 : selected.loyalty_tier === 'Silver' ? 5000 : null
                return next ? `${(next - selected.loyalty_points).toLocaleString()} pts to ${selected.loyalty_tier === 'Basic' ? 'Silver' : 'Gold'}` : 'Max tier reached 🏆'
              })() },
            ].map(r => (
              <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #282828', fontSize: 13 }}>
                <span style={{ color: '#505A60' }}>{r.label}</span>
                <span style={{ fontWeight: 600 }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
