#!/usr/bin/env python3
"""Upsert linked monitoring discoveries into the dashboard's Turso database."""
import argparse, hashlib, json, sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from dotenv import load_dotenv
load_dotenv(ROOT / ".env")
from backend.app import db
from backend.app.monitor_ranking import score_story, story_key

def canonical_url(value):
    parts = urlsplit(str(value or "").strip())
    if parts.scheme not in {"http", "https"} or not parts.netloc:
        raise ValueError("Every monitor entry requires an http(s) URL")
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/") or "/", "", ""))

def normalize(raw, default_source):
    url = canonical_url(raw.get("url") or raw.get("permalink") or raw.get("externalHref"))
    source = str(raw.get("source") or default_source).strip() or default_source
    text = str(raw.get("text") or raw.get("excerpt") or raw.get("summary") or "").strip()
    evidence = str(raw.get("evidence_status") or raw.get("evidenceStatus") or "")
    computed_score, computed_reason = score_story(str(raw.get("title") or text.splitlines()[0][:140] or url), text, source, evidence)
    return {
        "id": "monitor:" + hashlib.sha256(url.encode()).hexdigest()[:24], "source": source,
        "source_label": str(raw.get("source_label") or raw.get("sourceLabel") or ("X Following" if source.startswith("x") else source)),
        "title": str(raw.get("title") or text.splitlines()[0][:140] or url)[:240], "excerpt": text[:2000], "url": url,
        "author": str(raw.get("author") or "")[:240], "published_at": str(raw.get("published_at") or raw.get("publishedAt") or raw.get("time") or ""),
        "observed_at": str(raw.get("observed_at") or raw.get("observedAt") or datetime.now(timezone.utc).isoformat()),
        "thread_context": str(raw.get("thread_context") or raw.get("threadContext") or "")[:8000],
        "tags_json": json.dumps(raw.get("tags") or [], ensure_ascii=False), "metadata_json": json.dumps(raw.get("metadata") or {}, ensure_ascii=False),
        "importance_score": float(raw.get("importance_score") or raw.get("importanceScore") or computed_score),
        "importance_reason": str(raw.get("importance_reason") or raw.get("importanceReason") or computed_reason),
        "story_key": str(raw.get("story_key") or raw.get("storyKey") or story_key(str(raw.get("title") or text), url)),
        "evidence_status": evidence,
    }

def main():
    parser = argparse.ArgumentParser(); parser.add_argument("--input", required=True); parser.add_argument("--source", default="x-following"); args = parser.parse_args()
    payload = json.loads(Path(args.input).read_text(encoding="utf-8")); rows = payload if isinstance(payload, list) else payload.get("entries") or payload.get("posts") or payload.get("items") or []
    db.init_schema(); written = 0; errors = []
    keys = ("id", "source", "source_label", "title", "excerpt", "url", "author", "published_at", "observed_at", "thread_context", "tags_json", "metadata_json", "importance_score", "importance_reason", "story_key", "evidence_status")
    for index, raw in enumerate(rows):
        try:
            item = normalize(raw, args.source)
            db.execute("""INSERT INTO monitor_entries (id,source,source_label,title,excerpt,url,author,published_at,observed_at,thread_context,tags_json,metadata_json,importance_score,importance_reason,story_key,evidence_status)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET source=excluded.source,source_label=excluded.source_label,title=excluded.title,
                excerpt=excluded.excerpt,author=excluded.author,published_at=excluded.published_at,observed_at=excluded.observed_at,
                thread_context=excluded.thread_context,tags_json=excluded.tags_json,metadata_json=excluded.metadata_json,
                importance_score=excluded.importance_score,importance_reason=excluded.importance_reason,story_key=excluded.story_key,
                evidence_status=excluded.evidence_status,updated_at=unixepoch()""", [item[key] for key in keys])
            written += 1
        except Exception as exc: errors.append({"index": index, "error": str(exc)})
    print(json.dumps({"received": len(rows), "written": written, "errors": errors}, ensure_ascii=False))
    if errors: raise SystemExit(1)

if __name__ == "__main__": main()
