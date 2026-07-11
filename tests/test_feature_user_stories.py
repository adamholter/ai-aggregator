"""Contract tests for the account/API user stories in the canonical QA tracker.

These tests intentionally stub paid and external providers.  They exercise the
same Flask routes the browser uses without creating a Stripe checkout or making
an OpenRouter/Google Sheets request.
"""

from types import SimpleNamespace
from pathlib import Path

import server


def _local_account_client(monkeypatch, tmp_path):
    monkeypatch.setattr(server, "USERS_DB_PATH", str(tmp_path / "users.json"))
    monkeypatch.setattr(server, "PINS_DB_PATH", str(tmp_path / "pins.json"))
    monkeypatch.setattr(server, "_call_sheets_auth", lambda *args, **kwargs: {"use_local": True})
    monkeypatch.setattr(server, "_call_sheets_data", lambda *args, **kwargs: {"use_local": True})
    return server.app.test_client()


def test_dash_auth_001_register_login_and_validation(monkeypatch, tmp_path):
    client = _local_account_client(monkeypatch, tmp_path)

    invalid = client.post("/auth/register", json={"email": "bad", "password": "short"})
    assert invalid.status_code == 400
    assert "valid email" in invalid.get_json()["error"].lower()

    registered = client.post(
        "/auth/register",
        json={"email": "  USER@example.com ", "password": "securepass1"},
    )
    assert registered.status_code == 201
    assert registered.get_json()["user"]["email"] == "user@example.com"
    assert client.get("/api/me").get_json()["authenticated"] is True

    assert client.post("/auth/logout").status_code == 200
    wrong = client.post(
        "/auth/login", json={"email": "user@example.com", "password": "wrongpass1"}
    )
    assert wrong.status_code == 401

    logged_in = client.post(
        "/auth/login", json={"email": "user@example.com", "password": "securepass1"}
    )
    assert logged_in.status_code == 200
    assert logged_in.get_json()["user"]["email"] == "user@example.com"


def test_dash_auth_002_logout_clears_server_session(monkeypatch, tmp_path):
    client = _local_account_client(monkeypatch, tmp_path)
    client.post(
        "/auth/register", json={"email": "logout@example.com", "password": "securepass1"}
    )
    assert client.get("/api/me").get_json()["authenticated"] is True
    assert client.post("/auth/logout").get_json() == {"success": True}
    assert client.get("/api/me").get_json()["authenticated"] is False
    with client.session_transaction() as session:
        assert "user_email" not in session
        assert "clerk_id" not in session


def test_dash_auth_003_authenticated_session_persists_across_requests(monkeypatch, tmp_path):
    client = _local_account_client(monkeypatch, tmp_path)
    client.post(
        "/auth/register", json={"email": "persist@example.com", "password": "securepass1"}
    )
    first = client.get("/api/me").get_json()
    reloaded = client.get("/")
    second = client.get("/api/me").get_json()
    assert reloaded.status_code == 200
    assert first["authenticated"] is True
    assert second["authenticated"] is True
    assert second["user"]["email"] == "persist@example.com"
    with client.session_transaction() as session:
        assert session.permanent is True


def test_dash_pin_001_local_and_remote_pin_lifecycle(monkeypatch, tmp_path):
    client = _local_account_client(monkeypatch, tmp_path)

    assert client.get("/api/pins").status_code == 401
    client.post(
        "/auth/register", json={"email": "pins@example.com", "password": "securepass1"}
    )
    created = client.post(
        "/api/pins",
        json={"key": "llm:test-model", "category": "llms", "item": {"name": "Test Model"}},
    )
    assert created.status_code == 200
    pin = created.get_json()["pin"]
    assert pin["key"] == "llm:test-model"
    assert client.get("/api/pins").get_json()["items"][0]["item"]["name"] == "Test Model"

    removed = client.delete("/api/pins?key=llm:test-model")
    assert removed.get_json() == {"success": True}
    assert client.get("/api/pins").get_json()["items"] == []


def test_dash_pin_003_merge_target_is_idempotent_and_survives_reload(monkeypatch, tmp_path):
    """The frontend merge posts each local pin; duplicate keys must not duplicate data."""
    client = _local_account_client(monkeypatch, tmp_path)
    client.post(
        "/auth/register", json={"email": "merge@example.com", "password": "securepass1"}
    )
    payload = {
        "key": "llm:local-before-login",
        "category": "llms",
        "item": {"name": "Local Before Login"},
    }
    assert client.post("/api/pins", json=payload).status_code == 200
    assert client.post("/api/pins", json=payload).status_code == 200
    assert len(client.get("/api/pins").get_json()["items"]) == 1
    assert client.get("/").status_code == 200
    pins_after_reload = client.get("/api/pins").get_json()["items"]
    assert [pin["key"] for pin in pins_after_reload] == ["llm:local-before-login"]


def test_dash_analysis_001_cached_analysis_and_missing_input(monkeypatch):
    client = server.app.test_client()
    missing = client.post("/api/model-analysis", json={})
    assert missing.status_code == 400
    assert missing.get_json()["error"] == "Model data is required"

    cached_payload = {
        "analysis": "## Executive Summary\nCached analysis",
        "traces": [{"step": "Analysis Generation", "status": "success"}],
        "model_data": {"name": "Test Model"},
    }
    monkeypatch.setattr(server, "require_user_openrouter_token", lambda: ("fake-token", False, None))
    monkeypatch.setattr(server, "load_cached_analysis_payload", lambda name, kind: cached_payload)

    response = client.post(
        "/api/model-analysis", json={"model": {"name": "Test Model"}, "type": "llm"}
    )
    assert response.status_code == 200
    assert response.get_json() == cached_payload
    fetched = client.get("/api/model-analysis?name=Test%20Model&type=llm")
    assert fetched.get_json()["analysis"].startswith("## Executive Summary")


def test_dash_filter_001_validates_calls_provider_and_parses_result(monkeypatch):
    client = server.app.test_client()
    monkeypatch.setattr(server, "require_user_openrouter_token", lambda: ("fake-token", False, None))

    empty = client.post("/api/experimental-filter", json={"category": "llms", "items": []})
    assert empty.status_code == 400

    captured = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "choices": [
                    {
                        "message": {
                            "content": "filtered[1]{title,summary,link,timestamp}:\n  Keep Me,,,"
                        }
                    }
                ]
            }

    def fake_post(url, **kwargs):
        captured.update(url=url, **kwargs)
        return FakeResponse()

    monkeypatch.setattr(server.requests, "post", fake_post)
    response = client.post(
        "/api/experimental-filter",
        json={
            "category": "llms",
            "items": [{"id": "keep", "name": "Keep Me"}, {"id": "drop", "name": "Drop Me"}],
            "instructions": "Keep only the first model",
            "model_id": "test/filter-model",
        },
    )
    assert response.status_code == 200
    assert response.get_json()["items"]
    assert captured["json"]["model"] == "test/filter-model"
    assert "Keep only the first model" in captured["json"]["messages"][1]["content"]


def test_dash_upg_001_profile_exposes_tier_and_usage(monkeypatch):
    client = server.app.test_client()
    user = {"id": "paid-user", "email": "paid@example.com", "created_at": "2026-01-01T00:00:00Z"}
    monkeypatch.setattr(server, "get_current_user", lambda: user)
    monkeypatch.setattr(
        server,
        "_get_user_subscription",
        lambda _user_id: {"tier": "pro", "status": "active", "current_period_end": "2026-08-01"},
    )
    monkeypatch.setattr(server, "_get_monthly_usage_cost", lambda _user_id: 2.25)
    monkeypatch.setitem(server.TIER_CREDITS, "pro", 8.0)

    payload = client.get("/api/me").get_json()
    assert payload["authenticated"] is True
    assert payload["user"]["subscription"] == {
        "tier": "pro",
        "status": "active",
        "current_period_end": "2026-08-01",
        "credit_limit": 8.0,
        "credit_used": 2.25,
        "credit_remaining": 5.75,
    }


def test_dash_upg_002_checkout_and_portal_are_routed_without_real_stripe(monkeypatch):
    client = server.app.test_client()
    user = {"id": "paid-user", "email": "paid@example.com"}
    monkeypatch.setattr(server, "_get_current_user_for_checkout", lambda: user)
    monkeypatch.setattr(server, "_stripe_available", True)
    monkeypatch.setattr(server, "STRIPE_SECRET_KEY", "sk_test_stub")
    monkeypatch.setitem(server.STRIPE_PRICES, "pro_monthly", "price_stub")
    monkeypatch.setattr(server, "_run_with_timeout", lambda fn, timeout_seconds=12: fn())

    checkout_calls = []
    portal_calls = []
    fake_checkout = SimpleNamespace(
        Session=SimpleNamespace(
            create=lambda **kwargs: checkout_calls.append(kwargs)
            or SimpleNamespace(url="https://checkout.stripe.test/session")
        )
    )
    fake_portal = SimpleNamespace(
        Session=SimpleNamespace(
            create=lambda **kwargs: portal_calls.append(kwargs)
            or SimpleNamespace(url="https://billing.stripe.test/session")
        )
    )
    monkeypatch.setattr(
        server,
        "_stripe_module",
        SimpleNamespace(checkout=fake_checkout, billing_portal=fake_portal),
    )
    monkeypatch.setattr(
        server, "_get_user_subscription", lambda _uid: {"stripe_customer_id": "cus_stub"}
    )

    invalid = client.post("/api/create-checkout-session", json={"price_key": "unknown"})
    assert invalid.status_code == 400
    checkout = client.post("/api/create-checkout-session", json={"price_key": "pro_monthly"})
    assert checkout.get_json()["url"] == "https://checkout.stripe.test/session"
    assert checkout_calls[0]["line_items"] == [{"price": "price_stub", "quantity": 1}]
    assert checkout_calls[0]["client_reference_id"] == "paid-user"

    portal = client.post("/api/billing-portal")
    assert portal.get_json()["url"] == "https://billing.stripe.test/session"
    assert portal_calls[0]["customer"] == "cus_stub"


def test_dash_set_001_model_settings_contract_is_present():
    """Guard the browser-facing persistence contract without network-dependent UI data."""
    settings_html = (server.BASE_DIR / "templates/modals/settings.html").read_text() if hasattr(server.BASE_DIR, "read_text") else None
    if settings_html is None:
        settings_html = (Path(server.BASE_DIR) / "templates/modals/settings.html").read_text()
    script = (Path(server.BASE_DIR) / "static/script.js").read_text()
    for control_id in (
        "setting-available-models",
        "setting-speed-model",
        "setting-analysis-model",
        "setting-fallback-models",
        "settings-save",
    ):
        assert f'id="{control_id}"' in settings_html
    for storage_key in (
        "dashboard-available-models",
        "dashboard-speed-model",
        "dashboard-analysis-model",
        "dashboard-fallback-models",
    ):
        assert f"localStorage.setItem('{storage_key}'" in script
        assert f"localStorage.getItem('{storage_key}'" in script


def test_page_docs_001_serves_both_source_documents():
    client = server.app.test_client()
    docs_page = client.get("/docs")
    api_docs = client.get("/API_DOCS.md")
    llm_text = client.get("/LLM.txt")

    assert docs_page.status_code == 200
    assert api_docs.status_code == 200
    assert llm_text.status_code == 200
    assert "text/markdown" in api_docs.content_type
    assert "text/plain" in llm_text.content_type
    assert len(api_docs.data) > 500
    assert len(llm_text.data) > 500
