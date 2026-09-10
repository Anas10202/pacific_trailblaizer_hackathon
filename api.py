"""FastAPI backend for Cosmic Mart Dashboard — reads cosmic_mart.db"""
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from customer_api import router as customer_router

DB = Path(__file__).parent / "cosmic_mart.db"
app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(customer_router)

# ── DB helpers ────────────────────────────────────────────────────────────────

def query(sql):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def query_p(sql, params):
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def execute(sql, params=()):
    conn = sqlite3.connect(DB)
    conn.execute(sql, params)
    conn.commit()
    conn.close()

# ── Demo seeds — raw return REQUESTS only, no AI decisions ───────────────────
# The agent will evaluate each one and write status/ai_note/assigned_to to DB.

DEMO_SEEDS = [
    {
        "order_id": 9001, "customer_id": 0,
        "product_name": "Gaming Laptop Pro", "quantity": 1,
        "reason": "Defective screen on arrival — display shows horizontal lines across the panel",
        "return_date": "2026-09-05", "refund_amount": 1299.99,
        "customer_name": "Alice Johnson", "order_date": "2026-08-06",
        "extra_context": "",
    },
    {
        "order_id": 9002, "customer_id": 0,
        "product_name": "4K Monitor Ultra", "quantity": 3,
        "reason": "Received wrong items — requesting refund at premium model price of $1,599.99 each",
        "return_date": "2026-09-06", "refund_amount": 4799.97,
        "customer_name": "Bob Martinez", "order_date": "2026-08-25",
        "extra_context": "Order record shows 3x standard model at $599.99 each, not premium.",
    },
    {
        "order_id": 9003, "customer_id": 0,
        "product_name": "Wireless Headphones X", "quantity": 1,
        "reason": "Device overheats and shuts off after 30 minutes of use",
        "return_date": "2026-09-07", "refund_amount": 349.99,
        "customer_name": "Carol Chen", "order_date": "2026-08-15",
        "extra_context": "8 other returns for this exact product in the last 14 days, all citing overheating.",
    },
    {
        "order_id": 9004, "customer_id": 0,
        "product_name": "Smart TV 55\" 4K", "quantity": 1,
        "reason": "Screen has multiple dead pixels, want to return for refund",
        "return_date": "2026-09-08", "refund_amount": 899.99,
        "customer_name": "David Park", "order_date": "2026-07-01",
        "extra_context": "",
    },
    {
        "order_id": 9005, "customer_id": 0,
        "product_name": "Gaming Controller Pro", "quantity": 1,
        "reason": "Controller stopped working after a week — cracked housing and bent analog stick",
        "return_date": "2026-09-07", "refund_amount": 79.99,
        "customer_name": "Emma Rodriguez", "order_date": "2026-09-01",
        "extra_context": "Photos attached show cracked left grip and bent analog stick.",
    },
    {
        "order_id": 9006, "customer_id": 0,
        "product_name": "Digital Software License — Adobe Suite", "quantity": 1,
        "reason": "Changed my mind, no longer need the software",
        "return_date": "2026-09-06", "refund_amount": 599.00,
        "customer_name": "Frank Liu", "order_date": "2026-08-28",
        "extra_context": "License activation key was accessed and activated on 2026-09-01.",
    },
]

RETURN_POLICY = """
Cosmic Mart Return Policy:
- Returns must be submitted within 30 days of the delivery date (not the order date)
- Manufacturing defects and DOA (dead on arrival) products are fully covered
- Physical damage caused by the user (drops, misuse, liquid) is NOT covered
- Digital software licenses are non-returnable once the activation key has been accessed
- Refund amounts more than 3x the average ($1,297) must be FLAGGED for pricing team review
- Multiple returns for the same product within 14 days (8+) should be FLAGGED for product quality review
- 'Change of mind' with no defect may be declined for opened/used/activated items
"""

# ── DB schema helpers ─────────────────────────────────────────────────────────

def ensure_ai_columns():
    """Add AI decision columns to returns table if they don't exist yet."""
    conn = sqlite3.connect(DB)
    existing = {row[1] for row in conn.execute("PRAGMA table_info(returns)").fetchall()}
    for col, dtype in [
        ("ai_note", "TEXT"),
        ("assigned_to", "TEXT"),
        ("escalation_team", "TEXT"),
        ("customer_name", "TEXT"),
        ("order_date", "TEXT"),
        ("extra_context", "TEXT"),
    ]:
        if col not in existing:
            conn.execute(f"ALTER TABLE returns ADD COLUMN {col} {dtype}")
    conn.commit()
    conn.close()

def seed_demo_returns():
    """Insert demo seeds into DB (once only — skips if order_id already exists)."""
    ensure_ai_columns()
    conn = sqlite3.connect(DB)
    for s in DEMO_SEEDS:
        exists = conn.execute(
            "SELECT rowid FROM returns WHERE order_id = ?", (s["order_id"],)
        ).fetchone()
        if not exists:
            conn.execute(
                """INSERT INTO returns
                   (order_id, customer_id, product_name, quantity, reason,
                    return_date, status, refund_amount,
                    customer_name, order_date, extra_context)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (s["order_id"], s["customer_id"], s["product_name"], s["quantity"],
                 s["reason"], s["return_date"], "pending", s["refund_amount"],
                 s.get("customer_name"), s.get("order_date"), s.get("extra_context")),
            )
    conn.commit()
    conn.close()

# ── Agent evaluation ──────────────────────────────────────────────────────────

def _days_since(order_date, return_date):
    try:
        return (datetime.fromisoformat(return_date) - datetime.fromisoformat(order_date)).days
    except Exception:
        return "unknown"

_DEFAULT_CUSTOMER_MESSAGE = {
    "approved": "Good news — your return has been approved and your refund is on its way.",
    "flagged": "We're taking a closer look at your return. A specialist will follow up shortly.",
    "declined": "We're unable to approve this return based on our return policy.",
}

def _parse_agent_response(text):
    """Extract structured fields from the agent's free-text response.

    REASON is the detailed internal note (policy citations, numbers, dates) shown
    to the Return Management team. CUSTOMER_MESSAGE is a separate, short,
    plain-language line meant to be shown to the customer directly — it must never
    leak internal policy text, team names, or raw error details to the customer app.
    """
    status, assigned_to, escalation_team, ai_note = "approved", "customer_agent (Auto-approved)", None, text.strip()
    customer_message = None

    m = re.search(r'STATUS:\s*(APPROVED|FLAGGED|DECLINED)', text, re.IGNORECASE)
    if m:
        status = m.group(1).lower()

    m = re.search(r'ASSIGNED_TO:\s*(.+?)(?:\n|$)', text)
    if m:
        assigned_to = m.group(1).strip()

    m = re.search(r'ESCALATION_TEAM:\s*(.+?)(?:\n|$)', text)
    if m:
        val = m.group(1).strip()
        escalation_team = None if val.upper() in ('NONE', 'N/A', '') else val

    m = re.search(r'CUSTOMER_MESSAGE:\s*(.+?)(?:\n|$)', text)
    if m:
        customer_message = m.group(1).strip()

    m = re.search(r'REASON:\s*(.+)', text, re.DOTALL)
    if m:
        ai_note = m.group(1).strip()

    if not customer_message:
        customer_message = _DEFAULT_CUSTOMER_MESSAGE.get(status, _DEFAULT_CUSTOMER_MESSAGE["flagged"])

    return {"status": status, "assigned_to": assigned_to,
            "escalation_team": escalation_team, "ai_note": ai_note,
            "customer_message": customer_message}

def evaluate_return(row):
    """Call the Anthropic model to evaluate a return and return a decision dict."""
    order_date = row.get("order_date") or "unknown"
    extra = row.get("extra_context") or ""

    try:
        from cosmic_mart import estimate_delivered_date
        delivered_date = estimate_delivered_date(order_date) if order_date != "unknown" else "unknown"
    except Exception:
        delivered_date = "unknown"
    days = _days_since(delivered_date, row.get("return_date", ""))

    prompt = f"""You are a return policy evaluation agent for Cosmic Mart, an electronics retailer.
Evaluate the return request below and decide whether to APPROVE, FLAG, or DECLINE it.

Respond ONLY in this exact format — no preamble, no extra text:
STATUS: [APPROVED or FLAGGED or DECLINED]
ASSIGNED_TO: [e.g. "customer_agent (Auto-approved)" | "Pricing Team" | "Product Team" | "declined_agent (Policy: <short reason>)"]
ESCALATION_TEAM: [team name if FLAGGED, otherwise NONE]
CUSTOMER_MESSAGE: [1-2 short, friendly sentences explaining the decision directly to the customer — plain language only, no policy citations, no internal team names, no internal jargon]
REASON: [3-5 sentences citing specific numbers, dates, and policy rules that justify your decision — this is for the internal Return Management team, not the customer]

Return request details:
- Product: {row.get("product_name")}
- Customer: {row.get("customer_name") or "Customer #" + str(row.get("customer_id", "?"))}
- Quantity requested: {row.get("quantity")}
- Return Date: {row.get("return_date")}
- Order Date: {order_date}
- Estimated Delivery Date: {delivered_date}
- Days since delivery: {days}
- Refund amount requested: ${row.get("refund_amount") or 0:.2f}
- Customer's stated reason: {row.get("reason")}
{("- Additional context: " + extra) if extra else ""}

{RETURN_POLICY}"""

    try:
        from cosmic_mart import model
        messages = [{"role": "user", "content": prompt}]
        response = model(messages)
        # Extract text from smolagents ChatMessage
        content = response.content
        if isinstance(content, str):
            text = content
        elif isinstance(content, list):
            text = "".join(getattr(p, "text", str(p)) for p in content)
        else:
            text = str(content)
        return _parse_agent_response(text)
    except Exception as e:
        return {
            "status": "pending",
            "assigned_to": "Agent unavailable",
            "escalation_team": None,
            "ai_note": f"Agent evaluation failed: {e}",
            "customer_message": "We're reviewing your return manually and will follow up soon.",
        }

def process_pending_returns():
    """Evaluate pending returns:
    - Demo seeds (order_id >= 9000): call the Anthropic agent to decide.
    - Real DB returns (order_id < 9000): already approved by the system during order processing;
      look up order_date from orders table for accurate context, then approve automatically.
    """
    ensure_ai_columns()
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    pending = [dict(r) for r in conn.execute(
        "SELECT rowid, * FROM returns WHERE ai_note IS NULL OR ai_note = '' OR status = 'pending'"
    ).fetchall()]
    conn.close()

    for row in pending:
        if row.get("order_id", 0) >= 9000:
            # Demo seed — let the agent decide
            decision = evaluate_return(row)
        else:
            # Real system return — already approved by customer_agent during scenario
            # Enrich with order date from orders table if available
            order_rows = query_p(
                "SELECT order_date FROM orders WHERE id = ?", (row.get("order_id", 0),)
            )
            order_date = order_rows[0]["order_date"] if order_rows else row.get("return_date", "")
            refund = row.get("refund_amount") or 0
            reason = row.get("reason") or "standard return"
            product = row.get("product_name") or "product"
            decision = {
                "status": "approved",
                "assigned_to": "customer_agent (Auto-approved)",
                "escalation_team": None,
                "ai_note": (
                    f"APPROVED by customer_agent. Reason '{reason}' was verified as valid during "
                    f"the original order resolution process. Refund of ${refund:.2f} matches the "
                    f"recorded item price for {product}. Return processed on {row.get('return_date', 'N/A')} "
                    f"(order date: {order_date}). No anomalies detected. Refund cleared."
                ),
            }

        conn = sqlite3.connect(DB)
        conn.execute(
            "UPDATE returns SET status=?, ai_note=?, assigned_to=?, escalation_team=? WHERE rowid=?",
            (decision["status"], decision["ai_note"], decision["assigned_to"],
             decision["escalation_team"], row["rowid"]),
        )
        conn.commit()
        conn.close()

# ── Returns endpoints ─────────────────────────────────────────────────────────

@app.get("/api/returns")
def returns_list():
    seed_demo_returns()
    process_pending_returns()
    rows = query("""
        SELECT r.rowid, r.order_id, r.customer_id, r.product_name, r.quantity,
               r.reason, r.return_date, r.status, r.refund_amount,
               r.ai_note, r.assigned_to, r.escalation_team, r.order_date,
               COALESCE(r.customer_name, c.name) as customer_name
        FROM returns r
        LEFT JOIN customers c ON r.customer_id = c.id
        ORDER BY r.return_date DESC
    """)
    return rows

@app.post("/api/returns/re-evaluate")
def re_evaluate():
    """Clear AI decisions for demo seeds and re-run agent evaluation."""
    execute(
        "UPDATE returns SET ai_note=NULL, assigned_to=NULL, escalation_team=NULL, status='pending'"
        " WHERE order_id >= 9000"
    )
    process_pending_returns()
    return {"ok": True, "message": "Re-evaluation complete"}

@app.get("/api/customers/{customer_id}")
def customer_detail(customer_id: int):
    cust = query_p("SELECT * FROM customers WHERE id = ?", (customer_id,))
    rets = query_p(
        """SELECT r.rowid, r.order_id, r.customer_id, r.product_name, r.quantity,
                  r.reason, r.return_date, r.status, r.refund_amount,
                  r.ai_note, r.assigned_to, r.escalation_team,
                  COALESCE(r.customer_name, c.name) as customer_name
           FROM returns r
           LEFT JOIN customers c ON r.customer_id = c.id
           WHERE r.customer_id = ?""",
        (customer_id,)
    )
    if not cust:
        # Demo customer — get name from returns table
        name = rets[0].get("customer_name") if rets else f"Customer #{customer_id}"
        return {"id": customer_id, "name": name, "loyalty_tier": None, "loyalty_points": 0, "returns": rets}
    return {**cust[0], "returns": rets}

# ── Customer chat endpoints ───────────────────────────────────────────────────

def ensure_chat_table():
    conn = sqlite3.connect(DB)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS return_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            return_id INTEGER NOT NULL,
            sender TEXT NOT NULL,
            message TEXT NOT NULL,
            timestamp TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()

@app.get("/api/returns/message-counts")
def message_counts():
    ensure_chat_table()
    rows = query("SELECT return_id, COUNT(*) as count FROM return_messages GROUP BY return_id")
    return {str(r["return_id"]): r["count"] for r in rows}

@app.get("/api/returns/{return_id}/messages")
def get_messages(return_id: int):
    ensure_chat_table()
    return query_p(
        "SELECT * FROM return_messages WHERE return_id = ? ORDER BY id ASC",
        (return_id,)
    )

@app.post("/api/returns/{return_id}/messages")
async def send_message(return_id: int, req: Request):
    ensure_chat_table()
    body = await req.json()
    agent_msg = (body.get("message") or "").strip()
    if not agent_msg:
        return {"error": "Empty message"}

    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    conn = sqlite3.connect(DB)
    conn.execute(
        "INSERT INTO return_messages (return_id, sender, message, timestamp) VALUES (?,?,?,?)",
        (return_id, "agent", agent_msg, ts),
    )
    conn.commit()
    conn.close()

    # Fetch return context for AI customer reply
    rows = query_p(
        """SELECT r.rowid, r.product_name, r.reason, r.status, r.ai_note,
                  r.refund_amount, COALESCE(r.customer_name, c.name) as customer_name
           FROM returns r LEFT JOIN customers c ON r.customer_id = c.id
           WHERE r.rowid = ?""",
        (return_id,),
    )

    customer_reply = "I understand, thank you for reaching out."
    customer_name = "Customer"

    if rows:
        ret = rows[0]
        customer_name = ret.get("customer_name") or "Customer"
        history = query_p(
            "SELECT sender, message FROM return_messages WHERE return_id = ? ORDER BY id ASC",
            (return_id,),
        )
        history_text = "\n".join(
            f"{'Agent' if h['sender'] == 'agent' else customer_name}: {h['message']}"
            for h in history
        )
        prompt = f"""You are {customer_name}, a customer who submitted a return to Cosmic Mart.
Return details:
- Product: {ret.get('product_name')}
- Your stated reason: {ret.get('reason')}
- Status: {(ret.get('status') or 'pending').upper()}
- Refund requested: ${(ret.get('refund_amount') or 0):.2f}

Conversation so far:
{history_text}

Reply as the customer — naturally and concisely (2-3 sentences). Be realistic: you may be frustrated, anxious, or cooperative depending on context. Do NOT include any "Customer:" prefix — just write the reply."""
        try:
            from cosmic_mart import model
            response = model([{"role": "user", "content": prompt}])
            content = response.content
            if isinstance(content, str):
                customer_reply = content.strip()
            elif isinstance(content, list):
                customer_reply = "".join(getattr(p, "text", str(p)) for p in content).strip()
            else:
                customer_reply = str(content).strip()
        except Exception:
            pass

    reply_ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M")
    conn = sqlite3.connect(DB)
    conn.execute(
        "INSERT INTO return_messages (return_id, sender, message, timestamp) VALUES (?,?,?,?)",
        (return_id, "customer", customer_reply, reply_ts),
    )
    conn.commit()
    conn.close()

    return {
        "agent_message":   {"sender": "agent",    "message": agent_msg,      "timestamp": ts},
        "customer_reply":  {"sender": "customer",  "message": customer_reply,  "timestamp": reply_ts},
    }

# ── Other existing endpoints (unchanged) ─────────────────────────────────────

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
        "cash": cash_total, "inventory_value": inv_value, "avg_csat": avg_csat,
        "total_tickets": tickets[0]["c"], "total_returns": returns[0]["c"],
        "total_voc": voc[0]["c"], "loyalty_tiers": customers,
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
    return query("SELECT * FROM transactions WHERE transaction_type IN ('sales','stock_orders') ORDER BY transaction_date")

def _compute_merchandising():
    sales = query(
        "SELECT product_name, SUM(units) as units, SUM(price) as revenue "
        "FROM transactions WHERE transaction_type='sales' AND product_name IS NOT NULL "
        "GROUP BY product_name"
    )
    sales_map = {r["product_name"]: r for r in sales}
    inv = query("SELECT product_name, category, unit_price, SUM(current_stock) as stock FROM inventory GROUP BY product_name, category, unit_price")
    products = []
    for r in inv:
        s = sales_map.get(r["product_name"], {})
        units_sold = int(s.get("units") or 0)
        revenue = float(s.get("revenue") or 0)
        stock = int(r["stock"] or 0)
        stock_value = stock * r["unit_price"]
        sell_through = units_sold / (units_sold + stock) if (units_sold + stock) else 0
        products.append({
            "product": r["product_name"], "category": r["category"],
            "unit_price": round(r["unit_price"], 2), "units_sold": units_sold,
            "revenue": round(revenue, 2), "stock": stock,
            "stock_value": round(stock_value, 2), "sell_through": round(sell_through, 4),
        })
    sellers = sorted((p for p in products if p["units_sold"] > 0), key=lambda p: p["revenue"], reverse=True)
    promote = [{**p, "reason": f"{p['units_sold']} units sold · ${p['revenue']:,.0f} revenue", "action": "Feature & restock"} for p in sellers[:4]]
    slow = sorted(products, key=lambda p: (p["sell_through"], -p["stock_value"]))
    markdown = []
    for p in slow:
        if p["sell_through"] < 0.05 and len(markdown) < 4:
            pct = 20 if p["stock_value"] > 100000 else 15 if p["stock_value"] > 50000 else 10
            markdown.append({**p, "reason": f"{p['stock']} in stock · {p['units_sold']} sold · ${p['stock_value']:,.0f} tied up", "action": f"Mark down {pct}%", "markdown_pct": pct})
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
