#!/usr/bin/env python3
import argparse
import json
import os
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


def _iter_event_files(single_event_file: str | None, spool_dir: str):
    if single_event_file:
        path = Path(single_event_file)
        if path.exists():
            yield path
        return
    spool_path = Path(spool_dir)
    if not spool_path.exists():
        return
    for path in sorted(spool_path.glob('*.json')):
        if path.is_file():
            yield path


def main() -> int:
    parser = argparse.ArgumentParser(description='Process spooled Stripe webhook events.')
    parser.add_argument('--event-file', help='Process exactly one spooled event file.')
    parser.add_argument('--spool-dir', help='Override the spool directory.')
    args = parser.parse_args()

    import server
    from backend.app import db as db_module

    spool_dir = args.spool_dir or server.STRIPE_WEBHOOK_SPOOL_DIR
    exit_code = 0

    for path in _iter_event_files(args.event_file, spool_dir):
        try:
            payload = json.loads(path.read_text(encoding='utf-8'))
            result = server._store_and_process_stripe_webhook_event(payload, process_inline=True)
            event_id = result.get('event_id') or ''
            row = db_module.query_one(
                'SELECT processing_status FROM stripe_webhook_events WHERE event_id=?',
                (event_id,),
            ) if event_id else None
            status = (row or {}).get('processing_status')
            if status in {server.STRIPE_WEBHOOK_STATUS_PROCESSED, server.STRIPE_WEBHOOK_STATUS_IGNORED}:
                path.unlink(missing_ok=True)
            else:
                exit_code = 1
        except Exception as exc:
            print(f'Failed to process {path}: {exc}', file=sys.stderr)
            exit_code = 1

    return exit_code


if __name__ == '__main__':
    raise SystemExit(main())
