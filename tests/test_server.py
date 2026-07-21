import json
import os

import pytest
import requests

import server
from backend.app.services.models_dev import flatten_models_dev


def test_recency_filter_excludes_undated_and_old_records():
    items = [
        {'id': 'fresh', 'created_at': server.datetime.utcnow().isoformat()},
        {'id': 'old', 'created_at': '2020-01-01T00:00:00Z'},
        {'id': 'unknown'},
    ]

    assert [item['id'] for item in server.filter_items_by_recency(items, 'day')] == ['fresh']
    assert server.filter_items_by_recency(items, None) == items


def test_simple_category_loader_does_not_silently_substitute_fallback(monkeypatch):
    monkeypatch.setattr(server, 'resolve_category_config', lambda category: (category, {'source': 'test'}))
    monkeypatch.setattr(server, 'load_category_payload', lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError('upstream failed')))
    monkeypatch.setattr(server, 'load_category_fallback', lambda category: [{'id': 'cached'}])

    assert server.load_category_items_simple('fal') == []
    explicit = server.load_category_items_simple('fal', allow_fallback=True)
    assert explicit == [{'id': 'cached', '_provenance': {'mode': 'fallback', 'category': 'fal'}}]


def test_life_agent_never_returns_a_canned_patch_without_provider_access(monkeypatch):
    monkeypatch.setattr(server, 'SERVER_OPENROUTER_KEY', '')
    monkeypatch.setattr(server, 'OPENROUTER_API_KEY', '')
    client = server.app.test_client()

    response = client.post('/api/life-agent', json={'prompt': 'invent any arbitrary rule'})

    assert response.status_code == 401
    assert response.get_json() == {
        'error': 'OpenRouter access is required to generate a proposal.',
        'code': 'missing_openrouter_key',
    }


def test_health_endpoint():
    client = server.app.test_client()
    response = client.get('/api/health')
    assert response.status_code == 200
    payload = response.get_json()
    assert payload['status'] == 'healthy'
    assert 'timestamp' in payload


def test_hype_feed_balances_sources_and_adds_hacker_news(monkeypatch):
    class FakeResponse:
        def __init__(self, payload):
            self._payload = payload
            self.status_code = 200

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    calls = []

    def fake_get(url, headers=None, params=None, timeout=None):
        calls.append((url, params or {}))
        if 'hn.algolia.com' in url:
            return FakeResponse({'hits': [{
                'objectID': '42', 'title': 'A new AI model', 'points': 91,
                'author': 'hn-user', 'created_at': '2026-07-15T12:00:00Z'
            }]})
        source = (params or {}).get('source', '')
        if 'replicate' in source:
            count = int((params or {}).get('limit', 30))
            return FakeResponse([{'name': f'Replicate {index}', 'url': f'https://replicate.com/{index}', 'stars': 1000 - index, 'source': 'replicate'} for index in range(count)])
        if 'github' in source:
            return FakeResponse([{'name': 'GitHub item', 'url': 'https://github.com/example/item', 'stars': 50, 'source': 'github'}])
        if 'reddit' in source:
            return FakeResponse([{'name': 'Reddit item', 'url': 'https://reddit.com/r/LocalLLaMA/1', 'stars': 40, 'source': 'reddit'}])
        return FakeResponse([])

    monkeypatch.setattr(server, 'HYPE_SUPABASE_API_KEY', 'test')
    monkeypatch.setattr(server, 'HYPE_SUPABASE_BEARER', 'test')
    monkeypatch.setattr(server, 'HYPE_SUPABASE_SOURCES', 'github,reddit,replicate')
    monkeypatch.setattr(server.requests, 'get', fake_get)

    payload = server.fetch_hype_feed_payload(limit=20, window_days=14)

    assert {item['source'] for item in payload['items']} >= {'github', 'reddit', 'replicate', 'hackernews'}
    assert payload['meta']['retrieval'] == 'balanced-per-source'
    assert payload['meta']['source_counts']['replicate'] <= 5
    assert any('hn.algolia.com' in url for url, _ in calls)


def test_usage_endpoint_has_content():
    client = server.app.test_client()
    response = client.get('/usage')
    assert response.status_code == 200
    assert 'Usage Dashboard' in response.get_data(as_text=True)


def test_monitor_log_row_builds_feed_cards():
    row = [
        '2026-07-06T18:37:09.126Z',
        'google/gemini-3.1-flash-lite-preview',
        '0.8',
        'TRUE',
        'ai',
        '100',
        '12,60',
        (
            '- Anthropic released research on J-Space for Claude reasoning.\n'
            '- GPT-5.6 Sol: leaks suggest a release on Codex and Cerebras.\n'
            '\nSUMMARY: Broader context.'
        ),
    ]

    entries = server._build_monitor_log_entries(row)

    assert len(entries) == 2
    assert entries[0]['timestamp'] == '2026-07-06T18:37:09Z'
    assert entries[0]['source_label'] == 'X Feed Summary'
    assert entries[0]['title'] == 'Anthropic released research on J-Space for Claude reasoning.'
    assert entries[1]['title'] == 'GPT-5.6 Sol'
    assert 'Codex and Cerebras' in entries[1]['excerpt']


def test_database_monitor_entries_are_linked(monkeypatch):
    from backend.app import db
    monkeypatch.setattr(db, 'query_all_http', lambda *args, **kwargs: [{
        'id': 'monitor:abc', 'source': 'x-following', 'source_label': 'X Following',
        'title': 'A useful model release', 'excerpt': 'Details', 'url': 'https://x.com/a/status/1',
        'author': 'A', 'published_at': '2026-07-11T12:00:00Z', 'observed_at': '2026-07-11T12:01:00Z',
        'thread_context': 'Full thread context', 'tags_json': '["models"]'
    }])
    entries = server._fetch_database_monitor_entries()
    assert entries[0]['url'] == 'https://x.com/a/status/1'
    assert entries[0]['excerpt'] == 'Full thread context'
    assert entries[0]['tags'] == ['models']


def test_monitor_feed_prefers_database_over_legacy_sheets(monkeypatch):
    server._MONITOR_CACHE['payload'] = None
    server._MONITOR_CACHE['timestamp'] = None
    monkeypatch.setattr(server, '_fetch_database_monitor_entries', lambda: [{
        'id': 'db:1', 'title': 'Fresh linked item', 'timestamp_dt': server._coerce_timestamp_utc('2026-07-11T12:00:00Z'),
        'timestamp': '2026-07-11T12:00:00Z', 'url': 'https://example.com/new'
    }])
    monkeypatch.setattr(server, '_fetch_monitor_rows', lambda **kwargs: (_ for _ in ()).throw(AssertionError('legacy sheet should not be fetched')))
    result = server.load_monitor_feed(force_refresh=True, sanitize=True)
    assert result[0]['url'] == 'https://example.com/new'


def test_monitor_importance_keeps_frontier_release_above_minor_update():
    from backend.app.monitor_ranking import effective_importance, score_story
    major, _ = score_story('OpenAI launches a new GPT model family', 'A flagship model release with API access.', 'OpenAI', 'primary')
    minor, _ = score_story('Small checkpoint gets a free tier', 'Routine availability update.', 'community', 'historical')
    assert major >= 90
    assert minor < 70
    assert effective_importance(major, '2026-07-01T00:00:00Z', server.datetime(2026, 7, 8, tzinfo=server.timezone.utc)) > effective_importance(minor, '2026-07-07T00:00:00Z', server.datetime(2026, 7, 8, tzinfo=server.timezone.utc))


def test_fetch_sheet_rows_falls_back_to_public_csv_when_api_key_blocked(monkeypatch):
    calls = []

    class FakeResponse:
        text = 'Timestamp,Name\n2026-07-06T18:37:09Z,Fresh item\n'

        def raise_for_status(self):
            return None

    def fake_get(url, timeout):
        calls.append(url)
        if 'sheets.googleapis.com' in url:
            raise requests.HTTPError('blocked')
        return FakeResponse()

    monkeypatch.setattr(server, 'GOOGLE_SHEETS_API_KEY', 'blocked-key')
    monkeypatch.setattr(server.requests, 'get', fake_get)

    rows = server._fetch_sheet_rows('Logs!A:B', sheet_name='Logs')

    assert rows == [
        ['Timestamp', 'Name'],
        ['2026-07-06T18:37:09Z', 'Fresh item'],
    ]
    assert any('sheets.googleapis.com' in url for url in calls)
    assert any('/gviz/tq?' in url for url in calls)


def test_testing_catalog_history_loaded():
    history = server._load_testing_catalog_history()
    assert isinstance(history, list)
    history_path = os.path.join(server.BASE_DIR, 'logs', 'testing_catalog_history.json')
    if not os.path.isfile(history_path):
        assert history == []
        return
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


def test_flatten_models_dev_skips_alpha_and_formats_rows():
    payload = {
        'openai': {
            'name': 'OpenAI',
            'npm': '@ai-sdk/openai',
            'doc': 'https://docs.example/openai',
            'api': 'https://api.example/openai',
            'models': {
                'gpt-test': {
                    'id': 'gpt-test',
                    'name': 'GPT Test',
                    'attachment': True,
                    'reasoning': True,
                    'tool_call': True,
                    'structured_output': True,
                    'temperature': False,
                    'release_date': '2026-01-01',
                    'last_updated': '2026-02-01',
                    'open_weights': False,
                    'cost': {'input': 1.25, 'output': 10},
                    'limit': {'context': 128000, 'output': 16000},
                    'modalities': {'input': ['text', 'image'], 'output': ['text']}
                },
                'alpha-model': {
                    'name': 'Alpha Model',
                    'status': 'alpha',
                    'attachment': False,
                    'reasoning': False,
                    'tool_call': False,
                    'release_date': '2026-01-01',
                    'last_updated': '2026-02-01',
                    'open_weights': False,
                    'limit': {'context': 1, 'output': 1},
                    'modalities': {'input': ['text'], 'output': ['text']}
                }
            }
        }
    }

    rows = flatten_models_dev(payload)

    assert len(rows) == 1
    row = rows[0]
    assert row['id'] == 'openai/gpt-test'
    assert row['provider'] == 'OpenAI'
    assert row['context_display'] == '128,000'
    assert row['input_cost_display'] == '$1.25'
    assert row['reasoning'] is True
    assert row['tool_call'] is True
    assert row['input_modalities'] == ['text', 'image']


def test_models_dev_endpoint_uses_service_cache(monkeypatch):
    rows = [{'id': 'provider/model', 'name': 'Model', 'provider': 'Provider'}]

    monkeypatch.setattr(server, 'load_models_dev_catalog', lambda force_refresh=False: rows)
    server.cache.pop(server.get_cache_key('models_dev'), None)

    client = server.app.test_client()
    response = client.get('/api/models-dev')

    assert response.status_code == 200
    assert response.get_json() == rows
