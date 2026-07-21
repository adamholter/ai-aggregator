"""General editorial scoring and persistence rules for Monitor stories."""
import math
import re
from datetime import datetime, timezone

FRONTIER_LABS = ("openai", "anthropic", "google", "deepmind", "meta", "microsoft", "xai", "x.ai", "spacexai", "amazon", "aws")
RELEASE_TERMS = ("introducing", "launches", "launched", "releases", "released", "new model", "model family", "general availability")
SUBSTANTIVE_TERMS = ("benchmark", "research", "open source", "open-source", "system card", "api", "multimodal", "agentic", "reasoning")
ACCESS_TERMS = ("pricing", "price", "rate limit", "availability", "available", "free tier", "tokens per second", "throughput")
LOW_SIGNAL_TERMS = ("rumor", "leak", "speculation", "might", "reportedly", "funding round", "raises", "valuation")

def story_key(title, url=""):
    text = (title or "").lower()
    model = re.search(r'\b(gpt[- ]?\d+(?:\.\d+)?|grok[- ]?\d+(?:\.\d+)?|muse spark(?:[- ]?\d+(?:\.\d+)?)?|claude [a-z]+[- ]?\d+(?:\.\d+)?|gemini[- ]?[a-z0-9. -]+|glm[- ]?\d+(?:\.\d+)?)\b', text)
    if model:
        return re.sub(r'[^a-z0-9]+', '-', model.group(1)).strip('-')
    cleaned = re.sub(r'\b(introducing|launches|launched|releases|released|announces|announcement|available|availability|the|a|an)\b', ' ', text)
    cleaned = re.sub(r'[^a-z0-9]+', '-', cleaned).strip('-')
    return cleaned[:80] or url[:80]

def score_story(title, excerpt="", source="", evidence_status=""):
    text = f"{title} {excerpt} {source}".lower()
    score, reasons = 40, []
    frontier = any(term in text for term in FRONTIER_LABS)
    release = any(term in text for term in RELEASE_TERMS) and ("model" in text or re.search(r'\b(gpt|grok|claude|gemini|muse|glm)\b', text))
    if release:
        score += 28; reasons.append("major model or product release")
    if frontier:
        score += 17; reasons.append("frontier lab")
    if any(term in text for term in SUBSTANTIVE_TERMS):
        score += 8; reasons.append("substantive capability or evidence")
    if any(term in text for term in ACCESS_TERMS):
        score += 5; reasons.append("decision-useful availability or economics")
    if any(term in text for term in LOW_SIGNAL_TERMS):
        score -= 12; reasons.append("lower-confidence or lower-durability signal")
    if evidence_status in {"primary", "verified", "corroborated"}:
        score += 5; reasons.append("strong evidence")
    return max(0, min(100, score)), "; ".join(reasons) or "routine industry update"

def effective_importance(score, published_at, now=None):
    now = now or datetime.now(timezone.utc)
    try:
        dt = datetime.fromisoformat(str(published_at).replace("Z", "+00:00"))
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        age_days = max(0.0, (now - dt).total_seconds() / 86400)
    except Exception:
        age_days = 365.0
    half_life = 14 if score >= 90 else 8 if score >= 80 else 4 if score >= 70 else 1.5 if score >= 55 else 0.75
    return float(score) * math.pow(0.5, age_days / half_life)
