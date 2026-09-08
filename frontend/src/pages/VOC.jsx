import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import Badge from '../components/Badge'
import Card from '../components/Card'
import { fetchVOC } from '../api'

function Stars({ score }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= score ? '#ffd166' : '#2a2d40', fontSize: 14 }}>★</span>
      ))}
    </div>
  )
}

export default function VOC() {
  const [data, setData] = useState(null)

  useEffect(() => { fetchVOC().then(setData) }, [])

  if (!data) return <div style={{ color: '#7b82a0', padding: 40, textAlign: 'center' }}>Loading…</div>

  const avgCsat = data.csat.length ? (data.csat.reduce((s, r) => s + r.score, 0) / data.csat.length).toFixed(1) : '—'
  const csatTrend = data.csat.map(r => ({ date: r.scored_date, score: r.score }))

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#1a1d2e', border: '1px solid #ff6b9d', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>VOC Signals</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ff6b9d' }}>{data.signals.length}</div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 4 }}>100% negative sentiment</div>
        </div>
        <div style={{ background: '#1a1d2e', border: '1px solid #ffd166', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Auto-escalated</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ffd166' }}>{data.signals.length}</div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 4 }}>all turned into tickets</div>
        </div>
        <div style={{ background: '#1a1d2e', border: '1px solid #00d4aa', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Avg CSAT</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00d4aa' }}>{avgCsat} <span style={{ fontSize: 14, color: '#7b82a0' }}>/ 5</span></div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 4 }}>{data.csat.length} scores logged</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Card title="VOC Signals">
          {data.signals.map((v, i) => (
            <div key={i} style={{
              padding: '12px 14px', background: '#12141f', borderRadius: 10, marginBottom: 8,
              borderLeft: `3px solid ${v.source === 'twitter' ? '#1da1f2' : '#7c6fff'}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: v.source === 'twitter' ? '#1da1f2' : '#7c6fff', textTransform: 'uppercase', letterSpacing: '.5px' }}>
                  {v.source === 'twitter' ? '🐦' : '📧'} {v.source}
                </span>
                <span style={{ fontSize: 10, color: '#7b82a0' }}>{v.created_date} · Customer #{v.customer_id}</span>
              </div>
              <div style={{ fontSize: 12, color: '#b0b7c3', lineHeight: 1.5 }}>"{v.content}"</div>
            </div>
          ))}
        </Card>

        <Card title="CSAT Scores">
          {data.csat.map((c, i) => (
            <div key={i} style={{ padding: '12px 14px', background: '#12141f', borderRadius: 10, marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>{c.name}</span>
                <span style={{ fontSize: 10, color: '#7b82a0' }}>{c.scored_date}</span>
              </div>
              <Stars score={c.score} />
              <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 6, lineHeight: 1.5 }}>{c.comment}</div>
            </div>
          ))}
          {csatTrend.length > 1 && (
            <div style={{ marginTop: 14 }}>
              <div style={{ fontSize: 10, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Score Trend</div>
              <ResponsiveContainer width="100%" height={80}>
                <LineChart data={csatTrend}>
                  <XAxis dataKey="date" hide />
                  <YAxis domain={[1, 5]} hide />
                  <Tooltip contentStyle={{ background: '#1f2235', border: '1px solid #2a2d40', borderRadius: 8, fontSize: 11 }} />
                  <Line type="monotone" dataKey="score" stroke="#ffd166" strokeWidth={2} dot={{ fill: '#ffd166', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      <Card title={`Open Support Tickets (${data.tickets.length})`}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              {['Customer', 'Subject', 'Priority', 'Source', 'Date', 'Status'].map(h => (
                <th key={h} style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.6px', padding: '6px 12px', textAlign: 'left', borderBottom: '1px solid #2a2d40' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.tickets.map((t, i) => (
              <tr key={i}>
                <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, borderBottom: '1px solid #1e2030' }}>{t.name}</td>
                <td style={{ padding: '9px 12px', fontSize: 11, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid #1e2030' }}>{t.subject}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #1e2030' }}><Badge variant={t.priority}>{t.priority}</Badge></td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #1e2030' }}><Badge variant={t.source}>{t.source}</Badge></td>
                <td style={{ padding: '9px 12px', fontSize: 11, color: '#7b82a0', borderBottom: '1px solid #1e2030' }}>{t.created_date}</td>
                <td style={{ padding: '9px 12px', borderBottom: '1px solid #1e2030' }}><Badge variant={t.status}>{t.status}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
