import json

from backend.app.agent import core


def test_openrouter_stream_forces_utf8_when_upstream_omits_charset(monkeypatch):
    text = "Fast — provider range 14.3–14.9; café costs €0.10."
    payload = {"choices": [{"delta": {"content": text}}]}

    class FakeResponse:
        encoding = "ISO-8859-1"

        def raise_for_status(self):
            return None

        def iter_lines(self, decode_unicode=False):
            raw = f"data: {json.dumps(payload, ensure_ascii=False)}".encode("utf-8")
            yield raw.decode(self.encoding) if decode_unicode else raw

    response = FakeResponse()
    monkeypatch.setattr(core.requests, "post", lambda *args, **kwargs: response)

    events = list(core._stream_openrouter_chat_completion(
        api_key="test", model="maker/model", messages=[], tools=[], temperature=0.1
    ))

    assert response.encoding == "utf-8"
    assert events[0] == {"type": "content", "delta": text}
    assert events[-1]["message"]["content"] == text
    assert "â" not in events[-1]["message"]["content"]
