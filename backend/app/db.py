"""
Turso (libSQL) database connection helper.

Usage:
    from backend.app.db import get_db, execute, query_one, query_all

    # Run a write
    execute("INSERT INTO users (email) VALUES (?)", [email])

    # Fetch one row as a dict
    user = query_one("SELECT * FROM users WHERE email = ?", [email])

    # Fetch all rows as dicts
    rows = query_all("SELECT * FROM usage_records WHERE user_id = ?", [uid])
"""

import os
import threading
import libsql_experimental as libsql

_local = threading.local()


def _connect() -> libsql.Connection:
    url = os.environ.get("TURSO_DB_URL", "")
    token = os.environ.get("TURSO_AUTH_TOKEN", "")
    if not url or not token:
        raise RuntimeError(
            "TURSO_DB_URL and TURSO_AUTH_TOKEN must be set in .env"
        )
    # Remote-only connection — no local replica needed for a web server
    return libsql.connect(url, auth_token=token)


def get_db() -> libsql.Connection:
    """Return a per-thread database connection (lazy-initialised)."""
    if not getattr(_local, "conn", None):
        _local.conn = _connect()
    return _local.conn


def execute(sql: str, params: list = None) -> None:
    """Run a write statement and commit."""
    db = get_db()
    db.execute(sql, tuple(params or []))
    db.commit()


def query_one(sql: str, params: list = None) -> dict | None:
    """Return the first matching row as a dict, or None."""
    db = get_db()
    cursor = db.execute(sql, tuple(params or []))
    row = cursor.fetchone()
    if row is None:
        return None
    cols = [d[0] for d in cursor.description]
    return dict(zip(cols, row))


def query_all(sql: str, params: list = None) -> list[dict]:
    """Return all matching rows as a list of dicts."""
    db = get_db()
    cursor = db.execute(sql, tuple(params or []))
    rows = cursor.fetchall()
    if not rows:
        return []
    cols = [d[0] for d in cursor.description]
    return [dict(zip(cols, row)) for row in rows]


def init_schema() -> None:
    """Create all tables if they don't already exist. Safe to call on every startup."""
    db = get_db()

    db.executescript("""
        -- Users (will be populated once auth is wired up)
        CREATE TABLE IF NOT EXISTS users (
            id            TEXT PRIMARY KEY,
            email         TEXT UNIQUE NOT NULL,
            display_name  TEXT,
            created_at    INTEGER NOT NULL DEFAULT (unixepoch()),
            last_login_at INTEGER
        );

        -- Subscriptions (synced from Stripe webhooks)
        CREATE TABLE IF NOT EXISTS subscriptions (
            id                      TEXT PRIMARY KEY,
            user_id                 TEXT NOT NULL REFERENCES users(id),
            stripe_customer_id      TEXT,
            stripe_subscription_id  TEXT UNIQUE,
            tier                    TEXT NOT NULL DEFAULT 'free',
            status                  TEXT NOT NULL DEFAULT 'active',
            current_period_start    INTEGER,
            current_period_end      INTEGER,
            updated_at              INTEGER NOT NULL DEFAULT (unixepoch())
        );

        -- Usage ledger (append-only)
        CREATE TABLE IF NOT EXISTS usage_records (
            id             INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id        TEXT NOT NULL REFERENCES users(id),
            created_at     INTEGER NOT NULL DEFAULT (unixepoch()),
            tokens_input   INTEGER NOT NULL DEFAULT 0,
            tokens_output  INTEGER NOT NULL DEFAULT 0,
            model          TEXT,
            endpoint       TEXT,
            cost_usd       REAL NOT NULL DEFAULT 0.0
        );

        -- Promo codes (stored as HMAC hashes — plaintext never saved)
        CREATE TABLE IF NOT EXISTS promo_codes (
            code_hash        TEXT PRIMARY KEY,
            tier             TEXT NOT NULL,
            max_uses         INTEGER NOT NULL DEFAULT 1,
            uses_remaining   INTEGER NOT NULL DEFAULT 1,
            expires_at       INTEGER,
            stripe_coupon_id TEXT,
            allowed_price_key TEXT,
            created_at       INTEGER NOT NULL DEFAULT (unixepoch())
        );

        -- Per-user promo redemption tracking (prevents stacking / re-redemption)
        CREATE TABLE IF NOT EXISTS promo_redemptions (
            user_id    TEXT NOT NULL,
            code_hash  TEXT NOT NULL,
            redeemed_at INTEGER NOT NULL DEFAULT (unixepoch()),
            PRIMARY KEY (user_id, code_hash)
        );

        -- Indexes for hot query paths
        CREATE INDEX IF NOT EXISTS idx_usage_user_time
            ON usage_records(user_id, created_at);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_user
            ON subscriptions(user_id);
    """)

    db.commit()

    # Migrations: add columns that didn't exist in earlier schema versions
    for migration_sql in [
        "ALTER TABLE promo_codes ADD COLUMN stripe_coupon_id TEXT",
        "ALTER TABLE promo_codes ADD COLUMN allowed_price_key TEXT",
    ]:
        try:
            db.execute(migration_sql)
            db.commit()
        except Exception:
            pass  # Column already exists — safe to ignore
