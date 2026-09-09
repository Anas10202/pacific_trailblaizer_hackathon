const BASE = 'http://localhost:8000'

export const fetchOverview = () => fetch(`${BASE}/api/overview`).then(r => r.json())
export const fetchCustomers = () => fetch(`${BASE}/api/customers`).then(r => r.json())
export const fetchScenarios = () => fetch(`${BASE}/api/scenarios`).then(r => r.json())
export const fetchInventory = () => fetch(`${BASE}/api/inventory`).then(r => r.json())
export const fetchVOC = () => fetch(`${BASE}/api/voc`).then(r => r.json())
export const fetchFinancials = () => fetch(`${BASE}/api/financials`).then(r => r.json())
export const fetchInsights = () => fetch(`${BASE}/api/insights`).then(r => r.json())
export const fetchAgenticInsights = (refresh = false) =>
  fetch(`${BASE}/api/insights/agentic${refresh ? '?refresh=true' : ''}`).then(r => r.json())
export const fetchReturns = () => fetch(`${BASE}/api/returns`).then(r => r.json())
export const fetchCustomerDetail = (id) => fetch(`${BASE}/api/customers/${id}`).then(r => r.json())
export const reEvaluateReturns = () => fetch(`${BASE}/api/returns/re-evaluate`, { method: 'POST' }).then(r => r.json())
export const fetchMessageCounts = () => fetch(`${BASE}/api/returns/message-counts`).then(r => r.json())
export const fetchMessages = (returnId) => fetch(`${BASE}/api/returns/${returnId}/messages`).then(r => r.json())
export const sendMessage = (returnId, message) => fetch(`${BASE}/api/returns/${returnId}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ message }),
}).then(r => r.json())
