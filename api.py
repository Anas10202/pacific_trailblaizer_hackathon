"""FastAPI backend for Cosmic Mart Dashboard — reads cosmic_mart.db"""
import sqlite3
from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

DB = Path(__file__).parent / "cosmic_mart.db"
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

def query(sql):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql).fetchall()
    conn.close()
    return [dict(r) for r in rows]

@app.get("/api/overview")
def overview():
    cash = query("SELECT price FROM transactions WHERE transaction_type='sales'")
    cash_total = sum(r["price"] for r in cash)
    inv = query("SELECT unit_price, current_stock FROM inventory")
    inv_value = sum(r["unit_price"] * r["current_stock"] for r in inv)
    csat = query("SELECT score FROM csat_scores")
    avg_csat = round(sum(r["score"] for r in csat) / len(csat), 1) if csat else 0
    tickets = query("SELECT COUNT(*) as c FROM support_tickets")
    returns = query("SELECT COUNT(*) as c FROM returns")
    voc = query("SELECT COUNT(*) as c FROM voc_signals")
    customers = query("SELECT loyalty_tier, COUNT(*) as c FROM customers GROUP BY loyalty_tier")
    return {
        "cash": cash_total,
        "inventory_value": inv_value,
        "avg_csat": avg_csat,
        "total_tickets": tickets[0]["c"],
        "total_returns": returns[0]["c"],
        "total_voc": voc[0]["c"],
        "loyalty_tiers": customers,
    }

@app.get("/api/customers")
def customers():
    return query("SELECT * FROM customers ORDER BY loyalty_points DESC")

@app.get("/api/scenarios")
def scenarios():
    orders = query("SELECT * FROM orders ORDER BY order_date")
    returns = query("SELECT * FROM returns")
    tickets = query("SELECT * FROM support_tickets")
    return {"orders": orders, "returns": returns, "tickets": tickets}

@app.get("/api/inventory")
def inventory():
    return query("SELECT * FROM inventory ORDER BY product_name, market")

@app.get("/api/voc")
def voc():
    signals = query("SELECT * FROM voc_signals ORDER BY created_date DESC")
    csat = query("SELECT cs.*, c.name FROM csat_scores cs JOIN customers c ON cs.customer_id = c.id ORDER BY scored_date DESC")
    tickets = query("SELECT st.*, c.name FROM support_tickets st JOIN customers c ON st.customer_id = c.id ORDER BY created_date DESC")
    return {"signals": signals, "csat": csat, "tickets": tickets}

@app.get("/api/financials")
def financials():
    txns = query("SELECT * FROM transactions WHERE transaction_type IN ('sales','stock_orders') ORDER BY transaction_date")
    return txns
