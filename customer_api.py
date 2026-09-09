"""FastAPI router backing the customer-facing returns app (cosmic-customer-demo.html).

Kept out of api.py / cosmic_mart.py on purpose. Customer-submitted returns are written
straight into the same `returns` table the Return Management dashboard reads, using a
synthetic order_id (>= CUSTOMER_APP_ORDER_BASE) so they go through the exact same real
policy-agent evaluation (api.evaluate_return) that the dashboard's demo seeds use,
instead of the auto-approve shortcut api.py reserves for internally-fulfilled orders
(order_id < 9000). The real order_id is recovered as (synthetic_order_id - BASE) —
it's never actually looked up anywhere, just kept unique and decodable per order.

api.py / cosmic_mart are imported lazily inside each endpoint (matching the pattern
api.py already uses for its own model calls), so importing this module never pays the
cost of building the smolagents models, and there's no circular-import issue even
though api.py imports this module's router at startup — by the time a request reaches
these lazy imports, api.py is already fully loaded.
"""
import sqlite3
from datetime import datetime
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/customer", tags=["customer-app"])

DB = Path(__file__).parent / "cosmic_mart.db"
RETURN_WINDOW_DAYS = 30
CUSTOMER_APP_ORDER_BASE = 9500

# The customer app always shows this one demo persona. Each time their orders are
# loaded (i.e. each time the page is opened/refreshed), any return they previously
# submitted through the app is cleared first, so the same 3 purchases are always
# there with the return option available for the next demo run. This never touches
# other customers' returns or the dashboard's own seeded/system returns.
DEMO_CUSTOMER_ID = 1


def _reset_demo_customer_returns():
    conn = sqlite3.connect(DB)
    conn.execute(
        "DELETE FROM returns WHERE customer_id = ? AND order_id >= ?",
        (DEMO_CUSTOMER_ID, CUSTOMER_APP_ORDER_BASE),
    )
    conn.commit()
    conn.close()


@router.get("/{customer_id}")
def get_customer(customer_id: int):
    from cosmic_mart import get_customer_profile

    profile = get_customer_profile(customer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Customer not found")
    return profile


@router.get("/{customer_id}/orders")
def get_customer_orders(customer_id: int):
    from cosmic_mart import db_engine, cosmic_products

    if customer_id == DEMO_CUSTOMER_ID:
        _reset_demo_customer_returns()

    category_map = {p["product_name"]: p["category"] for p in cosmic_products}
    rows = pd.read_sql(
        "SELECT o.id as order_id, o.order_date, o.status, o.market, "
        "oi.product_name, oi.quantity, oi.unit_price, oi.total_price "
        "FROM orders o JOIN order_items oi ON oi.order_id = o.id "
        "WHERE o.customer_id = :cid AND o.status = 'delivered' "
        "ORDER BY o.order_date DESC",
        db_engine, params={"cid": customer_id},
    )
    if rows.empty:
        return []

    returned = pd.read_sql(
        "SELECT order_id, product_name FROM returns WHERE customer_id = :cid",
        db_engine, params={"cid": customer_id},
    )
    returned_keys = {(int(r["order_id"]), r["product_name"]) for _, r in returned.iterrows()}

    today = datetime.now()
    items = []
    for _, r in rows.iterrows():
        order_date = datetime.fromisoformat(r["order_date"])
        days_ago = (today - order_date).days
        synthetic_id = CUSTOMER_APP_ORDER_BASE + int(r["order_id"])
        items.append({
            "order_id": int(r["order_id"]),
            "product_name": r["product_name"],
            "category": category_map.get(r["product_name"], "accessory"),
            "quantity": int(r["quantity"]),
            "unit_price": round(float(r["unit_price"]), 2),
            "total_price": round(float(r["total_price"]), 2),
            "order_date": r["order_date"],
            "market": r["market"],
            "days_ago": days_ago,
            "eligible": days_ago <= RETURN_WINDOW_DAYS,
            "already_returned": (synthetic_id, r["product_name"]) in returned_keys,
        })
    return items


class ReturnRequest(BaseModel):
    customer_id: int
    order_id: int
    product_name: str
    reason: str
    description: str = ""


@router.post("/return")
def submit_return(req: ReturnRequest):
    from cosmic_mart import db_engine, _resolve_product_name, get_customer_profile
    from api import evaluate_return, ensure_ai_columns

    customer = get_customer_profile(req.customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    resolved_product = _resolve_product_name(req.product_name) or req.product_name

    order_item = pd.read_sql(
        "SELECT oi.*, o.order_date, o.status FROM order_items oi "
        "JOIN orders o ON o.id = oi.order_id "
        "WHERE oi.order_id = :oid AND o.customer_id = :cid AND oi.product_name = :p",
        db_engine, params={"oid": req.order_id, "cid": req.customer_id, "p": resolved_product},
    )
    if order_item.empty:
        raise HTTPException(status_code=404, detail="Order item not found for this customer")

    row = order_item.iloc[0]
    refund_amount = round(float(row["total_price"]), 2)
    order_date_str = row["order_date"]
    today_str = datetime.now().strftime("%Y-%m-%d")
    synthetic_order_id = CUSTOMER_APP_ORDER_BASE + req.order_id

    decision = evaluate_return({
        "product_name": resolved_product,
        "customer_name": customer["name"],
        "customer_id": req.customer_id,
        "quantity": int(row["quantity"]),
        "return_date": today_str,
        "order_date": order_date_str,
        "refund_amount": refund_amount,
        "reason": req.reason,
        "extra_context": req.description,
    })

    ensure_ai_columns()
    # Raw sqlite3 on one connection — pandas.to_sql() + a follow-up read_sql() can land
    # on two different pooled SQLAlchemy connections, making last_insert_rowid() read 0.
    conn = sqlite3.connect(DB)
    cur = conn.execute(
        """INSERT INTO returns
           (order_id, customer_id, product_name, quantity, reason, return_date,
            status, refund_amount, ai_note, assigned_to, escalation_team,
            customer_name, order_date, extra_context)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        (synthetic_order_id, req.customer_id, resolved_product, int(row["quantity"]),
         req.reason, today_str, decision["status"], refund_amount,
         decision["ai_note"], decision["assigned_to"], decision["escalation_team"],
         customer["name"], order_date_str, req.description),
    )
    conn.commit()
    return_id = cur.lastrowid
    conn.close()

    return {
        "return_id": return_id,
        "decision": decision["status"],
        "ai_note": decision["ai_note"],
        "assigned_to": decision["assigned_to"],
        "escalation_team": decision["escalation_team"],
        "product": resolved_product,
        "refund_amount": refund_amount,
        "order_id": req.order_id,
        "customer": {"name": customer["name"]},
    }
