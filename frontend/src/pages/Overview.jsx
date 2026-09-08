import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import KPICard from '../components/KPICard'
import Card from '../components/Card'
import { fetchOverview, fetchFinancials } from '../api'

const TIER_COLOR = { Gold: '#ffd166', Silver: '#b0b7c3', Basic: '#7b82a0' }
const ACCENT = ['#00d4aa', '#7c6fff', '#ff6b9d']

export default function Overview() {
  const [data, setData] = useState(null)
  const [txns, setTxns] = useState([])

  useEffect(() => {
    fetchOverview().then(setData)
    fetchFinancials().then(rows => {
      const sales = rows.filter(r => r.transaction_type === 'sales' && r.product_name)
      const byProduct = {}
      sales.forEach(r => {
        byProduct[r.product_name] = (byProduct[r.product_name] || 0) + r.price
      })
      setTxns(Object.entries(byProduct).map(([name, val]) => ({ name: name.replace(' ', '\n'), val: Math.round(val) })))
    })
  }, [])

  if (!data) return <div style={{ color: '#7b82a0', padding: 40, textAlign: 'center' }}>Loading…</div>

  const tierData = (data.loyalty_tiers || []).map(t => ({
    name: t.loyalty_tier, value: t.c, color: TIER_COLOR[t.loyalty_tier] || '#7b82a0'
  }))

  const scenarioOutcomes = [
    { name: 'Resolved', value: 9, color: '#00d4aa' },
    { name: 'Fulfilled', value: 1, color: '#7c6fff' },
    { name: 'Escalated', value: 0, color: '#e74c3c' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <KPICard label="Cash Balance" value={`$${(data.cash / 1e6).toFixed(2)}M`} sub="+$455 from scenarios" icon="💰" accent="#00d4aa" />
        <KPICard label="Inventory Value" value={`$${(data.inventory_value / 1e6).toFixed(2)}M`} sub="100 product-market combos" icon="📦" accent="#7c6fff" />
        <KPICard label="Avg CSAT Score" value={`${data.avg_csat} / 5`} sub={`${data.total_returns} returns logged`} icon="⭐" accent="#ff6b9d" />
        <KPICard label="Resolution Rate" value="100%" sub="10 of 10 scenarios" icon="🎯" accent="#ffd166" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="Scenario Outcomes">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={scenarioOutcomes} cx={65} cy={65} innerRadius={44} outerRadius={62} dataKey="value" strokeWidth={0}>
                  {scenarioOutcomes.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2235', border: '1px solid #2a2d40', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {scenarioOutcomes.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
                  <span style={{ color: '#7b82a0' }}>{e.name}</span>
                  <strong>{e.value}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Loyalty Tier Distribution">
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <ResponsiveContainer width={140} height={140}>
              <PieChart>
                <Pie data={tierData} cx={65} cy={65} innerRadius={44} outerRadius={62} dataKey="value" strokeWidth={0}>
                  {tierData.map(e => <Cell key={e.name} fill={e.color} />)}
                </Pie>
                <Tooltip contentStyle={{ background: '#1f2235', border: '1px solid #2a2d40', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {tierData.map(e => (
                <div key={e.name} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: e.color, display: 'inline-block' }} />
                  <span style={{ color: '#7b82a0' }}>{e.name}</span>
                  <strong>{e.value} customers</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Revenue by Product (from transactions)">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={txns} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2d40" />
            <XAxis dataKey="name" tick={{ fill: '#7b82a0', fontSize: 10 }} />
            <YAxis tick={{ fill: '#7b82a0', fontSize: 10 }} tickFormatter={v => `$${v}`} />
            <Tooltip
              contentStyle={{ background: '#1f2235', border: '1px solid #2a2d40', borderRadius: 8, fontSize: 12 }}
              formatter={v => [`$${v.toFixed(2)}`, 'Revenue']}
            />
            <Bar dataKey="val" fill="#7c6fff" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginTop: 16 }}>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Agent Architecture</div>
          {[
            { name: 'orchestrator_agent', type: 'CodeAgent', color: '#7c6fff' },
            { name: 'operations_agent', type: 'ToolCallingAgent', color: '#00d4aa' },
            { name: 'customer_agent', type: 'ToolCallingAgent', color: '#ff6b9d' },
            { name: 'analytics_agent', type: 'ToolCallingAgent', color: '#ffd166' },
          ].map(a => (
            <div key={a.name} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 10, color: '#7b82a0' }}>{a.type}</div>
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Support Activity</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ffd166' }}>{data.total_tickets}</div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginBottom: 12 }}>open tickets</div>
          <div style={{ fontSize: 11 }}>Returns processed: <strong style={{ color: '#00d4aa' }}>{data.total_returns}</strong></div>
          <div style={{ fontSize: 11, marginTop: 4 }}>VOC signals: <strong style={{ color: '#ff6b9d' }}>{data.total_voc}</strong></div>
        </Card>
        <Card>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Model</div>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>claude-haiku-4-5-20251001</div>
          <div style={{ fontSize: 10, color: '#7b82a0', marginBottom: 12 }}>via Vocareum · anthropic</div>
          <div style={{ fontSize: 10, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 6 }}>Framework</div>
          <div style={{ fontSize: 12 }}>smolagents · LiteLLMModel</div>
          <div style={{ fontSize: 10, color: '#7b82a0', marginTop: 4 }}>SQLite · SQLAlchemy · pandas</div>
        </Card>
      </div>
    </div>
  )
}
