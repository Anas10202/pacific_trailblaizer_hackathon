"""
Cosmic Mart Customer Satisfaction Multi-Agent System
Follows the Munder Difflin smolagents pattern (CodeAgent + ToolCallingAgents)
"""

import pandas as pd
import numpy as np
import os
import time
import dotenv
from sqlalchemy.sql import text
from datetime import datetime, timedelta
from typing import Dict, List, Union
from sqlalchemy import create_engine, Engine

# ============================================================
# DATABASE
# ============================================================

db_engine = create_engine("sqlite:///cosmic_mart.db")

# ============================================================
# PRODUCT CATALOG
# ============================================================

cosmic_products = [
    {"product_name": "AstroSpeaker X3",     "category": "audio",     "unit_price": 89.99},
    {"product_name": "Nebula Headphones",   "category": "audio",     "unit_price": 149.99},
    {"product_name": "AstroGoggles V2",     "category": "eyewear",   "unit_price": 199.99},
    {"product_name": "NovaSpeaker X12",     "category": "audio",     "unit_price": 249.99},
    {"product_name": "StarPad Pro",         "category": "tablet",    "unit_price": 399.99},
    {"product_name": "CosmicCam 360",       "category": "camera",    "unit_price": 179.99},
    {"product_name": "LunarLight LED Strip","category": "lighting",  "unit_price": 39.99},
    {"product_name": "GalaxySmart Watch",   "category": "wearable",  "unit_price": 299.99},
    {"product_name": "NebulaFit Band",      "category": "wearable",  "unit_price": 79.99},
    {"product_name": "AstroDock Hub",       "category": "accessory", "unit_price": 59.99},
]

earth_markets = [
    "North America", "South America", "Europe", "Asia", "Africa",
    "Middle East", "Oceania", "East Asia", "South Asia", "Southeast Asia",
]

# Loyalty tiers: (name, minimum points threshold) — highest first
LOYALTY_TIERS = [("Gold", 5000), ("Silver", 1000), ("Basic", 0)]

# ============================================================
# UTILITY FUNCTIONS (non-agent level — do not call from tools directly,
# use the @tool wrappers instead)
# ============================================================

def get_loyalty_tier_name(points: int) -> str:
    for name, threshold in LOYALTY_TIERS:
        if points >= threshold:
            return name
    return "Basic"


def get_points_to_next_tier(points: int) -> Dict:
    """Returns current_tier, next_tier, and points gap to next tier."""
    tiers_asc = [("Basic", 0), ("Silver", 1000), ("Gold", 5000)]
    current = get_loyalty_tier_name(points)
    for i, (name, _) in enumerate(tiers_asc):
        if name == current and i < len(tiers_asc) - 1:
            next_name, next_thresh = tiers_asc[i + 1]
            return {"current_tier": current, "next_tier": next_name, "gap": next_thresh - points}
    return {"current_tier": current, "next_tier": None, "gap": 0}


def get_cash_balance(as_of_date: Union[str, datetime]) -> float:
    if isinstance(as_of_date, datetime):
        as_of_date = as_of_date.isoformat()
    try:
        txns = pd.read_sql(
            "SELECT * FROM transactions WHERE transaction_date <= :d",
            db_engine, params={"d": as_of_date},
        )
        if txns.empty:
            return 0.0
        sales = txns.loc[txns["transaction_type"] == "sales", "price"].sum()
        orders = txns.loc[txns["transaction_type"] == "stock_orders", "price"].sum()
        return float(sales - orders)
    except Exception:
        return 0.0


def create_transaction(
    product_name: str, market: str, transaction_type: str,
    units: int, price: float, date: Union[str, datetime],
) -> int:
    date_str = date.isoformat() if isinstance(date, datetime) else date
    if transaction_type not in {"stock_orders", "sales"}:
        raise ValueError("transaction_type must be 'stock_orders' or 'sales'")
    row = pd.DataFrame([{
        "product_name": product_name, "market": market,
        "transaction_type": transaction_type, "units": units,
        "price": price, "transaction_date": date_str,
    }])
    row.to_sql("transactions", db_engine, if_exists="append", index=False)
    result = pd.read_sql("SELECT last_insert_rowid() as id", db_engine)
    return int(result.iloc[0]["id"])


def get_stock_level(product_name: str, market: str, as_of_date: Union[str, datetime]) -> int:
    if isinstance(as_of_date, datetime):
        as_of_date = as_of_date.isoformat()
    query = """
        SELECT COALESCE(SUM(CASE
            WHEN transaction_type = 'stock_orders' THEN units
            WHEN transaction_type = 'sales' THEN -units
            ELSE 0 END), 0) AS stock
        FROM transactions
        WHERE product_name = :p AND market = :m AND transaction_date <= :d
    """
    result = pd.read_sql(query, db_engine, params={"p": product_name, "m": market, "d": as_of_date})
    return int(result["stock"].iloc[0]) if not result.empty else 0


# Orders have no delivery_date column — only order_date is recorded. The return
# policy window is 30 days from delivery, not from purchase, so we estimate a
# delivery date using a fixed shipping lead time, applied consistently everywhere
# eligibility or "delivered N days ago" is computed.
CUSTOMER_DELIVERY_LEAD_DAYS = 4

def estimate_delivered_date(order_date_str: str) -> str:
    base = datetime.fromisoformat(order_date_str.split("T")[0])
    return (base + timedelta(days=CUSTOMER_DELIVERY_LEAD_DAYS)).strftime("%Y-%m-%d")


def get_supplier_delivery_date(date_str: str, quantity: int) -> str:
    try:
        base = datetime.fromisoformat(date_str.split("T")[0])
    except (ValueError, TypeError):
        base = datetime.now()
    if quantity <= 10:
        days = 0
    elif quantity <= 100:
        days = 1
    elif quantity <= 1000:
        days = 4
    else:
        days = 7
    return (base + timedelta(days=days)).strftime("%Y-%m-%d")


def get_customer_profile(customer_id: int) -> Dict:
    df = pd.read_sql("SELECT * FROM customers WHERE id = :id", db_engine, params={"id": customer_id})
    if df.empty:
        return {}
    row = df.iloc[0]
    return {
        "id": int(row["id"]),
        "name": row["name"],
        "email": row["email"],
        "loyalty_tier": row["loyalty_tier"],
        "loyalty_points": int(row["loyalty_points"]),
        "market": row["market"],
    }


def update_loyalty_points(customer_id: int, points_delta: int) -> Dict:
    df = pd.read_sql("SELECT * FROM customers WHERE id = :id", db_engine, params={"id": customer_id})
    if df.empty:
        return {}
    new_points = max(0, int(df.iloc[0]["loyalty_points"]) + points_delta)
    new_tier = get_loyalty_tier_name(new_points)
    with db_engine.connect() as conn:
        conn.execute(
            text("UPDATE customers SET loyalty_points = :pts, loyalty_tier = :tier WHERE id = :id"),
            {"pts": new_points, "tier": new_tier, "id": customer_id},
        )
        conn.commit()
    return {"loyalty_points": new_points, "loyalty_tier": new_tier}


def log_csat(
    customer_id: int, score: int, comment: str,
    order_id: int = None, ticket_id: int = None, scored_date: str = None,
) -> int:
    if not scored_date:
        scored_date = datetime.now().strftime("%Y-%m-%d")
    row = pd.DataFrame([{
        "customer_id": customer_id, "ticket_id": ticket_id, "order_id": order_id,
        "score": score, "comment": comment, "scored_date": scored_date,
    }])
    row.to_sql("csat_scores", db_engine, if_exists="append", index=False)
    result = pd.read_sql("SELECT last_insert_rowid() as id", db_engine)
    return int(result.iloc[0]["id"])


def log_voc(source: str, content: str, sentiment: str, customer_id: int = None, created_date: str = None) -> int:
    if not created_date:
        created_date = datetime.now().strftime("%Y-%m-%d")
    row = pd.DataFrame([{
        "source": source, "content": content, "sentiment": sentiment,
        "customer_id": customer_id, "created_date": created_date, "ticket_id": None,
    }])
    row.to_sql("voc_signals", db_engine, if_exists="append", index=False)
    result = pd.read_sql("SELECT last_insert_rowid() as id", db_engine)
    return int(result.iloc[0]["id"])


def create_support_ticket_record(
    customer_id: int, subject: str, description: str,
    priority: str, source: str, created_date: str,
) -> int:
    row = pd.DataFrame([{
        "customer_id": customer_id, "subject": subject, "description": description,
        "status": "open", "priority": priority, "created_date": created_date,
        "resolved_date": None, "source": source, "resolution_notes": None,
    }])
    row.to_sql("support_tickets", db_engine, if_exists="append", index=False)
    result = pd.read_sql("SELECT last_insert_rowid() as id", db_engine)
    return int(result.iloc[0]["id"])


def resolve_ticket_record(ticket_id: int, resolution_notes: str, resolved_date: str) -> bool:
    with db_engine.connect() as conn:
        conn.execute(
            text("UPDATE support_tickets SET status='resolved', resolved_date=:rd, resolution_notes=:rn WHERE rowid=:id"),
            {"rd": resolved_date, "rn": resolution_notes, "id": ticket_id},
        )
        conn.commit()
    return True


def record_return(
    order_id: int, customer_id: int, product_name: str,
    quantity: int, reason: str, return_date: str,
) -> int:
    item_df = pd.read_sql(
        "SELECT * FROM order_items WHERE order_id = :oid AND product_name = :p",
        db_engine, params={"oid": order_id, "p": product_name},
    )
    refund_amount = float(item_df["total_price"].iloc[0]) if not item_df.empty else 0.0
    row = pd.DataFrame([{
        "order_id": order_id, "customer_id": customer_id, "product_name": product_name,
        "quantity": quantity, "reason": reason, "return_date": return_date,
        "status": "approved", "refund_amount": refund_amount,
    }])
    row.to_sql("returns", db_engine, if_exists="append", index=False)
    result = pd.read_sql("SELECT last_insert_rowid() as id", db_engine)
    return int(result.iloc[0]["id"])


def generate_financial_report(as_of_date: Union[str, datetime]) -> Dict:
    if isinstance(as_of_date, datetime):
        as_of_date = as_of_date.isoformat()
    cash = get_cash_balance(as_of_date)
    inv_df = pd.read_sql("SELECT DISTINCT product_name, unit_price FROM inventory", db_engine)
    inv_value = 0.0
    for _, row in inv_df.iterrows():
        total_stock = sum(get_stock_level(row["product_name"], m, as_of_date) for m in earth_markets)
        inv_value += total_stock * row["unit_price"]
    top_sales = pd.read_sql(
        """SELECT product_name, SUM(units) as total_units, SUM(price) as total_revenue
           FROM transactions WHERE transaction_type='sales' AND transaction_date<=:d
           GROUP BY product_name ORDER BY total_revenue DESC LIMIT 5""",
        db_engine, params={"d": as_of_date},
    )
    return {
        "as_of_date": as_of_date,
        "cash_balance": round(cash, 2),
        "inventory_value": round(inv_value, 2),
        "total_assets": round(cash + inv_value, 2),
        "top_selling_products": top_sales.to_dict(orient="records"),
    }


# ============================================================
# DATABASE INITIALISATION
# ============================================================

def init_database(db_engine: Engine) -> Engine:
    try:
        # --- Customers ---
        customers = pd.DataFrame([
            {"id": 1,  "name": "Alex Rivera",    "email": "alex@example.com",    "loyalty_tier": "Gold",   "loyalty_points": 5200, "market": "North America"},
            {"id": 2,  "name": "Sam Chen",       "email": "sam@example.com",     "loyalty_tier": "Silver", "loyalty_points": 1800, "market": "East Asia"},
            {"id": 3,  "name": "Jordan Kim",     "email": "jordan@example.com",  "loyalty_tier": "Basic",  "loyalty_points": 300,  "market": "Europe"},
            {"id": 4,  "name": "Taylor Brooks",  "email": "taylor@example.com",  "loyalty_tier": "Silver", "loyalty_points": 2100, "market": "North America"},
            {"id": 5,  "name": "Morgan Singh",   "email": "morgan@example.com",  "loyalty_tier": "Gold",   "loyalty_points": 6500, "market": "South Asia"},
            {"id": 6,  "name": "Casey Park",     "email": "casey@example.com",   "loyalty_tier": "Basic",  "loyalty_points": 150,  "market": "Southeast Asia"},
            {"id": 7,  "name": "Drew Martinez",  "email": "drew@example.com",    "loyalty_tier": "Silver", "loyalty_points": 1200, "market": "Europe"},
            {"id": 8,  "name": "Quinn Johnson",  "email": "quinn@example.com",   "loyalty_tier": "Basic",  "loyalty_points": 450,  "market": "Africa"},
            {"id": 9,  "name": "Riley Thompson", "email": "riley@example.com",   "loyalty_tier": "Gold",   "loyalty_points": 8900, "market": "North America"},
            {"id": 10, "name": "Avery Wilson",   "email": "avery@example.com",   "loyalty_tier": "Silver", "loyalty_points": 3400, "market": "Middle East"},
        ])
        customers.to_sql("customers", db_engine, if_exists="replace", index=False)

        # --- Orders (historical) ---
        orders = pd.DataFrame([
            {"id": 1,  "customer_id": 1,  "order_date": "2026-07-15", "status": "delivered", "market": "North America",  "total_amount": 269.97},
            {"id": 2,  "customer_id": 2,  "order_date": "2026-08-01", "status": "delivered", "market": "East Asia",       "total_amount": 299.98},
            {"id": 3,  "customer_id": 3,  "order_date": "2026-08-10", "status": "delivered", "market": "Europe",          "total_amount": 149.99},
            {"id": 4,  "customer_id": 4,  "order_date": "2026-08-15", "status": "delivered", "market": "North America",  "total_amount": 199.99},
            {"id": 5,  "customer_id": 5,  "order_date": "2026-08-20", "status": "in_transit","market": "South Asia",      "total_amount": 89.99},
            {"id": 6,  "customer_id": 1,  "order_date": "2026-08-25", "status": "delivered", "market": "North America",  "total_amount": 249.99},
            {"id": 7,  "customer_id": 6,  "order_date": "2026-08-28", "status": "delayed",   "market": "Southeast Asia",  "total_amount": 179.99},
            {"id": 8,  "customer_id": 7,  "order_date": "2026-09-01", "status": "delivered", "market": "Europe",          "total_amount": 399.99},
            {"id": 9,  "customer_id": 8,  "order_date": "2026-09-03", "status": "delivered", "market": "Africa",          "total_amount": 39.99},
            {"id": 10, "customer_id": 9,  "order_date": "2026-09-05", "status": "delivered", "market": "North America",  "total_amount": 149.99},
        ])
        orders.to_sql("orders", db_engine, if_exists="replace", index=False)

        # --- Order Items ---
        order_items = pd.DataFrame([
            {"id": 1,  "order_id": 1,  "product_name": "AstroSpeaker X3",     "quantity": 3,  "unit_price": 89.99,  "discount_pct": 0.0, "total_price": 269.97},
            {"id": 2,  "order_id": 2,  "product_name": "Nebula Headphones",   "quantity": 2,  "unit_price": 149.99, "discount_pct": 0.0, "total_price": 299.98},
            {"id": 3,  "order_id": 3,  "product_name": "Nebula Headphones",   "quantity": 1,  "unit_price": 149.99, "discount_pct": 0.0, "total_price": 149.99},
            {"id": 4,  "order_id": 4,  "product_name": "AstroGoggles V2",     "quantity": 1,  "unit_price": 199.99, "discount_pct": 0.0, "total_price": 199.99},
            {"id": 5,  "order_id": 5,  "product_name": "AstroSpeaker X3",     "quantity": 1,  "unit_price": 89.99,  "discount_pct": 0.0, "total_price": 89.99},
            {"id": 6,  "order_id": 6,  "product_name": "NovaSpeaker X12",     "quantity": 1,  "unit_price": 249.99, "discount_pct": 0.0, "total_price": 249.99},
            {"id": 7,  "order_id": 7,  "product_name": "CosmicCam 360",       "quantity": 1,  "unit_price": 179.99, "discount_pct": 0.0, "total_price": 179.99},
            {"id": 8,  "order_id": 8,  "product_name": "StarPad Pro",         "quantity": 1,  "unit_price": 399.99, "discount_pct": 0.0, "total_price": 399.99},
            {"id": 9,  "order_id": 9,  "product_name": "LunarLight LED Strip","quantity": 1,  "unit_price": 39.99,  "discount_pct": 0.0, "total_price": 39.99},
            {"id": 10, "order_id": 10, "product_name": "Nebula Headphones",   "quantity": 1,  "unit_price": 149.99, "discount_pct": 0.0, "total_price": 149.99},
        ])
        order_items.to_sql("order_items", db_engine, if_exists="replace", index=False)

        # --- Inventory (product x market) ---
        np.random.seed(42)
        inv_records = []
        for product in cosmic_products:
            for market in earth_markets:
                # South America intentionally low to mirror widget alert scenario
                if market == "South America":
                    stock = int(np.random.randint(5, 25))
                else:
                    stock = int(np.random.randint(80, 500))
                inv_records.append({
                    "product_name": product["product_name"],
                    "category": product["category"],
                    "unit_price": product["unit_price"],
                    "market": market,
                    "current_stock": stock,
                    "min_stock_level": 20,
                })
        inv_df = pd.DataFrame(inv_records)
        inv_df.to_sql("inventory", db_engine, if_exists="replace", index=False)

        # --- Transactions (financial ledger) ---
        pd.DataFrame({
            "product_name": pd.Series(dtype=str),
            "market": pd.Series(dtype=str),
            "transaction_type": pd.Series(dtype=str),
            "units": pd.Series(dtype=float),
            "price": pd.Series(dtype=float),
            "transaction_date": pd.Series(dtype=str),
        }).to_sql("transactions", db_engine, if_exists="replace", index=False)

        initial_date = datetime(2026, 7, 1).isoformat()
        # Seed operating cash (must exceed inventory cost: 100 product-market combos × avg $176/unit × 250 units ≈ $4.4M)
        pd.DataFrame([{
            "product_name": None, "market": None, "transaction_type": "sales",
            "units": None, "price": 6000000.0, "transaction_date": initial_date,
        }]).to_sql("transactions", db_engine, if_exists="append", index=False)
        # Seed stock cost
        seed_txns = [{
            "product_name": r["product_name"], "market": r["market"],
            "transaction_type": "stock_orders", "units": r["current_stock"],
            "price": r["current_stock"] * r["unit_price"], "transaction_date": initial_date,
        } for r in inv_records]
        pd.DataFrame(seed_txns).to_sql("transactions", db_engine, if_exists="append", index=False)

        # --- Empty tables for CX / CSAT / VOC / Returns ---
        pd.DataFrame({
            "order_id": pd.Series(dtype=int), "customer_id": pd.Series(dtype=int),
            "product_name": pd.Series(dtype=str), "quantity": pd.Series(dtype=int),
            "reason": pd.Series(dtype=str), "return_date": pd.Series(dtype=str),
            "status": pd.Series(dtype=str), "refund_amount": pd.Series(dtype=float),
        }).to_sql("returns", db_engine, if_exists="replace", index=False)

        pd.DataFrame({
            "customer_id": pd.Series(dtype=int), "subject": pd.Series(dtype=str),
            "description": pd.Series(dtype=str), "status": pd.Series(dtype=str),
            "priority": pd.Series(dtype=str), "created_date": pd.Series(dtype=str),
            "resolved_date": pd.Series(dtype=str), "source": pd.Series(dtype=str),
            "resolution_notes": pd.Series(dtype=str),
        }).to_sql("support_tickets", db_engine, if_exists="replace", index=False)

        pd.DataFrame({
            "customer_id": pd.Series(dtype=int), "ticket_id": pd.Series(dtype=float),
            "order_id": pd.Series(dtype=float), "score": pd.Series(dtype=int),
            "comment": pd.Series(dtype=str), "scored_date": pd.Series(dtype=str),
        }).to_sql("csat_scores", db_engine, if_exists="replace", index=False)

        pd.DataFrame({
            "source": pd.Series(dtype=str), "content": pd.Series(dtype=str),
            "sentiment": pd.Series(dtype=str), "customer_id": pd.Series(dtype=float),
            "created_date": pd.Series(dtype=str), "ticket_id": pd.Series(dtype=float),
        }).to_sql("voc_signals", db_engine, if_exists="replace", index=False)

        print("Database initialized successfully.")
        return db_engine

    except Exception as e:
        print(f"Error initializing database: {e}")
        raise


# ============================================================
# AGENT SETUP — load env, import smolagents, build model
# ============================================================

dotenv.load_dotenv()

from smolagents import tool, CodeAgent, ToolCallingAgent, LiteLLMModel

model = LiteLLMModel(
    model_id="anthropic/claude-haiku-4-5-20251001",
    api_key=os.environ.get("ANTHROPIC_API_KEY", ""),
    api_base="https://claude.vocareum.com",
)

# ============================================================
# HELPER: fuzzy product name resolver
# ============================================================

def _resolve_product_name(query: str) -> str:
    """Map a customer description to the exact catalog product_name."""
    query_lower = query.lower().strip()
    all_names = [p["product_name"] for p in cosmic_products]

    # 1. Exact match
    for name in all_names:
        if name.lower() == query_lower:
            return name

    # 2. Substring containment
    candidates = [n for n in all_names if query_lower in n.lower() or n.lower() in query_lower]
    if len(candidates) == 1:
        return candidates[0]

    # 3. Keyword overlap
    filler = {"the", "a", "an", "for", "and", "of", "in", "with", "my", "our", "pro", "x", "v2"}
    query_words = set(query_lower.replace("-", " ").split()) - filler
    best_score, best_match = 0, None
    for name in all_names:
        name_words = set(name.lower().replace("-", " ").split()) - filler
        overlap = len(query_words & name_words)
        if overlap > best_score:
            best_score, best_match = overlap, name
    if best_score > 0:
        return best_match

    return None

# ============================================================
# CATALOG NOTE — injected into orchestrator system prompt
# ============================================================

_product_names_str = ", ".join(p["product_name"] for p in cosmic_products)
_markets_str = ", ".join(earth_markets)

_agent_catalog_note = (
    "IMPORTANT RULES:\n"
    "1. Every request includes a 'Date of request' in YYYY-MM-DD format. "
    "Use that date for ALL tool calls. NEVER use any other date.\n"
    "2. The full product catalog is: " + _product_names_str + "\n"
    "3. Valid markets are: " + _markets_str + "\n"
    "4. Common product mappings: 'speaker' -> 'AstroSpeaker X3' or 'NovaSpeaker X12', "
    "'headphones' -> 'Nebula Headphones', 'goggles' -> 'AstroGoggles V2', "
    "'tablet' or 'pad' -> 'StarPad Pro', 'camera' or 'cam' -> 'CosmicCam 360', "
    "'LED' or 'light strip' -> 'LunarLight LED Strip', 'watch' -> 'GalaxySmart Watch', "
    "'fit band' or 'fitness' -> 'NebulaFit Band', 'dock' or 'hub' -> 'AstroDock Hub'.\n"
    "5. Loyalty tiers: Basic (0–999 pts), Silver (1000–4999 pts), Gold (5000+ pts).\n"
    "6. CSAT scores range 1–5 (5 = delighted). Log CSAT after every resolution.\n"
)


# ============================================================
# TOOLS — INVENTORY AGENT
# ============================================================

@tool
def check_stock_by_market(product_name: str, market: str, as_of_date: str) -> str:
    """
    Check the current stock level for a specific product in a specific market.
    Flags whether a reorder is needed. Product name is fuzzy-matched to catalog.

    Args:
        product_name: Product to check (fuzzy-matched to catalog).
        market: One of the 10 Earth markets.
        as_of_date: ISO date string YYYY-MM-DD.

    Returns:
        Formatted string with stock level, unit price, and reorder status.
    """
    resolved = _resolve_product_name(product_name)
    if not resolved:
        return f"Product '{product_name}' not found in catalog."
    stock = get_stock_level(resolved, market, as_of_date)
    inv = pd.read_sql(
        "SELECT * FROM inventory WHERE product_name = :p AND market = :m",
        db_engine, params={"p": resolved, "m": market},
    )
    if inv.empty:
        return f"'{resolved}' is not stocked in {market}."
    unit_price = inv["unit_price"].iloc[0]
    min_level = int(inv["min_stock_level"].iloc[0])
    return (
        f"Product: {resolved} | Market: {market}\n"
        f"Stock: {stock} units | Min level: {min_level} | Unit price: ${unit_price:.2f}\n"
        f"Reorder needed: {'YES' if stock <= min_level else 'No'}"
    )


@tool
def check_all_market_inventory(market: str, as_of_date: str) -> str:
    """
    Check stock levels for ALL products in a given market. Flags low-stock items.

    Args:
        market: One of the 10 Earth markets.
        as_of_date: ISO date string YYYY-MM-DD.

    Returns:
        Formatted string listing all products with stock status for the market.
    """
    inv = pd.read_sql(
        "SELECT * FROM inventory WHERE market = :m", db_engine, params={"m": market}
    )
    if inv.empty:
        return f"No inventory data found for market: {market}"
    lines = [f"Inventory snapshot for {market} as of {as_of_date}:"]
    alerts = []
    for _, row in inv.iterrows():
        stock = get_stock_level(row["product_name"], market, as_of_date)
        low = stock <= int(row["min_stock_level"])
        if low:
            alerts.append(row["product_name"])
        lines.append(
            f"  - {row['product_name']}: {stock} units "
            f"@ ${row['unit_price']:.2f} [{'LOW — REORDER' if low else 'OK'}]"
        )
    if alerts:
        lines.append(f"\nALERT: Low-stock products: {', '.join(alerts)}")
    else:
        lines.append("\nAll products adequately stocked in this market.")
    return "\n".join(lines)


@tool
def reorder_product(product_name: str, market: str, quantity: int, order_date: str) -> str:
    """
    Place a supplier reorder for a product in a specific market. Verifies cash availability first.
    Applies standard delivery lead times: ≤10 units = same day, ≤100 = 1 day, ≤1000 = 4 days, >1000 = 7 days.

    Args:
        product_name: Product to reorder (fuzzy-matched to catalog).
        market: Market to restock.
        quantity: Units to order.
        order_date: ISO date string YYYY-MM-DD.

    Returns:
        Confirmation string with cost, delivery date, or refusal reason.
    """
    resolved = _resolve_product_name(product_name)
    if not resolved:
        return f"Product '{product_name}' not found in catalog."
    inv = pd.read_sql(
        "SELECT * FROM inventory WHERE product_name = :p AND market = :m",
        db_engine, params={"p": resolved, "m": market},
    )
    if not inv.empty:
        unit_price = float(inv["unit_price"].iloc[0])
    else:
        price_map = {p["product_name"]: p["unit_price"] for p in cosmic_products}
        unit_price = price_map.get(resolved)
        if unit_price is None:
            return f"No price info for '{resolved}'."
    total_cost = quantity * unit_price
    cash = get_cash_balance(order_date)
    if total_cost > cash:
        return (
            f"Reorder declined — insufficient funds.\n"
            f"Cost: ${total_cost:.2f} | Available cash: ${cash:.2f}"
        )
    delivery_date = get_supplier_delivery_date(order_date, quantity)
    create_transaction(resolved, market, "stock_orders", quantity, total_cost, delivery_date)
    return (
        f"Reorder confirmed: {quantity} units of '{resolved}' for {market}.\n"
        f"Unit price: ${unit_price:.2f} | Total: ${total_cost:.2f}\n"
        f"Estimated delivery: {delivery_date}"
    )


# ============================================================
# TOOLS — RETURNS AGENT
# ============================================================

@tool
def check_return_eligibility(order_id: int, return_date: str) -> str:
    """
    Check whether an order is eligible for return (within 30-day window).

    Args:
        order_id: The order ID to check.
        return_date: ISO date string YYYY-MM-DD (today's date for the return request).

    Returns:
        Eligibility status with order details.
    """
    order = pd.read_sql(
        "SELECT * FROM orders WHERE id = :id", db_engine, params={"id": order_id}
    )
    if order.empty:
        return f"Order {order_id} not found."
    delivered_date_str = estimate_delivered_date(order.iloc[0]["order_date"])
    delivered_date = datetime.fromisoformat(delivered_date_str)
    return_dt = datetime.fromisoformat(return_date)
    days_since = (return_dt - delivered_date).days
    eligible = days_since <= 30
    items = pd.read_sql(
        "SELECT product_name, quantity, total_price FROM order_items WHERE order_id = :id",
        db_engine, params={"id": order_id},
    )
    items_str = "\n".join(
        f"    - {r['product_name']}: {r['quantity']} unit(s) — ${r['total_price']:.2f}"
        for _, r in items.iterrows()
    )
    return (
        f"Order {order_id} — placed {order.iloc[0]['order_date']}, delivered {delivered_date_str} "
        f"({days_since} days ago)\n"
        f"Return eligible: {'YES (within 30-day window of delivery)' if eligible else 'NO (window expired)'}\n"
        f"Items in order:\n{items_str}"
    )


@tool
def process_return(
    order_id: int, customer_id: int, product_name: str,
    quantity: int, reason: str, return_date: str,
) -> str:
    """
    Process a customer return. Records the return, refunds the customer (as loyalty points
    at $1 = 10 points), and logs a CSAT score request. Awards 50 bonus goodwill points.

    Args:
        order_id: Order being returned.
        customer_id: Customer making the return.
        product_name: Product being returned (fuzzy-matched).
        quantity: Units being returned.
        reason: Customer's stated reason for return.
        return_date: ISO date string YYYY-MM-DD.

    Returns:
        Return confirmation with refund amount and loyalty points awarded.
    """
    resolved = _resolve_product_name(product_name)
    if not resolved:
        return f"Product '{product_name}' not found in catalog."
    return_id = record_return(order_id, customer_id, resolved, quantity, reason, return_date)
    # Fetch refund amount just recorded
    ret_df = pd.read_sql(
        "SELECT * FROM returns WHERE rowid = (SELECT MAX(rowid) FROM returns)",
        db_engine,
    )
    refund_amount = float(ret_df["refund_amount"].iloc[0]) if not ret_df.empty else 0.0
    # Award points: $1 = 10 points, plus 50 goodwill bonus
    points_awarded = int(refund_amount * 10) + 50
    update_loyalty_points(customer_id, points_awarded)
    customer = get_customer_profile(customer_id)
    # Log CSAT for the return interaction
    log_csat(customer_id, 4, f"Return processed for {resolved}. Reason: {reason}",
             order_id=order_id, scored_date=return_date)
    return (
        f"Return approved for '{resolved}' — Order {order_id}\n"
        f"Refund amount: ${refund_amount:.2f}\n"
        f"Loyalty points awarded: {points_awarded} pts (refund value + 50 goodwill)\n"
        f"{customer.get('name', 'Customer')} now has {customer.get('loyalty_points', 0) + points_awarded} pts "
        f"({customer.get('loyalty_tier', 'Basic')} tier)"
    )


@tool
def suggest_exchange(customer_id: int, returned_product: str, return_date: str) -> str:
    """
    Suggest a product exchange instead of a full return. Recommends an upgrade in the
    same category at a discounted price, preserving loyalty tier. Awards 100 bonus points
    for choosing exchange over return.

    Args:
        customer_id: The customer considering the return.
        returned_product: Product they want to return (fuzzy-matched).
        return_date: ISO date string YYYY-MM-DD.

    Returns:
        Exchange recommendation with pricing and loyalty benefit.
    """
    resolved = _resolve_product_name(returned_product)
    if not resolved:
        return f"Product '{returned_product}' not found in catalog."
    # Find the returned product's category
    cat = next((p["category"] for p in cosmic_products if p["product_name"] == resolved), None)
    returned_price = next((p["unit_price"] for p in cosmic_products if p["product_name"] == resolved), 0)
    # Find upgrade in same category
    upgrades = [p for p in cosmic_products if p["category"] == cat and p["unit_price"] > returned_price]
    customer = get_customer_profile(customer_id)
    if not upgrades:
        return (
            f"No upgrade available for '{resolved}' in the {cat} category.\n"
            "Standard return has been offered instead."
        )
    best_upgrade = min(upgrades, key=lambda p: p["unit_price"])
    exchange_discount = 0.15
    exchange_price = round(best_upgrade["unit_price"] * (1 - exchange_discount), 2)
    price_diff = round(exchange_price - returned_price, 2)
    return (
        f"Smart Exchange Offer for {customer.get('name', 'Customer')}:\n"
        f"  Return: '{resolved}' (${returned_price:.2f})\n"
        f"  Upgrade to: '{best_upgrade['product_name']}' "
        f"({int(exchange_discount*100)}% loyalty discount → ${exchange_price:.2f})\n"
        f"  You pay the difference: ${max(0, price_diff):.2f}\n"
        f"  Bonus: +100 loyalty points for choosing exchange over return\n"
        f"  Current tier: {customer.get('loyalty_tier', 'Basic')} "
        f"({customer.get('loyalty_points', 0)} pts) — tier preserved!"
    )


# ============================================================
# TOOLS — CX AGENT
# ============================================================

@tool
def create_ticket(
    customer_id: int, subject: str, description: str,
    priority: str, source: str, created_date: str,
) -> str:
    """
    Create a customer support ticket. Source can be 'app', 'phone', 'email', or 'social'
    (for VOC signals from Twitter/reviews). Priority: 'low', 'medium', 'high'.

    Args:
        customer_id: Customer raising the ticket.
        subject: Brief subject line for the ticket.
        description: Full description of the issue.
        priority: 'low', 'medium', or 'high'.
        source: Channel of contact — 'app', 'phone', 'email', or 'social'.
        created_date: ISO date string YYYY-MM-DD.

    Returns:
        Confirmation string with ticket ID.
    """
    ticket_id = create_support_ticket_record(customer_id, subject, description, priority, source, created_date)
    customer = get_customer_profile(customer_id)
    return (
        f"Support ticket #{ticket_id} created for {customer.get('name', 'Customer')}.\n"
        f"Subject: {subject}\n"
        f"Priority: {priority} | Source: {source} | Date: {created_date}"
    )


@tool
def resolve_ticket(ticket_id: int, resolution_notes: str, resolved_date: str) -> str:
    """
    Resolve an open support ticket and log a CSAT score. Automatically awards
    150 loyalty points to the customer for a resolved complaint.

    Args:
        ticket_id: The ticket to resolve.
        resolution_notes: Summary of how the issue was resolved.
        resolved_date: ISO date string YYYY-MM-DD.

    Returns:
        Resolution confirmation with CSAT and loyalty points awarded.
    """
    ticket_df = pd.read_sql(
        "SELECT * FROM support_tickets WHERE rowid = :id", db_engine, params={"id": ticket_id}
    )
    if ticket_df.empty:
        # Try by sequential id
        all_tickets = pd.read_sql("SELECT * FROM support_tickets", db_engine)
        if all_tickets.empty or ticket_id > len(all_tickets):
            return f"Ticket #{ticket_id} not found."
        ticket_df = all_tickets.iloc[[ticket_id - 1]]
    resolve_ticket_record(ticket_id, resolution_notes, resolved_date)
    customer_id = int(ticket_df.iloc[0]["customer_id"])
    update_loyalty_points(customer_id, 150)
    customer = get_customer_profile(customer_id)
    log_csat(customer_id, 4, f"Ticket #{ticket_id} resolved: {resolution_notes[:100]}",
             ticket_id=ticket_id, scored_date=resolved_date)
    return (
        f"Ticket #{ticket_id} resolved.\n"
        f"Resolution: {resolution_notes}\n"
        f"Resolved date: {resolved_date}\n"
        f"+150 loyalty points awarded to {customer.get('name', 'Customer')} "
        f"(now {customer.get('loyalty_points', 0) + 150} pts, {customer.get('loyalty_tier', 'Basic')} tier)"
    )


@tool
def log_voc_signal(source: str, content: str, sentiment: str, customer_id: int, created_date: str) -> str:
    """
    Log a Voice of Customer (VOC) signal from social media, reviews, or surveys.
    Negative signals automatically trigger a high-priority support ticket.
    Sentiment: 'positive', 'neutral', or 'negative'.

    Args:
        source: Origin platform — 'twitter', 'review', 'survey', or 'email'.
        content: The raw customer post or comment.
        sentiment: 'positive', 'neutral', or 'negative'.
        customer_id: Customer ID if identifiable (use 0 if anonymous).
        created_date: ISO date string YYYY-MM-DD.

    Returns:
        VOC log confirmation and any auto-created ticket details.
    """
    voc_id = log_voc(source, content, sentiment, customer_id or None, created_date)
    result_lines = [f"VOC signal #{voc_id} logged from {source} ({sentiment})."]
    if sentiment == "negative" and customer_id and customer_id > 0:
        # Auto-escalate to support ticket
        ticket_id = create_support_ticket_record(
            customer_id,
            subject=f"VOC Alert — {source} negative signal",
            description=f"Auto-escalated from {source}: {content[:300]}",
            priority="high",
            source="social",
            created_date=created_date,
        )
        result_lines.append(
            f"Negative signal auto-escalated → Support ticket #{ticket_id} created (high priority)."
        )
    return "\n".join(result_lines)


# ============================================================
# TOOLS — FULFILLMENT AGENT
# ============================================================

@tool
def fulfill_order(
    customer_id: int, product_name: str, quantity: int, market: str, order_date: str,
) -> str:
    """
    Fulfill a customer order. Applies bulk discounts: 5% for 10-49 units, 10% for 50-99,
    15% for 100+ units. Restocks from supplier if needed. Awards loyalty points (1 pt per $1 spent).

    Args:
        customer_id: Customer placing the order.
        product_name: Product to order (fuzzy-matched to catalog).
        quantity: Number of units.
        market: Market for delivery.
        order_date: ISO date string YYYY-MM-DD.

    Returns:
        Order confirmation with total price, discount, delivery date, and loyalty points earned.
    """
    resolved = _resolve_product_name(product_name)
    if not resolved:
        return f"Product '{product_name}' not found in catalog."
    inv = pd.read_sql(
        "SELECT * FROM inventory WHERE product_name = :p AND market = :m",
        db_engine, params={"p": resolved, "m": market},
    )
    if not inv.empty:
        unit_price = float(inv["unit_price"].iloc[0])
    else:
        price_map = {p["product_name"]: p["unit_price"] for p in cosmic_products}
        unit_price = price_map.get(resolved)
        if unit_price is None:
            return f"No price info for '{resolved}'."
    # Bulk discounts
    if quantity >= 100:
        discount = 0.15
    elif quantity >= 50:
        discount = 0.10
    elif quantity >= 10:
        discount = 0.05
    else:
        discount = 0.0
    sale_price = round(quantity * unit_price * (1 - discount), 2)
    stock = get_stock_level(resolved, market, order_date)
    if stock < quantity:
        shortfall = quantity - stock
        reorder_cost = shortfall * unit_price
        cash = get_cash_balance(order_date)
        if cash < reorder_cost:
            return (
                f"Cannot fulfill '{resolved}' in {market}: insufficient cash to restock.\n"
                f"Shortfall: {shortfall} units | Reorder cost: ${reorder_cost:.2f} | Cash: ${cash:.2f}"
            )
        delivery_date = get_supplier_delivery_date(order_date, shortfall)
        create_transaction(resolved, market, "stock_orders", shortfall, reorder_cost, delivery_date)
        fulfillment_date = delivery_date
    else:
        fulfillment_date = order_date
    create_transaction(resolved, market, "sales", quantity, sale_price, fulfillment_date)
    # Record order and order item
    order_row = pd.DataFrame([{
        "customer_id": customer_id, "order_date": fulfillment_date,
        "status": "confirmed", "market": market, "total_amount": sale_price,
    }])
    order_row.to_sql("orders", db_engine, if_exists="append", index=False)
    order_id = int(pd.read_sql("SELECT last_insert_rowid() as id", db_engine).iloc[0]["id"])
    pd.DataFrame([{
        "order_id": order_id, "product_name": resolved, "quantity": quantity,
        "unit_price": unit_price, "discount_pct": discount * 100, "total_price": sale_price,
    }]).to_sql("order_items", db_engine, if_exists="append", index=False)
    # Award loyalty points: 1 point per $1
    points_earned = int(sale_price)
    update_loyalty_points(customer_id, points_earned)
    customer = get_customer_profile(customer_id)
    return (
        f"Order confirmed — '{resolved}' for {customer.get('name', 'Customer')} in {market}.\n"
        f"Quantity: {quantity} | Unit price: ${unit_price:.2f} | Discount: {int(discount*100)}%\n"
        f"Total: ${sale_price:.2f} | Fulfillment date: {fulfillment_date}\n"
        f"Loyalty points earned: {points_earned} pts "
        f"(total: {customer.get('loyalty_points', 0) + points_earned} pts)"
    )


@tool
def get_order_history(customer_id: int) -> str:
    """
    Retrieve the recent order history for a customer, including order status.

    Args:
        customer_id: The customer to look up.

    Returns:
        Formatted string listing recent orders and their status.
    """
    orders = pd.read_sql(
        "SELECT * FROM orders WHERE customer_id = :id ORDER BY order_date DESC LIMIT 10",
        db_engine, params={"id": customer_id},
    )
    if orders.empty:
        return f"No orders found for customer {customer_id}."
    customer = get_customer_profile(customer_id)
    lines = [f"Order history for {customer.get('name', 'Customer')}:"]
    for _, row in orders.iterrows():
        items = pd.read_sql(
            "SELECT product_name, quantity FROM order_items WHERE order_id = :id",
            db_engine, params={"id": int(row["id"])},
        )
        item_str = ", ".join(f"{r['product_name']} x{r['quantity']}" for _, r in items.iterrows())
        lines.append(
            f"  Order #{int(row['id'])} | {row['order_date']} | {row['market']} | "
            f"Status: {row['status']} | ${row['total_amount']:.2f} | {item_str}"
        )
    return "\n".join(lines)


# ============================================================
# TOOLS — SATISFACTION AGENT
# ============================================================

@tool
def get_loyalty_status(customer_id: int) -> str:
    """
    Get a customer's current loyalty tier, points balance, and progress to next tier.

    Args:
        customer_id: The customer to look up.

    Returns:
        Formatted loyalty status string.
    """
    customer = get_customer_profile(customer_id)
    if not customer:
        return f"Customer {customer_id} not found."
    points = customer["loyalty_points"]
    tier_info = get_points_to_next_tier(points)
    if tier_info["next_tier"]:
        progress = f"→ {tier_info['gap']} pts to reach {tier_info['next_tier']} tier"
    else:
        progress = "→ Maximum tier reached (Gold)"
    return (
        f"Loyalty Status — {customer['name']}\n"
        f"  Tier: {customer['loyalty_tier']} | Points: {points}\n"
        f"  {progress}"
    )


@tool
def award_loyalty_points(customer_id: int, points: int, reason: str) -> str:
    """
    Award loyalty points to a customer for a specific reason (goodwill, promotion, resolution).

    Args:
        customer_id: The customer to award points to.
        points: Number of points to award.
        reason: Plain-English reason for the award.

    Returns:
        Confirmation with new points total and tier.
    """
    result = update_loyalty_points(customer_id, points)
    customer = get_customer_profile(customer_id)
    return (
        f"Awarded {points} loyalty points to {customer.get('name', 'Customer')}.\n"
        f"Reason: {reason}\n"
        f"New total: {result.get('loyalty_points', 0)} pts | Tier: {result.get('loyalty_tier', 'Basic')}"
    )


@tool
def bridge_loyalty_tier(customer_id: int, reason: str) -> str:
    """
    Bridge a customer to the next loyalty tier if they are within 200 points of it.
    Used during returns or complaint resolution to prevent tier downgrade and reduce churn.

    Args:
        customer_id: The customer at risk of tier downgrade.
        reason: Context for the bridge (e.g., 'return processing', 'complaint resolution').

    Returns:
        Bridge result — whether the customer was bridged and their new tier status.
    """
    customer = get_customer_profile(customer_id)
    if not customer:
        return f"Customer {customer_id} not found."
    points = customer["loyalty_points"]
    tier_info = get_points_to_next_tier(points)
    if not tier_info["next_tier"]:
        return f"{customer['name']} is already at Gold (maximum) tier. No bridge needed."
    gap = tier_info["gap"]
    if gap <= 200:
        bridged = update_loyalty_points(customer_id, gap)
        return (
            f"Loyalty Bridge Applied for {customer['name']}!\n"
            f"Was: {points} pts ({tier_info['current_tier']}) | Gap to next: {gap} pts\n"
            f"Bridged {gap} pts → Now: {bridged['loyalty_points']} pts "
            f"({bridged['loyalty_tier']} tier)\n"
            f"Reason: {reason}"
        )
    else:
        return (
            f"No bridge applied for {customer['name']}.\n"
            f"Gap to {tier_info['next_tier']}: {gap} pts (bridge threshold is 200 pts).\n"
            f"Current: {points} pts ({tier_info['current_tier']} tier)"
        )


@tool
def log_csat_score(customer_id: int, score: int, comment: str, order_id: int, ticket_id: int, scored_date: str) -> str:
    """
    Log a CSAT (Customer Satisfaction) score. Score 1–5 where 5 = highly satisfied.
    Should be called after every customer interaction is resolved.
    Use order_id=0 if not order-related; use ticket_id=0 if not ticket-related.

    Args:
        customer_id: Customer being scored.
        score: CSAT score 1–5.
        comment: Brief explanation for the score.
        order_id: Related order ID (0 if none).
        ticket_id: Related ticket ID (0 if none).
        scored_date: ISO date string YYYY-MM-DD.

    Returns:
        Confirmation of logged CSAT with running average.
    """
    oid = order_id if order_id and order_id > 0 else None
    tid = ticket_id if ticket_id and ticket_id > 0 else None
    log_csat(customer_id, score, comment, order_id=oid, ticket_id=tid, scored_date=scored_date)
    # Compute running average for this customer
    avg_df = pd.read_sql(
        "SELECT AVG(score) as avg_score, COUNT(*) as count FROM csat_scores WHERE customer_id = :id",
        db_engine, params={"id": customer_id},
    )
    avg = float(avg_df["avg_score"].iloc[0]) if not avg_df.empty else score
    count = int(avg_df["count"].iloc[0]) if not avg_df.empty else 1
    customer = get_customer_profile(customer_id)
    return (
        f"CSAT score {score}/5 logged for {customer.get('name', 'Customer')}.\n"
        f"Comment: {comment}\n"
        f"Customer CSAT average: {avg:.1f}/5 across {count} interaction(s)"
    )


# ============================================================
# TOOLS — INSIGHT AGENT
# ============================================================

@tool
def detect_at_risk_orders(market: str, as_of_date: str) -> str:
    """
    Proactively scan recent orders for at-risk signals: delayed orders, repeated returns,
    or orders from markets with low stock. Returns a list of customers who may need
    proactive outreach before they complain.

    Args:
        market: Market to scan (or 'all' to scan all markets).
        as_of_date: ISO date string YYYY-MM-DD.

    Returns:
        Formatted report of at-risk customers and recommended actions.
    """
    if market.lower() == "all":
        orders = pd.read_sql(
            "SELECT * FROM orders WHERE order_date <= :d ORDER BY order_date DESC LIMIT 50",
            db_engine, params={"d": as_of_date},
        )
    else:
        orders = pd.read_sql(
            "SELECT * FROM orders WHERE market = :m AND order_date <= :d ORDER BY order_date DESC LIMIT 50",
            db_engine, params={"m": market, "d": as_of_date},
        )
    if orders.empty:
        return f"No recent orders found for {market}."
    at_risk = orders[orders["status"].isin(["delayed", "in_transit"])]
    lines = [f"Predictive Return Scan — {market} as of {as_of_date}:"]
    if at_risk.empty:
        lines.append("  No at-risk orders detected. All recent orders delivered on time.")
    else:
        lines.append(f"  {len(at_risk)} at-risk order(s) identified:")
        for _, row in at_risk.iterrows():
            customer = get_customer_profile(int(row["customer_id"]))
            lines.append(
                f"  ⚠ Order #{int(row['id'])} — Customer: {customer.get('name', 'Unknown')} "
                f"| Status: {row['status']} | Date: {row['order_date']} | "
                f"Market: {row['market']} | ${row['total_amount']:.2f}"
            )
        lines.append("\nRecommendation: Proactively contact these customers with status updates and goodwill gestures.")
    return "\n".join(lines)


@tool
def get_market_analytics(market: str, as_of_date: str) -> str:
    """
    Generate a market-level analytics summary: revenue, top products, stock levels, and CSAT.

    Args:
        market: Market to analyse.
        as_of_date: ISO date string YYYY-MM-DD.

    Returns:
        Analytics summary for the market.
    """
    revenue = pd.read_sql(
        "SELECT SUM(price) as total_revenue, SUM(units) as total_units FROM transactions "
        "WHERE market = :m AND transaction_type='sales' AND transaction_date <= :d",
        db_engine, params={"m": market, "d": as_of_date},
    )
    top_products = pd.read_sql(
        "SELECT product_name, SUM(units) as units, SUM(price) as revenue FROM transactions "
        "WHERE market=:m AND transaction_type='sales' AND transaction_date<=:d "
        "GROUP BY product_name ORDER BY revenue DESC LIMIT 3",
        db_engine, params={"m": market, "d": as_of_date},
    )
    orders_count = pd.read_sql(
        "SELECT COUNT(*) as count, status FROM orders WHERE market=:m GROUP BY status",
        db_engine, params={"m": market},
    )
    total_rev = float(revenue["total_revenue"].iloc[0] or 0)
    lines = [f"Market Analytics — {market} as of {as_of_date}:"]
    lines.append(f"  Total revenue: ${total_rev:,.2f}")
    if not top_products.empty:
        lines.append("  Top products:")
        for _, row in top_products.iterrows():
            lines.append(f"    - {row['product_name']}: {int(row['units'])} units, ${float(row['revenue']):.2f}")
    if not orders_count.empty:
        for _, row in orders_count.iterrows():
            lines.append(f"  Orders ({row['status']}): {int(row['count'])}")
    return "\n".join(lines)


@tool
def get_financial_summary(as_of_date: str) -> str:
    """
    Generate a global financial summary: cash balance, inventory value, total assets, top sellers.

    Args:
        as_of_date: ISO date string YYYY-MM-DD.

    Returns:
        Formatted financial summary string.
    """
    report = generate_financial_report(as_of_date)
    lines = [
        f"=== Cosmic Mart Financial Report — {as_of_date} ===",
        f"  Cash Balance:    ${report['cash_balance']:,.2f}",
        f"  Inventory Value: ${report['inventory_value']:,.2f}",
        f"  Total Assets:    ${report['total_assets']:,.2f}",
        "\n  Top Selling Products:",
    ]
    for p in report["top_selling_products"]:
        if p.get("product_name"):
            lines.append(
                f"    - {p['product_name']}: {int(p.get('total_units', 0))} units, "
                f"${float(p.get('total_revenue', 0)):.2f} revenue"
            )
    return "\n".join(lines)


# ============================================================
# BUILD AGENTS
# ============================================================

# Merge into 3 agents to match Munder Difflin's structure and stay within Vocareum token limits.

operations_agent = ToolCallingAgent(
    tools=[check_stock_by_market, check_all_market_inventory, reorder_product, fulfill_order, get_order_history],
    model=model,
    name="operations_agent",
    description="Handles inventory checks, stock reorders, and order fulfillment with bulk discounts. Pass product name, market, customer_id, and YYYY-MM-DD date.",
    max_steps=8,
)

customer_agent = ToolCallingAgent(
    tools=[check_return_eligibility, process_return, suggest_exchange, create_ticket, resolve_ticket, log_voc_signal],
    model=model,
    name="customer_agent",
    description="Handles returns (30-day window), smart exchanges, support tickets, and VOC signals from any channel (app/phone/email/social).",
    max_steps=8,
)

analytics_agent = ToolCallingAgent(
    tools=[get_loyalty_status, award_loyalty_points, bridge_loyalty_tier, log_csat_score, detect_at_risk_orders, get_market_analytics, get_financial_summary],
    model=model,
    name="analytics_agent",
    description="Manages loyalty points/tiers, logs CSAT scores (1-5), detects at-risk delayed orders, and produces market/financial analytics.",
    max_steps=8,
)

_product_list = "AstroSpeaker X3, Nebula Headphones, AstroGoggles V2, NovaSpeaker X12, StarPad Pro, CosmicCam 360, LunarLight LED Strip, GalaxySmart Watch, NebulaFit Band, AstroDock Hub"

orchestrator_agent = CodeAgent(
    tools=[],
    model=model,
    name="orchestrator_agent",
    managed_agents=[operations_agent, customer_agent, analytics_agent],
    description=(
        "Use the 'Date of request' YYYY-MM-DD for every agent call. "
        "Products: " + _product_list + ". "
        "Workflow: orders/stock → operations_agent; returns/complaints/VOC → customer_agent; loyalty/CSAT/analytics → analytics_agent. "
        "Always end with analytics_agent log_csat_score. Respond in plain English."
    ),
    max_steps=10,
)


# ============================================================
# TEST HARNESS
# ============================================================

def run_test_scenarios():
    print("Initializing Cosmic Mart database...")
    init_database(db_engine)

    try:
        scenarios = pd.read_csv("test_scenarios.csv")
        scenarios["request_date"] = pd.to_datetime(
            scenarios["request_date"], format="%m/%d/%y", errors="coerce"
        )
        scenarios.dropna(subset=["request_date"], inplace=True)
        scenarios = scenarios.sort_values("request_date")
    except Exception as e:
        print(f"FATAL: Error loading test scenarios: {e}")
        return

    initial_date = scenarios["request_date"].min().strftime("%Y-%m-%d")
    report = generate_financial_report(initial_date)
    current_cash = report["cash_balance"]
    current_inventory = report["inventory_value"]
    prev_cash = current_cash

    results = []
    for idx, row in scenarios.iterrows():
        request_date = row["request_date"].strftime("%Y-%m-%d")
        print(f"\n=== Scenario {idx + 1}: {row['scenario_type']} ===")
        print(f"Customer ID: {row['customer_id']} | Market: {row['market']}")
        print(f"Request Date: {request_date}")
        print(f"Cash Balance: ${current_cash:,.2f}")

        request_with_date = f"{row['request']} (Date of request: {request_date})"

        try:
            response = orchestrator_agent.run(request_with_date)
        except Exception as e:
            print(f"Error processing scenario: {e}")
            response = f"Error: {str(e)}"

        report = generate_financial_report(request_date)
        current_cash = report["cash_balance"]
        current_inventory = report["inventory_value"]
        cash_change = current_cash - prev_cash

        response_str = str(response)
        if any(w in response_str.lower() for w in ["cannot", "not available", "unable", "error"]):
            status = "escalated"
        elif cash_change > 0:
            status = "fulfilled"
        else:
            status = "resolved"

        print(f"Response: {response_str[:400]}")
        print(f"Updated Cash: ${current_cash:,.2f} | Cash Δ: ${cash_change:+.2f}")

        results.append({
            "scenario_id":    idx + 1,
            "request_date":   request_date,
            "scenario_type":  row["scenario_type"],
            "customer_id":    row["customer_id"],
            "market":         row["market"],
            "status":         status,
            "cash_balance":   round(current_cash, 2),
            "cash_change":    round(cash_change, 2),
            "inventory_value":round(current_inventory, 2),
            "response_summary": response_str[:600],
        })

        prev_cash = current_cash
        time.sleep(1)

    # Final report
    final_date = scenarios["request_date"].max().strftime("%Y-%m-%d")
    final_report = generate_financial_report(final_date)
    print("\n===== FINAL FINANCIAL REPORT =====")
    print(f"Cash:      ${final_report['cash_balance']:,.2f}")
    print(f"Inventory: ${final_report['inventory_value']:,.2f}")
    print(f"Assets:    ${final_report['total_assets']:,.2f}")

    pd.DataFrame(results).to_csv("test_results.csv", index=False)

    print("\n===== SCENARIO RESULTS SUMMARY =====")
    print(f"{'ID':<4} {'Date':<12} {'Type':<25} {'Market':<16} {'Status':<12} {'Cash Δ':>10}")
    print("-" * 82)
    for r in results:
        print(
            f"{r['scenario_id']:<4} "
            f"{r['request_date']:<12} "
            f"{r['scenario_type']:<25} "
            f"{r['market']:<16} "
            f"{r['status']:<12} "
            f"${r['cash_change']:>+8.2f}"
        )
    resolved = sum(1 for r in results if r["status"] in ("fulfilled", "resolved"))
    escalated = sum(1 for r in results if r["status"] == "escalated")
    print("-" * 82)
    print(f"Resolved/Fulfilled: {resolved} | Escalated: {escalated} | Total: {len(results)}")

    return results


if __name__ == "__main__":
    results = run_test_scenarios()
