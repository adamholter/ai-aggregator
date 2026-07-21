#!/usr/bin/env python3
"""One-time migration of the linked legacy Monitor sheet into Turso."""
import hashlib, json, os, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
import requests
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT)); load_dotenv(ROOT / ".env")
import server
from backend.app import db
from backend.app.monitor_ranking import score_story, story_key

SQL = """INSERT INTO monitor_entries (id,source,source_label,title,excerpt,url,author,published_at,observed_at,thread_context,tags_json,metadata_json,importance_score,importance_reason,story_key,evidence_status)
VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET title=excluded.title,excerpt=excluded.excerpt,published_at=excluded.published_at,
importance_score=excluded.importance_score,importance_reason=excluded.importance_reason,story_key=excluded.story_key,updated_at=unixepoch()"""

def arg(value):
    return {"type": "text", "value": str(value or "")}

def main():
    db.init_schema()
    raw = server._fetch_monitor_rows(True)[1:]
    records, skipped = [], 0
    now = datetime.now(timezone.utc).isoformat()
    for row_number, row in enumerate(raw, start=2):
        if len(row) < 2: skipped += 1; continue
        published, title, url = (row + ["", "", ""])[:3]
        excerpt = row[3] if len(row) > 3 else ""
        parts = urlsplit(str(url).strip())
        archived_without_original = parts.scheme not in {"http", "https"} or not parts.netloc
        if archived_without_original:
            url = f"https://docs.google.com/spreadsheets/d/{server.MONITOR_SHEET_ID}/edit#gid={server.MONITOR_SHEET_GID}&range=A{row_number}:D{row_number}"
        score, reason = score_story(title, excerpt, "legacy-monitor", "historical")
        values = ["monitor:" + hashlib.sha256(url.encode()).hexdigest()[:24], "legacy-monitor", "Monitor Archive", title or "Monitor Update", excerpt,
                  url, "", published, published or now, "", "[]", json.dumps({"migrated_from": "legacy-monitor-sheet", "archive_link": archived_without_original, "original_url_missing": archived_without_original}), score, reason,
                  story_key(title, url), "historical"]
        records.append({"type": "execute", "stmt": {"sql": SQL, "args": [arg(value) for value in values]}})
    origin = os.environ["TURSO_DB_URL"].replace("libsql://", "https://", 1).rstrip("/")
    headers = {"Authorization": f"Bearer {os.environ['TURSO_AUTH_TOKEN']}", "Content-Type": "application/json"}
    written = 0
    for start in range(0, len(records), 50):
        batch = records[start:start + 50]
        response = requests.post(f"{origin}/v2/pipeline", headers=headers, json={"requests": batch + [{"type": "close"}]}, timeout=30)
        response.raise_for_status(); written += len(batch)
    print(json.dumps({"legacy_rows": len(raw), "written": written, "skipped": skipped}))

if __name__ == "__main__": main()
