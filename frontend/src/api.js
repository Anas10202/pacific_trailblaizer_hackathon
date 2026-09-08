const BASE = 'http://localhost:8000'

export const fetchOverview = () => fetch(`${BASE}/api/overview`).then(r => r.json())
export const fetchCustomers = () => fetch(`${BASE}/api/customers`).then(r => r.json())
export const fetchScenarios = () => fetch(`${BASE}/api/scenarios`).then(r => r.json())
export const fetchInventory = () => fetch(`${BASE}/api/inventory`).then(r => r.json())
export const fetchVOC = () => fetch(`${BASE}/api/voc`).then(r => r.json())
export const fetchFinancials = () => fetch(`${BASE}/api/financials`).then(r => r.json())
