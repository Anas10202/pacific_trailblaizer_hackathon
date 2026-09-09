import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import KPICard from '../components/KPICard'
import Card from '../components/Card'
import { fetchOverview, fetchFinancials, fetchInsights, fetchAgenticInsights } from '../api'

const TIER_COLOR = { Gold: '#ffd166', Silver: '#b0b7c3', Basic: '#7b82a0' }
const ACCENT = ['#00d4aa', '#7c6fff', '#ff6b9d']

export default function Overview() {
  const [data, setData] = useState(null)
  const [txns, setTxns] = useState([])
  const [insights, setInsights] = useState(null)
  const [agentic, setAgentic] = useState(null)
  const [agenticLoading, setAgenticLoading] = useState(true)

  const loadAgentic = (refresh = false) => {
    setAgenticLoading(true)
    fetchAgenticInsights(refresh)
      .then(setAgentic)
      .catch(() => setAgentic({ text: 'Could not reach the agent. Is the API running with an ANTHROPIC_API_KEY?' }))
      .finally(() => setAgenticLoading(false))
  }

  useEffect(() => {
    fetchOverview().then(setData)
    fetchInsights().then(setInsights)
    loadAgentic()
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

      {insights && (
        <Card title="Merchandising Insights — Recommended Actions" style={{ marginTop: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <RecColumn
              heading="Push These Products"
              caption="Best sellers — feature them and keep stock high"
              accent="#00d4aa"
              icon="📈"
              items={insights.promote}
              empty="No sales yet to rank winners."
            />
            <RecColumn
              heading="Mark These Down"
              caption="Overstocked slow movers — free up tied-up cash"
              accent="#ffd166"
              icon="🏷️"
              items={insights.markdown}
              empty="No markdown candidates — inventory is moving."
            />
          </div>
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 15 }}>🤖</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px' }}>
              AI Merchandising Recommendation
            </span>
            <span style={{ fontSize: 9, fontWeight: 700, color: '#7c6fff', background: '#7c6fff1a', padding: '2px 8px', borderRadius: 20 }}>
              analytics_agent
            </span>
          </div>
          <button
            onClick={() => loadAgentic(true)}
            disabled={agenticLoading}
            style={{
              fontSize: 11, fontWeight: 600, color: '#7c6fff', background: 'transparent',
              border: '1px solid #2a2d40', borderRadius: 8, padding: '5px 12px',
              cursor: agenticLoading ? 'default' : 'pointer', opacity: agenticLoading ? 0.5 : 1,
            }}
          >
            {agenticLoading ? 'Thinking…' : '↻ Regenerate'}
          </button>
        </div>

        {agenticLoading ? (
          <div style={{ color: '#7b82a0', fontSize: 13, padding: '8px 0' }}>
            Agent is analyzing inventory &amp; sales… this can take a few seconds.
          </div>
        ) : (
          <div style={{ fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap', color: '#d8dbe8' }}>
            {renderBold(agentic?.text)}
          </div>
        )}

        {agentic?.generated_at && !agenticLoading && (
          <div style={{ fontSize: 10, color: '#7b82a0', marginTop: 12 }}>
            Generated {new Date(agentic.generated_at).toLocaleString()} · cached until regenerated
          </div>
        )}
      </Card>
    </div>
  )
}

function renderBold(text) {
  if (!text) return null
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part
  )
}

function RecColumn({ heading, caption, accent, icon, items, empty }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 15 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: accent }}>{heading}</span>
      </div>
      <div style={{ fontSize: 11, color: '#7b82a0', marginBottom: 12 }}>{caption}</div>
      {(!items || items.length === 0) ? (
        <div style={{ fontSize: 12, color: '#7b82a0', padding: '12px 0' }}>{empty}</div>
      ) : items.map(p => (
        <div key={p.product} style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          gap: 12, padding: '10px 12px', marginBottom: 8,
          background: '#141726', border: '1px solid #2a2d40', borderLeft: `3px solid ${accent}`, borderRadius: 8,
        }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.product}</div>
            <div style={{ fontSize: 10, color: '#7b82a0', marginTop: 2 }}>{p.reason}</div>
          </div>
          <span style={{
            flexShrink: 0, padding: '4px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700,
            color: accent, background: `${accent}1a`, whiteSpace: 'nowrap',
          }}>{p.action}</span>
        </div>
      ))}
    </div>
  )
}
