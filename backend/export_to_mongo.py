"""
Export Agent 69 SQLite database directly into local MongoDB for MongoDB Compass.
"""
import os
import json
import sqlite3
from datetime import datetime
from pymongo import MongoClient

def export_sqlite_to_mongo(
    sqlite_path="backend/agent69.db",
    mongo_uri="mongodb://localhost:27017/",
    mongo_db_name="agent69_db",
    export_json_dir="backend/mongo_export"
):
    if not os.path.exists(sqlite_path):
        sqlite_path = "agent69.db"

    print(f"[*] Connecting to SQLite database at: {sqlite_path}")
    conn = sqlite3.connect(sqlite_path)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    # Get list of all tables
    cur.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
    tables = [row[0] for row in cur.fetchall()]
    print(f"[*] Found {len(tables)} tables: {', '.join(tables)}")

    # Connect to MongoDB
    print(f"[*] Connecting to MongoDB at: {mongo_uri}")
    client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    # Trigger connection check
    client.admin.command('ping')
    db = client[mongo_db_name]
    print(f"[OK] Successfully connected to MongoDB! Target database: '{mongo_db_name}'")

    os.makedirs(export_json_dir, exist_ok=True)
    summary = {}

    for table in tables:
        cur.execute(f"SELECT * FROM {table};")
        rows = cur.fetchall()
        
        records = []
        for r in rows:
            d = dict(r)
            # Parse JSON strings if columns contain json data
            for k, v in d.items():
                if isinstance(v, str) and (v.startswith('{') or v.startswith('[')):
                    try:
                        d[k] = json.loads(v)
                    except Exception:
                        pass
            records.append(d)

        # 1. Insert into MongoDB collection
        collection = db[table]
        # Drop previous collection if exists to ensure clean fresh sync
        collection.drop()
        if records:
            collection.insert_many(records)
        
        # 2. Also save as formatted JSON for manual import if needed
        json_file_path = os.path.join(export_json_dir, f"{table}.json")
        with open(json_file_path, "w", encoding="utf-8") as jf:
            json.dump(records, jf, indent=2, default=str)

        summary[table] = len(records)
        print(f"  -> Exported table '{table}': {len(records)} records synced to MongoDB collection & saved to {json_file_path}")

    print("\n[OK] MIGRATION COMPLETE!")
    print(f"[*] Database '{mongo_db_name}' is now fully populated in your local MongoDB.")
    print("[*] You can now open MongoDB Compass, connect to 'mongodb://localhost:27017', and browse 'agent69_db'!")
    return summary

if __name__ == "__main__":
    export_sqlite_to_mongo()
