import json
import sqlite3

import pytest

import server
from backend.app import db as db_module


@pytest.fixture
def sqlite_db(monkeypatch):
    conn = sqlite3.connect(':memory:')
    conn.row_factory = sqlite3.Row
    conn.executescript(
        '''
        CREATE TABLE users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            display_name TEXT,
            created_at INTEGER NOT NULL DEFAULT 0,
            last_login_at INTEGER
        );
        CREATE TABLE subscriptions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT UNIQUE,
            tier TEXT NOT NULL DEFAULT 'free',
            status TEXT NOT NULL DEFAULT 'active',
            current_period_start INTEGER,
            current_period_end INTEGER,
            updated_at INTEGER NOT NULL DEFAULT 0
        );
        CREATE TABLE stripe_webhook_events (
            event_id TEXT PRIMARY KEY,
            event_type TEXT NOT NULL,
            livemode INTEGER NOT NULL DEFAULT 0,
            payload_json TEXT NOT NULL,
            processing_status TEXT NOT NULL DEFAULT 'pending',
            attempt_count INTEGER NOT NULL DEFAULT 0,
            received_at INTEGER NOT NULL DEFAULT 0,
            processed_at INTEGER,
            next_attempt_at INTEGER NOT NULL DEFAULT 0,
            last_error TEXT
        );
        '''
    )

    def execute(sql, params=None):
        conn.execute(sql, tuple(params or []))
        conn.commit()

    def query_one(sql, params=None):
        cur = conn.execute(sql, tuple(params or []))
        row = cur.fetchone()
        return dict(row) if row else None

    def query_all(sql, params=None):
        cur = conn.execute(sql, tuple(params or []))
        return [dict(row) for row in cur.fetchall()]

    monkeypatch.setattr(db_module, 'execute', execute)
    monkeypatch.setattr(db_module, 'query_one', query_one)
    monkeypatch.setattr(db_module, 'query_all', query_all)
    return conn


def _event(event_id, event_type, obj):
    return {
        'id': event_id,
        'type': event_type,
        'livemode': True,
        'data': {'object': obj},
    }


def test_stripe_webhook_invalid_signature_returns_400(monkeypatch, sqlite_db):
    monkeypatch.setattr(server, '_stripe_available', True)
    monkeypatch.setattr(server, 'STRIPE_WEBHOOK_SECRET', 'whsec_test')

    class DummyWebhook:
        @staticmethod
        def construct_event(payload, sig, secret):
            raise ValueError('invalid signature')

    class DummyStripe:
        Webhook = DummyWebhook

    monkeypatch.setattr(server, '_stripe_module', DummyStripe())
    client = server.app.test_client()
    response = client.post('/webhooks/stripe', data=b'{}', headers={'Stripe-Signature': 'bad'})

    assert response.status_code == 400


def test_stripe_webhook_valid_event_is_stored_idempotently(monkeypatch, sqlite_db):
    monkeypatch.setattr(server, '_stripe_available', True)
    monkeypatch.setattr(server, 'STRIPE_WEBHOOK_SECRET', 'whsec_test')
    monkeypatch.setattr(server, '_ensure_stripe_webhook_worker', lambda: None)
    event_payload = _event(
        'evt_checkout_1',
        'checkout.session.completed',
        {
            'metadata': {'user_id': 'user_1', 'price_key': 'starter_monthly'},
            'client_reference_id': 'user_1',
            'customer': 'cus_1',
            'subscription': 'sub_1',
            'customer_email': 'user1@example.com',
        },
    )

    class DummyWebhook:
        @staticmethod
        def construct_event(payload, sig, secret):
            return event_payload

    class DummyStripe:
        Webhook = DummyWebhook

    monkeypatch.setattr(server, '_stripe_module', DummyStripe())
    client = server.app.test_client()

    response1 = client.post('/webhooks/stripe', data=b'{}', headers={'Stripe-Signature': 'sig'})
    response2 = client.post('/webhooks/stripe', data=b'{}', headers={'Stripe-Signature': 'sig'})

    rows = db_module.query_all('SELECT * FROM stripe_webhook_events')
    assert response1.status_code == 200
    assert response2.status_code == 200
    assert len(rows) == 1
    assert rows[0]['event_id'] == 'evt_checkout_1'


def test_stripe_webhook_supported_event_is_processed_inline(monkeypatch, sqlite_db):
    monkeypatch.setattr(server, '_stripe_available', True)
    monkeypatch.setattr(server, 'STRIPE_WEBHOOK_SECRET', 'whsec_test')
    monkeypatch.setattr(server, 'STRIPE_PRICES', {'starter_monthly': 'price_starter_live'})
    event_payload = _event(
        'evt_checkout_inline',
        'checkout.session.completed',
        {
            'metadata': {'user_id': 'user_inline', 'price_key': 'starter_monthly'},
            'client_reference_id': 'user_inline',
            'customer': 'cus_inline',
            'subscription': 'sub_inline',
            'customer_email': 'inline@example.com',
        },
    )

    class DummyWebhook:
        @staticmethod
        def construct_event(payload, sig, secret):
            return event_payload

    class DummyStripe:
        Webhook = DummyWebhook

    monkeypatch.setattr(server, '_stripe_module', DummyStripe())
    client = server.app.test_client()

    response = client.post('/webhooks/stripe', data=b'{}', headers={'Stripe-Signature': 'sig'})

    event_row = db_module.query_one('SELECT * FROM stripe_webhook_events WHERE event_id=?', ('evt_checkout_inline',))
    subscription = db_module.query_one('SELECT * FROM subscriptions WHERE user_id=?', ('user_inline',))

    assert response.status_code == 200
    assert event_row['processing_status'] == server.STRIPE_WEBHOOK_STATUS_PROCESSED
    assert event_row['attempt_count'] == 1
    assert subscription['stripe_customer_id'] == 'cus_inline'
    assert subscription['stripe_subscription_id'] == 'sub_inline'
    assert subscription['tier'] == 'starter'


def test_checkout_session_completed_processing_maps_user_and_subscription(monkeypatch, sqlite_db):
    monkeypatch.setattr(server, 'STRIPE_PRICES', {'starter_monthly': 'price_starter_live'})
    db_module.execute(
        '''INSERT INTO stripe_webhook_events
           (event_id, event_type, livemode, payload_json, processing_status, attempt_count, next_attempt_at)
           VALUES (?,?,?,?,?,?,?)''',
        (
            'evt_checkout_map',
            'checkout.session.completed',
            1,
            json.dumps(_event(
                'evt_checkout_map',
                'checkout.session.completed',
                {
                    'metadata': {'user_id': 'user_checkout', 'price_key': 'starter_monthly'},
                    'client_reference_id': 'user_checkout',
                    'customer': 'cus_checkout',
                    'subscription': 'sub_checkout',
                    'customer_email': 'checkout@example.com',
                },
            )),
            server.STRIPE_WEBHOOK_STATUS_PENDING,
            0,
            0,
        ),
    )

    processed = server._drain_stripe_webhook_events(limit=10)
    sub = db_module.query_one('SELECT * FROM subscriptions WHERE user_id=?', ('user_checkout',))
    user = db_module.query_one('SELECT * FROM users WHERE id=?', ('user_checkout',))
    event_row = db_module.query_one('SELECT * FROM stripe_webhook_events WHERE event_id=?', ('evt_checkout_map',))

    assert processed == 1
    assert user['email'] == 'checkout@example.com'
    assert sub['stripe_customer_id'] == 'cus_checkout'
    assert sub['stripe_subscription_id'] == 'sub_checkout'
    assert sub['tier'] == 'starter'
    assert sub['status'] == 'active'
    assert event_row['processing_status'] == server.STRIPE_WEBHOOK_STATUS_PROCESSED


def test_subscription_updated_event_upserts_tier_status_and_periods(monkeypatch, sqlite_db):
    monkeypatch.setattr(server, 'STRIPE_PRICES', {'pro_monthly': 'price_pro_live'})
    server._apply_stripe_event(_event(
        'evt_sub_updated',
        'customer.subscription.updated',
        {
            'id': 'sub_live_123',
            'customer': 'cus_live_123',
            'status': 'active',
            'current_period_start': 111,
            'current_period_end': 222,
            'metadata': {'user_id': 'user_sub_1', 'price_key': 'pro_monthly'},
            'items': {'data': [{'price': {'id': 'price_pro_live'}}]},
        },
    ))

    sub = db_module.query_one('SELECT * FROM subscriptions WHERE stripe_subscription_id=?', ('sub_live_123',))
    assert sub['user_id'] == 'user_sub_1'
    assert sub['tier'] == 'pro'
    assert sub['status'] == 'active'
    assert sub['current_period_start'] == 111
    assert sub['current_period_end'] == 222


def test_unknown_valid_event_is_marked_ignored(monkeypatch, sqlite_db):
    db_module.execute(
        '''INSERT INTO stripe_webhook_events
           (event_id, event_type, livemode, payload_json, processing_status, attempt_count, next_attempt_at)
           VALUES (?,?,?,?,?,?,?)''',
        (
            'evt_unknown',
            'charge.succeeded',
            1,
            json.dumps(_event('evt_unknown', 'charge.succeeded', {'id': 'ch_1'})),
            server.STRIPE_WEBHOOK_STATUS_PENDING,
            0,
            0,
        ),
    )

    processed = server._drain_stripe_webhook_events(limit=10)
    event_row = db_module.query_one('SELECT * FROM stripe_webhook_events WHERE event_id=?', ('evt_unknown',))

    assert processed == 1
    assert event_row['processing_status'] == server.STRIPE_WEBHOOK_STATUS_IGNORED


def test_processing_failure_is_retryable_and_does_not_break_ack(monkeypatch, sqlite_db):
    monkeypatch.setattr(server, '_stripe_available', True)
    monkeypatch.setattr(server, 'STRIPE_WEBHOOK_SECRET', 'whsec_test')
    monkeypatch.setattr(server, '_ensure_stripe_webhook_worker', lambda: None)
    event_payload = _event(
        'evt_subscription_missing_user',
        'customer.subscription.updated',
        {
            'id': 'sub_missing',
            'customer': 'cus_missing',
            'status': 'active',
            'items': {'data': [{'price': {'id': 'price_missing'}}]},
            'metadata': {},
        },
    )

    class DummyWebhook:
        @staticmethod
        def construct_event(payload, sig, secret):
            return event_payload

    class DummyStripe:
        Webhook = DummyWebhook

    monkeypatch.setattr(server, '_stripe_module', DummyStripe())
    client = server.app.test_client()
    response = client.post('/webhooks/stripe', data=b'{}', headers={'Stripe-Signature': 'sig'})

    processed = server._drain_stripe_webhook_events(limit=10)
    event_row = db_module.query_one('SELECT * FROM stripe_webhook_events WHERE event_id=?', ('evt_subscription_missing_user',))

    assert response.status_code == 200
    assert processed == 0
    assert event_row['processing_status'] == server.STRIPE_WEBHOOK_STATUS_FAILED
    assert event_row['attempt_count'] == 1
    assert 'Unable to resolve user_id' in event_row['last_error']
