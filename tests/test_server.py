import json
import os

import pytest
import requests

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


def test_checkout_fast_user_from_x_clerk_authorization(monkeypatch):
    monkeypatch.setattr(server, 'CLERK_SECRET_KEY', 'clerk_test_secret')

    def fake_verify(token):
        assert token == 'token-x-clerk'
        return {
            'clerk_id': 'user_from_x_header',
            '_raw': {'email': 'xheader@example.com'},
        }

    monkeypatch.setattr(server, '_verify_clerk_token', fake_verify)

    with server.app.test_request_context('/', headers={'X-Clerk-Authorization': 'Bearer token-x-clerk'}):
        user = server._get_current_user_for_checkout()
        assert user == {'id': 'user_from_x_header', 'email': 'xheader@example.com'}
        assert server.session.get('clerk_id') == 'user_from_x_header'
        assert server.session.get('user_email') == 'xheader@example.com'


def test_get_current_user_fast_from_session_clerk_id():
    with server.app.test_request_context('/'):
        server.session['clerk_id'] = 'user_session_only'
        server.session['user_email'] = 'session@example.com'
        user = server.get_current_user()
    assert user == {
        'id': 'user_session_only',
        'email': 'session@example.com',
        '_skip_billing_lookup': True,
    }


def test_get_current_user_from_verified_token_skips_upsert(monkeypatch):
    monkeypatch.setattr(server, 'CLERK_SECRET_KEY', 'clerk_test_secret')

    def fake_verify(token):
        assert token == 'token-fast'
        return {
            'clerk_id': 'user_token_only',
            '_raw': {'email': 'tokenonly@example.com'},
        }

    def fail_get_user(_clerk_id):
        raise AssertionError('Clerk profile lookup should be skipped')

    def fail_upsert(_clerk_user):
        raise AssertionError('Clerk upsert should be skipped')

    monkeypatch.setattr(server, '_verify_clerk_token', fake_verify)
    monkeypatch.setattr(server, '_get_clerk_user', fail_get_user)
    monkeypatch.setattr(server, '_upsert_clerk_user', fail_upsert)

    with server.app.test_request_context('/', headers={'Authorization': 'Bearer token-fast'}):
        user = server.get_current_user()
    assert user == {
        'id': 'user_token_only',
        'email': 'tokenonly@example.com',
        '_skip_billing_lookup': True,
    }


def test_auth_clerk_sync_sets_session_without_upsert(monkeypatch):
    monkeypatch.setattr(server, 'CLERK_SECRET_KEY', 'clerk_test_secret')

    def fake_verify(token):
        assert token == 'sync-token'
        return {
            'clerk_id': 'user_sync',
            '_raw': {'email': 'sync@example.com'},
        }

    def fail_get_user(_clerk_id):
        raise AssertionError('Clerk profile lookup should be skipped')

    def fail_upsert(_clerk_user):
        raise AssertionError('Clerk upsert should be skipped')

    monkeypatch.setattr(server, '_verify_clerk_token', fake_verify)
    monkeypatch.setattr(server, '_get_clerk_user', fail_get_user)
    monkeypatch.setattr(server, '_upsert_clerk_user', fail_upsert)

    client = server.app.test_client()
    response = client.post(
        '/auth/clerk-sync',
        json={'token': 'sync-token'},
        headers={'Authorization': 'Bearer sync-token'}
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['user'] == {'id': 'user_sync', 'email': 'sync@example.com'}
    with client.session_transaction() as sess:
        assert sess['clerk_id'] == 'user_sync'
        assert sess['user_email'] == 'sync@example.com'


def test_auth_clerk_sync_accepts_x_clerk_authorization(monkeypatch):
    monkeypatch.setattr(server, 'CLERK_SECRET_KEY', 'clerk_test_secret')

    def fake_verify(token):
        assert token == 'sync-token-x'
        return {
            'clerk_id': 'user_sync_x',
            '_raw': {'email': 'syncx@example.com'},
        }

    monkeypatch.setattr(server, '_verify_clerk_token', fake_verify)

    client = server.app.test_client()
    response = client.post(
        '/auth/clerk-sync',
        json={},
        headers={'X-Clerk-Authorization': 'Bearer sync-token-x'}
    )

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['user'] == {'id': 'user_sync_x', 'email': 'syncx@example.com'}


def test_require_user_openrouter_token_prefers_explicit_provider_header_over_clerk_auth(monkeypatch):
    with server.app.test_request_context(
        '/',
        headers={
            'X-OpenRouter-Key': 'or-key-123',
            'X-Clerk-Authorization': 'Bearer clerk-token',
        },
    ):
        token, is_server_key, user_id = server.require_user_openrouter_token()

    assert token == 'or-key-123'
    assert is_server_key is False
    assert user_id is None


def test_require_user_openrouter_token_uses_server_key_for_paid_user_without_personal_key(monkeypatch):
    monkeypatch.setattr(server, 'SERVER_OPENROUTER_KEY', 'server-key-123')
    monkeypatch.setattr(server, 'get_current_user', lambda: {'id': 'user_paid', 'email': 'paid@example.com'})
    monkeypatch.setattr(server, '_get_user_subscription', lambda _user_id: {'tier': 'pro', 'status': 'active'})
    monkeypatch.setattr(server, '_get_monthly_usage_cost', lambda _user_id: 1.25)

    with server.app.test_request_context('/', headers={'X-Clerk-Authorization': 'Bearer clerk-token'}):
        token, is_server_key, user_id = server.require_user_openrouter_token()

    assert token == 'server-key-123'
    assert is_server_key is True
    assert user_id == 'user_paid'


def test_agent_v2_chat_returns_typed_402_for_missing_paid_plan(monkeypatch):
    def fake_require():
        raise server.MissingOpenRouterKeyError(
            'No paid plan with server-side OpenRouter access is active on this account. Add your own OpenRouter key or upgrade.',
            code='no_paid_plan',
        )

    monkeypatch.setattr(server, 'require_user_openrouter_token', fake_require)
    client = server.app.test_client()

    response = client.post(
        '/api/agent-v2/chat',
        json={
            'messages': [{'role': 'user', 'content': 'hello'}],
            'settings': {},
        },
    )

    assert response.status_code == 402
    payload = response.get_json()
    assert payload['code'] == 'no_paid_plan'


def test_create_checkout_session_includes_subscription_metadata(monkeypatch):
    monkeypatch.setattr(server, '_stripe_available', True)
    monkeypatch.setattr(server, 'STRIPE_SECRET_KEY', 'sk_live_test')
    monkeypatch.setattr(server, 'STRIPE_PRICES', {'starter_monthly': 'price_live_123'})
    monkeypatch.setattr(server, '_get_current_user_for_checkout', lambda: {'id': 'user_checkout', 'email': 'checkout@example.com'})

    captured = {}

    class DummyCheckout:
        url = 'https://checkout.stripe.test/session'

    class DummySession:
        @staticmethod
        def create(**kwargs):
            captured.update(kwargs)
            return DummyCheckout()

    class DummyCheckoutAPI:
        Session = DummySession

    class DummyStripe:
        checkout = DummyCheckoutAPI()

    monkeypatch.setattr(server, '_stripe_module', DummyStripe())

    client = server.app.test_client()
    response = client.post('/api/create-checkout-session', json={'price_key': 'starter_monthly'})

    assert response.status_code == 200
    assert captured['metadata'] == {'user_id': 'user_checkout', 'price_key': 'starter_monthly'}
    assert captured['subscription_data']['metadata'] == {'user_id': 'user_checkout', 'price_key': 'starter_monthly'}


def test_api_me_for_clerk_session_skips_billing_lookup(monkeypatch):
    def fail_get_user_subscription(_user_id):
        raise AssertionError('subscription lookup should be skipped')

    def fail_get_monthly_usage_cost(_user_id):
        raise AssertionError('usage lookup should be skipped')

    monkeypatch.setattr(server, '_get_user_subscription', fail_get_user_subscription)
    monkeypatch.setattr(server, '_get_monthly_usage_cost', fail_get_monthly_usage_cost)

    client = server.app.test_client()
    with client.session_transaction() as sess:
        sess['clerk_id'] = 'user_clerk_fast'

    response = client.get('/api/me')

    assert response.status_code == 200
    payload = response.get_json()
    assert payload['authenticated'] is True
    assert payload['user']['id'] == 'user_clerk_fast'
    assert payload['user']['subscription'] == {
        'tier': 'free',
        'status': 'active',
        'current_period_end': None,
        'credit_limit': 0.0,
        'credit_used': 0.0,
        'credit_remaining': 0.0,
    }


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


def test_format_fal_pricing_summary_supports_structured_pricing():
    summary = server.format_fal_pricing_summary({
        'unit_price': 0.025,
        'unit': 'megapixels',
        'currency': 'USD',
    })

    assert summary == '$0.0250 / megapixels'


def test_get_fal_models_enriches_pricing_from_fal_pricing_api(monkeypatch):
    server.cache.clear()
    monkeypatch.setattr(server, 'FAL_API_KEY', 'fal_test_key')
    monkeypatch.setattr(server, 'FAL_MODELS_MAX_PAGES', 2)

    class DummyResponse:
        def __init__(self, payload, status_code=200):
            self._payload = payload
            self.status_code = status_code

        def raise_for_status(self):
            if self.status_code >= 400:
                raise requests.exceptions.HTTPError(f'{self.status_code} error')

        def json(self):
            return self._payload

    calls = []

    def fake_get(url, params=None, headers=None, timeout=None):
        calls.append({'url': url, 'params': params, 'headers': headers, 'timeout': timeout})
        if url.startswith('https://fal.ai/api/models'):
            if 'page=1' in url:
                return DummyResponse({
                    'items': [
                        {
                            'id': 'fal-ai/flux/dev',
                            'title': 'FLUX Dev',
                            'category': 'text-to-image',
                            'shortDescription': 'Image model',
                            'tags': ['image'],
                            'date': '2026-03-20T12:00:00Z',
                            'licenseType': 'commercial',
                            'modelUrl': 'https://fal.run/fal-ai/flux/dev',
                            'thumbnailUrl': 'https://example.com/thumb.jpg',
                            'group': {'name': 'Flux'},
                            'pricingInfoOverride': '$0.10 per request',
                            'highlighted': True,
                            'creditsRequired': 3,
                            'durationEstimate': 9,
                        }
                    ]
                })
            return DummyResponse({'items': []})
        if url == server.FAL_PRICING_API_URL:
            assert headers == {'Authorization': 'Key fal_test_key'}
            assert params == [('endpoint_id', 'fal-ai/flux/dev')]
            return DummyResponse({
                'prices': [
                    {
                        'endpoint_id': 'fal-ai/flux/dev',
                        'unit_price': 0.025,
                        'unit': 'megapixels',
                        'currency': 'USD',
                    }
                ]
            })
        raise AssertionError(f'unexpected URL {url}')

    monkeypatch.setattr(server.requests, 'get', fake_get)

    client = server.app.test_client()
    response = client.get('/api/fal-models?cache_bust=true&limit=1')

    assert response.status_code == 200
    payload = response.get_json()
    assert len(payload) == 1
    assert payload[0]['pricing'] == {
        'source': 'fal_pricing_api',
        'endpoint_id': 'fal-ai/flux/dev',
        'unit_price': 0.025,
        'unit': 'megapixels',
        'currency': 'USD',
        'summary': '$0.0250 / megapixels',
        'legacy_text': '$0.10 per request',
    }
    assert any(call['url'] == server.FAL_PRICING_API_URL for call in calls)


def test_fetch_fal_pricing_map_accepts_legacy_fal_key_env(monkeypatch):
    monkeypatch.setattr(server, 'FAL_API_KEY', '')
    monkeypatch.delenv('FAL_API_KEY', raising=False)
    monkeypatch.setenv('FAL_KEY', 'legacy_fal_key')

    class DummyResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                'prices': [
                    {
                        'endpoint_id': 'fal-ai/example',
                        'unit_price': 0.01,
                        'unit': 'requests',
                        'currency': 'USD',
                    }
                ]
            }

    captured = {}

    def fake_get(url, params=None, headers=None, timeout=None):
        captured['url'] = url
        captured['params'] = params
        captured['headers'] = headers
        captured['timeout'] = timeout
        return DummyResponse()

    monkeypatch.setattr(server.requests, 'get', fake_get)

    pricing_map = server._fetch_fal_pricing_map(['fal-ai/example'])

    assert pricing_map['fal-ai/example']['unit_price'] == 0.01
    assert captured['url'] == server.FAL_PRICING_API_URL
    assert captured['headers'] == {'Authorization': 'Key legacy_fal_key'}
