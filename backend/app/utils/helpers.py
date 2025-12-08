"""
Utility functions extracted from server.py.

Contains formatting, parsing, and helper functions used across the application.
"""
import re
import json
from datetime import datetime, timezone
from html import unescape


def normalize_email(value: str) -> str:
    """Normalize email addresses for comparison."""
    if not value:
        return ''
    return str(value).strip().lower()


def sanitize_for_filename(value: str) -> str:
    """Convert a string to a safe filename."""
    value = value or 'model'
    sanitized = re.sub(r'[^A-Za-z0-9_-]+', '_', value).strip('_')
    return sanitized or 'model'


def coerce_int(value) -> int | None:
    """Safely convert a value to an integer."""
    if value is None:
        return None
    try:
        return int(value)
    except (TypeError, ValueError):
        try:
            return int(float(value))
        except (TypeError, ValueError):
            return None


def format_bearer_token(token: str) -> str:
    """Format a token as a Bearer authorization header value."""
    token = (token or '').strip()
    if not token:
        return ''
    if token.lower().startswith('bearer '):
        return token
    return f'Bearer {token}'


def parse_iso_datetime(value: str) -> datetime | None:
    """Parse ISO 8601 timestamp strings safely."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None


def get_prompt_current_date() -> str:
    """Return today's date formatted for prompts."""
    now = datetime.now(timezone.utc)
    return now.strftime('%B %d, %Y')


def format_vendor_name(raw_value: str) -> str:
    """Format a vendor/provider name for display."""
    if not raw_value:
        return ''
    normalized = raw_value.strip().lower()
    special_cases = {
        'openai': 'OpenAI',
        'x-ai': 'xAI',
        'meta': 'Meta',
        'meta-llama': 'Meta Llama',
        'anthropic': 'Anthropic',
        'google': 'Google',
        'mistralai': 'Mistral AI',
        'mistral': 'Mistral',
        'perplexity': 'Perplexity',
        'cohere': 'Cohere',
        'qwen': 'Qwen',
        'alibaba': 'Alibaba',
        'nvidia': 'NVIDIA',
        'microsoft': 'Microsoft',
        'deepseek': 'DeepSeek',
        'zero-one': 'Zero One',
        'ai21': 'AI21',
        'databricks': 'Databricks'
    }
    if normalized in special_cases:
        return special_cases[normalized]

    tokens = re.split(r'[-_]', raw_value)
    formatted = []
    for token in tokens:
        token = token.strip()
        if not token:
            continue
        if len(token) <= 3:
            formatted.append(token.upper())
        else:
            formatted.append(token[0].upper() + token[1:])
    return ' '.join(formatted) if formatted else raw_value


def sanitize_toon_value(value: str) -> str:
    """Escape special characters in TOON format values."""
    if not value:
        return ''
    # Escape commas and backslashes
    return str(value).replace('\\', '\\\\').replace(',', '\\,')


def parse_hype_tags(raw_tags) -> list[str]:
    """Parse tags from various formats into a list of strings."""
    if isinstance(raw_tags, list):
        return [str(tag).strip() for tag in raw_tags if str(tag).strip()]
    if isinstance(raw_tags, str):
        candidate = raw_tags.strip()
        if not candidate:
            return []
        try:
            decoded = json.loads(candidate)
            if isinstance(decoded, list):
                return [str(tag).strip() for tag in decoded if str(tag).strip()]
        except json.JSONDecodeError:
            pass
        return [segment.strip() for segment in candidate.split(',') if segment.strip()]
    return []


def normalize_hype_item(entry: dict) -> dict:
    """Normalize a hype feed item into a consistent format."""
    if not isinstance(entry, dict):
        return {}
    stars = coerce_int(entry.get('stars') or entry.get('score'))
    return {
        'name': entry.get('name') or entry.get('title') or entry.get('repository_name'),
        'url': entry.get('url') or entry.get('link'),
        'stars': stars if stars is not None else 0,
        'username': entry.get('username') or entry.get('owner') or entry.get('author'),
        'source': entry.get('source'),
        'summary': entry.get('summary'),
        'description': entry.get('description'),
        'language': entry.get('language') or entry.get('primary_language'),
        'tags': parse_hype_tags(entry.get('tags')),
        'created_at': entry.get('created_at'),
        'inserted_at': entry.get('inserted_at'),
        'updated_at': entry.get('updated_at')
    }


def extract_filter_timestamp(item: dict) -> str:
    """Extract a timestamp string from an item for filtering."""
    if not isinstance(item, dict):
        return ''
    if item.get('timestamp'):
        return item.get('timestamp')
    date = item.get('published_date') or item.get('date') or item.get('created_at')
    time_value = item.get('published_time') or item.get('time')
    if date and time_value:
        return f"{date}T{time_value}"
    if date:
        return date
    return ''
