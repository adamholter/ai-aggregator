import json
import os

import pytest

import server


def test_health_endpoint():
    client = server.app.test_client()
    response = client.get('/api/health')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['status'] == 'healthy'
    assert 'timestamp' in payload


def test_usage_endpoint_has_content():
    client = server.app.test_client()
    response = client.get('/usage')
    assert response.status_code == 200
    assert 'Usage Dashboard' in response.get_data(as_text=True)


def test_testing_catalog_history_loaded():
    history = server._load_testing_catalog_history()
    assert isinstance(history, list)
    history_path = os.path.join(server.BASE_DIR, 'logs', 'testing_catalog_history.json')
    assert os.path.isfile(history_path)
    with open(history_path, 'r', encoding='utf-8') as handle:
        raw = json.load(handle)
    assert history == raw
    assert all('url' in entry for entry in history)


def test_checkout_fast_user_from_session_email():
    with server.app.test_request_context('/'):
        server.session['user_email'] = 'user@example.com'
        user = server._get_current_user_for_checkout()
    assert user == {'id': 'user@example.com', 'email': 'user@example.com'}


def test_checkout_fast_user_from_session_clerk_id():
    with server.app.test_request_context('/'):
        server.session['clerk_id'] = 'user_abc123'
        user = server._get_current_user_for_checkout()
    assert user == {'id': 'user_abc123', 'email': ''}


def test_checkout_fast_user_from_bearer_token(monkeypatch):
    monkeypatch.setattr(server, 'CLERK_SECRET_KEY', 'clerk_test_secret')

    def fake_verify(token):
        assert token == 'token-123'
        return {
            'clerk_id': 'user_from_token',
            '_raw': {'email': 'token@example.com'},
        }

    monkeypatch.setattr(server, '_verify_clerk_token', fake_verify)

    with server.app.test_request_context('/', headers={'Authorization': 'Bearer token-123'}):
        user = server._get_current_user_for_checkout()
        assert user == {'id': 'user_from_token', 'email': 'token@example.com'}
        assert server.session.get('clerk_id') == 'user_from_token'
        assert server.session.get('user_email') == 'token@example.com'


def test_create_checkout_session_skips_remote_clerk_lookup(monkeypatch):
    def fail_verify(_token):
        raise AssertionError('remote clerk lookup should be skipped for checkout')

    monkeypatch.setattr(server, '_verify_clerk_token', fail_verify)
    client = server.app.test_client()
    with client.session_transaction() as sess:
        sess['clerk_id'] = 'user_fast_auth'

    response = client.post(
        '/api/create-checkout-session',
        json={'price_key': 'starter_monthly'},
        headers={'Authorization': 'Bearer fake-token'}
    )
    # Primary assertion is no remote clerk lookup path (would raise AssertionError via monkeypatch).
    assert response.status_code in (200, 400, 401, 503)
