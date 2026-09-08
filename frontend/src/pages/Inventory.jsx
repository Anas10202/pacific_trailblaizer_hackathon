import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import Card from '../components/Card'
import { fetchInventory } from '../api'

export default function Inventory() {
  const [raw, setRaw] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('')

  useEffect(() => { fetchInventory().then(setRaw) }, [])

  if (!raw.length) return <div style={{ color: '#7b82a0', padding: 40, textAlign: 'center' }}>Loading…</div>

  const products = [...new Set(raw.map(r => r.product_name))]
  const byProduct = products.map(name => {
    const rows = raw.filter(r => r.product_name === name)
    const totalStock = rows.reduce((s, r) => s + r.current_stock, 0)
    const lowMarkets = rows.filter(r => r.current_stock < r.min_stock_level)
    return { name, price: rows[0]?.unit_price, rows, totalStock, lowMarkets }
  }).filter(p => !filter || p.name.toLowerCase().includes(filter.toLowerCase()))

  const lowCount = raw.filter(r => r.current_stock < r.min_stock_level).length

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 20 }}>
        <div style={{ background: '#1a1d2e', border: '1px solid #7c6fff', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Products</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#7c6fff' }}>10</div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 4 }}>across 10 markets</div>
        </div>
        <div style={{ background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Total Units</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#00d4aa' }}>{raw.reduce((s, r) => s + r.current_stock, 0).toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 4 }}>in stock globally</div>
        </div>
        <div style={{ background: '#1a1d2e', border: `1px solid ${lowCount > 0 ? '#e74c3c' : '#2a2d40'}`, borderRadius: 14, padding: '16px 20px' }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 8 }}>Low Stock Alerts</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: lowCount > 0 ? '#e74c3c' : '#00d4aa' }}>{lowCount}</div>
          <div style={{ fontSize: 11, color: '#7b82a0', marginTop: 4 }}>below min level of 20</div>
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <input value={filter} onChange={e => setFilter(e.target.value)} placeholder="Filter products…"
          style={{ background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#e8eaf0', outline: 'none', width: 280, fontFamily: 'Inter,sans-serif' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {byProduct.map(p => (
          <Card key={p.name} style={{ cursor: 'pointer', borderColor: selected?.name === p.name ? '#7c6fff' : '#2a2d40', transition: 'border-color .15s' }}
            onClick={() => setSelected(selected?.name === p.name ? null : p)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</div>
                <div style={{ fontSize: 11, color: '#7b82a0' }}>${p.price} · {p.totalStock.toLocaleString()} total units</div>
              </div>
              {p.lowMarkets.length > 0 && (
                <span style={{ background: '#2e1010', color: '#ff7c7c', fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20 }}>
                  ⚠ {p.lowMarkets.length} low
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {p.rows.map(r => {
                const isLow = r.current_stock < r.min_stock_level
                return (
                  <span key={r.market} style={{
                    padding: '2px 7px', borderRadius: 12, fontSize: 9, fontWeight: 600,
                    background: isLow ? '#2e1010' : '#0d2e1e',
                    color: isLow ? '#ff7c7c' : '#00d4aa',
                  }}>{r.market} {r.current_stock}</span>
                )
              })}
            </div>

            {selected?.name === p.name && (
              <div style={{ marginTop: 14 }}>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={p.rows.map(r => ({ market: r.market.replace(' ', '\n'), stock: r.current_stock, min: r.min_stock_level }))}
                    margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2d40" />
                    <XAxis dataKey="market" tick={{ fill: '#7b82a0', fontSize: 8 }} />
                    <YAxis tick={{ fill: '#7b82a0', fontSize: 8 }} />
                    <Tooltip contentStyle={{ background: '#1f2235', border: '1px solid #2a2d40', borderRadius: 8, fontSize: 11 }} />
                    <Bar dataKey="stock" radius={[3, 3, 0, 0]}>
                      {p.rows.map(r => <Cell key={r.market} fill={r.current_stock < r.min_stock_level ? '#e74c3c' : '#7c6fff'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  )
}
