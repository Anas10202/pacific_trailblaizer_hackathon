"""FastAPI backend for Cosmic Mart Dashboard — reads cosmic_mart.db"""
import sqlite3
from datetime import datetime, timezone
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

def _compute_merchandising():
    sales = query(
        "SELECT product_name, SUM(units) as units, SUM(price) as revenue "
        "FROM transactions WHERE transaction_type='sales' AND product_name IS NOT NULL "
        "GROUP BY product_name"
    )
    sales_map = {r["product_name"]: r for r in sales}
    inv = query(
        "SELECT product_name, category, unit_price, SUM(current_stock) as stock "
        "FROM inventory GROUP BY product_name, category, unit_price"
    )
    products = []
    for r in inv:
        s = sales_map.get(r["product_name"], {})
        units_sold = int(s.get("units") or 0)
        revenue = float(s.get("revenue") or 0)
        stock = int(r["stock"] or 0)
        stock_value = stock * r["unit_price"]
        sell_through = units_sold / (units_sold + stock) if (units_sold + stock) else 0
        products.append({
            "product": r["product_name"],
            "category": r["category"],
            "unit_price": round(r["unit_price"], 2),
            "units_sold": units_sold,
            "revenue": round(revenue, 2),
            "stock": stock,
            "stock_value": round(stock_value, 2),
            "sell_through": round(sell_through, 4),
        })

    sellers = sorted((p for p in products if p["units_sold"] > 0), key=lambda p: p["revenue"], reverse=True)
    promote = [
        {**p, "reason": f"{p['units_sold']} units sold · ${p['revenue']:,.0f} revenue", "action": "Feature & restock"}
        for p in sellers[:4]
    ]

    slow = sorted(products, key=lambda p: (p["sell_through"], -p["stock_value"]))
    markdown = []
    for p in slow:
        if p["sell_through"] < 0.05 and len(markdown) < 4:
            pct = 20 if p["stock_value"] > 100000 else 15 if p["stock_value"] > 50000 else 10
            markdown.append({
                **p,
                "reason": f"{p['stock']} in stock · {p['units_sold']} sold · ${p['stock_value']:,.0f} tied up",
                "action": f"Mark down {pct}%",
                "markdown_pct": pct,
            })

    return {"products": products, "promote": promote, "markdown": markdown}


@app.get("/api/insights")
def insights():
    d = _compute_merchandising()
    return {"promote": d["promote"], "markdown": d["markdown"]}


_agentic_cache = {"text": None, "generated_at": None}


@app.get("/api/insights/agentic")
def agentic_insights(refresh: bool = False):
    if _agentic_cache["text"] and not refresh:
        return _agentic_cache

    data = _compute_merchandising()
    lines = [
        f"- {p['product']} ({p['category']}): {p['units_sold']} sold, "
        f"${p['revenue']:,.0f} revenue, {p['stock']} in stock "
        f"(${p['stock_value']:,.0f} tied up), sell-through {p['sell_through'] * 100:.2f}%"
        for p in data["products"]
    ]
    prompt = (
        "You are a retail merchandising analyst for Cosmic Mart, an electronics store. "
        "Using ONLY the product data below, give a concise, decisive recommendation.\n\n"
        "Product data:\n" + "\n".join(lines) + "\n\n"
        "Write 3-5 short bullet points covering: which products to PUSH/feature, which to "
        "MARK DOWN (with a rough %), and the single most urgent action. Cite specific dollar "
        "figures from the data. Do not invent numbers. Keep the whole answer under 150 words."
    )

    try:
        from cosmic_mart import analytics_agent
        text = str(analytics_agent.run(prompt))
    except Exception as e:
        text = f"Agentic insight unavailable: {e}"

    _agentic_cache["text"] = text
    _agentic_cache["generated_at"] = datetime.now(timezone.utc).isoformat()
    return _agentic_cache
