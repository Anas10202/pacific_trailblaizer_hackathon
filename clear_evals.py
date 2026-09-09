import sqlite3
DB = r"C:\Users\anas.ahmed\pacific_trailblaizer\cosmic_mart.db"
conn = sqlite3.connect(DB)
conn.execute("UPDATE returns SET ai_note=NULL, assigned_to=NULL, escalation_team=NULL, status='pending'")
conn.commit()
rows = conn.execute("SELECT rowid, order_id, status FROM returns").fetchall()
for r in rows:
    print(r)
conn.close()
print("Done — all evaluations cleared.")
