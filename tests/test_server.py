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


def test_get_current_user_fast_mode_skips_remote_clerk_lookup(monkeypatch):
    def fail_verify(_token):
        raise AssertionError('remote clerk lookup should be skipped')

    monkeypatch.setattr(server, '_verify_clerk_token', fail_verify)
    with server.app.test_request_context(
        '/api/create-checkout-session',
        headers={'Authorization': 'Bearer fake-token'}
    ):
        user = server.get_current_user(allow_remote_clerk=False)
    assert user is None


def test_create_checkout_session_fast_auth_returns_401_without_remote_lookup(monkeypatch):
    def fail_verify(_token):
        raise AssertionError('remote clerk lookup should be skipped')

    monkeypatch.setattr(server, '_verify_clerk_token', fail_verify)
    client = server.app.test_client()
    response = client.post(
        '/api/create-checkout-session',
        json={'price_key': 'starter_monthly'},
        headers={'Authorization': 'Bearer fake-token'}
    )
    assert response.status_code == 401
