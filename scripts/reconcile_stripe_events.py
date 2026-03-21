#!/usr/bin/env python3

import argparse
from datetime import datetime, timezone

import server


def _parse_timestamp(value: str) -> datetime:
    raw = (value or '').strip()
    if not raw:
        raise ValueError('timestamp is required')
    if raw.endswith('Z'):
        raw = raw[:-1] + '+00:00'
    parsed = datetime.fromisoformat(raw)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def main() -> int:
    parser = argparse.ArgumentParser(description='Replay or backfill Stripe webhook events into the durable inbox.')
    parser.add_argument('--process-pending', action='store_true', help='Drain pending/failed stored webhook events.')
    parser.add_argument('--backfill-since', help='Backfill Stripe live events created at or after this ISO8601 timestamp.')
    parser.add_argument('--limit', type=int, default=100, help='Batch size / Stripe list page size.')
    parser.add_argument('--dry-run', action='store_true', help='Show what would run without mutating state.')
    args = parser.parse_args()

    summary = {
        'processed_pending': 0,
        'backfill_collected': 0,
        'backfill_inserted': 0,
        'dry_run': bool(args.dry_run),
    }

    if args.backfill_since:
        started_at = _parse_timestamp(args.backfill_since)
        backfill = server._backfill_stripe_events_from(started_at, limit=args.limit, dry_run=args.dry_run)
        summary['backfill_collected'] = backfill['collected']
        summary['backfill_inserted'] = backfill['inserted']

    if args.process_pending:
        summary['processed_pending'] = server._drain_stripe_webhook_events(limit=args.limit, dry_run=args.dry_run)

    print(summary)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
