import { useState, useEffect, useMemo, useRef } from 'react'
import { fetchReturns, fetchCustomerDetail, reEvaluateReturns, fetchMessages, sendMessage, fetchMessageCounts } from '../api'
import { theme } from '../theme'

// ── Icons (SVG, not emoji) ──────────────────────────────────────────────────────

function IconSearch(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" {...props}>
      <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
    </svg>
  )
}
function IconBot(props) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <rect x="4" y="8" width="16" height="11" rx="3" /><path d="M12 8V4M9 4h6" />
      <circle cx="9" cy="13.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="15" cy="13.5" r="1.2" fill="currentColor" stroke="none" />
      <path d="M9 17h6" />
    </svg>
  )
}
function IconClose(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...props}>
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}
function IconChat(props) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
    </svg>
  )
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function StatusBadge({ status }) {
  // Status colors = stellar spectral classes
  const map = {
    approved: { bg: '#071A28', text: '#00C8E8', border: '#00C8E830', icon: '✓ ' },  // A-type cyan
    flagged:  { bg: '#1A1000', text: '#F5A020', border: '#F5A02030', icon: '⚠ ' },  // K-type amber
    declined: { bg: '#1A0818', text: '#FF4B6A', border: '#FF4B6A30', icon: '✕ ' },  // M-type rose
    pending:  { bg: '#0F1030', text: '#F5A020', border: '#F5A02030', icon: '' },    // K-type amber
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
    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 10, fontWeight: 700, background: '#100C22', color: '#8A60FF', border: '1px solid #6840FF45', letterSpacing: '.3px' }}>
      ↑ {team}
    </span>
  )
}

function Pill({ children, active, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 16px', borderRadius: 5, border: `1px solid ${active ? '#6840FF' : '#2A3260'}`,
      background: active ? '#6840FF18' : 'transparent', color: active ? '#8A60FF' : '#7A85B0',
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
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,5,22,.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#12183A', border: '1px solid #2A3260', borderRadius: 12, padding: 32, maxWidth: width, width: '92%', maxHeight: '85vh', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}

function ModalHeader({ title, sub, onClose }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
      <div>
        <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.3 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: '#7A85B0', marginTop: 3 }}>{sub}</div>}
      </div>
      <button onClick={onClose} aria-label="Close" style={{ background: 'transparent', border: '1px solid #2A3260', borderRadius: 8, color: '#7A85B0', cursor: 'pointer', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color .15s, border-color .15s' }}><IconClose /></button>
    </div>
  )
}

function FieldGrid({ items }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
      {items.map(({ label, value, full }) => (
        <div key={label} style={full ? { gridColumn: '1 / -1' } : {}}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#7A85B0', textTransform: 'uppercase', letterSpacing: '.45px', marginBottom: 5 }}>{label}</div>
          <div style={{ fontSize: 13, color: '#E8EDF8' }}>{value}</div>
        </div>
      ))}
    </div>
  )
}

// ── Chat Panel — fixed bottom-right, minimizable, stays open while multitasking ──

function ChatPanel({ ret, minimized, onMinimize, onClose, onCountChange }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const customerName = ret.customer_name || `Customer #${ret.customer_id}`

  useEffect(() => {
    fetchMessages(ret.rowid).then(msgs => { setMessages(msgs); onCountChange(ret.rowid, msgs.length) }).catch(() => {})
  }, [ret.rowid])

  useEffect(() => {
    if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, minimized])

  useEffect(() => {
    if (!minimized) setTimeout(() => inputRef.current?.focus(), 120)
  }, [minimized])

  const handleSend = async () => {
    const text = input.trim()
    if (!text || sending) return
    setInput('')
    setSending(true)
    try {
      const result = await sendMessage(ret.rowid, text)
      const newMsgs = [result.agent_message, result.customer_reply].filter(Boolean)
      setMessages(prev => { const next = [...prev, ...newMsgs]; onCountChange(ret.rowid, next.length); return next })
    } catch (e) { /* ignore */ } finally {
      setSending(false)
    }
  }

  const panelH = minimized ? 52 : 480

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, width: 360,
      height: panelH, overflow: 'hidden',
      background: '#0C1028', border: '1px solid #2A3260',
      borderRadius: 14, zIndex: 500, display: 'flex', flexDirection: 'column',
      boxShadow: '0 0 0 1px #6840FF28, 0 24px 64px rgba(0,0,0,0.8)',
      transition: 'height .22s cubic-bezier(.4,0,.2,1)',
    }}>
      {/* Header bar — always visible, click body to expand */}
      <div
        onClick={minimized ? onMinimize : undefined}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#07091A', padding: '0 16px', height: 52, flexShrink: 0,
          cursor: minimized ? 'pointer' : 'default',
          borderBottom: minimized ? 'none' : '1px solid #1E2650',
        }}
      >
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#6840FF,#4A28D8)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <IconChat style={{ color: '#fff', width: 12, height: 12 }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#E8EDF8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customerName}</div>
          <div style={{ fontSize: 10, color: '#7A85B0' }}>Return #{ret.rowid}</div>
        </div>
        {messages.length > 0 && (
          <span style={{ fontSize: 9, fontWeight: 800, color: '#8A60FF', background: '#0E0C22', border: '1px solid #6840FF35', borderRadius: 20, padding: '1px 7px' }}>
            {messages.length}
          </span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onMinimize() }}
          title={minimized ? 'Expand' : 'Minimise'}
          style={{ background: 'transparent', border: 'none', color: '#7A85B0', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#E8EDF8'}
          onMouseLeave={e => e.currentTarget.style.color = '#7A85B0'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            {minimized ? <polyline points="18 15 12 9 6 15" /> : <polyline points="6 9 12 15 18 9" />}
          </svg>
        </button>
        <button
          onClick={onClose}
          title="Close chat"
          style={{ background: 'transparent', border: 'none', color: '#7A85B0', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', borderRadius: 4, transition: 'color .15s' }}
          onMouseEnter={e => e.currentTarget.style.color = '#FF4B6A'}
          onMouseLeave={e => e.currentTarget.style.color = '#7A85B0'}
        >
          <IconClose />
        </button>
      </div>

      {/* Message thread */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && !sending && (
          <div style={{ fontSize: 12, color: '#3A4470', textAlign: 'center', padding: '32px 0', fontStyle: 'italic', lineHeight: 1.7 }}>
            No messages yet.<br />Send one to contact {customerName}.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.sender === 'agent' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '82%', padding: '8px 12px',
              borderRadius: m.sender === 'agent' ? '12px 12px 3px 12px' : '12px 12px 12px 3px',
              background: m.sender === 'agent' ? '#0E0C22' : '#1A2048',
              border: `1px solid ${m.sender === 'agent' ? '#6840FF45' : '#2A3260'}`,
            }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: m.sender === 'agent' ? '#8A60FF' : '#7A85B0', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>
                {m.sender === 'agent' ? 'You (Agent)' : customerName}
              </div>
              <div style={{ fontSize: 12, color: '#B8C4E0', lineHeight: 1.55 }}>{m.message}</div>
              <div style={{ fontSize: 8.5, color: '#3A4470', marginTop: 4 }}>{m.timestamp}</div>
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '8px 12px', borderRadius: '12px 12px 12px 3px', background: '#1A2048', border: '1px solid #2A3260' }}>
              <div style={{ fontSize: 8.5, fontWeight: 700, color: '#7A85B0', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '.4px' }}>{customerName}</div>
              <div style={{ display: 'flex', gap: 4, paddingTop: 2 }}>
                {[0,1,2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#3A4470', display: 'inline-block', animation: `pulse 1.4s ${i*0.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input footer */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1E2650', display: 'flex', gap: 8, flexShrink: 0, background: '#0C1028' }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder={`Message ${customerName}…`}
          disabled={sending}
          style={{
            flex: 1, padding: '8px 12px', background: '#0A0E2A', border: '1px solid #2A3260',
            borderRadius: 8, fontSize: 12, color: '#E8EDF8', outline: 'none', fontFamily: 'inherit',
            opacity: sending ? 0.6 : 1,
          }}
        />
        <button
          onClick={handleSend}
          disabled={sending || !input.trim()}
          style={{
            padding: '8px 14px', borderRadius: 8, border: 'none',
            background: sending || !input.trim() ? '#1A2048' : '#6840FF',
            color: sending || !input.trim() ? '#3A4470' : '#fff',
            fontSize: 12, fontWeight: 700, cursor: sending || !input.trim() ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'background .15s', flexShrink: 0,
          }}
        >
          {sending ? '…' : '↑'}
        </button>
      </div>
    </div>
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
          <button onClick={() => { onClose(); onCustomerClick({ id: ret.customer_id, name: ret.customer_name }) }} style={{ background: 'transparent', border: 'none', color: '#6840FF', cursor: 'pointer', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}>
            {ret.customer_name || `Customer #${ret.customer_id}`}
          </button>
        )},
        { label: 'Refund Amount', value: `$${(ret.refund_amount || 0).toFixed(2)}` },
        { label: 'Quantity', value: ret.quantity },
        { label: 'Order ID', value: `#${ret.order_id}` },
        { label: 'Return Reason', value: ret.reason, full: true },
      ]} />

      {/* AI Agent Analysis — always shown; violet = AI system */}
      <div style={{
        marginTop: 4, borderRadius: 12, padding: 18,
        background: '#0C1028',
        border: `1px solid ${ret.status === 'flagged' ? '#F5A02028' : ret.status === 'declined' ? '#FF4B6A28' : '#00C8E828'}`,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <IconBot style={{ color: '#8A60FF', flexShrink: 0 }} />
          <span style={{ fontSize: 10, fontWeight: 700, color: '#8A60FF', textTransform: 'uppercase', letterSpacing: '.7px' }}>
            AI Agent Analysis
          </span>
        </div>

        <div style={{ fontSize: 12, lineHeight: 1.7, color: '#B0B8C8', marginBottom: 14 }}>
          {ret.ai_note || 'Analysis not available.'}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', borderTop: '1px solid #1E2650', paddingTop: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#7A85B0', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 5 }}>
              {ret.status === 'flagged' ? 'Assigned To' : ret.status === 'declined' ? 'Declined By' : 'Processed By'}
            </div>
            <span style={{
              fontSize: 12, fontWeight: 600,
              color: ret.status === 'flagged' ? '#8A60FF' : ret.status === 'declined' ? '#FF4B6A' : '#00C8E8',
            }}>
              {ret.assigned_to || (ret.status === 'flagged' ? 'Pending Assignment' : ret.status === 'declined' ? 'Policy agent' : 'Auto-approved')}
            </span>
          </div>
          {ret.escalation_team && (
            <div>
              <div style={{ fontSize: 9, fontWeight: 700, color: '#7A85B0', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 5 }}>Escalated To</div>
              <EscBadge team={ret.escalation_team} />
            </div>
          )}
        </div>
      </div>

    </Modal>
  )
}

// ── Customer Detail Modal ─────────────────────────────────────────────────────

function CustomerDetail({ customer, returns, onClose }) {
  // customer = { id, name } — id===0 means legacy seeded data, filter by name
  const customerId = customer?.id ?? customer
  const customerName = customer?.name

  const [detail, setDetail] = useState(null)

  useEffect(() => {
    if (customerId > 0) fetchCustomerDetail(customerId).then(setDetail).catch(() => {})
  }, [customerId])

  // When id===0, match by customer_name; otherwise match by id
  const custReturns = customerId > 0
    ? returns.filter(r => r.customer_id === customerId)
    : returns.filter(r => r.customer_name === customerName)

  const totalRefund = custReturns.reduce((s, r) => s + (r.refund_amount || 0), 0)
  const flaggedCount = custReturns.filter(r => r.status === 'flagged').length
  const name = detail?.name || customerName || custReturns[0]?.customer_name || `Customer #${customerId}`

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={name} onClose={onClose} />

      {detail?.loyalty_tier && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#1A1200', color: '#F5A020', border: '1px solid #F5A02035', fontWeight: 600 }}>
            {detail.loyalty_tier} Member
          </span>
          {detail.loyalty_points > 0 && (
            <span style={{ fontSize: 11, padding: '3px 12px', borderRadius: 20, background: '#100C22', color: '#8A60FF', border: '1px solid #6840FF38', fontWeight: 600 }}>
              {detail.loyalty_points.toLocaleString()} pts
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Total Returns', value: custReturns.length, color: '#8A60FF' },
          { label: 'Total Refunded', value: `$${totalRefund.toFixed(2)}`, color: '#00C8E8' },
          { label: 'Flagged', value: flaggedCount, color: flaggedCount > 0 ? '#FF4B6A' : '#3A4470' },
        ].map(s => (
          <div key={s.label} style={{ background: '#1A2048', borderRadius: 8, padding: '14px 16px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, fontFamily: theme.font.heading }}>{s.value}</div>
            <div style={{ fontSize: 10, color: '#7A85B0', marginTop: 3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ fontSize: 10, fontWeight: 600, color: '#7A85B0', textTransform: 'uppercase', letterSpacing: '.7px', marginBottom: 12 }}>Return History</div>
      {custReturns.length === 0
        ? <div style={{ color: '#7A85B0', fontSize: 13 }}>No returns on record.</div>
        : custReturns.map((r, i) => (
          <div key={i} style={{ padding: '14px 16px', background: '#1A2048', borderRadius: 8, marginBottom: 8, borderLeft: `1px solid ${r.status === 'approved' ? '#00C8E8' : r.status === 'flagged' ? '#F5A020' : '#FF4B6A'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>{r.product_name}</span>
              <StatusBadge status={r.status} />
            </div>
            <div style={{ fontSize: 11, color: '#7A85B0', marginBottom: 4 }}>{r.return_date} · ${(r.refund_amount || 0).toFixed(2)} refund</div>
            <div style={{ fontSize: 11, color: '#9AA8C8', lineHeight: 1.5 }}>{r.reason}</div>
          </div>
        ))
      }
    </Modal>
  )
}

// ── AI Insights Panel ─────────────────────────────────────────────────────────

function AIInsights({ returns, onReEvaluate, reEvaluating }) {
  const flagged = returns.filter(r => r.status === 'flagged')
  const pending = returns.filter(r => r.status === 'pending')
  const totalExposure = flagged.reduce((s, r) => s + (r.refund_amount || 0), 0)

  // Derive fraud signals from actual agent-written data
  const pricingFlags = flagged.filter(r => (r.escalation_team || '').toLowerCase().includes('pricing') || (r.ai_note || '').toLowerCase().includes('anomaly') || (r.ai_note || '').toLowerCase().includes('overc'))
  const productFlags = flagged.filter(r => (r.escalation_team || '').toLowerCase().includes('product') || (r.ai_note || '').toLowerCase().includes('pattern') || (r.ai_note || '').toLowerCase().includes('defect'))

  // Remaining flags not caught by pricing/product classifiers
  const otherFlags = flagged.filter(r => !pricingFlags.includes(r) && !productFlags.includes(r))

  return (
    <div style={{ background: '#0C1028', border: '1px solid #2A1850', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14, boxShadow: '0 0 0 1px #6840FF28, 0 16px 48px rgba(0,0,0,0.6)' }}>
      {/* Header cap — violet = AI system zone */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#07091A', borderRadius: '10px 10px 6px 6px', padding: '10px 16px', margin: '-16px -16px 0 -16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <IconBot style={{ color: '#8A60FF', flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#8A60FF', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>AI Agent Insights</span>
        </div>
        <button onClick={onReEvaluate} disabled={reEvaluating} title="Re-run agent evaluation on all demo returns" style={{
          fontSize: 10, fontWeight: 600, marginLeft: 8,
          color: reEvaluating ? '#3A4470' : '#8A60FF',
          background: reEvaluating ? 'transparent' : '#6840FF18',
          border: `1px solid ${reEvaluating ? '#1E2650' : '#6840FF40'}`,
          borderRadius: 5, padding: '4px 10px',
          cursor: reEvaluating ? 'default' : 'pointer', fontFamily: 'inherit',
          transition: 'all .2s',
        }}>
          {reEvaluating ? '· Evaluating…' : '↻ Re-evaluate'}
        </button>
      </div>

      {pending.length > 0 && (
        <div style={{ background: '#0E0C22', border: '1px solid #6840FF28', borderRadius: 7, padding: '8px 12px', fontSize: 11, color: '#8A60FF', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#6840FF', display: 'inline-block', flexShrink: 0, animation: 'pulse 2s infinite' }} />
          {pending.length} return{pending.length > 1 ? 's' : ''} pending evaluation…
        </div>
      )}

      {/* Risk signals — summary + compact scrollable per-return list */}
      <Section title="Risk Signals" accent={flagged.length > 0 ? '#F5A020' : undefined}>
        {flagged.length === 0
          ? <InfoLine color="#00C8E8" icon="✓">All evaluated returns within policy.</InfoLine>
          : <>
              {/* Summary row */}
              <InfoLine color="#F5A020" icon="⚠">
                <strong>{flagged.length}</strong> flagged · <strong>${totalExposure.toFixed(2)}</strong> exposure
              </InfoLine>
              {/* Per-return compact list — 2-line rows, scrolls internally */}
              <div style={{ maxHeight: 148, overflowY: 'auto', display: 'flex', flexDirection: 'column', marginTop: 4, paddingRight: 8 }}>
                {flagged.map((r, i) => {
                  const isPricing = pricingFlags.includes(r)
                  const isProduct = productFlags.includes(r)
                  const signalColor = isProduct ? '#FF4B6A' : '#F5A020'
                  const customerLabel = r.customer_name || (r.customer_id > 0 ? `Customer #${r.customer_id}` : 'Legacy return')
                  return (
                    <div key={r.rowid} style={{
                      padding: '6px 0',
                      borderBottom: i < flagged.length - 1 ? '1px solid #1A2048' : 'none',
                    }}>
                      {/* Row 1: ID · customer name · amount */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ color: '#8A60FF', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>#{r.rowid}</span>
                        <span style={{ color: signalColor, fontSize: 10, flexShrink: 0 }}>⚠</span>
                        <span style={{ color: '#E8EDF8', fontSize: 11, fontWeight: 600, flex: 1 }}>{customerLabel}</span>
                        <span style={{ color: signalColor, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>${(r.refund_amount || 0).toFixed(2)}</span>
                      </div>
                      {/* Row 2: AI note — wraps, never clips */}
                      <div style={{ color: '#7A85B0', fontSize: 10, paddingLeft: 28, lineHeight: 1.5 }}>
                        {r.ai_note?.split('.')[0] || 'Flagged for manual review'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
        }
      </Section>

    </div>
  )
}

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: '#12183A',
      borderRadius: 8,
      padding: '16px 16px 14px',
    }}>
      <div style={{
        fontSize: 38,
        fontWeight: 800,
        color,
        fontFamily: "'Space Grotesk', system-ui, sans-serif",
        lineHeight: 1,
        letterSpacing: -1,
      }}>{value}</div>
      <div style={{ fontSize: 10, color: '#7A85B0', marginTop: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.7px' }}>{label}</div>
    </div>
  )
}

function Section({ title, children, accent }) {
  return (
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, color: accent || '#7A85B0', textTransform: 'uppercase', letterSpacing: '.55px', marginBottom: 10, fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>
        {title}
      </div>
      {children}
    </div>
  )
}

function InfoLine({ color, icon, children }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, lineHeight: 1.6, color: '#9AA8C8', marginBottom: 6 }}>
      <span style={{ color, flexShrink: 0 }}>{icon}</span>
      <span>{children}</span>
    </div>
  )
}

// ── KPI Grid — 2×2 color-coded metric cards ───────────────────────────────────

function KPIGrid({ returns }) {
  const cards = [
    {
      label: 'Flagged',
      value: returns.filter(r => r.status === 'flagged').length,
      color: '#F5A020', bg: '#0E0A06', borderColor: '#F5A02020',
      note: 'pending manual review',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/>
        </svg>
      ),
    },
    {
      label: 'Escalations',
      value: returns.filter(r => r.escalation_team).length,
      color: '#8A60FF', bg: '#0A0818', borderColor: '#6840FF20',
      note: 'routed by AI agent',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
          <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
        </svg>
      ),
    },
    {
      label: 'Approved',
      value: returns.filter(r => r.status === 'approved').length,
      color: '#00C8E8', bg: '#04121A', borderColor: '#00C8E820',
      note: 'auto-processed',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ),
    },
    {
      label: 'Declined',
      value: returns.filter(r => r.status === 'declined').length,
      color: '#FF4B6A', bg: '#120608', borderColor: '#FF4B6A20',
      note: 'outside policy',
      icon: (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
        </svg>
      ),
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
      {cards.map(({ label, value, color, bg, borderColor, note, icon }) => (
        <div key={label} style={{
          background: bg,
          border: `1px solid ${borderColor}`,
          borderTop: `2px solid ${color}60`,
          borderRadius: 12,
          padding: '14px 16px',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* Icon + label row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color }}>
            <span style={{ opacity: 0.6 }}>{icon}</span>
            <span style={{ fontSize: 9, fontWeight: 700, opacity: 0.55, textTransform: 'uppercase', letterSpacing: '.8px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{label}</span>
          </div>
          {/* Big number */}
          <div style={{ fontSize: 38, fontWeight: 800, color, fontFamily: "'Space Grotesk', system-ui, sans-serif", lineHeight: 1, letterSpacing: -1.5 }}>{value}</div>
          {/* Note */}
          <div style={{ fontSize: 10, color: '#7A85B0', letterSpacing: '.15px' }}>{note}</div>
        </div>
      ))}
    </div>
  )
}

// ── Escalations Panel (below table) ──────────────────────────────────────────

function EscalationsPanel({ returns }) {
  const escalations = returns.filter(r => r.escalation_team)
  if (escalations.length === 0) return null
  return (
    <div style={{ background: '#0C1028', border: '1px solid #2A1850', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px #6840FF28, 0 16px 48px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#07091A', padding: '13px 22px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F5A020" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/><circle cx="12" cy="17" r="1" fill="#F5A020" stroke="none"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#F5A020', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Active Escalations</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#F5A020', background: 'rgba(245,160,32,0.12)', border: '1px solid rgba(245,160,32,0.3)', borderRadius: 20, padding: '2px 9px' }}>
          {escalations.length}
        </span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {escalations.map((r, i) => (
          <div key={i} style={{ background: '#12183A', border: '1px solid #2A3260', borderRadius: 8, padding: '14px 16px', borderLeft: '2px solid #6840FF50' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E8EDF8' }}>Return #{r.rowid}</span>
              <EscBadge team={r.escalation_team} />
            </div>
            <div style={{ fontSize: 11, color: '#7A85B0', marginBottom: 5 }}>{r.product_name} · {r.customer_name}</div>
            <div style={{ fontSize: 12, color: '#9AA8C8', lineHeight: 1.6 }}>{r.ai_note?.split('.')[0]}.</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Declined Panel (below table) ──────────────────────────────────────────────

function DeclinedPanel({ returns }) {
  const declined = returns.filter(r => r.status === 'declined')
  if (declined.length === 0) return null
  return (
    <div style={{ background: '#0C1028', border: '1px solid #2A1850', borderRadius: 14, overflow: 'hidden', boxShadow: '0 0 0 1px #FF4B6A20, 0 16px 48px rgba(0,0,0,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#07091A', padding: '13px 22px' }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FF4B6A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#FF4B6A', textTransform: 'uppercase', letterSpacing: '.5px', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>Declined Returns</span>
        <span style={{ marginLeft: 'auto', fontSize: 10, fontWeight: 700, color: '#FF4B6A', background: 'rgba(255,75,106,0.12)', border: '1px solid rgba(255,75,106,0.3)', borderRadius: 20, padding: '2px 9px' }}>
          {declined.length}
        </span>
      </div>
      <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {declined.map((r, i) => (
          <div key={i} style={{ background: '#12183A', border: '1px solid #2A3260', borderRadius: 8, padding: '14px 16px', borderLeft: '2px solid #FF4B6A50' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#E8EDF8' }}>Return #{r.rowid}</span>
              <StatusBadge status="declined" />
            </div>
            <div style={{ fontSize: 11, color: '#7A85B0', marginBottom: 5 }}>{r.product_name} · {r.customer_name}</div>
            <div style={{ fontSize: 12, color: '#9AA8C8', lineHeight: 1.6 }}>{r.ai_note?.split('.')[0] || 'Outside return policy'}.</div>
          </div>
        ))}
      </div>
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
  // selectedCustomer = { id, name } — when id===0 we filter by name instead
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [selectedChat, setSelectedChat] = useState(null)
  const [chatMinimized, setChatMinimized] = useState(false)
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
    <div style={{ color: '#7A85B0', padding: 60, textAlign: 'center', fontSize: 14 }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><IconBot width={28} height={28} style={{ color: '#6840FF' }} /></div>
      <div style={{ fontWeight: 600, color: '#E8EDF8', marginBottom: 8, fontFamily: theme.font.heading }}>Agent is evaluating returns…</div>
      <div style={{ fontSize: 12 }}>This takes a moment on first load.</div>
    </div>
  )

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 20 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, fontFamily: theme.font.heading, letterSpacing: -0.4 }}>Return Management</h1>
        <div style={{ fontSize: 11, color: '#7A85B0', display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#6840FF', display: 'inline-block', flexShrink: 0, animation: 'pulse 2s infinite' }} />
          AI-powered · {returns.length} total returns
        </div>
      </div>

      {/* ── TOP ROW: KPI grid (left) + AI Insights (right) ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20, marginBottom: 16, alignItems: 'start' }}>
        <KPIGrid returns={returns} />
        <AIInsights returns={returns} onReEvaluate={handleReEvaluate} reEvaluating={reEvaluating} />
      </div>

      {/* ── SEARCH + FILTERS ── */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 280px', maxWidth: 420 }}>
          <IconSearch style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#7A85B0' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search returns, customers, products…"
            style={{ width: '100%', paddingLeft: 36, paddingRight: 14, paddingTop: 9, paddingBottom: 9, background: '#12183A', border: '1px solid #2A3260', borderRadius: 5, fontSize: 13, color: '#E8EDF8', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <Pill active={statusFilter === 'all'} onClick={() => setStatusFilter('all')}>All ({counts.all})</Pill>
          <Pill active={statusFilter === 'approved'} onClick={() => setStatusFilter('approved')}>Approved ({counts.approved})</Pill>
          <Pill active={statusFilter === 'flagged'} onClick={() => setStatusFilter('flagged')}>Flagged ({counts.flagged})</Pill>
          <Pill active={statusFilter === 'declined'} onClick={() => setStatusFilter('declined')}>Declined ({counts.declined})</Pill>
        </div>
      </div>

      {/* ── BOTTOM ROW: table (left, wide) + right column (escalations/declined) ── */}
      {(() => {
        const hasEscalations = returns.some(r => r.escalation_team)
        const hasDeclined = returns.some(r => r.status === 'declined')
        const hasRightCol = hasEscalations || hasDeclined
        return (
          <div style={{ display: 'grid', gridTemplateColumns: hasRightCol ? '1fr 340px' : '1fr', gap: 20, alignItems: 'start' }}>

            {/* Returns table */}
            <div style={{ background: '#12183A', border: '1px solid #2A3260', borderRadius: 14, overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.5)' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#7A85B0', fontSize: 13 }}>No returns match your filters.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1E2650' }}>
                  {['Return ID', 'Customer', 'Product', 'Date', 'Amount', 'Status', ''].map(h => (
                    <th key={h} style={{ fontSize: 10, fontWeight: 600, color: '#7A85B0', textTransform: 'uppercase', letterSpacing: '.6px', padding: '10px 16px', textAlign: 'left', fontFamily: "'Space Grotesk', system-ui, sans-serif" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.rowid} style={{
                    borderBottom: '1px solid #1E2650',
                    background: 'transparent',
                    transition: 'background .12s',
                  }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1A2048'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '13px 16px' }}>
                      {/* Return ID — violet: AI-assigned system identifier */}
                      <button onClick={e => { e.stopPropagation(); setSelectedReturn(r) }} style={{ background: 'transparent', border: 'none', color: '#8A60FF', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
                        #{r.rowid}
                      </button>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <button onClick={e => { e.stopPropagation(); setSelectedCustomer({ id: r.customer_id, name: r.customer_name }) }} style={{ background: 'transparent', border: 'none', color: '#00C8E8', fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', padding: 0, textAlign: 'left' }}>
                        {r.customer_name || `#${r.customer_id}`}
                      </button>
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: 12, color: '#B0B8D0' }}>{r.product_name}</td>
                    <td style={{ padding: '13px 16px', fontSize: 11, color: '#7A85B0' }}>{r.return_date}</td>
                    <td style={{ padding: '13px 16px', fontSize: 12, fontWeight: 700,
                      color: r.status === 'approved' ? '#00C8E8' : r.status === 'flagged' ? '#F5A020' : r.status === 'declined' ? '#FF4B6A' : '#B0B8D0',
                    }}>${(r.refund_amount || 0).toFixed(2)}</td>
                    <td style={{ padding: '13px 16px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '13px 10px' }}>
                      {r.status === 'flagged' && (
                        <button
                          onClick={e => { e.stopPropagation(); setSelectedChat(r); setChatMinimized(false) }}
                          title="Open chat panel"
                          style={{
                            position: 'relative', background: 'transparent',
                            border: '1px solid #2A3260', borderRadius: 8,
                            color: '#7A85B0', cursor: 'pointer', padding: '4px 9px',
                            fontSize: 14, fontFamily: 'inherit', display: 'flex',
                            alignItems: 'center', gap: 4, transition: 'all .15s',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#6840FF'; e.currentTarget.style.color = '#8A60FF' }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2A3260'; e.currentTarget.style.color = '#7A85B0' }}
                        >
                          <IconChat />
                          {(msgCounts[String(r.rowid)] || 0) > 0 && (
                            <span style={{
                              position: 'absolute', top: -6, right: -6,
                              background: '#FF4B6A', color: '#fff',
                              fontSize: 9, fontWeight: 800, borderRadius: 20,
                              padding: '1px 5px', minWidth: 16, textAlign: 'center',
                              border: '2px solid #0A0E2A', letterSpacing: 0,
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

            {/* Right column: escalations stacked above declined */}
            {hasRightCol && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <EscalationsPanel returns={returns} />
                <DeclinedPanel returns={returns} />
              </div>
            )}
          </div>
        )
      })()}

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
          customer={selectedCustomer}
          returns={returns}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
      {/* Chat panel — fixed bottom-right, stays open while multitasking */}
      {selectedChat && (
        <ChatPanel
          ret={selectedChat}
          minimized={chatMinimized}
          onMinimize={() => setChatMinimized(m => !m)}
          onClose={() => { setSelectedChat(null); setChatMinimized(false) }}
          onCountChange={handleCountChange}
        />
      )}
    </div>
  )
}
