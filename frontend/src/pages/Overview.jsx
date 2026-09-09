import { useState, useEffect, useMemo, useRef } from 'react'
import { fetchReturns, fetchCustomerDetail, reEvaluateReturns, fetchMessages, sendMessage, fetchMessageCounts } from '../api'

// ── Shared primitives ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  const map = {
    approved: { bg: '#0d2218', text: '#00d4aa', border: '#00d4aa40', icon: '✓ ' },
    flagged:  { bg: '#2e1010', text: '#ff7c7c', border: '#e74c3c50', icon: '⚠ ' },
    declined: { bg: '#251508', text: '#ff9500', border: '#ff950050', icon: '✕ ' },
    pending:  { bg: '#2a1f05', text: '#ffd166', border: '#ffd16640', icon: '' },
  }
  const c = map[status] || map.pending
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}`, textTransform: 'uppercase', letterSpacing: '.5px' }}>
      {c.icon}{status}
    </span>
  )
}

function EscBadge({ team }) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#1a1030', color: '#bf7fff', border: '1px solid #7c6fff50', letterSpacing: '.4px' }}>
      ↑ {team}
    </span>
  )
}

function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 8, border: `1px solid ${active ? '#7c6fff' : '#2a2d40'}`,
      background: active ? '#7c6fff18' : 'transparent', color: active ? '#9b8fff' : '#7b82a0',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
    }}>{children}</button>
  )
}

// ── Modal wrapper ─────────────────────────────────────────────────────────────

function Modal({ onClose, children, width = 580 }) {
  useEffect(() => {
    const esc = e => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(5,6,18,.82)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(2px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#12141f', border: '1px solid #252840', borderRadius: 18, padding: 32, maxWidth: width, width: '92%', maxHeight: '85vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, sub, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div>
        {sub && <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 5 }}>{sub}</div>}
        <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
      </div>
      <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #2a2d40', borderRadius: 8, color: '#7b82a0', fontSize: 16, cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
    </div>
  )
}

function FieldGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
      {items.map(({ label, value, full }) => (
        <div key={label} style={full ? { gridColumn: '1 / -1' } : {}}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 5 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#e8eaf0' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Chat Modal (standalone, for flagged returns) ───────────────────────────────

function ChatModal({ ret, onClose, onCountChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const customerName = ret.customer_name || `Customer #${ret.customer_id}`

  useEffect(() => {
    fetchMessages(ret.rowid).then(msgs => { setMessages(msgs); onCountChange(ret.rowid, msgs.length) }).catch(() => {})
  }, [ret.rowid])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    try {
      const result = await sendMessage(ret.rowid, text)
      const newMsgs = [result.agent_message, result.customer_reply].filter(Boolean)
      setMessages(prev => { const next = [...prev, ...newMsgs]; onCountChange(ret.rowid, next.length); return next })
    } catch (e) {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <Modal onClose={onClose} width={520}>
      <ModalHeader
        title={`Chat with ${customerName}`}
        sub={`Return #${ret.rowid} · ${ret.product_name}`}
        onClose={onClose}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minHeight: 260, maxHeight: 420, overflowY: 'auto', marginBottom: 16, paddingRight: 2 }}>
        {messages.length === 0 && !sending && (
          <div style={{ fontSize: 12, color: '#5a6080', textAlign: 'center', padding: '40px 0', fontStyle: 'italic' }}>
            No messages yet — send one to contact {customerName}.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.sender === 'agent' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%', padding: '9px 13px',
              borderRadius: m.sender === 'agent' ? '14px 14px 3px 14px' : '14px 14px 14px 3px',
              background: m.sender === 'agent' ? '#2a1f5e' : '#1a1d2e',
              border: `1px solid ${m.sender === 'agent' ? '#7c6fff50' : '#2a2d40'}`,
            }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: m.sender === 'agent' ? '#9b8fff' : '#7b82a0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                {m.sender === 'agent' ? 'You (Agent)' : customerName}
              </div>
              <div style={{ fontSize: 12, color: '#d8dbe8', lineHeight: 1.6 }}>{m.message}</div>
              <div style={{ fontSize: 9, color: '#3a4060', marginTop: 5 }}>{m.timestamp}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '9px 13px', borderRadius: '14px 14px 14px 3px', background: '#1a1d2e', border: '1px solid #2a2d40' }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#7b82a0', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>{customerName}</div>
              <div style={{ fontSize: 12, color: '#5a6080', fontStyle: 'italic' }}>Typing…</div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #1e2133', paddingTop: 14 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={`Message ${customerName}…`}
          disabled={sending}
          autoFocus
          style={{
            flex: 1, padding: '10px 14px', background: '#1a1d2e', border: '1px solid #2a2d40',
            borderRadius: 9, fontSize: 13, color: '#e8eaf0', outline: 'none', fontFamily: 'inherit',
            opacity: sending ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '10px 18px', borderRadius: 9, border: 'none',
            background: sending || !input.trim() ? '#2a2d40' : '#7c6fff',
            color: sending || !input.trim() ? '#7b82a0' : '#fff',
            fontSize: 13, fontWeight: 700, cursor: sending || !input.trim() ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'background .15s',
          }}
        >
          {sending ? '⏳' : 'Send →'}
        </button>
      </div>
    </Modal>
  )
}

// ── Return Detail Modal ───────────────────────────────────────────────────────

function ReturnDetail({ ret, onClose, onCustomerClick }) {
  return (
    <Modal onClose={onClose}>
      <ModalHeader title={ret.product_name} sub={`Return #${ret.rowid}`} onClose={onClose} />

      <FieldGrid items={[
        { label: 'Return Date', value: ret.return_date },
        { label: 'Status', value: <StatusBadge status={ret.status} /> },
        { label: 'Customer', value: (
          <button onClick={() => { onClose(); onCustomerClick(ret.customer_id) }} style={{ background: 'transparent', border: 'none', color: '#7c6fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
            {ret.customer_name || `Customer #${ret.customer_id}`}
          </button>
        )},
        { label: 'Refund Amount', value: `$${(ret.refund_amount || 0).toFixed(2)}` },
        { label: 'Quantity', value: ret.quantity },
        { label: 'Order ID', value: `#${ret.order_id}` },
        { label: 'Return Reason', value: ret.reason, full: true },
      ]} />

      {/* AI Agent Analysis — always shown */}
      <div style={{
        marginTop: 4, borderRadius: 12, padding: 18,
        background: ret.status === 'flagged' ? '#180a0a' : ret.status === 'declined' ? '#1a0d00' : '#091812',
        border: `1px solid ${ret.status === 'flagged' ? '#e74c3c30' : ret.status === 'declined' ? '#ff950030' : '#00d4aa30'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 14 }}>🤖</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: ret.status === 'flagged' ? '#ff7c7c' : ret.status === 'declined' ? '#ff9500' : '#00d4aa', textTransform: 'uppercase', letterSpacing: '.7px' }}>
            AI Agent Analysis
          </span>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.7, color: '#c8cbe0', marginBottom: 14 }}>
          {ret.ai_note || 'Analysis not available.'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #1e2133', paddingTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 5 }}>
              {ret.status === 'flagged' ? 'Assigned To' : ret.status === 'declined' ? 'Declined By' : 'Processed By'}
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: ret.status === 'flagged' ? '#bf7fff' : ret.status === 'declined' ? '#ff9500' : '#00d4aa',
            }}>
              {ret.assigned_to || (ret.status === 'flagged' ? 'Pending Assignment' : ret.status === 'declined' ? 'declined_agent' : 'customer_agent (Auto-approved)')}
            </span>
          </div>
          {ret.escalation_team && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 5 }}>Escalated To</div>
              <EscBadge team={ret.escalation_team} />
            </div>
          )}
        </div>
      </div>

    </Modal>
  )
}

// ── Customer Detail Modal ─────────────────────────────────────────────────────

function CustomerDetail({ customerId, returns, onClose }) {
  const [detail, setDetail] = useState(null)

  useEffect(() => {
    fetchCustomerDetail(customerId).then(setDetail)
  }, [customerId])

  const custReturns = returns.filter(r => r.customer_id === customerId)
  const totalRefund = custReturns.reduce((s, r) => s + (r.refund_amount || 0), 0)
  const flaggedCount = custReturns.filter(r => r.status === 'flagged').length
  const name = detail?.name || custReturns[0]?.customer_name || `Customer #${customerId}`

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={name} sub={`Customer #${customerId}`} onClose={onClose} />

      {detail?.loyalty_tier && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#2a1f05', color: '#ffd166', border: '1px solid #ffd16640', fontWeight: 600 }}>
            {detail.loyalty_tier} Member
          </span>
          {detail.loyalty_points > 0 && (
            <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#0d1a2e', color: '#7c6fff', border: '1px solid #7c6fff40', fontWeight: 600 }}>
              {detail.loyalty_points.toLocaleString()} pts
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Returns', value: custReturns.length, color: '#7c6fff' },
          { label: 'Total Refunded', value: `$${totalRefund.toFixed(2)}`, color: '#00d4aa' },
          { label: 'Flagged', value: flaggedCount, color: flaggedCount > 0 ? '#ff7c7c' : '#7b82a0' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1a1d2e', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#7b82a0', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 12 }}>Return History</div>
      {custReturns.length === 0
        ? <div style={{ color: '#7b82a0', fontSize: 13 }}>No returns on record.</div>
        : custReturns.map((r, i) => (
          <div key={i} style={{ padding: '14px 16px', background: '#1a1d2e', borderRadius: 11, marginBottom: 8, borderLeft: `3px solid ${r.status === 'flagged' ? '#e74c3c' : '#00d4aa'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.product_name}</span>
              <StatusBadge status={r.status} />
            </div>
            <div style={{ fontSize: 11, color: '#7b82a0', marginBottom: 4 }}>{r.return_date} · ${(r.refund_amount || 0).toFixed(2)} refund</div>
            <div style={{ fontSize: 11, color: '#b0b7c3', lineHeight: 1.5 }}>{r.reason}</div>
          </div>
        ))
      }
    </Modal>
  )
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────

function AIInsights({ returns, onReEvaluate, reEvaluating }) {
  const flagged = returns.filter(r => r.status === 'flagged')
  const declined = returns.filter(r => r.status === 'declined')
  const escalations = returns.filter(r => r.escalation_team)
  const approved = returns.filter(r => r.status === 'approved')
  const pending = returns.filter(r => r.status === 'pending')
  const totalExposure = flagged.reduce((s, r) => s + (r.refund_amount || 0), 0)

  // Derive fraud signals from actual agent-written data
  const pricingFlags = flagged.filter(r => (r.escalation_team || '').toLowerCase().includes('pricing') || (r.ai_note || '').toLowerCase().includes('anomaly') || (r.ai_note || '').toLowerCase().includes('overc'))
  const productFlags = flagged.filter(r => (r.escalation_team || '').toLowerCase().includes('product') || (r.ai_note || '').toLowerCase().includes('pattern') || (r.ai_note || '').toLowerCase().includes('defect'))

  return (
    <div style={{ background: '#12141f', border: '1px solid #1e2133', borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 16 }}>🤖</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.8px' }}>AI Agent Insights</span>
          <span style={{ fontSize: 9, background: '#7c6fff1a', color: '#7c6fff', padding: '2px 8px', borderRadius: 20, fontWeight: 700 }}>analytics_agent</span>
        </div>
        <button onClick={onReEvaluate} disabled={reEvaluating} title="Re-run agent evaluation on all demo returns" style={{
          fontSize: 10, fontWeight: 600, color: reEvaluating ? '#7b82a0' : '#7c6fff',
          background: 'transparent', border: '1px solid #2a2d40', borderRadius: 7,
          padding: '4px 10px', cursor: reEvaluating ? 'default' : 'pointer', fontFamily: 'inherit',
        }}>
          {reEvaluating ? '⏳ Evaluating…' : '↻ Re-evaluate'}
        </button>
      </div>

      {pending.length > 0 && (
        <div style={{ background: '#1a1020', border: '1px solid #7c6fff30', borderRadius: 10, padding: '10px 14px', fontSize: 11, color: '#bf7fff' }}>
          ⏳ {pending.length} return{pending.length > 1 ? 's' : ''} pending agent evaluation…
        </div>
      )}

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Stat label="Flagged" value={flagged.length} color="#ff7c7c" />
        <Stat label="Escalations" value={escalations.length} color="#ffd166" />
        <Stat label="Approved" value={approved.length} color="#00d4aa" />
        <Stat label="Declined" value={declined.length} color="#ff9500" />
      </div>

      {/* Risk assessment — derived from agent decisions */}
      <Section title="Risk Assessment">
        {flagged.length === 0
          ? <InfoLine color="#00d4aa" icon="✓">No risk signals detected — all evaluated returns are within policy.</InfoLine>
          : <>
              <InfoLine color="#ff7c7c" icon="⚠">{flagged.length} return{flagged.length > 1 ? 's' : ''} flagged by agent. Financial exposure: <strong>${totalExposure.toFixed(2)}</strong>.</InfoLine>
              <InfoLine color="#ffd166" icon="→">Manual review required before processing flagged refunds.</InfoLine>
            </>
        }
      </Section>

      {/* Fraud detection — inferred from agent's actual notes */}
      <Section title="Fraud Detection">
        {pricingFlags.length > 0
          ? pricingFlags.map((r, i) => (
              <InfoLine key={i} color="#ff7c7c" icon="⚠">Return #{r.rowid} — pricing anomaly flagged by agent: {r.ai_note?.split('.')[0]}.</InfoLine>
            ))
          : <InfoLine color="#00d4aa" icon="✓">No pricing anomalies detected.</InfoLine>
        }
        {productFlags.map((r, i) => (
          <InfoLine key={i} color="#ffd166" icon="⚠">Return #{r.rowid} — product defect pattern flagged: {r.ai_note?.split('.')[0]}.</InfoLine>
        ))}
      </Section>

      {/* Active escalations */}
      {escalations.length > 0 && (
        <Section title="Active Escalations">
          {escalations.map((r, i) => (
            <div key={i} style={{ background: '#180a0a', border: '1px solid #e74c3c20', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Return #{r.rowid}</span>
                <EscBadge team={r.escalation_team} />
              </div>
              <div style={{ fontSize: 11, color: '#7b82a0', marginBottom: 4 }}>{r.product_name}</div>
              <div style={{ fontSize: 11, color: '#c8cbe0', lineHeight: 1.5 }}>{r.ai_note?.split('.')[0]}.</div>
            </div>
          ))}
        </Section>
      )}

      {/* Policy violations (declined) */}
      {declined.length > 0 && (
        <Section title="Policy Violations (Declined)">
          {declined.map((r, i) => (
            <div key={i} style={{ background: '#1a0d00', border: '1px solid #ff950025', borderRadius: 10, padding: '12px 14px', marginBottom: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Return #{r.rowid}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#ff9500', background: '#251508', border: '1px solid #ff950030', borderRadius: 20, padding: '2px 8px' }}>✕ DECLINED</span>
              </div>
              <div style={{ fontSize: 11, color: '#7b82a0', marginBottom: 4 }}>{r.product_name} · {r.customer_name}</div>
              <div style={{ fontSize: 11, color: '#d4a96a', lineHeight: 1.5 }}>{r.ai_note?.split('.')[0] || 'Policy violation'}.</div>
            </div>
          ))}
        </Section>
      )}

      {/* Recommended actions — derived from live data */}
      <Section title="Recommended Actions">
        {escalations.map((r, i) => (
          <InfoLine key={`esc-${i}`} color="#bf7fff" icon="→">Escalate Return #{r.rowid} to <strong>{r.escalation_team}</strong> — hold refund.</InfoLine>
        ))}
        {approved.length > 0 && (
          <InfoLine color="#00d4aa" icon="→">Process <strong>{approved.length}</strong> approved return{approved.length > 1 ? 's' : ''} — refunds cleared.</InfoLine>
        )}
        {declined.length > 0 && (
          <InfoLine color="#ff9500" icon="→">Send decline notifications for <strong>{declined.length}</strong> return{declined.length > 1 ? 's' : ''} with policy citations.</InfoLine>
        )}
      </Section>
    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{ background: '#1a1d2e', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 10, color: '#7b82a0', marginTop: 3 }}>{label}</div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.9px', marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  )
}

function InfoLine({ color, icon, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.6, color: '#b0b7c3', marginBottom: 6 }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function Overview() {
  const [returns, setReturns] = useState([])
  const [loading, setLoading] = useState(true)
  const [reEvaluating, setReEvaluating] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReturn, setSelectedReturn] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [msgCounts, setMsgCounts] = useState({})

  const loadReturns = () => {
    setLoading(true)
    fetchReturns()
      .then(setReturns)
      .catch(() => setReturns([]))
      .finally(() => setLoading(false))
  }

  const loadMsgCounts = () => {
    fetchMessageCounts().then(setMsgCounts).catch(() => {})
  }

  const handleReEvaluate = () => {
    setReEvaluating(true)
    reEvaluateReturns()
      .then(() => fetchReturns().then(setReturns))
      .catch(() => {})
      .finally(() => setReEvaluating(false))
  }

  const handleCountChange = (returnId, count) => {
    setMsgCounts(prev => ({ ...prev, [String(returnId)]: count }))
  }

  useEffect(() => { loadReturns(); loadMsgCounts() }, [])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return returns.filter(r => {
      const matchSearch = !q ||
        String(r.rowid).includes(q) ||
        String(r.customer_id).includes(q) ||
        (r.product_name || '').toLowerCase().includes(q) ||
        (r.customer_name || '').toLowerCase().includes(q) ||
        (r.reason || '').toLowerCase().includes(q)
      const matchStatus = statusFilter === 'all' || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [returns, search, statusFilter])

  const counts = useMemo(() => ({
    all: returns.length,
    approved: returns.filter(r => r.status === 'approved').length,
    flagged: returns.filter(r => r.status === 'flagged').length,
    declined: returns.filter(r => r.status === 'declined').length,
  }), [returns])

  if (loading) return (
    <div style={{ color: '#7b82a0', padding: 60, textAlign: 'center', fontSize: 14 }}>
      <div style={{ fontSize: 28, marginBottom: 16 }}>🤖</div>
      <div style={{ fontWeight: 600, color: '#e8eaf0', marginBottom: 8 }}>Agent is evaluating returns…</div>
      <div style={{ fontSize: 12 }}>The analytics_agent is reviewing each return against policy. This takes a moment on first load.</div>
    </div>
  )

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 4px 0' }}>Return Management</h1>
        <div style={{ fontSize: 13, color: '#7b82a0' }}>AI-powered review · {returns.length} total returns</div>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7b82a0', fontSize: 14 }}>🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search returns, customers, products…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, background: '#1a1d2e', border: '1px solid #2a2d40', borderRadius: 9, fontSize: 13, color: '#e8eaf0', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All ({counts.all})</Pill>
          <Pill active={statusFilter === 'approved'} onClick={() => setStatusFilter('approved')}>Approved ({counts.approved})</Pill>
          <Pill active={statusFilter === 'flagged'} onClick={() => setStatusFilter('flagged')}>Flagged ({counts.flagged})</Pill>
          <Pill active={statusFilter === 'declined'} onClick={() => setStatusFilter('declined')}>Declined ({counts.declined})</Pill>
        </div>
      </div>

      {/* 2-column layout: table + insights */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, alignItems: 'start' }}>

        {/* Returns table */}
        <div style={{ background: '#12141f', border: '1px solid #1e2133', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #1e2133', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600 }}>Returns</span>
            <span style={{ fontSize: 11, color: '#7b82a0' }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7b82a0', fontSize: 13 }}>No returns match your filters.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2133' }}>
                  {['Return ID', 'Customer', 'Product', 'Date', 'Amount', 'Status', ''].map(h => (
                    <th key={h} style={{ fontSize: 10, fontWeight: 600, color: '#7b82a0', textTransform: 'uppercase', letterSpacing: '.6px', padding: '10px 16px', textAlign: 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.rowid} style={{ borderBottom: '1px solid #161828', transition: 'background .12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1a1d2e'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '13px 16px' }}>
                      <button onClick={() => setSelectedReturn(r)} style={{ background: 'transparent', border: 'none', color: '#7c6fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                        #{r.rowid}
                      </button>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button onClick={() => setSelectedCustomer(r.customer_id)} style={{ background: 'transparent', border: 'none', color: '#7c6fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                        {r.customer_name || `#${r.customer_id}`}
                      </button>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: '#d8dbe8', maxWidth: 180 }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.product_name}</div>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 11, color: '#7b82a0', whiteSpace: 'nowrap' }}>{r.return_date}</td>
                    <td style={{ padding: '13px 16px', fontSize: 12, fontWeight: 600, color: '#d8dbe8', whiteSpace: 'nowrap' }}>${(r.refund_amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '13px 10px' }}>
                      {r.status === 'flagged' && (
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedChat(r) }}
                          title="Open customer chat"
                          style={{
                            position: 'relative', background: 'transparent',
                            border: '1px solid #2a2d40', borderRadius: 8,
                            color: '#7b82a0', cursor: 'pointer', padding: '4px 9px',
                            fontSize: 14, fontFamily: 'inherit', display: 'flex',
                            alignItems: 'center', gap: 4, transition: 'all .15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6fff'; e.currentTarget.style.color = '#9b8fff' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2d40'; e.currentTarget.style.color = '#7b82a0' }}
                        >
                          💬
                          {(msgCounts[String(r.rowid)] || 0) > 0 && (
                            <span style={{
                              position: 'absolute', top: -6, right: -6,
                              background: '#e74c3c', color: '#fff',
                              fontSize: 9, fontWeight: 800, borderRadius: 20,
                              padding: '1px 5px', minWidth: 16, textAlign: 'center',
                              border: '2px solid #0a0b14', letterSpacing: 0,
                            }}>
                              +{msgCounts[String(r.rowid)]}
                            </span>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* AI insights sidebar */}
        <AIInsights returns={returns} onReEvaluate={handleReEvaluate} reEvaluating={reEvaluating} />
      </div>

      {/* Modals */}
      {selectedReturn && (
        <ReturnDetail
          ret={selectedReturn}
          onClose={() => setSelectedReturn(null)}
          onCustomerClick={id => { setSelectedReturn(null); setSelectedCustomer(id) }}
        />
      )}
      {selectedCustomer !== null && (
        <CustomerDetail
          customerId={selectedCustomer}
          returns={returns}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
      {selectedChat && (
        <ChatModal
          ret={selectedChat}
          onClose={() => setSelectedChat(null)}
          onCountChange={handleCountChange}
        />
      )}
    </div>
  )
}
