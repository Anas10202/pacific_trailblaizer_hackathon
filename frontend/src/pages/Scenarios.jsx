import { useEffect, useState } from 'react'
import Badge from '../components/Badge'
import Card from '../components/Card'

const SCENARIOS = [
  { id: 1, type: 'predictive_return', customer: 'Casey Park', market: 'Southeast Asia', date: '2026-09-08', status: 'resolved', cashDelta: 0, request: 'CosmicCam 360 ordered Aug 28 still hasn\'t arrived — tracking shows delayed.', response: 'Detected at-risk order. Created high-priority ticket + VOC signal logged (email/negative). Proactive outreach initiated.', finance: 'No cash change. Ticket created for delayed shipment investigation.' },
  { id: 2, type: 'happy_order', customer: 'Alex Rivera', market: 'North America', date: '2026-09-08', status: 'fulfilled', cashDelta: 499.98, request: 'Buy 2 NovaSpeaker X12 units for home studio.', response: '2× NovaSpeaker X12 @ $249.99 each fulfilled. Same-day delivery confirmed. +200 loyalty points → Alex now 5,699 pts (Gold).', finance: 'Cash +$499.98. Inventory -2 NovaSpeaker X12.' },
  { id: 3, type: 'smart_exchange', customer: 'Jordan Kim', market: 'Europe', date: '2026-09-09', status: 'resolved', cashDelta: 0, request: 'Return Nebula Headphones (Order 3, Aug 10) — disappointed in sound quality.', response: 'Return processed within 30-day window (30 days). Refund $149.99 as 1,549 loyalty points (1,499 base + 50 goodwill). Smart exchange to NovaSpeaker X12 also offered.', finance: 'Refund as loyalty points — no cash outflow.' },
  { id: 4, type: 'loyalty_save', customer: 'Sam Chen', market: 'East Asia', date: '2026-09-09', status: 'resolved', cashDelta: 0, request: 'Return Nebula Headphones (Order 2, Aug 1) — worried it will affect Silver loyalty tier.', response: 'Return flagged outside 30-day window (39 days). Escalated for exception review. Loyalty bridge applied — Silver tier preserved.', finance: 'No cash change. Manager exception ticket created.' },
  { id: 5, type: 'complaint_recovery', customer: 'Riley Thompson', market: 'North America', date: '2026-09-10', status: 'resolved', cashDelta: 0, request: 'Twitter: GalaxySmart Watch stopped working after 3 days. $300 product — unacceptable!', response: 'VOC logged (Twitter/negative) → auto-escalated to high-priority ticket. Return approved, defective unit replacement offered. +150 goodwill loyalty points.', finance: 'Return approved. Loyalty points issued as goodwill.' },
  { id: 6, type: 'out_of_stock', customer: 'Quinn Johnson', market: 'Africa', date: '2026-09-10', status: 'resolved', cashDelta: 199.95, request: 'Order 5 LunarLight LED Strips for apartment.', response: '5× LunarLight LED Strip fulfilled from Africa stock. Reorder triggered to replenish below-min inventory.', finance: 'Cash +$199.95.' },
  { id: 7, type: 'bulk_order', customer: 'Taylor Brooks', market: 'North America', date: '2026-09-11', status: 'resolved', cashDelta: 854.86, request: '15 AstroDock Hubs for office — do we get a bulk discount?', response: '5% bulk discount applied (≥10 units). 15× AstroDock Hub @ $56.99 (was $59.99). +1,500 loyalty points.', finance: 'Cash +$854.86 after 5% bulk discount.' },
  { id: 8, type: 'multi_item_order', customer: 'Drew Martinez', market: 'Europe', date: '2026-09-11', status: 'resolved', cashDelta: 459.98, request: 'Order 1 StarPad Pro + 1 AstroDock Hub for new workspace.', response: 'Both items fulfilled. StarPad Pro $399.99 + AstroDock Hub $59.99. Same-day delivery. +458 loyalty pts → 1,658 pts (Silver).', finance: 'Cash +$459.98.' },
  { id: 9, type: 'standard_return', customer: 'Morgan Singh', market: 'South Asia', date: '2026-09-12', status: 'resolved', cashDelta: -44.99, request: 'Return AstroSpeaker X3 (Order 5, Aug 20) — stopped connecting to Bluetooth after a week.', response: 'Return eligible (23 days). 949 loyalty pts awarded (899 base + 50 goodwill). Morgan stays Gold tier at 8,398 pts.', finance: 'Refund $89.99 as cash. Net -$44.99.' },
  { id: 10, type: 'voc_signal', customer: 'Avery Wilson', market: 'Middle East', date: '2026-09-12', status: 'resolved', cashDelta: 0, request: '"@CosmicMart my NebulaFit Band display went dark after 2 days. #CosmicMartFail" — Twitter.', response: 'VOC logged (Twitter/negative) → ticket #6 created (high priority). Return eligible (7 days). Smart exchange offered: NebulaFit Band → GalaxySmart Watch at 15% loyalty discount. Silver tier preserved.', finance: 'No cash change. Exchange pending customer acceptance.' },
]

export default function Scenarios() {
  const [selected, setSelected] = useState(null)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Resolved</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00d4aa' }}>9</div>
        </div>
        <div style={{ background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Fulfilled</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7c6fff' }}>1</div>
        </div>
        <div style={{ background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Net Cash</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00d4aa' }}>+$455</div>
        </div>
      </div>

      <Card title="All 10 Test Scenarios — click a row for details">
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['#', 'Type', 'Customer', 'Market', 'Date', 'Status', 'Cash Δ'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.6px', padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #2a2d40' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCENARIOS.map(s => {
              const dc = s.cashDelta > 0 ? '#00d4aa' : s.cashDelta < 0 ? '#e74c3c' : '#7b82a0'
              const ds = s.cashDelta > 0 ? '+' : ''
              return (
                <tr key={s.id} onClick={() => setSelected(s)} style={{ cursor: 'pointer', transition: 'background .12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e2133'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '10px 12px', fontSize: 12, color: '#7b82a0', borderBottom: '1px solid #1e2030' }}>{s.id}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #1e2030' }}>{s.type.replace(/_/g, ' ')}</td>
                  <td style={{ padding: '10px 12px', fontSize: 12, borderBottom: '1px solid #1e2030' }}>{s.customer}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#7b82a0', borderBottom: '1px solid #1e2030' }}>{s.market}</td>
                  <td style={{ padding: '10px 12px', fontSize: 11, color: '#7b82a0', borderBottom: '1px solid #1e2030' }}>{s.date}</td>
                  <td style={{ padding: '10px 12px', borderBottom: '1px solid #1e2030' }}>
                    <Badge variant={s.status}>{s.status === 'fulfilled' ? '✓ fulfilled' : '✓ resolved'}</Badge>
                  </td>
                  <td style={{ padding: '10px 12px', fontSize: 12, fontWeight: 600, color: dc, borderBottom: '1px solid #1e2030' }}>
                    {ds}${Math.abs(s.cashDelta).toFixed(2)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {selected && (
        <div onClick={() => setSelected(null)} style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 18,
            width: 560, maxHeight: '80vh', overflowY: 'auto', padding: 28,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 16, fontWeight: 700, textTransform: 'uppercase' }}>{selected.type.replace(/_/g, ' ')}</div>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: '#7b82a0', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ fontSize: 11, color: '#7b82a0', marginBottom: 20 }}>
              {selected.customer} · {selected.market} · {selected.date}
            </div>
            {[
              { label: 'Customer Request', val: selected.request },
              { label: 'Agent Response', val: selected.response },
              { label: 'Financial Impact', val: selected.finance },
            ].map(b => (
              <div key={b.label} style={{ background: '#12141f', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                <div style={{ fontSize: 10, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>{b.label}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6 }}>{b.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
