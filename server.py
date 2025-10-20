from flask import Flask, jsonify, request, Response, stream_with_context, has_request_context
from flask_cors import CORS
import argparse
import requests
import json
from datetime import datetime, timedelta
import os
import subprocess
import tempfile
import sys
import shutil
import json
import signal
import time
import numpy as np
import re
import ast
import urllib.parse
from contextlib import contextmanager

app = Flask(__name__, static_folder='.', static_url_path='')
CORS(app)

# Set proper encoding for Flask responses
app.config['JSON_AS_ASCII'] = False
app.config['JSONIFY_MIMETYPE'] = 'application/json; charset=utf-8'

# API Configuration
ARTIFICIAL_ANALYSIS_API_KEY = (os.environ.get('ARTIFICIAL_ANALYSIS_API_KEY') or '').strip()
OPENROUTER_API_KEY = (os.environ.get('OPENROUTER_API_KEY') or '').strip()
ARTIFICIAL_ANALYSIS_BASE_URL = 'https://artificialanalysis.ai/api/v2'
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
REPLICATE_API_KEY = (os.environ.get('REPLICATE_API_KEY') or '').strip()
REPLICATE_BASE_URL = 'https://api.replicate.com/v1'
DEEP_RESEARCH_MODEL_ID = 'openai/o4-mini-deep-research'
MAX_REPLICATE_MODELS = max(int(os.environ.get('MAX_REPLICATE_MODELS', '60')), 1)
MAX_REPLICATE_TOTAL = max(int(os.environ.get('MAX_REPLICATE_TOTAL', '250')), MAX_REPLICATE_MODELS)
MAX_REPLICATE_PAGES = max(int(os.environ.get('MAX_REPLICATE_PAGES', '5')), 1)

OPENROUTER_KEY_REQUIRED_MESSAGE = (
    'An OpenRouter API key is required for this feature. Add your key in Settings to continue.'
)


def _warn_if_missing(name, value):
    if not value:
        print(f"WARNING: Environment variable '{name}' is not set; related features may be unavailable.")


_warn_if_missing('ARTIFICIAL_ANALYSIS_API_KEY', ARTIFICIAL_ANALYSIS_API_KEY)
_warn_if_missing('OPENROUTER_API_KEY', OPENROUTER_API_KEY)
_warn_if_missing('REPLICATE_API_KEY', REPLICATE_API_KEY)


class MissingOpenRouterKeyError(Exception):
    """Raised when an OpenRouter API key is required but not available."""


def get_request_bearer_token():
    """Extract Bearer token from the current request, if present."""
    if not has_request_context():
        return ''
    auth_header = request.headers.get('Authorization', '')
    if not isinstance(auth_header, str):
        return ''
    auth_header = auth_header.strip()
    if not auth_header:
        return ''
    parts = auth_header.split(' ', 1)
    if len(parts) == 2 and parts[0].lower() == 'bearer':
        return parts[1].strip()
    return ''


def require_user_openrouter_token():
    """Return the user-provided OpenRouter token or raise if missing."""
    token = get_request_bearer_token()
    if token:
        return token
    raise MissingOpenRouterKeyError(OPENROUTER_KEY_REQUIRED_MESSAGE)


def build_openrouter_headers(token):
    """Build OpenRouter request headers from the provided token."""
    token = (token or '').strip()
    if not token:
        raise MissingOpenRouterKeyError(OPENROUTER_KEY_REQUIRED_MESSAGE)
    return {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }


def openrouter_key_required_response():
    """Standard JSON response when a user OpenRouter key is required."""
    return jsonify({'error': OPENROUTER_KEY_REQUIRED_MESSAGE}), 402

# Model configuration
MODEL_CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config', 'model_config.json')
PROMPT_CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'config', 'prompt_config.json')
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MODEL_MATCHES_PATH = os.path.join(DATA_DIR, 'model_matches.json')


def load_model_config():
    """Load dashboard model configuration from disk."""
    try:
        with open(MODEL_CONFIG_PATH, 'r', encoding='utf-8') as config_file:
            return json.load(config_file)
    except FileNotFoundError:
        print(f"WARNING: Model configuration file not found at {MODEL_CONFIG_PATH}. Using built-in defaults.")
    except json.JSONDecodeError as exc:
        print(f"WARNING: Failed to parse model configuration ({exc}). Using built-in defaults.")
    except Exception as exc:
        print(f"WARNING: Unexpected error loading model configuration ({exc}). Using built-in defaults.")
    return {}


MODEL_CONFIG = load_model_config()
try:
    with open(PROMPT_CONFIG_PATH, 'r', encoding='utf-8') as prompt_file:
        PROMPT_CONFIG = json.load(prompt_file)
except FileNotFoundError:
    print(f"WARNING: Prompt configuration file not found at {PROMPT_CONFIG_PATH}. Using built-in defaults.")
    PROMPT_CONFIG = {}
except json.JSONDecodeError as exc:
    print(f"WARNING: Failed to parse prompt configuration ({exc}). Using built-in defaults.")
    PROMPT_CONFIG = {}
except Exception as exc:
    print(f"WARNING: Unexpected error loading prompt configuration ({exc}). Using built-in defaults.")
    PROMPT_CONFIG = {}


def refresh_model_config():
    """Reload model configuration from disk."""
    global MODEL_CONFIG
    MODEL_CONFIG = load_model_config()


def get_config_value(path, default=None):
    """Retrieve a nested configuration value with fallback."""
    current = MODEL_CONFIG
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current


def get_analysis_sequence_map():
    """Return analysis sequence as a step->model map."""
    sequence = get_config_value(['analysis', 'sequence'], default=[]) or []
    return {
        step.get('step'): step.get('modelId')
        for step in sequence
        if isinstance(step, dict) and step.get('step') and step.get('modelId')
    }

def get_prompt_value(path, default=""):
    """Retrieve nested prompt strings with a safe fallback."""
    current = PROMPT_CONFIG
    for key in path:
        if isinstance(current, dict) and key in current:
            current = current[key]
        else:
            return default
    return current if isinstance(current, str) else default

def format_prompt(template, **kwargs):
    """Simple placeholder substitution without affecting other braces."""
    if not template:
        return ""
    result = template
    for key, value in kwargs.items():
        placeholder = '{' + key + '}'
        if value is None:
            value = ''
        result = result.replace(placeholder, str(value))
    return result

# Cache configuration
cache = {}
MATCH_CACHE = {}
CACHE_DURATION = timedelta(hours=1)  # Cache data for 1 hour
ANALYSIS_DIR = os.path.join(os.path.dirname(__file__), 'analyses')
MODEL_MATCH_STORE = {}

def build_cache_entry(data, extra=None):
    """Create a standardized cache entry with optional metadata."""
    entry = {
        'data': data,
        'timestamp': datetime.now()
    }
    if extra:
        entry.update(extra)
    return entry

def ensure_analysis_dir():
    if not os.path.exists(ANALYSIS_DIR):
        os.makedirs(ANALYSIS_DIR, exist_ok=True)

def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR, exist_ok=True)

def sanitize_for_filename(value):
    value = value or 'model'
    sanitized = re.sub(r'[^A-Za-z0-9_-]+', '_', value).strip('_')
    return sanitized or 'model'

def load_model_match_store():
    ensure_data_dir()
    try:
        with open(MODEL_MATCHES_PATH, 'r', encoding='utf-8') as match_file:
            data = json.load(match_file)
            if isinstance(data, dict):
                return data
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as exc:
        print(f"WARNING: Failed to parse model match store ({exc}). Starting fresh.")
    except Exception as exc:
        print(f"WARNING: Unexpected error reading match store ({exc}). Starting fresh.")
    return {}

def persist_model_match_store(store):
    ensure_data_dir()
    try:
        with open(MODEL_MATCHES_PATH, 'w', encoding='utf-8') as match_file:
            json.dump(store, match_file, ensure_ascii=False, indent=2)
    except Exception as exc:
        print(f"WARNING: Failed to persist model match store ({exc}).")

MODEL_MATCH_STORE = load_model_match_store()

def model_match_store_key(source, target, model_name, provider):
    return '::'.join([
        str(source or '').lower().strip(),
        str(target or '').lower().strip(),
        str(model_name or '').lower().strip(),
        str(provider or '').lower().strip()
    ])

def get_persisted_model_match(source, target, model_name, provider):
    key = model_match_store_key(source, target, model_name, provider)
    entry = MODEL_MATCH_STORE.get(key)
    if isinstance(entry, dict):
        return entry.get('result')
    return None

def persist_model_match_result(source, target, model_name, provider, result):
    key = model_match_store_key(source, target, model_name, provider)
    MODEL_MATCH_STORE[key] = {
        'result': result,
        'saved_at': datetime.now().isoformat()
    }
    persist_model_match_store(MODEL_MATCH_STORE)

def _format_vendor_name(raw_value):
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

def derive_openrouter_vendor(model):
    if not isinstance(model, dict):
        return ''

    name = model.get('name') or ''
    if isinstance(name, str) and ': ' in name:
        vendor = name.split(': ', 1)[0].strip()
        return vendor or ''

    slug = model.get('canonical_slug') or model.get('id') or ''
    if not isinstance(slug, str):
        return ''
    slug = slug.split(':', 1)[0]
    if '/' in slug:
        vendor_candidate = slug.split('/', 1)[0]
    else:
        vendor_candidate = slug
    vendor_candidate = vendor_candidate.strip()
    if not vendor_candidate:
        return ''

    return _format_vendor_name(vendor_candidate)

def get_analysis_paths(model_name, model_type):
    ensure_analysis_dir()
    safe_name = sanitize_for_filename(model_name)
    base = f"{model_type}_{safe_name}"
    json_path = os.path.join(ANALYSIS_DIR, f"{base}.json")
    markdown_path = os.path.join(ANALYSIS_DIR, f"{base}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md")
    return json_path, markdown_path

def load_persisted_analysis(model_name, model_type):
    json_path, _ = get_analysis_paths(model_name, model_type)
    if not os.path.exists(json_path):
        return None, None
    try:
        with open(json_path, 'r', encoding='utf-8') as file:
            payload = json.load(file)
        saved_at = payload.get('saved_at')
        if saved_at:
            try:
                timestamp = datetime.fromisoformat(saved_at)
            except ValueError:
                timestamp = datetime.now()
        else:
            timestamp = datetime.now()
        return payload, timestamp
    except Exception as exc:
        print(f"ERROR: Failed to load cached analysis {json_path}: {exc}")
        return None, None

def persist_model_analysis(model_name, model_type, analysis_text, traces, model_data, context=None):
    json_path, markdown_path = get_analysis_paths(model_name, model_type)
    timestamp = datetime.now()
    payload = {
        'model_name': model_name,
        'model_type': model_type,
        'analysis': analysis_text,
        'traces': traces,
        'model_data': model_data,
        'context': context,
        'saved_at': timestamp.isoformat()
    }
    try:
        with open(json_path, 'w', encoding='utf-8') as json_file:
            json.dump(payload, json_file, ensure_ascii=False, indent=2)
    except Exception as exc:
        print(f"ERROR: Failed to persist analysis JSON {json_path}: {exc}")

    try:
        with open(markdown_path, 'w', encoding='utf-8') as md_file:
            md_file.write(f"# {model_name} Analysis\n\n")
            md_file.write(f"**Type:** {model_type}\n")
            md_file.write(f"**Generated:** {timestamp.strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            md_file.write("---\n\n")
            md_file.write(analysis_text)
            if context:
                md_file.write("\n\n---\n\n")
                md_file.write("## Dataset Context\n\n")
                try:
                    md_file.write(json.dumps(context, ensure_ascii=False, indent=2))
                except TypeError:
                    md_file.write(str(context))
    except Exception as exc:
        print(f"ERROR: Failed to persist analysis markdown {markdown_path}: {exc}")

def get_cache_key(endpoint, params=None):
    """Generate a cache key for the given endpoint and parameters."""
    key = endpoint
    if params:
        key += '_' + '_'.join(f"{k}={v}" for k, v in sorted(params.items()))
    return key

def parse_iso_datetime(value):
    """Parse ISO 8601 timestamp strings safely."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace('Z', '+00:00'))
    except (ValueError, TypeError):
        return None

def compute_latency_seconds(default_example):
    """Compute latency in seconds from a Replicate default example payload."""
    if not isinstance(default_example, dict):
        return None
    metrics = default_example.get('metrics') or {}
    if isinstance(metrics, dict):
        total = metrics.get('total_time') or metrics.get('predict_time')
        if total is not None:
            try:
                total_float = float(total)
                if total_float >= 0:
                    return round(total_float, 3)
            except (TypeError, ValueError):
                pass
    started = parse_iso_datetime(default_example.get('created_at'))
    finished = parse_iso_datetime(default_example.get('completed_at'))
    if not started or not finished:
        return None
    latency = (finished - started).total_seconds()
    return round(latency, 3) if latency >= 0 else None

def normalize_fal_model_url(url):
    """Convert fal.run URLs into canonical fal.ai model URLs."""
    if not url or not isinstance(url, str):
        return url

    cleaned = url.strip()
    if cleaned.startswith('https://fal.run/'):
        path = cleaned[len('https://fal.run/'):]
        return 'https://fal.ai/models/' + path
    if cleaned.startswith('http://fal.run/'):
        path = cleaned[len('http://fal.run/'):]
        return 'https://fal.ai/models/' + path
    return cleaned

def get_model_display_name(model_id):
    """Return a human-friendly name for the given model identifier."""
    if not model_id:
        return 'Unknown Model'

    if isinstance(model_id, dict):
        model_id = model_id.get('id') or model_id.get('name')

    if not model_id:
        return 'Unknown Model'

    model_id = str(model_id)

    known = {
        'z-ai/glm-4.6': 'GLM 4.6',
        'z-ai/glm-4.5': 'GLM 4.5',
        'openai/gpt-5': 'GPT-5',
        'openai/gpt-5-mini': 'GPT-5 Mini',
        'openai/gpt-5-nano': 'GPT-5 Nano',
        'openai/gpt-4.1': 'GPT-4.1',
        'openai/gpt-4.1-mini': 'GPT-4.1 Mini',
        'openai/gpt-4o': 'GPT-4o',
        'openai/gpt-4o-mini': 'GPT-4o Mini',
        'x-ai/grok-4-fast': 'Grok-4 Fast',
        'anthropic/claude-sonnet-4.5': 'Claude Sonnet 4.5',
        'google/gemini-2.5-flash-preview-09-2025': 'Gemini 2.5 Flash Preview',
        'google/gemini-2.5-flash-lite-preview-09-2025': 'Gemini 2.5 Flash Lite Preview',
        'openai/o4-mini-deep-research': 'OpenAI o4 Mini Deep Research'
    }

    if model_id in known:
        return known[model_id]

    openrouter_cache_key = get_cache_key('openrouter_models')
    cached_models = cache.get(openrouter_cache_key, {}).get('data')
    if isinstance(cached_models, list):
        for entry in cached_models:
            if entry.get('id') == model_id:
                return entry.get('name') or entry.get('base_name') or model_id

    slug = model_id.split('/', 1)[-1]
    slug = slug.replace('-', ' ').replace('_', ' ')
    return slug.title() if slug else model_id

def load_openrouter_models(force_refresh=False):
    cache_key = get_cache_key('openrouter_models')
    if not force_refresh and cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return cache[cache_key]['data']

    if not OPENROUTER_API_KEY:
        raise MissingOpenRouterKeyError('OPENROUTER_API_KEY is required to fetch OpenRouter catalog data.')

    headers = build_openrouter_headers(OPENROUTER_API_KEY)

    response = requests.get(
        f'{OPENROUTER_BASE_URL}/models',
        headers=headers,
        timeout=30
    )
    response.raise_for_status()

    payload = response.json()
    models = payload.get('data', [])
    processed_models = []

    for model in models:
        name = model.get('name') or ''
        vendor, base_name = None, name
        if ': ' in name:
            vendor, base_name = name.split(': ', 1)
            vendor = vendor.strip()
            base_name = base_name.strip()
        else:
            vendor = derive_openrouter_vendor(model) or None
            base_name = base_name.strip()

        processed_model = {
            'id': model.get('id'),
            'slug': model.get('canonical_slug'),
            'name': name,
            'vendor': vendor,
            'base_name': base_name,
            'created': model.get('created'),
            'description': model.get('description'),
            'context_length': model.get('context_length'),
            'hugging_face_id': model.get('hugging_face_id'),
            'architecture': model.get('architecture', {}),
            'pricing': model.get('pricing', {}),
            'top_provider': model.get('top_provider', {}),
            'per_request_limits': model.get('per_request_limits'),
            'supported_parameters': model.get('supported_parameters', []),
            'default_parameters': model.get('default_parameters'),
            'tags': model.get('tags', []),
            'display_url': f"https://openrouter.ai/models/{model.get('canonical_slug')}" if model.get('canonical_slug') else None
        }
        processed_models.append(processed_model)

    processed_models.sort(
        key=lambda x: (x.get('created') or 0, x.get('name') or ''),
        reverse=True
    )

    cache[cache_key] = build_cache_entry(processed_models)
    return processed_models

def load_artificial_analysis_llms(force_refresh=False):
    cache_key = get_cache_key('llms')
    if not force_refresh and cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return cache[cache_key]['data']

    headers = {
        'x-api-key': ARTIFICIAL_ANALYSIS_API_KEY,
        'Content-Type': 'application/json'
    }

    response = requests.get(
        f'{ARTIFICIAL_ANALYSIS_BASE_URL}/data/llms/models',
        headers=headers,
        timeout=20
    )
    response.raise_for_status()
    data = response.json()
    cache[cache_key] = build_cache_entry(data)
    return data

def load_cached_analysis_payload(model_name, model_type):
    if not model_name:
        return None

    cache_key = f"analysis_{sanitize_for_filename(model_type)}_{sanitize_for_filename(model_name)}"
    if cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return cache[cache_key]['data']

    persisted_payload, persisted_timestamp = load_persisted_analysis(model_name, model_type)
    if persisted_payload:
        cache[cache_key] = build_cache_entry(
            persisted_payload,
            extra={'timestamp': persisted_timestamp or datetime.now()}
        )
        return persisted_payload
    return None

def stream_cached_analysis(payload):
    sse_headers = {
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }



def _build_openrouter_catalog_listing(models):
    lines = []
    for entry in models:
        model_id = entry.get('id')
        name = entry.get('name') or entry.get('base_name')
        if not model_id or not name:
            continue
        vendor = entry.get('vendor')
        label = name
        if vendor and isinstance(name, str) and vendor.lower() not in name.lower():
            label = f"{vendor}: {name}"
        lines.append(f"{model_id} | {label}")
    return '\n'.join(lines)


def _build_artificial_catalog_listing(models):
    lines = []
    for entry in models:
        model_id = entry.get('id') or entry.get('model_id') or entry.get('name')
        name = entry.get('name')
        if not model_id or not name:
            continue
        provider = (entry.get('model_creator') or {}).get('name')
        label = name if not provider else f"{provider}: {name}"
        lines.append(f"{model_id} | {label}")
    return '\n'.join(lines)


def _request_model_match_via_gemini(target_label, target_name, provider_hint, catalog_listing, auth_token):
    prompt = f"""You are matching models between datasets.

Target Model Name: "{target_name or ''}"
Target Provider Hint: "{provider_hint or ''}"

{target_label} Catalogue (id | name):
{catalog_listing}

Output requirements:
- Respond with strictly valid JSON (no markdown, no commentary).
- Structure: {{"match": "<model_id or empty string>", "confidence": 0.0-1.0, "reason": "short explanation"}}
- The value for "match" MUST be an exact id from the catalogue above. Use an empty string when no confident match exists.
- "confidence" is a float between 0 and 1 (inclusive). Use lower confidence when uncertain.
- "reason" should briefly reference the evidence (e.g., name match, provider alignment, version).

Matching guidance:
- Only provide a match when the target clearly refers to the same underlying model.
- Prefer exact or near-exact name matches considering common variations (capitalization, whitespace, punctuation).
- If vendor/provider hints disagree, do not force a match.
- Avoid guessing based solely on similar prefixes or suffixes.
- If multiple candidates seem plausible, prefer returning no match.

Return JSON only."""

    payload = {
        'model': 'google/gemini-2.5-flash-lite-preview-09-2025',
        'messages': [{'role': 'user', 'content': prompt}],
        'temperature': 0.1,
        'timeout': 25
    }

    response = requests.post(
        f'{OPENROUTER_BASE_URL}/chat/completions',
        headers=build_openrouter_headers(auth_token),
        json=payload,
        timeout=30
    )
    response.raise_for_status()
    result = response.json()
    content = result['choices'][0]['message']['content']
    try:
        parsed = parse_model_json_response(content)
        if not isinstance(parsed, dict):
            raise ValueError('Parsed response is not a JSON object')
        return parsed
    except Exception as exc:
        print(f"WARNING: Failed to parse Gemini match response: {exc}")
        return {
            'match': '',
            'confidence': 0.0,
            'reason': 'Unable to parse model response',
            'raw': content
        }


def perform_model_match(source, target, model_payload, force_refresh=False, auth_token=None):
    supported_pairs = {('artificial-analysis', 'openrouter'), ('openrouter', 'artificial-analysis')}
    key = (source, target, str(model_payload.get('name') or '').lower(), str(model_payload.get('id') or '').lower(), str(model_payload.get('provider') or '').lower())

    if (source, target) not in supported_pairs:
        raise ValueError('Unsupported match direction')

    model_name = model_payload.get('name')
    provider_hint = model_payload.get('provider')

    if not force_refresh:
        persisted = get_persisted_model_match(source, target, model_name, provider_hint)
        if persisted:
            hydrated = hydrate_match_metadata(dict(persisted), target)
            MATCH_CACHE[key] = hydrated
            return hydrated

    if not force_refresh and key in MATCH_CACHE:
        return MATCH_CACHE[key]

    if target == 'openrouter':
        catalog = load_openrouter_models()
        catalog_listing = _build_openrouter_catalog_listing(catalog)
        if not catalog_listing:
            result = {'match': None, 'reason': 'OpenRouter catalogue unavailable'}
            MATCH_CACHE[key] = result
            return result
        gemini_response = _request_model_match_via_gemini(
            'OpenRouter',
            model_name,
            provider_hint,
            catalog_listing,
            auth_token
        )
    else:
        aa_data = load_artificial_analysis_llms()
        models = aa_data.get('data', [])
        catalog_listing = _build_artificial_catalog_listing(models)
        if not catalog_listing:
            result = {'match': None, 'reason': 'Artificial Analysis dataset unavailable'}
            MATCH_CACHE[key] = result
            return result
        gemini_response = _request_model_match_via_gemini(
            'Artificial Analysis',
            model_name,
            provider_hint,
            catalog_listing,
            auth_token
        )

    match_id = ''
    confidence = 0.0
    reason = ''
    if isinstance(gemini_response, dict):
        match_id = str(gemini_response.get('match') or '').strip()
        try:
            confidence = float(gemini_response.get('confidence', 0.0))
        except (TypeError, ValueError):
            confidence = 0.0
        confidence = max(0.0, min(1.0, confidence))
        reason = gemini_response.get('reason') or ''

    if match_id:
        matched_record = None
        if target == 'openrouter':
            catalog = load_openrouter_models()
            matched_record = next((entry for entry in catalog if entry.get('id') == match_id), None)
        else:
            aa_data = load_artificial_analysis_llms()
            matched_record = next(
                (
                    entry for entry in aa_data.get('data', [])
                    if (entry.get('id') or entry.get('model_id') or entry.get('name')) == match_id
                ),
                None
            )
        result = {
            'match': {
                'id': match_id,
                'confidence': confidence,
                'reason': reason,
                'target': target,
                'metadata': matched_record
            }
        }
    else:
        result = {
            'match': None,
            'decision': gemini_response
        }

    hydrated_result = hydrate_match_metadata(dict(result), target)
    if isinstance(hydrated_result, dict) and 'persisted_at' not in hydrated_result:
        hydrated_result['persisted_at'] = datetime.now().isoformat()
    MATCH_CACHE[key] = hydrated_result
    persist_model_match_result(source, target, model_name, provider_hint, hydrated_result)
    return hydrated_result

def hydrate_match_metadata(result, target):
    if not isinstance(result, dict):
        return result
    match = result.get('match')
    if not match or not isinstance(match, dict):
        return result
    match_id = match.get('id')
    if not match_id:
        return result
    metadata = match.get('metadata')
    if metadata:
        return result
    if target == 'openrouter':
        catalog = load_openrouter_models()
        metadata = next((entry for entry in catalog if entry.get('id') == match_id), None)
    else:
        aa_data = load_artificial_analysis_llms()
        metadata = next(
            (
                entry for entry in aa_data.get('data', [])
                if (entry.get('id') or entry.get('model_id') or entry.get('name')) == match_id
            ),
            None
        )
    if metadata:
        result['match']['metadata'] = metadata
    return result

    MATCH_CACHE[key] = result
    return result
    def generator():
        traces = payload.get('traces') or []
        traces_event = json.dumps({'type': 'traces', 'traces': traces}, ensure_ascii=False)
        yield f"data: {traces_event}\n\n".encode('utf-8')
        for chunk in iter_text_chunks(payload.get('analysis', '')):
            content_event = json.dumps({'type': 'content', 'content': chunk}, ensure_ascii=False)
            yield f"data: {content_event}\n\n".encode('utf-8')
        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n".encode('utf-8')

    return Response(stream_with_context(generator()), mimetype='text/event-stream', headers=sse_headers)

FETCH_DATA_CATEGORY_ALIASES = {
    'llm': 'llms',
    'llms': 'llms',
    'language-models': 'llms',
    'language_models': 'llms',
    'open-router': 'openrouter',
    'open_router': 'openrouter',
    'openrouter': 'openrouter',
    'text-to-image': 'text-to-image',
    'text_to_image': 'text-to-image',
    'image-generation': 'text-to-image',
    'image_generation': 'text-to-image',
    'image-editing': 'image-editing',
    'image_editing': 'image-editing',
    'text-to-speech': 'text-to-speech',
    'text_to_speech': 'text-to-speech',
    'audio': 'text-to-speech',
    'text-to-video': 'text-to-video',
    'text_to_video': 'text-to-video',
    'image-to-video': 'image-to-video',
    'image_to_video': 'image-to-video',
    'fal': 'fal',
    'fal.ai': 'fal',
    'fal_models': 'fal',
    'replicate': 'replicate',
    'replicate-models': 'replicate',
    'replicate_models': 'replicate'
}

FETCH_DATA_CATEGORY_CONFIG = {
    'llms': {
        'label': 'Artificial Analysis — LLMs',
        'endpoint': '/api/llms',
        'params': None,
        'cache_keys': lambda: [get_cache_key('llms')],
        'extract': lambda payload: (payload or {}).get('data', []),
        'limit': 30,
        'source': 'artificial-analysis'
    },
    'openrouter': {
        'label': 'OpenRouter Catalogue',
        'endpoint': '/api/openrouter-models',
        'params': None,
        'cache_keys': lambda: [get_cache_key('openrouter_models')],
        'extract': lambda payload: payload if isinstance(payload, list) else (payload or []),
        'limit': 50,
        'source': 'openrouter'
    },
    'text-to-image': {
        'label': 'Artificial Analysis — Text-to-Image',
        'endpoint': '/api/text-to-image',
        'params': {'include_categories': 'true'},
        'cache_keys': lambda: [
            get_cache_key('text-to-image', {'include_categories': True}),
            get_cache_key('text_to_image', {'include_categories': True})
        ],
        'extract': lambda payload: (payload or {}).get('data', []),
        'limit': 25,
        'source': 'artificial-analysis'
    },
    'image-editing': {
        'label': 'Artificial Analysis — Image Editing',
        'endpoint': '/api/image-editing',
        'params': None,
        'cache_keys': lambda: [
            get_cache_key('image-editing'),
            get_cache_key('image_editing')
        ],
        'extract': lambda payload: (payload or {}).get('data', []),
        'limit': 20,
        'source': 'artificial-analysis'
    },
    'text-to-speech': {
        'label': 'Artificial Analysis — Text-to-Speech',
        'endpoint': '/api/text-to-speech',
        'params': None,
        'cache_keys': lambda: [
            get_cache_key('text-to-speech'),
            get_cache_key('text_to_speech')
        ],
        'extract': lambda payload: (payload or {}).get('data', []),
        'limit': 20,
        'source': 'artificial-analysis'
    },
    'text-to-video': {
        'label': 'Artificial Analysis — Text-to-Video',
        'endpoint': '/api/text-to-video',
        'params': None,
        'cache_keys': lambda: [
            get_cache_key('text-to-video'),
            get_cache_key('text_to_video')
        ],
        'extract': lambda payload: (payload or {}).get('data', []),
        'limit': 20,
        'source': 'artificial-analysis'
    },
    'image-to-video': {
        'label': 'Artificial Analysis — Image-to-Video',
        'endpoint': '/api/image-to-video',
        'params': None,
        'cache_keys': lambda: [
            get_cache_key('image-to-video'),
            get_cache_key('image_to_video')
        ],
        'extract': lambda payload: (payload or {}).get('data', []),
        'limit': 20,
        'source': 'artificial-analysis'
    },
    'fal': {
        'label': 'fal.ai Models',
        'endpoint': '/api/fal-models',
        'params': None,
        'cache_keys': lambda: [get_cache_key('fal_models')],
        'extract': lambda payload: payload if isinstance(payload, list) else (payload or []),
        'limit': 40,
        'source': 'fal.ai'
    },
    'replicate': {
        'label': 'Replicate Catalogue',
        'endpoint': '/api/replicate-models',
        'params': None,
        'cache_keys': lambda: [get_cache_key('replicate_models')],
        'extract': lambda payload: payload if isinstance(payload, list) else (payload or []),
        'limit': 40,
        'source': 'replicate'
    }
}

def normalize_category_id(value):
    if not value:
        return ''
    category = str(value).strip().lower()
    return FETCH_DATA_CATEGORY_ALIASES.get(category, category)

def is_cache_valid(timestamp):
    """Check if cached data is still valid."""
    return datetime.now() - timestamp < CACHE_DURATION

def resolve_category_config(category):
    category_id = normalize_category_id(category)
    return category_id, FETCH_DATA_CATEGORY_CONFIG.get(category_id)

def _iter_cache_keys(config):
    cache_keys = config.get('cache_keys')
    if callable(cache_keys):
        try:
            keys = cache_keys()
        except Exception:
            keys = []
    else:
        keys = cache_keys or []
    if isinstance(keys, (list, tuple, set)):
        for key in keys:
            if key:
                yield key
    elif keys:
        yield keys

def get_cached_category_payload(category_id, config):
    for key in _iter_cache_keys(config):
        if key in cache and is_cache_valid(cache[key]['timestamp']):
            return cache[key]['data']
    return None

def fetch_category_payload(category_id, config):
    endpoint = config.get('endpoint')
    if not endpoint:
        return None

    params = config.get('params')
    try:
        with app.test_client() as client:
            response = client.get(endpoint, query_string=params or {})
        if response.status_code == 200:
            try:
                return response.get_json()
            except Exception:
                return None
        else:
            print(f"WARNING: Test client hydration failed for '{category_id}' with status {response.status_code}")
            return None
    except Exception as exc:
        print(f"WARNING: Failed to hydrate category '{category_id}' via internal client {endpoint}: {exc}")
        return None

def load_category_payload(category):
    category_id, config = resolve_category_config(category)
    if not config:
        return category_id, None, None

    payload = get_cached_category_payload(category_id, config)
    if payload is not None:
        return category_id, config, payload

    payload = fetch_category_payload(category_id, config)

    # Prefer cached/processed payload if hydrated via endpoint
    cached_payload = get_cached_category_payload(category_id, config)
    if cached_payload is not None:
        return category_id, config, cached_payload

    return category_id, config, payload

def extract_category_items(category_id, config, payload, limit=None):
    if payload is None:
        return []
    extractor = config.get('extract')
    try:
        items = extractor(payload) if callable(extractor) else payload
    except Exception as exc:
        print(f"WARNING: Failed to extract items for category '{category_id}': {exc}")
        items = []

    if items is None:
        return []

    if isinstance(items, list):
        limit_value = limit if limit is not None else config.get('limit')
        if limit_value:
            return items[:limit_value]
    return items

def infer_item_name(item):
    if not isinstance(item, dict):
        return str(item)
    for key in ('name', 'title', 'modelId', 'id', 'slug'):
        value = item.get(key)
        if value:
            return value
    return 'Unknown'

def infer_item_provider(category_id, item):
    if not isinstance(item, dict):
        return ''
    if category_id == 'llms':
        creator = item.get('model_creator') or {}
        return creator.get('name') or ''
    if category_id == 'openrouter':
        return item.get('vendor') or ''
    if category_id == 'fal':
        group = item.get('group') or {}
        return group.get('name') or 'fal.ai'
    if category_id == 'replicate':
        return item.get('owner') or 'Replicate'
    creator = item.get('model_creator') or {}
    return creator.get('name') or ''

def infer_item_metrics(category_id, item):
    if not isinstance(item, dict):
        return {}

    metrics = {}
    if category_id == 'llms':
        evaluations = item.get('evaluations') or {}
        if 'artificial_analysis_intelligence_index' in evaluations:
            metrics['intelligence'] = evaluations['artificial_analysis_intelligence_index']
        if 'artificial_analysis_coding_index' in evaluations:
            metrics['coding'] = evaluations['artificial_analysis_coding_index']
        if item.get('median_output_tokens_per_second') is not None:
            metrics['speed_tokens_s'] = item['median_output_tokens_per_second']
        pricing = item.get('pricing') or {}
        if pricing.get('price_1m_input_tokens') is not None:
            metrics['input_price_1m'] = pricing['price_1m_input_tokens']
        if pricing.get('price_1m_output_tokens') is not None:
            metrics['output_price_1m'] = pricing['price_1m_output_tokens']
    elif category_id == 'openrouter':
        if item.get('context_length') is not None:
            metrics['context'] = item['context_length']
        pricing = item.get('pricing') or {}
        prompt_cost = pricing.get('prompt')
        completion_cost = pricing.get('completion')
        if prompt_cost is not None:
            metrics['prompt_cost'] = prompt_cost
        if completion_cost is not None:
            metrics['completion_cost'] = completion_cost
        parameters = item.get('supported_parameters')
        if isinstance(parameters, list) and parameters:
            metrics['parameters'] = ', '.join(parameters[:4])
    elif category_id in {'fal', 'replicate'}:
        if item.get('category'):
            metrics['category'] = item['category']
        if item.get('creditsRequired') is not None:
            metrics['credits'] = item['creditsRequired']
        if item.get('run_count') is not None:
            metrics['run_count'] = item['run_count']
        if item.get('latency_seconds') is not None:
            metrics['latency_s'] = item['latency_seconds']
    else:
        if item.get('elo') is not None:
            metrics['elo'] = item['elo']
        if item.get('rank') is not None:
            metrics['rank'] = item['rank']
        if item.get('ci95'):
            metrics['confidence'] = item['ci95']
    return {k: v for k, v in metrics.items() if v not in (None, '', [])}

def build_fetch_data_markdown(metadata, summary, datasets):
    if not metadata:
        return ''

    lines = []
    highlights = []
    if isinstance(summary, dict):
        highlights = summary.get('highlights') or []
    if highlights:
        lines.append('## Dataset Highlights')
        for highlight in highlights:
            lines.append(f"- {highlight}")
        lines.append('')

    category_summaries = {}
    if isinstance(summary, dict):
        for entry in summary.get('category_summaries', []) or []:
            if isinstance(entry, dict) and entry.get('id'):
                category_summaries[entry['id']] = entry

    for meta in metadata:
        cat_id = meta.get('id')
        label = meta.get('label', cat_id.title() if cat_id else 'Category')
        lines.append(f"### {label}")
        lines.append(f"- Items loaded: {meta.get('items', len(datasets.get(cat_id, []))) if cat_id else 0}")

        summary_entry = category_summaries.get(cat_id, {})
        if summary_entry.get('summary'):
            lines.append(f"- Summary: {summary_entry['summary']}")

        top_items = summary_entry.get('top_items') or []
        if top_items:
            lines.append("- Top entries:")
            for item in top_items:
                if not isinstance(item, dict):
                    continue
                name = item.get('name') or 'Unknown'
                provider = item.get('provider')
                bullet = f"  - {name}"
                if provider:
                    bullet += f" · {provider}"
                metrics = item.get('key_metrics') or {}
                if metrics:
                    formatted = ', '.join(f"{k}: {v}" for k, v in metrics.items() if v not in (None, '', []))
                    if formatted:
                        bullet += f" ({formatted})"
                lines.append(bullet)
        else:
            dataset_items = datasets.get(cat_id) or []
            for entry in dataset_items[:3]:
                provider = infer_item_provider(cat_id, entry)
                bullet = f"- {infer_item_name(entry)}"
                if provider:
                    bullet += f" · {provider}"
                lines.append(bullet)

        lines.append('')

    return '\n'.join(line for line in lines if line is not None).strip()

def parse_model_json_response(content):
    if not content:
        return {}
    cleaned = content.strip()
    if cleaned.startswith('```'):
        cleaned = cleaned[3:]
        if cleaned.startswith('json'):
            cleaned = cleaned[4:]
        cleaned = cleaned.strip()
        if cleaned.endswith('```'):
            cleaned = cleaned[:-3]
    if cleaned.endswith('```'):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except Exception as exc:
        raise ValueError(f"Failed to parse model JSON: {exc}") from exc

def build_fetch_data_fallback(metadata, datasets):
    summaries = []
    highlights = []
    for meta in metadata:
        cat_id = meta.get('id')
        label = meta.get('label', cat_id.title() if cat_id else 'Category')
        items = datasets.get(cat_id) or []
        top_entries = []
        for entry in items[:3]:
            top_entries.append({
                'name': infer_item_name(entry),
                'provider': infer_item_provider(cat_id, entry),
                'key_metrics': infer_item_metrics(cat_id, entry)
            })
        summaries.append({
            'id': cat_id,
            'label': label,
            'summary': f"{len(items)} items available.",
            'top_items': top_entries
        })
        if top_entries:
            highlights.append(f"{label}: {top_entries[0]['name']}")

    markdown = build_fetch_data_markdown(
        metadata,
        {'category_summaries': summaries, 'highlights': highlights},
        datasets
    )
    return {
        'category_summaries': summaries,
        'highlights': highlights,
        'markdown_summary': markdown,
        '_source': 'fallback'
    }

def run_fetch_data_summarizer(metadata, datasets):
    token = get_request_bearer_token()
    if not token:
        return build_fetch_data_fallback(metadata, datasets)

    analysis_sequence = get_analysis_sequence_map()
    fetch_model = analysis_sequence.get('intelligent-query', 'google/gemini-2.5-flash-lite-preview-09-2025')
    headers = build_openrouter_headers(token)

    default_fetch_prompt = """You are a structured data extraction assistant. The provided datasets are the ground truth.

Categories:
{CATEGORY_METADATA}

Dataset JSON:
{DATASETS_JSON}

Return a JSON object with this structure:
{{
  "category_summaries": [
    {{
      "id": "category id",
      "label": "Human readable label",
      "summary": "One or two sentences covering key insights using ONLY provided data",
      "top_items": [
        {{
          "name": "Model Name",
          "provider": "Provider or source",
          "key_metrics": {{"metric": "value"}},
          "notes": "Optional short note sourced from the data"
        }}
      ]
    }}
  ],
  "highlights": ["List noteworthy takeaways sourced from the data"],
  "markdown_summary": "Markdown synopsis covering each category and notable models."
}}

Rules:
- Use ONLY the supplied datasets, they are authoritative.
- Omit any hallucinated or uncertain information.
- Keep JSON keys exactly as specified."""

    prompt_template = get_prompt_value(['fetch-data', 'prompt'], default_fetch_prompt)
    prompt = format_prompt(
        prompt_template,
        CATEGORY_METADATA=json.dumps(metadata, ensure_ascii=False, indent=2),
        DATASETS_JSON=json.dumps(datasets, ensure_ascii=False, indent=2)
    )

    payload = {
        'model': fetch_model,
        'messages': [{'role': 'user', 'content': prompt}],
        'timeout': 30
    }

    try:
        response = requests.post(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            headers=headers,
            json=payload,
            timeout=25
        )
        response.raise_for_status()
        result = response.json()
        content = result['choices'][0]['message']['content']
        parsed = parse_model_json_response(content)
        if isinstance(parsed, dict):
            parsed['_model_id'] = fetch_model
            parsed['_raw_length'] = len(content or '')
        return parsed
    except Exception as exc:
        print(f"WARNING: fetch-data summarizer failed ({exc}); using fallback.")
        return build_fetch_data_fallback(metadata, datasets)

def fetch_data_for_categories(categories, limit_per_category=None):
    if not isinstance(categories, (list, tuple, set)):
        categories = [categories]

    datasets = {}
    metadata = []
    seen = set()

    for category in categories:
        category_id, config = resolve_category_config(category)
        if not category_id or category_id in seen or not config:
            continue
        seen.add(category_id)

        _, _, payload = load_category_payload(category_id)
        if payload is None:
            continue

        items = extract_category_items(
            category_id,
            config,
            payload,
            limit=limit_per_category if limit_per_category is not None else config.get('limit')
        )

        if not items:
            continue

        datasets[category_id] = items
        metadata.append({
            'id': category_id,
            'label': config.get('label', category_id.title()),
            'items': len(items) if isinstance(items, list) else len(items),
            'source': config.get('source', '')
        })

    if not datasets:
        return {
            'categories': [],
            'structured': {},
            'markdown': 'No datasets were available for the requested categories.',
            'datasets': {},
            'generated_at': datetime.now().isoformat()
        }

    structured = run_fetch_data_summarizer(metadata, datasets)
    markdown = ''
    if isinstance(structured, dict):
        markdown = structured.get('markdown_summary') or ''
    if not markdown:
        markdown = build_fetch_data_markdown(metadata, structured if isinstance(structured, dict) else {}, datasets)

    return {
        'categories': metadata,
        'structured': structured if isinstance(structured, dict) else {},
        'markdown': markdown,
        'datasets': datasets,
        'generated_at': datetime.now().isoformat()
    }

def initialize_fetch_context():
    return {
        'metadata': [],
        'datasets': {},
        'structured': {
            'category_summaries': [],
            'highlights': []
        },
        'markdown_sections': [],
        'last_generated_at': None
    }

def merge_fetch_context(context, fetch_result):
    context = context or initialize_fetch_context()
    if not isinstance(fetch_result, dict):
        return context

    metadata = fetch_result.get('categories') or []
    index_map = {
        entry.get('id'): idx
        for idx, entry in enumerate(context['metadata'])
        if isinstance(entry, dict) and entry.get('id')
    }
    for entry in metadata:
        if not isinstance(entry, dict):
            continue
        cat_id = entry.get('id')
        if cat_id and cat_id in index_map:
            context['metadata'][index_map[cat_id]] = entry
        else:
            context['metadata'].append(entry)
            if cat_id:
                index_map[cat_id] = len(context['metadata']) - 1

    datasets = fetch_result.get('datasets') or {}
    for cat_id, items in datasets.items():
        context['datasets'][cat_id] = items

    new_structured = fetch_result.get('structured') or {}
    summaries = context['structured'].setdefault('category_summaries', [])
    summary_index = {
        entry.get('id'): idx
        for idx, entry in enumerate(summaries)
        if isinstance(entry, dict) and entry.get('id')
    }
    for summary in new_structured.get('category_summaries', []):
        if not isinstance(summary, dict):
            continue
        sid = summary.get('id')
        if sid and sid in summary_index:
            summaries[summary_index[sid]] = summary
        else:
            summaries.append(summary)
            if sid:
                summary_index[sid] = len(summaries) - 1

    existing_highlights = set(context['structured'].setdefault('highlights', []))
    for highlight in new_structured.get('highlights', []):
        if highlight and highlight not in existing_highlights:
            context['structured']['highlights'].append(highlight)
            existing_highlights.add(highlight)

    for key, value in new_structured.items():
        if key not in {'category_summaries', 'highlights'}:
            context['structured'][key] = value

    markdown_summary = fetch_result.get('markdown')
    if markdown_summary:
        context['markdown_sections'].append(markdown_summary.strip())

    if fetch_result.get('generated_at'):
        context['last_generated_at'] = fetch_result['generated_at']

    return context

def describe_loaded_categories(context, fallback="No datasets were available for this request."):
    metadata = (context or {}).get('metadata') or []
    entries = []
    for item in metadata:
        if not isinstance(item, dict):
            continue
        cat_id = item.get('id')
        label = item.get('label')
        if cat_id and label:
            entries.append(f"{label} ({cat_id})")
        elif label:
            entries.append(label)
        elif cat_id:
            entries.append(cat_id)
    if not entries:
        return fallback
    return f"Loaded datasets: {', '.join(entries)}"

def compose_fetch_markdown(context):
    if not context:
        return "No dataset summary was available."
    sections = [section for section in context.get('markdown_sections', []) if section]
    if sections:
        return '\n\n'.join(sections)
    structured = context.get('structured') or {}
    markdown = structured.get('markdown_summary')
    if markdown:
        return markdown
    return "No dataset summary was available."

def compose_fetch_structured(context):
    if not context:
        return {}
    structured = dict(context.get('structured') or {})
    if 'markdown_summary' not in structured:
        structured['markdown_summary'] = compose_fetch_markdown(context)
    return structured

def compose_fetch_datasets(context):
    if not context:
        return {}
    return context.get('datasets') or {}

def build_loaded_datasets_label(context):
    metadata = (context or {}).get('metadata') or []
    labels = []
    for entry in metadata:
        if not isinstance(entry, dict):
            continue
        label = entry.get('label')
        cat_id = entry.get('id')
        if label:
            labels.append(label)
        elif cat_id:
            labels.append(cat_id)
    return ', '.join(labels) if labels else 'None'

def initialize_web_context():
    return {'entries': []}

def add_web_result(web_context, query, content, tool_name):
    web_context = web_context or initialize_web_context()
    web_context.setdefault('entries', []).append({
        'query': query,
        'content': content,
        'tool': tool_name
    })
    return web_context

def compose_web_data(web_context):
    entries = (web_context or {}).get('entries') or []
    if not entries:
        return "", "Web Search Results: (not requested)"
    segments = []
    for idx, entry in enumerate(entries, 1):
        query = entry.get('query') or ''
        tool = entry.get('tool') or 'Web Search'
        content = entry.get('content') or ''
        header = f"Query {idx}: {query}" if query else f"Query {idx}"
        segments.append(f"{header}\nSource ({tool}):\n{content}".strip())
    combined = "\n\n".join(segments).strip()
    section = f"Web Search Results:\n{combined}" if combined else "Web Search Results: (requested but no content was returned)"
    return combined, section

def build_agent_prompt_context(user_message, fetch_context, web_context):
    fetch_markdown = compose_fetch_markdown(fetch_context)
    fetch_structured = compose_fetch_structured(fetch_context)
    fetch_datasets = compose_fetch_datasets(fetch_context)
    web_data, web_section = compose_web_data(web_context)
    return {
        'USER_MESSAGE': user_message,
        'FETCH_DATA_MARKDOWN': fetch_markdown,
        'FETCH_DATA_JSON': json.dumps(fetch_structured, ensure_ascii=False, indent=2),
        'FETCH_DATASETS_JSON': json.dumps(fetch_datasets, ensure_ascii=False, indent=2),
        'WEB_DATA': web_data,
        'WEB_DATA_SECTION': web_section,
        'LOADED_DATASETS': build_loaded_datasets_label(fetch_context)
    }

def build_agent_messages(final_prompt, conversation_history, user_message):
    messages = [{
        'role': 'system',
        'content': final_prompt
    }]

    if conversation_history:
        recent_history = conversation_history[-20:] if len(conversation_history) > 20 else conversation_history
        for entry in recent_history:
            role = entry.get('role')
            content = entry.get('content')
            if role in ['user', 'assistant'] and content:
                messages.append({
                    'role': role,
                    'content': content
                })

    current_user_content = user_message
    if conversation_history:
        fallback_history = conversation_history[-10:] if len(conversation_history) > 10 else conversation_history
        context_parts = []
        for msg in fallback_history:
            if msg.get('role') in ['user', 'assistant'] and msg.get('content'):
                prefix = "User: " if msg.get('role') == 'user' else "Assistant: "
                snippet = str(msg.get('content', ''))[:200]
                context_parts.append(f"{prefix}{snippet}")
        if context_parts:
            context_summary = "\n".join(context_parts)
            current_user_content = f"CONTEXT:\n{context_summary}\n\nCURRENT REQUEST: {user_message}"

    messages.append({
        'role': 'user',
        'content': current_user_content
    })
    return messages

def parse_fetch_category_payload(payload):
    if payload is None:
        return [], 'No categories were provided.'
    text = payload.strip()
    parsed = None
    if not text:
        return [], 'No categories were provided.'
    try:
        parsed = json.loads(text)
    except (ValueError, json.JSONDecodeError):
        tokens = [token.strip().strip('\"\'') for token in text.split(',') if token.strip()]
        if tokens:
            parsed = tokens
    if isinstance(parsed, str):
        parsed = [parsed]
    if not isinstance(parsed, (list, tuple, set)):
        return [], 'Categories must be provided as a JSON array or comma-separated list.'
    normalized = []
    seen = set()
    for item in parsed:
        normalized_id = normalize_category_id(item)
        if normalized_id and normalized_id not in seen:
            normalized.append(normalized_id)
            seen.add(normalized_id)
    if not normalized:
        return [], 'No valid categories were recognized.'
    return normalized, None

def iter_text_chunks(value, chunk_size=600):
    if not value:
        return
    segments = str(value).strip().split('\n\n')
    for segment in segments:
        segment = segment.strip()
        if not segment:
            continue
        if len(segment) <= chunk_size:
            yield segment
        else:
            start = 0
            while start < len(segment):
                yield segment[start:start + chunk_size]
                start += chunk_size

def agent_tool_loop_generator(
    user_message,
    conversation_history,
    final_model,
    headers,
    analysis_sequence,
    prompt_template,
    fetch_context,
    web_context,
    initial_categories,
    theme='light',
    mode='standard',
    max_iterations=6
):
    print(f"🔧 [AGENT] Starting tool loop generator")
    print(f"📝 [AGENT] User message: {user_message[:100]}{'...' if len(user_message) > 100 else ''}")
    print(f"🤖 [AGENT] Model: {final_model}")
    print(f"🔧 [AGENT] Mode: {mode}")
    print(f"🔢 [AGENT] Max iterations: {max_iterations}")
    
    def status_payload(stage, message):
        return {
            'stage': stage,
            'message': message,
            'timestamp': datetime.utcnow().isoformat()
        }

    try:
        fetch_context = fetch_context or initialize_fetch_context()
        web_context = web_context or initialize_web_context()

        traces = []
        normalized_initial = [
            normalize_category_id(cat)
            for cat in (initial_categories or [])
            if normalize_category_id(cat)
        ]
        mode_label = (mode or 'standard').lower()
        dataset_trace = {
            'step': 'Dataset Fetch' if mode_label != 'deep-research' else 'Deep Research Context',
            'description': describe_loaded_categories(fetch_context),
            'tool': f"fetch_data ({len(normalized_initial) or len(fetch_context.get('metadata', []))} categories)",
            'status': 'success'
        }
        if mode_label == 'deep-research':
            descriptor = describe_loaded_categories(fetch_context)
            dataset_trace['description'] = (
                f"Loaded full database context: {descriptor}" if descriptor else
                "Loaded full database context from primary datasets."
            )
        traces.append(dataset_trace)
        print(f"📊 [AGENT] Initial trace created, yielding...")
        yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
        yield ('status', status_payload('Datasets', dataset_trace['description'] or 'No datasets loaded'))
        print(f"✅ [AGENT] Initial trace yielded successfully")

        prompt_context = build_agent_prompt_context(user_message, fetch_context, web_context)
        final_prompt = format_prompt(prompt_template, **prompt_context)
        if mode_label == 'deep-research':
            final_prompt = (
                f"{final_prompt}\n\n"
                "DEEP RESEARCH MODE:\n"
                "1. Review the database context above before issuing any additional tool commands.\n"
                "2. Only invoke `WEB_SEARCH` for details that are missing or outdated in the database summary.\n"
                "3. Combine database findings with external research, and cite each source group (Database vs Web Search).\n"
                "4. Summarize key discoveries and note where fresh web research augmented the internal data."
            )
        model_display = get_model_display_name(final_model)
        print(f"💬 [AGENT] Final prompt prepared for {model_display}")

        iteration = 0
        while iteration < max_iterations:
            iteration += 1
            print(f"🔄 [AGENT] Starting iteration {iteration}/{max_iterations}")
            yield ('status', status_payload('Iteration', f'Starting iteration {iteration}/{max_iterations}'))
            
            try:
                messages = build_agent_messages(final_prompt, conversation_history, user_message)
                payload = {
                    'model': final_model,
                    'messages': messages,
                    'stream': False,
                    'max_tokens': 4096
                }
                if final_model == DEEP_RESEARCH_MODEL_ID:
                    payload.setdefault('addons', ['web_search'])

                yield ('status', {
                    'stage': 'LLM Request',
                    'message': f'Requesting response from {model_display} (iteration {iteration})',
                    'timestamp': datetime.utcnow().isoformat()
                })
                print(f"📡 [AGENT] Requesting non-stream completion from OpenRouter...")

                try:
                    full_text = fetch_non_stream_content(headers, payload, theme)
                except requests.exceptions.RequestException as exc:
                    error_message = f'LLM request failed: {exc}'
                    print(f"❌ [AGENT] {error_message}")
                    traces.append({
                        'step': 'Response Generation',
                        'description': error_message,
                        'tool': model_display,
                        'status': 'failed'
                    })
                    yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                    yield ('status', status_payload('LLM Request', f'Error: {exc}'))
                    yield ('error', error_message, traces, fetch_context, web_context)
                    return

                content = full_text or ''
                content = sanitize_quickchart_urls_in_text(content, theme)
                content, _ = ensure_quickchart_visualization(content, theme)
                total_chars = len(content)
                print(f"✅ [AGENT] Received completion ({total_chars} chars)")

                if content:
                    delivered = 0
                    for chunk in iter_text_chunks(content, chunk_size=320):
                        delivered += len(chunk)
                        yield ('content', chunk)
                        yield ('status', status_payload('LLM Response', f'Delivered {delivered} of {total_chars} characters'))

                last_choice_snapshot = {'message': {'content': content}}
                normalized_content = content.strip()
                upper_content = normalized_content.upper()
                print(f"📄 [AGENT] Content received: {len(normalized_content)} chars")
                
            except requests.exceptions.RequestException as exc:
                print(f"❌ [AGENT] Request to language model failed: {exc}")
                import traceback
                print(f"TRACEBACK: {traceback.format_exc()}")
                error_message = f'Request to language model failed: {exc}'
                traces.append({
                    'step': 'Response Generation',
                    'description': 'Request to language model failed.',
                    'tool': model_display,
                    'status': 'failed'
                })
                yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                yield ('status', status_payload('LLM Request', f'Error: {exc}'))
                yield ('error', error_message, traces, fetch_context, web_context)
                return
            except ValueError as exc:
                print(f"❌ [AGENT] Failed to parse language model response: {exc}")
                import traceback
                print(f"TRACEBACK: {traceback.format_exc()}")
                error_message = f'Failed to parse language model response: {exc}'
                traces.append({
                    'step': 'Response Generation',
                    'description': 'Failed to parse language model response.',
                    'tool': model_display,
                    'status': 'failed'
                })
                yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                yield ('status', status_payload('LLM Request', f'Parsing error: {exc}'))
                yield ('error', error_message, traces, fetch_context, web_context)
                return
            except Exception as exc:
                print(f"❌ [AGENT] Unexpected error in iteration {iteration}: {exc}")
                import traceback
                print(f"TRACEBACK: {traceback.format_exc()}")
                error_message = f'Unexpected error: {exc}'
                traces.append({
                    'step': 'Response Generation',
                    'description': f'Unexpected error in iteration {iteration}.',
                    'tool': model_display,
                    'status': 'failed'
                })
                yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                yield ('status', status_payload('LLM Request', f'Unexpected error: {exc}'))
                yield ('error', error_message, traces, fetch_context, web_context)
                return

            normalized_content = content.strip()
            upper_content = normalized_content.upper()

            if upper_content.startswith('FETCH_DATA:'):
                print(f"📊 [AGENT] Processing FETCH_DATA command")
                try:
                    categories_payload = normalized_content.split(':', 1)[1].strip()
                    requested_categories, error = parse_fetch_category_payload(categories_payload)
                    if error:
                        print(f"❌ [AGENT] Invalid fetch_data request: {error}")
                        traces.append({
                            'step': 'Dataset Fetch',
                            'description': f"Invalid fetch_data request: {error}",
                            'tool': 'fetch_data (invalid request)',
                            'status': 'failed'
                        })
                        yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                        fail_message = (
                            "Unable to complete the request because the agent issued an invalid fetch_data command. "
                            "Please refine your request."
                        )
                        traces.append({
                            'step': 'Response Generation',
                            'description': 'Stopped due to invalid fetch_data command.',
                            'tool': model_display,
                            'status': 'failed'
                        })
                        yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                        yield ('final', fail_message, traces, fetch_context, web_context)
                        return

                    print(f"📊 [AGENT] Fetching data for categories: {requested_categories}")
                    fetch_result = fetch_data_for_categories(requested_categories)
                    fetch_context = merge_fetch_context(fetch_context, fetch_result)
                    prompt_context = build_agent_prompt_context(user_message, fetch_context, web_context)
                    final_prompt = format_prompt(prompt_template, **prompt_context)
                    description = (
                        f"Fetched datasets for {', '.join(requested_categories)}. "
                        f"{describe_loaded_categories(fetch_context)}"
                    )
                    traces.append({
                        'step': 'Dataset Fetch',
                        'description': description,
                        'tool': f"fetch_data ({len(requested_categories)} categories)",
                        'status': 'success'
                    })
                    yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                    yield ('status', status_payload('Tool', description))
                    print(f"✅ [AGENT] Data fetched successfully, continuing to next iteration")
                    continue
                except Exception as exc:
                    print(f"❌ [AGENT] Error processing FETCH_DATA: {exc}")
                    import traceback
                    print(f"TRACEBACK: {traceback.format_exc()}")
                    error_message = f'Error processing fetch_data command: {exc}'
                    traces.append({
                        'step': 'Dataset Fetch',
                        'description': f"Error processing fetch_data: {exc}",
                        'tool': 'fetch_data (error)',
                        'status': 'failed'
                    })
                    yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                    yield ('status', status_payload('Tool', f'fetch_data failed: {exc}'))
                    yield ('error', error_message, traces, fetch_context, web_context)
                    return

            if upper_content.startswith('WEB_SEARCH:'):
                print(f"🔍 [AGENT] Processing WEB_SEARCH command")
                try:
                    query = normalized_content.split(':', 1)[1].strip()
                    print(f"🔍 [AGENT] Searching for: {query}")
                    web_data, tool_display = perform_web_search(query, analysis_sequence, user_openrouter_token)
                    web_context = add_web_result(web_context, query, web_data, tool_display)
                    prompt_context = build_agent_prompt_context(user_message, fetch_context, web_context)
                    final_prompt = format_prompt(prompt_template, **prompt_context)
                    traces.append({
                        'step': 'Web Search',
                        'description': f'Performed live search for "{query}"' if query else 'Performed live search',
                        'tool': tool_display or 'Web Search',
                        'status': 'success' if web_data else 'warning'
                    })
                    yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                    yield ('status', status_payload('Tool', f'WEB_SEARCH -> {query or "(blank)"}'))
                    print(f"✅ [AGENT] Web search completed, continuing to next iteration")
                    continue
                except Exception as exc:
                    print(f"❌ [AGENT] Error processing WEB_SEARCH: {exc}")
                    import traceback
                    print(f"TRACEBACK: {traceback.format_exc()}")
                    error_message = f'Error processing web_search command: {exc}'
                    traces.append({
                        'step': 'Web Search',
                        'description': f"Error processing web search: {exc}",
                        'tool': 'Web Search (error)',
                        'status': 'failed'
                    })
                    yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
                    yield ('status', status_payload('Tool', f'web_search failed: {exc}'))
                    yield ('error', error_message, traces, fetch_context, web_context)
                    return

            # Final response
            final_content = normalized_content or content
            print(f"✅ [AGENT] Final response ready: {len(final_content)} chars")
            yield ('status', status_payload('Agent', 'Final response ready'))
            traces.append({
                'step': 'Response Generation',
                'description': f'Response generated by {model_display}',
                'tool': model_display,
                'status': 'success'
            })
            yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
            yield ('final', final_content, traces, fetch_context, web_context)
            print(f"🏁 [AGENT] Tool loop completed successfully")
            return

        # Exceeded iterations
        print(f"⚠️ [AGENT] Exceeded maximum iterations ({max_iterations})")
        final_message = (
            "I couldn't complete that request within the tool-call limit. "
            "Please try again with a more specific question."
        )
        traces.append({
            'step': 'Response Generation',
            'description': 'Exceeded maximum tool iterations without final reply.',
            'tool': model_display,
            'status': 'failed'
        })
        yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
        yield ('final', final_message, traces, fetch_context, web_context)
        return
        
    except GeneratorExit:
        print(f"🛑 [AGENT] Client disconnected from generator")
        raise
    except Exception as exc:
        print(f"❌ [AGENT] FATAL ERROR in tool loop generator: {exc}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        try:
            error_message = f'Fatal error in agent processing: {exc}'
            traces.append({
                'step': 'Response Generation',
                'description': f'Fatal error: {exc}',
                'tool': 'Agent System',
                'status': 'failed'
            })
            yield ('traces', [dict(item) if isinstance(item, dict) else item for item in traces], fetch_context, web_context)
            yield ('error', error_message, traces, fetch_context, web_context)
        except Exception as yield_exc:
            print(f"❌ [AGENT] Failed to yield error: {yield_exc}")
        return

def determine_analysis_categories(model_type, model_data=None):
    category_map = {
        'text-to-image': ['text-to-image', 'fal', 'replicate'],
        'image-editing': ['image-editing', 'fal', 'replicate'],
        'text-to-speech': ['text-to-speech', 'fal', 'replicate'],
        'text-to-video': ['text-to-video', 'fal', 'replicate'],
        'image-to-video': ['image-to-video', 'fal', 'replicate']
    }

    normalized_type = (model_type or '').lower()
    if normalized_type == 'llm':
        return ['llms', 'openrouter']
    if normalized_type == 'media':
        media_category = ''
        if isinstance(model_data, dict):
            media_category = model_data.get('mediaCategory') or model_data.get('media_type') or ''
        media_category = normalize_category_id(media_category)
        return category_map.get(media_category, ['text-to-image', 'fal', 'replicate'])
    if normalized_type == 'fal-models':
        return ['fal', 'replicate', 'text-to-image']
    if normalized_type == 'replicate-models':
        return ['replicate', 'fal', 'text-to-image']
    if normalized_type == 'openrouter':
        return ['openrouter', 'llms']
    return ['llms', 'openrouter']

def determine_agent_categories(message):
    if not message:
        return ['llms', 'openrouter']

    text = message.lower()
    categories = []

    def add_categories(*cats):
        for cat in cats:
            normalized = normalize_category_id(cat)
            if normalized and normalized not in categories:
                categories.append(normalized)

    if any(keyword in text for keyword in ['image', 'visual', 'picture', 'art', 'graphic']):
        add_categories('text-to-image', 'fal', 'replicate')
    if any(keyword in text for keyword in ['video', 'animation', 'frame']):
        add_categories('text-to-video', 'image-to-video', 'fal', 'replicate')
    if any(keyword in text for keyword in ['speech', 'audio', 'voice', 'tts']):
        add_categories('text-to-speech', 'fal', 'replicate')
    if 'fal' in text:
        add_categories('fal')
    if 'replicate' in text:
        add_categories('replicate')
    if any(keyword in text for keyword in ['router', 'openrouter']):
        add_categories('openrouter')
    if any(keyword in text for keyword in ['llm', 'language model', 'chatbot', 'gpt', 'claude', 'model', 'reasoning']):
        add_categories('llms', 'openrouter')

    if not categories:
        add_categories('llms', 'openrouter')

    return categories

def perform_web_search(query, analysis_sequence, auth_token):
    """Invoke the configured web-search model via OpenRouter."""
    web_search_model = analysis_sequence.get('web-search') or analysis_sequence.get('web-search-speed')
    if not web_search_model:
        web_search_model = 'perplexity/sonar-pro'

    headers = build_openrouter_headers(auth_token)

    default_search_prompt = """You are an AI model analysis expert. The user is asking: "{USER_MESSAGE}"

Search the web for the most current and factual information about AI models, benchmarks, releases, pricing, or comparisons that help answer the question.
Return a concise markdown report that cites sources inline when available."""
    search_prompt_template = get_prompt_value(
        ['ai-agent', 'web-search'],
        default_search_prompt
    )
    formatted_prompt = format_prompt(
        search_prompt_template,
        USER_MESSAGE=query
    )

    payload = {
        'model': web_search_model,
        'messages': [
            {
                'role': 'user',
                'content': formatted_prompt
            }
        ],
        'timeout': 45
    }

    try:
        response = requests.post(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            headers=headers,
            json=payload,
            timeout=45
        )
        if response.status_code == 200:
            result = response.json()
            content = result['choices'][0]['message']['content']
            return content or "", get_model_display_name(web_search_model)
    except Exception as exc:
        print(f"WARNING: Web search request failed: {exc}")

    return "", get_model_display_name(web_search_model)
@app.route('/')
def index():
    """Serve the main dashboard page."""
    return app.send_static_file('index.html')

@app.route('/about')
def about_page():
    """Serve the about page."""
    return app.send_static_file('about.html')


@app.route('/api/model-config', methods=['GET'])
def get_model_config_api():
    """Expose model configuration to the frontend."""
    refresh_model_config()
    return jsonify(MODEL_CONFIG)


@app.route('/api/llms', methods=['GET'])
def get_llms():
    """Get LLM models data from Artificial Analysis API."""
    force_refresh = request.args.get('cache_bust', 'false').lower() == 'true'
    try:
        data = load_artificial_analysis_llms(force_refresh=force_refresh)
        return jsonify(data), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
        }
    except requests.exceptions.RequestException as exc:
        return jsonify({
            'error': 'Failed to fetch LLM data',
            'details': str(exc)
        }), 500
    except Exception as exc:
        return jsonify({
            'error': 'Error processing LLM data',
            'details': str(exc)
        }), 500

@app.route('/api/text-to-image', methods=['GET'])
def get_text_to_image():
    """Get Text-to-Image models data from Artificial Analysis API."""
    include_categories = request.args.get('include_categories', 'false').lower() == 'true'
    cache_key = get_cache_key('text-to-image', {'include_categories': include_categories})
    
    if cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return jsonify(cache[cache_key]['data'])
    
    try:
        headers = {
            'x-api-key': ARTIFICIAL_ANALYSIS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        params = {}
        if include_categories:
            params['include_categories'] = 'true'
        
        response = requests.get(
            f'{ARTIFICIAL_ANALYSIS_BASE_URL}/data/media/text-to-image',
            headers=headers,
            params=params
        )
        
        if response.status_code == 200:
            data = response.json()
            cache[cache_key] = {
                'data': data,
                'timestamp': datetime.now()
            }
            return jsonify(data), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            }
        else:
            return jsonify({
                'error': f'API request failed with status {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch Text-to-Image data',
            'details': str(e)
        }), 500

@app.route('/api/image-editing', methods=['GET'])
def get_image_editing():
    """Get Image Editing models data from Artificial Analysis API."""
    cache_key = get_cache_key('image-editing')
    
    if cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return jsonify(cache[cache_key]['data'])
    
    try:
        headers = {
            'x-api-key': ARTIFICIAL_ANALYSIS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'{ARTIFICIAL_ANALYSIS_BASE_URL}/data/media/image-editing',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            cache[cache_key] = {
                'data': data,
                'timestamp': datetime.now()
            }
            return jsonify(data), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            }
        else:
            return jsonify({
                'error': f'API request failed with status {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch Image Editing data',
            'details': str(e)
        }), 500

@app.route('/api/text-to-speech', methods=['GET'])
def get_text_to_speech():
    """Get Text-to-Speech models data from Artificial Analysis API."""
    cache_key = get_cache_key('text-to-speech')
    
    if cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return jsonify(cache[cache_key]['data'])
    
    try:
        headers = {
            'x-api-key': ARTIFICIAL_ANALYSIS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'{ARTIFICIAL_ANALYSIS_BASE_URL}/data/media/text-to-speech',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            cache[cache_key] = {
                'data': data,
                'timestamp': datetime.now()
            }
            return jsonify(data), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            }
        else:
            return jsonify({
                'error': f'API request failed with status {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch Text-to-Speech data',
            'details': str(e)
        }), 500

@app.route('/api/text-to-video', methods=['GET'])
def get_text_to_video():
    """Get Text-to-Video models data from Artificial Analysis API."""
    cache_key = get_cache_key('text-to-video')
    
    if cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return jsonify(cache[cache_key]['data'])
    
    try:
        headers = {
            'x-api-key': ARTIFICIAL_ANALYSIS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'{ARTIFICIAL_ANALYSIS_BASE_URL}/data/media/text-to-video',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            cache[cache_key] = {
                'data': data,
                'timestamp': datetime.now()
            }
            return jsonify(data), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            }
        else:
            return jsonify({
                'error': f'API request failed with status {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch Text-to-Video data',
            'details': str(e)
        }), 500

@app.route('/api/image-to-video', methods=['GET'])
def get_image_to_video():
    """Get Image-to-Video models data from Artificial Analysis API."""
    cache_key = get_cache_key('image-to-video')
    
    if cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return jsonify(cache[cache_key]['data'])
    
    try:
        headers = {
            'x-api-key': ARTIFICIAL_ANALYSIS_API_KEY,
            'Content-Type': 'application/json'
        }
        
        response = requests.get(
            f'{ARTIFICIAL_ANALYSIS_BASE_URL}/data/media/image-to-video',
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            cache[cache_key] = {
                'data': data,
                'timestamp': datetime.now()
            }
            return jsonify(data), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, x-api-key'
            }
        else:
            return jsonify({
                'error': f'API request failed with status {response.status_code}',
                'details': response.text
            }), response.status_code
            
    except Exception as e:
        return jsonify({
            'error': 'Failed to fetch Image-to-Video data',
            'details': str(e)
        }), 500

@app.route('/api/fal-models', methods=['GET'])
def get_fal_models():
    """Get media generation models data from fal.ai API."""
    cache_key = get_cache_key('fal_models')

    # Force fresh data fetch if cache_bust parameter is present
    force_refresh = request.args.get('cache_bust', 'false').lower() == 'true'

    print(f"DEBUG: fal-models endpoint called, cache_key={cache_key}, force_refresh={force_refresh}")
    print(f"DEBUG: Cache contains {len(cache)} entries")
    print(f"DEBUG: Cache key exists: {cache_key in cache}")
    if cache_key in cache:
        print(f"DEBUG: Cache timestamp: {cache[cache_key].get('timestamp')}")
        print(f"DEBUG: Cache is valid: {is_cache_valid(cache[cache_key]['timestamp'])}")

    # Clear cache if force_refresh is requested
    if force_refresh and cache_key in cache:
        print(f"DEBUG: Clearing cache for force refresh")
        del cache[cache_key]

    if not force_refresh and cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        print(f"DEBUG: Serving from cache, checking {len(cache[cache_key]['data'])} models for URL normalization")
        cached_models = cache[cache_key]['data']
        normalized_models = []
        cache_dirty = False

        for model in cached_models:
            if not isinstance(model, dict):
                normalized_models.append(model)
                continue

            original_url = model.get('modelUrl', '')
            normalized_url = normalize_fal_model_url(original_url)

            if normalized_url != original_url:
                updated_model = {**model, 'modelUrl': normalized_url}
                normalized_models.append(updated_model)
                cache_dirty = True
                print(f"DEBUG: Normalized URL: {original_url} -> {normalized_url}")
            else:
                normalized_models.append(model)

        if cache_dirty:
            cache[cache_key]['data'] = normalized_models
            print(f"DEBUG: Updated {cache_dirty} model URLs in cache")

        print(f"DEBUG: Returning {len(normalized_models)} normalized models from cache")
        return jsonify(normalized_models)
    
    try:
        # Fetch all pages of fal.ai models
        all_models = []
        page = 1
        max_pages = 20  # Safety limit to prevent infinite loops
        
        while page <= max_pages:
            url = f"https://fal.ai/api/models?page={page}&sort=recent"
            response = requests.get(url, timeout=15)
            response.raise_for_status()
            
            data = response.json()
            models = data.get('items', [])
            
            # If no models on this page, we've reached the end
            if not models:
                break
                
            all_models.extend(models)
            print(f"Fetched page {page} of fal.ai models: {len(models)} models")
            page += 1
        
        print(f"Total fal.ai models fetched: {len(all_models)} from {page-1} pages")
        
        # Process and standardize the model data
        processed_models = []
        for model in all_models:
            original_url = model.get('modelUrl', '')
            normalized_url = normalize_fal_model_url(original_url)
            print(f"DEBUG: Processing model {model.get('title', 'Unknown')} - URL: {original_url} -> {normalized_url}")

            processed_model = {
                'id': model.get('id', ''),
                'title': model.get('title', ''),
                'category': model.get('category', ''),
                'description': model.get('shortDescription', ''),
                'tags': model.get('tags', []),
                'date': model.get('date', ''),
                'licenseType': model.get('licenseType', ''),
                'modelUrl': normalized_url,
                'thumbnailUrl': model.get('thumbnailUrl', ''),
                'group': model.get('group', {}),
                'pricing': model.get('pricingInfoOverride', ''),
                'highlighted': model.get('highlighted', False),
                'creditsRequired': model.get('creditsRequired', 0),
                'durationEstimate': model.get('durationEstimate', 0)
            }
            processed_models.append(processed_model)
        
        # Sort by date (newest first)
        processed_models.sort(key=lambda x: x.get('date', ''), reverse=True)
        
        # Cache the processed data
        cache[cache_key] = {
            'data': processed_models,
            'timestamp': datetime.now()
        }
        
        return jsonify(processed_models), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
    except requests.exceptions.RequestException as e:
        print(f"Error fetching fal.ai models: {e}")
        return jsonify({'error': 'Failed to fetch fal.ai models data', 'details': str(e)}), 500
    except Exception as e:
        print(f"Error processing fal.ai models data: {e}")
        return jsonify({'error': 'Error processing fal.ai models data', 'details': str(e)}), 500

@app.route('/api/replicate-models', methods=['GET'])
def get_replicate_models():
    """Get media generation models data from Replicate API with optional streaming updates."""
    cache_key = get_cache_key('replicate_models')
    stream_results = request.args.get('stream', 'false').lower() == 'true'
    page = int(request.args.get('page', '1') or 1)
    page = page if page > 0 else 1
    raw_page_size = request.args.get('page_size')
    page_size = MAX_REPLICATE_MODELS
    if raw_page_size and raw_page_size.isdigit():
        page_size = max(1, min(int(raw_page_size), MAX_REPLICATE_TOTAL))

    if stream_results:
        page_size = MAX_REPLICATE_MODELS

    def process_category(model_data):
        try:
            model_name = (model_data.get('name') or '').lower()
            description = (model_data.get('description') or '').lower()
            text_blob = f"{model_name} {description}"
            if any(keyword in text_blob for keyword in ['video', 'motion', 'animate']):
                return 'video-generation'
            if any(keyword in text_blob for keyword in ['image', 'photo', 'picture', 'visual']):
                return 'image-generation'
            if any(keyword in text_blob for keyword in ['audio', 'music', 'sound', 'speech']):
                return 'audio-generation'
            if any(keyword in text_blob for keyword in ['upscale', 'enhance', 'restore']):
                return 'image-enhancement'
            if any(keyword in text_blob for keyword in ['text', 'chat', 'language']):
                return 'text-generation'
            return 'other'
        except Exception as exc:
            print(f"Error in category detection: {exc}")
            return 'unknown'

    def stream_from_cache(models):
        def generator():
            yield f"data: {json.dumps({'type': 'start', 'total': len(models)})}\n\n"
            for model in models:
                yield f"data: {json.dumps({'type': 'model', 'model': model}, ensure_ascii=False)}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'total': len(models), 'source': 'cache'})}\n\n"
        return Response(
            stream_with_context(generator()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'Access-Control-Allow-Origin': '*'
            }
        )

    if stream_results and cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return stream_from_cache(cache[cache_key]['data'])

    if not stream_results and cache_key in cache and is_cache_valid(cache[cache_key]['timestamp']):
        return jsonify(cache[cache_key]['data'])

    def build_model_payload(model_data):
        owner = model_data.get('owner', '')
        slug = model_data.get('slug') or model_data.get('name') or ''
        model_id = f"{owner}/{slug}".strip('/')

        processed_model = {
            'id': model_id,
            'name': model_data.get('name') or slug,
            'owner': owner,
            'title': model_data.get('name') or slug,
            'description': model_data.get('description', ''),
            'url': model_data.get('url'),
            'cover_image_url': model_data.get('cover_image_url'),
            'github_url': model_data.get('github_url'),
            'paper_url': model_data.get('paper_url'),
            'license_url': model_data.get('license_url'),
            'created_at': model_data.get('created_at') or model_data.get('published_at'),
            'run_count': model_data.get('run_count', 0),
            'visibility': model_data.get('visibility', ''),
            'platform': 'replicate'
        }

        latest_version = model_data.get('latest_version')
        default_example = model_data.get('default_example')
        if isinstance(latest_version, dict):
            processed_model['latest_version'] = latest_version
            processed_model['latest_version_created_at'] = latest_version.get('created_at')
        if isinstance(default_example, dict):
            processed_model['default_example'] = default_example
            processed_model['default_inputs'] = default_example.get('input') or {}
            latency_seconds = compute_latency_seconds(default_example)
            if latency_seconds is not None:
                processed_model['latency_seconds'] = latency_seconds

        processed_model['category'] = process_category(processed_model)
        return processed_model

    def fetch_collection_page(page_number):
        response = requests.get(
            f'{REPLICATE_BASE_URL}/collections/official',
            headers={
                'Authorization': f'Token {REPLICATE_API_KEY}',
                'Content-Type': 'application/json'
            },
            params={'per_page': page_size, 'page': page_number},
            timeout=10
        )
        response.raise_for_status()
        payload = response.json()
        raw_models = payload.get('models') or []
        processed = []
        for entry in raw_models:
            try:
                processed.append(build_model_payload(entry))
            except Exception as exc:
                print(f"Error transforming Replicate model entry: {exc}")
        pagination = payload.get('pagination') or {}
        has_next = bool(pagination.get('next'))
        return processed, has_next

    try:
        if stream_results:
            def streaming_generator():
                seen_ids = set()
                processed_models = []
                current_page = page
                pages_fetched = 0
                total_sent = 0
                yield f"data: {json.dumps({'type': 'start'})}\n\n"

                while pages_fetched < MAX_REPLICATE_PAGES and len(processed_models) < MAX_REPLICATE_TOTAL:
                    page_models, has_next = fetch_collection_page(current_page)
                    if not page_models:
                        break

                    for model in page_models:
                        model_id = model.get('id')
                        if model_id and model_id in seen_ids:
                            continue
                        seen_ids.add(model_id)
                        processed_models.append(model)
                        total_sent += 1
                        yield f"data: {json.dumps({'type': 'model', 'model': model}, ensure_ascii=False)}\n\n"

                        if len(processed_models) >= MAX_REPLICATE_TOTAL:
                            break

                    pages_fetched += 1
                    current_page += 1
                    if not has_next or len(processed_models) >= MAX_REPLICATE_TOTAL:
                        break

                cache[cache_key] = {
                    'data': processed_models,
                    'timestamp': datetime.now()
                }

                yield f"data: {json.dumps({'type': 'done', 'total': total_sent, 'pagesFetched': pages_fetched, 'source': 'live'})}\n\n"

            return Response(
                stream_with_context(streaming_generator()),
                mimetype='text/event-stream',
                headers={
                    'Cache-Control': 'no-cache',
                    'Connection': 'keep-alive',
                    'Access-Control-Allow-Origin': '*'
                }
            )

        # Non-streaming path
        if request.args.get('page'):
            page_models, _ = fetch_collection_page(page)
            return jsonify(page_models), 200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }

        aggregated_models = []
        seen_ids = set()
        current_page = 1
        pages_fetched = 0

        while pages_fetched < MAX_REPLICATE_PAGES and len(aggregated_models) < MAX_REPLICATE_TOTAL:
            page_models, has_next = fetch_collection_page(current_page)
            if not page_models:
                break

            for model in page_models:
                model_id = model.get('id')
                if model_id and model_id in seen_ids:
                    continue
                seen_ids.add(model_id)
                aggregated_models.append(model)
                if len(aggregated_models) >= MAX_REPLICATE_TOTAL:
                    break

            pages_fetched += 1
            current_page += 1
            if not has_next or len(aggregated_models) >= MAX_REPLICATE_TOTAL:
                break

        cache[cache_key] = {
            'data': aggregated_models,
            'timestamp': datetime.now()
        }

        return jsonify(aggregated_models), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }

    except requests.exceptions.RequestException as exc:
        print(f"Error fetching Replicate models: {exc}")
        return jsonify({'error': 'Failed to fetch Replicate models data', 'details': str(exc)}), 500
    except Exception as exc:
        print(f"Error processing Replicate models data: {exc}")
        return jsonify({'error': 'Error processing Replicate models data', 'details': str(exc)}), 500

# AI Agent Tool Endpoints
@app.route('/api/agent-tools/search-models', methods=['POST'])
def search_models():
    """Search for models by name, creator, or category."""
    try:
        data = request.json
        query = data.get('query', '').lower()
        category = data.get('category', 'llms')  # llms, text-to-image, etc.
        limit = data.get('limit', 5)
        
        # Get cached data for the category
        cache_key = get_cache_key(category.replace('-', '_'))
        if cache_key not in cache:
            return jsonify({'models': []})
        
        models = cache[cache_key]['data']['data']
        
        # Filter models based on query
        filtered_models = []
        for model in models:
            if (query in model['name'].lower() or
                query in model['model_creator']['name'].lower()):
                filtered_models.append({
                    'name': model['name'],
                    'creator': model['model_creator']['name'],
                    'id': model.get('id', ''),
                    'key_metrics': extract_key_metrics(model, category)
                })
        
        return jsonify({'models': filtered_models[:limit]})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent-tools/top-models', methods=['POST'])
def get_top_models():
    """Get top performing models in a category."""
    try:
        data = request.json
        category = data.get('category', 'llms')
        metric = data.get('metric', 'intelligence')  # intelligence, speed, cost, etc.
        limit = data.get('limit', 5)
        
        cache_key = get_cache_key(category.replace('-', '_'))
        if cache_key not in cache:
            return jsonify({'models': []})
        
        models = cache[cache_key]['data']['data']
        
        # Sort models by the specified metric
        sorted_models = sort_models_by_metric(models, metric, category)
        
        top_models = []
        for model in sorted_models[:limit]:
            top_models.append({
                'name': model['name'],
                'creator': model['model_creator']['name'],
                'rank': len(top_models) + 1,
                'key_metrics': extract_key_metrics(model, category)
            })
        
        return jsonify({'models': top_models})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/agent-tools/compare-models', methods=['POST'])
def compare_models():
    """Compare specific models."""
    try:
        data = request.json
        model_names = data.get('models', [])
        category = data.get('category', 'llms')
        
        if not model_names:
            return jsonify({'comparison': []})
        
        cache_key = get_cache_key(category.replace('-', '_'))
        if cache_key not in cache:
            return jsonify({'comparison': []})
        
        models = cache[cache_key]['data']['data']
        
        comparison = []
        for model in models:
            if model['name'].lower() in [name.lower() for name in model_names]:
                comparison.append({
                    'name': model['name'],
                    'creator': model['model_creator']['name'],
                    'metrics': extract_key_metrics(model, category)
                })
        
        return jsonify({'comparison': comparison})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def extract_key_metrics(model, category):
    """Extract key metrics based on category."""
    if category == 'llms':
        return {
            'intelligence_index': model.get('evaluations', {}).get('artificial_analysis_intelligence_index'),
            'coding_index': model.get('evaluations', {}).get('artificial_analysis_coding_index'),
            'speed': model.get('median_output_tokens_per_second'),
            'input_price': model.get('pricing', {}).get('price_1m_input_tokens'),
            'output_price': model.get('pricing', {}).get('price_1m_output_tokens')
        }
    else:
        return {
            'elo_score': model.get('elo'),
            'rank': model.get('rank'),
            'confidence_interval': model.get('ci95')
        }

def sort_models_by_metric(models, metric, category):
    """Sort models by specified metric."""
    if category == 'llms':
        if metric == 'intelligence':
            return sorted(models, key=lambda x: x.get('evaluations', {}).get('artificial_analysis_intelligence_index', 0), reverse=True)
        elif metric == 'speed':
            return sorted(models, key=lambda x: x.get('median_output_tokens_per_second', 0), reverse=True)
        elif metric == 'cost':
            return sorted(models, key=lambda x: x.get('pricing', {}).get('price_1m_input_tokens', float('inf')))
    else:
        return sorted(models, key=lambda x: x.get('elo', 0), reverse=True)
    
    return models

@app.route('/api/ai-agent', methods=['POST'])
def ai_agent():
    """Server-side orchestration for the conversational agent with tool looping support."""
    try:
        try:
            user_openrouter_token = require_user_openrouter_token()
        except MissingOpenRouterKeyError:
            return openrouter_key_required_response()

        try:
            raw_body = request.get_data(as_text=True)
        except Exception as exc:
            raw_body = f"<failed to read raw body: {exc}>"
        try:
            data = request.get_json(force=False, silent=True)
            if data is None and raw_body:
                data = json.loads(raw_body)
        except Exception:
            data = json.loads(raw_body) if raw_body else {}
        data = data or {}

        user_message = data.get('message', '')
        stream = bool(data.get('stream', False))
        conversation_history = data.get('conversationHistory', []) or []
        analysis_sequence = get_analysis_sequence_map()
        selected_model = data.get('model') or get_config_value(['agent', 'defaultModel'], 'z-ai/glm-4.5')

        raw_deep_flag = data.get('deepResearch')
        if raw_deep_flag is None:
            raw_deep_flag = data.get('deep_research')
        if isinstance(raw_deep_flag, str):
            deep_research = raw_deep_flag.strip().lower() in {'1', 'true', 'yes', 'on'}
        elif raw_deep_flag is not None:
            deep_research = bool(raw_deep_flag)
        else:
            deep_research = False

        try:
            speed_mode = bool(data.get('speedMode', False) or data.get('speed', False))
        except Exception:
            speed_mode = False
        if isinstance(selected_model, str) and selected_model.startswith('speed:'):
            selected_model = selected_model.split('speed:', 1)[1] or selected_model
            speed_mode = True
        if isinstance(selected_model, str) and selected_model.startswith('deepresearch:'):
            selected_model = selected_model.split('deepresearch:', 1)[1] or DEEP_RESEARCH_MODEL_ID
            deep_research = True
        speed_mode_model = get_config_value(['agent', 'speedModeModel'], 'openai/gpt-4o-mini')
        configured_speed_models = {
            str(model_id)
            for model_id in (get_config_value(['agent', 'knownSpeedModels'], default=[]) or [])
        }
        if speed_mode_model:
            configured_speed_models.add(speed_mode_model)
        default_speed_ids = {'openai/gpt-4o-mini', 'x-ai/grok-3-mini', 'openai/gpt-4o'}
        known_speed_ids = configured_speed_models.union(default_speed_ids)
        if isinstance(selected_model, str) and selected_model in known_speed_ids:
            speed_mode = True

        if deep_research:
            speed_mode = False

        final_model = selected_model
        if deep_research:
            final_model = DEEP_RESEARCH_MODEL_ID

        if not user_message:
            return jsonify({'error': 'Message is required'}), 400

        needs_charts = detect_chart_request(user_message)
        current_theme = request.args.get('theme', 'light')
        if deep_research:
            fetch_categories = list(FETCH_DATA_CATEGORY_CONFIG.keys())
        else:
            fetch_categories = determine_agent_categories(user_message)
        fetch_context = initialize_fetch_context()
        fetch_result = fetch_data_for_categories(fetch_categories)
        fetch_context = merge_fetch_context(fetch_context, fetch_result)
        web_context = initialize_web_context()
        relevant_data = compose_fetch_markdown(fetch_context)
        headers = build_openrouter_headers(user_openrouter_token)
        sse_headers = {
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        model_display_name = get_model_display_name(final_model)

        default_final_prompt = """You are an AI model analysis expert. You can call tools to gather data before responding.

TOOLS AVAILABLE:
- fetch_data(categories: list[str]) -> Loads cached datasets (Artificial Analysis, OpenRouter, fal.ai, Replicate). Request it by replying exactly with `FETCH_DATA: [\"llms\", \"openrouter\"]`.
- ask_perplexity(query: str) -> Live web search for missing information. Request it by replying exactly with `WEB_SEARCH: <query>`.

Current User Question: "{USER_MESSAGE}"

Loaded Datasets: {LOADED_DATASETS}

Fetched Dataset Summary:
{FETCH_DATA_MARKDOWN}

Structured Dataset JSON:
{FETCH_DATA_JSON}

Raw Dataset Snapshot:
{FETCH_DATASETS_JSON}

{WEB_DATA_SECTION}

CONVERSATION USAGE:
- The server may provide conversation history alongside the current message. Incorporate it when useful; do not invent prior exchanges.

GUIDELINES:
1. Treat fetched datasets as ground truth and cite them as "Database".
2. Call `FETCH_DATA` if additional categories are required before answering.
3. Use `WEB_SEARCH` only when the datasets do not contain the needed details; cite returned material as "Web Search".
4. Reference conversation history when it clarifies intent, citing it as "Conversation History".
5. If information remains unavailable after tool usage, acknowledge the gap explicitly.
6. Format the final reply in markdown with clear headers, tables, or bullet lists when appropriate.
7. When ready to answer, respond directly with the final content—do not include tool commands.

Respond concisely and cite the sources (Conversation History, Database, Web Search) supporting each claim."""

        prompt_template = get_prompt_value(['ai-agent', 'final-system'], default_final_prompt)

        if needs_charts:
            prompt_template = append_quickchart_guidance(prompt_template, current_theme)

        def encode_traces(traces_list):
            return f"data: {json.dumps({'type': 'traces', 'traces': traces_list}, ensure_ascii=False)}\n\n".encode('utf-8')

        def encode_content(text):
            return f"data: {json.dumps({'type': 'content', 'content': text}, ensure_ascii=False)}\n\n".encode('utf-8')

        def encode_error(message):
            return f"data: {json.dumps({'type': 'error', 'error': message}, ensure_ascii=False)}\n\n".encode('utf-8')

        def encode_status(status_payload):
            return f"data: {json.dumps({'type': 'status', 'status': status_payload}, ensure_ascii=False)}\n\n".encode('utf-8')
        if stream:
            def generate_stream():
                try:
                    print(f"🚀 [SERVER] Starting stream generation for model: {final_model}")
                    local_generator = agent_tool_loop_generator(
                        user_message,
                        conversation_history,
                        final_model,
                        headers,
                        analysis_sequence,
                        prompt_template,
                        fetch_context,
                        web_context,
                        fetch_categories,
                        theme=current_theme,
                        mode='deep-research' if deep_research else 'standard',
                        max_iterations=8 if deep_research else 6
                    )
                    print(f"✅ [SERVER] Generator created successfully")
                    
                    # Add timeout and connection management
                    start_time = time.time()
                    timeout_seconds = 120  # 2 minute timeout for production
                    
                    events_sent = 0
                    max_events = 5000  # Prevent infinite loops while streaming
                    last_yield_time = start_time
                    stall_timeout = 30  # 30 seconds without yielding
                    content_emitted = False
                    
                    try:
                        for event in local_generator:
                            current_time = time.time()
                            last_yield_time = current_time
                            events_sent += 1
                            print(f"📦 [SERVER] Processing event {events_sent}: {type(event)}")
                            
                            # Check timeout
                            if current_time - start_time > timeout_seconds:
                                print(f"⏰ [SERVER] Stream timeout after {current_time - start_time:.2f}s")
                                timeout_json = json.dumps({'type': 'error', 'error': 'Request timeout - please try again'}, ensure_ascii=False)
                                yield f"data: {timeout_json}\n\n".encode('utf-8')
                                return
                            
                            # Check event limit
                            if events_sent > max_events:
                                print(f"🚫 [SERVER] Event limit exceeded: {events_sent} > {max_events}")
                                error_json = json.dumps({'type': 'error', 'error': 'Too many events - response truncated'}, ensure_ascii=False)
                                yield f"data: {error_json}\n\n".encode('utf-8')
                                return
                            
                            # Validate event structure
                            if not isinstance(event, (list, tuple)) or len(event) < 1:
                                print(f"⚠️ [SERVER] Invalid event structure: {event}")
                                continue
                            
                            kind = event[0]
                            if kind == 'traces':
                                traces_snapshot = event[1] if len(event) > 1 else []
                                print(f"📍 [SERVER] Yielding traces: {len(traces_snapshot)} steps")
                                yield encode_traces(traces_snapshot)
                            elif kind == 'status':
                                status_payload = event[1] if len(event) > 1 else {}
                                print(f"ℹ️  [SERVER] Status update: {status_payload}")
                                yield encode_status(status_payload)
                            elif kind == 'content':
                                chunk_payload = event[1] if len(event) > 1 else ''
                                if chunk_payload:
                                    content_emitted = True
                                    yield encode_content(chunk_payload)
                            elif kind == 'error':
                                error_message = event[1] if len(event) > 1 else 'Unknown error'
                                traces_snapshot = event[2] if len(event) > 2 else []
                                print(f"❌ [SERVER] Yielding error: {error_message}")
                                yield encode_traces(traces_snapshot)
                                error_json = json.dumps({'type': 'error', 'error': error_message}, ensure_ascii=False)
                                yield f"data: {error_json}\n\n".encode('utf-8')
                                return
                            elif kind == 'final':
                                final_content = event[1] if len(event) > 1 else ''
                                final_content = sanitize_quickchart_urls_in_text(final_content or '', current_theme)
                                final_content, _ = ensure_quickchart_visualization(final_content, current_theme)
                                print(f"✅ [SERVER] Final content ready: {len(final_content)} chars")
                                if not content_emitted and final_content:
                                    for chunk in iter_text_chunks(final_content):
                                        yield encode_content(chunk)
                                # Ensure proper termination
                                yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n".encode('utf-8')
                                return
                            else:
                                print(f"⚠️ [SERVER] Unknown event type: {kind}")
                                continue
                        
                        # Ensure we always send a done event if we get here
                        print(f"🏁 [SERVER] Stream completed normally after {events_sent} events")
                        done_json = json.dumps({'type': 'done'}, ensure_ascii=False)
                        yield f"data: {done_json}\n\n".encode('utf-8')
                        return
                    
                    except GeneratorExit:
                        print(f"🛑 [SERVER] Client disconnected from stream")
                        raise
                    except Exception as inner_exc:
                        print(f"❌ [SERVER] Error in stream processing: {inner_exc}")
                        import traceback
                        print(f"TRACEBACK: {traceback.format_exc()}")
                        error_json = json.dumps({'type': 'error', 'error': str(inner_exc)}, ensure_ascii=False)
                        yield f"data: {error_json}\n\n".encode('utf-8')
                        return
                    
                except Exception as exc:
                    print(f"❌ [SERVER] ERROR in generate_stream: {exc}")
                    import traceback
                    print(f"TRACEBACK: {traceback.format_exc()}")
                    try:
                        error_json = json.dumps({'type': 'error', 'error': str(exc)}, ensure_ascii=False)
                        yield f"data: {error_json}\n\n".encode('utf-8')
                    except Exception as json_exc:
                        print(f"❌ [SERVER] Failed to encode error: {json_exc}")
                        yield f"data: {json.dumps({'type': 'error', 'error': 'Unknown error'})}\n\n".encode('utf-8')
                finally:
                    print(f"🧹 [SERVER] Stream generator cleanup completed")

            # Enhanced SSE headers for production compatibility
            enhanced_sse_headers = {
                **sse_headers,
                'X-Accel-Buffering': 'no',  # Disable nginx buffering
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
            
            return Response(
                stream_with_context(generate_stream()),
                mimetype='text/event-stream',
                headers=enhanced_sse_headers
            )

        final_content = ''
        final_traces = []
        final_fetch_ctx = fetch_context
        final_web_ctx = web_context
        error_message = None

        local_generator = agent_tool_loop_generator(
            user_message,
            conversation_history,
            final_model,
            headers,
            analysis_sequence,
            prompt_template,
            fetch_context,
            web_context,
            fetch_categories,
            theme=current_theme,
            mode='deep-research' if deep_research else 'standard',
            max_iterations=8 if deep_research else 6
        )

        for event in local_generator:
            kind = event[0]
            if kind == 'traces':
                final_traces = event[1]
                final_fetch_ctx = event[2]
                final_web_ctx = event[3]
            elif kind == 'error':
                error_message = event[1]
                final_traces = event[2]
                final_fetch_ctx = event[3]
                final_web_ctx = event[4]
                break
            elif kind == 'final':
                final_content = event[1]
                final_traces = event[2]
                final_fetch_ctx = event[3]
                final_web_ctx = event[4]

        if error_message:
            return jsonify({'error': error_message, 'traces': final_traces}), 500
        if not final_content:
            final_content = "I don't have additional information to share right now."
        final_content = sanitize_quickchart_urls_in_text(final_content, current_theme)
        final_content, _ = ensure_quickchart_visualization(final_content, current_theme)

        return jsonify({
            'response': final_content,
            'traces': final_traces,
            'fetch_data': {
                'categories': final_fetch_ctx.get('metadata', []),
                'structured': compose_fetch_structured(final_fetch_ctx),
                'datasets': compose_fetch_datasets(final_fetch_ctx)
            },
            'web_search': final_web_ctx
        })
    except Exception as exc:
        print(f"ERROR: ai_agent handler failed: {exc}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to process agent request.', 'details': str(exc)}), 500

def _handle_model_analysis_post():
    try:
        payload = request.get_json(silent=True) or {}
        model_data = payload.get('model') or {}
        model_type = payload.get('type', 'llm')
        stream = bool(payload.get('stream', False))
        force_refresh = bool(payload.get('force', False))

        if not model_data:
            return jsonify({'error': 'Model data is required'}), 400

        try:
            user_openrouter_token = require_user_openrouter_token()
        except MissingOpenRouterKeyError:
            return openrouter_key_required_response()

        model_name = (
            model_data.get('name')
            or model_data.get('title')
            or model_data.get('id')
            or 'Unknown Model'
        )
        cache_key = f"analysis_{sanitize_for_filename(model_type)}_{sanitize_for_filename(model_name)}"

        existing_payload = None if force_refresh else load_cached_analysis_payload(model_name, model_type)
        if existing_payload:
            if stream:
                return stream_cached_analysis(existing_payload)
            return jsonify(existing_payload)

        analysis_sequence = get_analysis_sequence_map()
        analysis_model = analysis_sequence.get(
            'analysis-generation',
            get_config_value(['analysis', 'defaultModel'], 'openai/gpt-4.1-mini')
        )

        fetch_categories = determine_analysis_categories(model_type, model_data)
        fetch_context = merge_fetch_context(initialize_fetch_context(), fetch_data_for_categories(fetch_categories))

        fetch_structured_json = json.dumps(
            compose_fetch_structured(fetch_context),
            ensure_ascii=False,
            indent=2
        )
        fetch_markdown = compose_fetch_markdown(fetch_context)
        fetch_datasets_json = json.dumps(
            compose_fetch_datasets(fetch_context),
            ensure_ascii=False,
            indent=2
        )

        default_analysis_prompt = """You are an AI model analysis expert. Provide a comprehensive analysis of this model using ONLY the provided data.

Model Data from Database:
{MODEL_DATA_JSON}

Structured Dataset Summary:
{FETCH_DATA_JSON}

Formatted Highlights:
{FETCH_DATA_MARKDOWN}

Raw Dataset Snapshot:
{FETCH_DATASETS_JSON}

Additional Web Research:
{WEB_DATA}

CRITICAL: Base your analysis entirely on the supplied information. Do not use external or internal knowledge.

IMPORTANT: Write your response directly in markdown format. Do NOT wrap it in code fences.

Generate a detailed analysis covering:

## Model Overview
- Name, creator, and category
- Key specifications and capabilities

## Performance Analysis
- Benchmarks and scores (from provided data only)
- Comparisons with similar models (from provided data only)

## Technical Details
- Architecture insights (if available in data)
- Input/output specifications

## Pricing & Availability
- Cost structure and pricing tiers
- Availability and access methods

## Use Cases & Applications
- Recommended applications based on performance data
- Strengths and limitations

## Community & Updates
- Recent developments or updates
- User feedback and adoption

Explicitly note when information is not present in the provided datasets."""
        analysis_prompt_template = get_prompt_value(
            ['model-analysis', 'analysis-generation'],
            default_analysis_prompt
        )
        analysis_prompt = format_prompt(
            analysis_prompt_template,
            MODEL_DATA_JSON=json.dumps(model_data, ensure_ascii=False, indent=2),
            FETCH_DATA_JSON=fetch_structured_json,
            FETCH_DATA_MARKDOWN=fetch_markdown,
            FETCH_DATASETS_JSON=fetch_datasets_json,
            WEB_DATA="Web search was not requested; rely on provided datasets.",
            RELATED_DATA=fetch_markdown
        )

        headers = build_openrouter_headers(user_openrouter_token)

        fetch_description = describe_loaded_categories(
            fetch_context,
            "No datasets were available for the requested categories."
        )
        analysis_tool_name = get_model_display_name(analysis_model)

        sse_headers = {
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }

        fetch_summary = {
            'categories': fetch_context.get('metadata', []),
            'structured': compose_fetch_structured(fetch_context),
            'datasets': compose_fetch_datasets(fetch_context)
        }

        theme = request.args.get('theme', 'light')

        if stream:
            def generate_analysis_stream():
                traces = [
                    {
                        'step': 'Dataset Fetch',
                        'description': fetch_description,
                        'tool': f"fetch_data ({len(fetch_categories)} categories)",
                        'status': 'success'
                    },
                    {
                        'step': 'Analysis Generation',
                        'description': 'Generating comprehensive model analysis',
                        'tool': analysis_tool_name,
                        'status': 'in_progress'
                    }
                ]

                def emit_traces():
                    return f"data: {json.dumps({'type': 'traces', 'traces': traces}, ensure_ascii=False)}\n\n".encode('utf-8')

                def emit_content(value):
                    return f"data: {json.dumps({'type': 'content', 'content': value}, ensure_ascii=False)}\n\n".encode('utf-8')

                yield emit_traces()

                stream_payload = {
                    'model': analysis_model,
                    'messages': [{'role': 'user', 'content': analysis_prompt}],
                    'stream': True,
                    'max_tokens': 4096
                }

                fallback_payload = {
                    'model': analysis_model,
                    'messages': [{'role': 'user', 'content': analysis_prompt}],
                    'stream': False,
                    'max_tokens': 4096
                }

                full_content = ""
                fallback_reason = None
                stream_completed = False
                finish_reason = None
                try:
                    response = requests.post(
                        f'{OPENROUTER_BASE_URL}/chat/completions',
                        headers=headers,
                        json=stream_payload,
                        stream=True,
                        timeout=(10, 180)
                    )
                    if response.status_code != 200:
                        fallback_reason = f'Stream request failed with status {response.status_code}'
                        response = None
                except requests.exceptions.RequestException as exc:
                    print(f"ERROR in analysis stream: {exc}")
                    import traceback
                    print(f"TRACEBACK: {traceback.format_exc()}")
                    fallback_reason = str(exc)
                    response = None

                if response is not None:
                    buffer = ""
                    for chunk in response.iter_content(chunk_size=1024, decode_unicode=True):
                        if not chunk:
                            continue
                        buffer += chunk
                        while True:
                            line_end = buffer.find('\n')
                            if line_end == -1:
                                break
                            line = buffer[:line_end].strip()
                            buffer = buffer[line_end + 1:]
                            if not line.startswith('data: '):
                                continue
                            payload_line = line[6:]
                            if payload_line == '[DONE]':
                                stream_completed = True
                                traces[-1]['status'] = 'success'
                                yield emit_traces()

                                sanitized_content = sanitize_quickchart_urls_in_text(full_content, theme)
                                sanitized_content, _ = ensure_quickchart_visualization(sanitized_content, theme)
                                try:
                                    verified_content = fetch_non_stream_content(headers, fallback_payload, theme)
                                except requests.exceptions.RequestException as exc:
                                    print(f"⚠️ [ANALYSIS] Non-stream verification failed: {exc}")
                                    verified_content = sanitized_content
                                if verified_content and verified_content != sanitized_content:
                                    delta = verified_content[len(sanitized_content):]
                                    if delta:
                                        yield emit_content(delta)
                                    sanitized_content = verified_content
                                    full_content = verified_content

                                analysis_payload = {
                                    'analysis': sanitized_content,
                                    'model_data': model_data,
                                    'traces': traces,
                                    'fetch_data': fetch_summary,
                                    'saved_at': datetime.now().isoformat()
                                }
                                cache[cache_key] = build_cache_entry(analysis_payload)
                                persist_model_analysis(model_name, model_type, sanitized_content, traces, model_data, fetch_summary)

                                yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n".encode('utf-8')
                                return
                            try:
                                parsed = json.loads(payload_line)
                                delta = parsed.get('choices', [{}])[0].get('delta', {})
                                finish_reason = parsed.get('choices', [{}])[0].get('finish_reason') or finish_reason
                                content_piece = delta.get('content')
                                if content_piece:
                                    full_content += content_piece
                                    yield emit_content(content_piece)
                            except json.JSONDecodeError:
                                continue

                if not stream_completed and not fallback_reason:
                    fallback_reason = 'stream ended without completion'
                elif finish_reason and finish_reason != 'stop' and not fallback_reason:
                    fallback_reason = f'stream finished with reason {finish_reason}'

                if fallback_reason:
                    print(f"⚠️ [ANALYSIS] Falling back to non-stream mode: {fallback_reason}")
                    traces[-1]['status'] = 'warning'
                    traces[-1]['description'] = f'Stream interrupted: {fallback_reason}. Retrying without streaming.'
                    yield emit_traces()
                    try:
                        fallback_content = fetch_non_stream_content(headers, fallback_payload, theme)
                        traces[-1]['status'] = 'success'
                        traces[-1]['description'] = 'Analysis generated via non-stream fallback.'
                        yield emit_traces()
                        yield emit_content(fallback_content)

                        analysis_payload = {
                            'analysis': fallback_content,
                            'model_data': model_data,
                            'traces': traces,
                            'fetch_data': fetch_summary,
                            'saved_at': datetime.now().isoformat()
                        }
                        cache[cache_key] = build_cache_entry(analysis_payload)
                        persist_model_analysis(model_name, model_type, fallback_content, traces, model_data, fetch_summary)

                        yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n".encode('utf-8')
                    except requests.exceptions.RequestException as exc:
                        print(f"ERROR in analysis fallback: {exc}")
                        import traceback
                        print(f"TRACEBACK: {traceback.format_exc()}")
                        traces[-1]['status'] = 'failed'
                        traces[-1]['description'] = f'Fallback analysis failed: {exc}'
                        yield emit_traces()
                        error_event = json.dumps({'type': 'error', 'error': str(exc)}, ensure_ascii=False)
                        yield f"data: {error_event}\n\n".encode('utf-8')
                    return

            return Response(stream_with_context(generate_analysis_stream()), mimetype='text/event-stream', headers=sse_headers)

        request_payload = {
            'model': analysis_model,
            'messages': [{'role': 'user', 'content': analysis_prompt}],
            'stream': False,
            'max_tokens': 4096
        }

        try:
            response = requests.post(
                f'{OPENROUTER_BASE_URL}/chat/completions',
                headers=headers,
                json=request_payload,
                timeout=180
            )
            response.raise_for_status()
            result = response.json()
            final_content = (
                result.get('choices', [{}])[0]
                .get('message', {})
                .get('content') or ''
            )
        except requests.exceptions.RequestException as exc:
            return jsonify({'error': f'Analysis request failed: {exc}'}), 500

        final_content = sanitize_quickchart_urls_in_text(final_content, theme)
        final_content, _ = ensure_quickchart_visualization(final_content, theme)

        final_traces = [
            {
                'step': 'Dataset Fetch',
                'description': fetch_description,
                'tool': f"fetch_data ({len(fetch_categories)} categories)",
                'status': 'success'
            },
            {
                'step': 'Analysis Generation',
                'description': 'Generated comprehensive model analysis',
                'tool': analysis_tool_name,
                'status': 'success'
            }
        ]

        analysis_payload = {
            'analysis': final_content,
            'model_data': model_data,
            'traces': final_traces,
            'fetch_data': fetch_summary,
            'saved_at': datetime.now().isoformat()
        }

        cache[cache_key] = build_cache_entry(analysis_payload)
        persist_model_analysis(model_name, model_type, final_content, final_traces, model_data, fetch_summary)

        return jsonify(analysis_payload)
    except Exception as exc:
        print(f"ERROR: model_analysis handler failed: {exc}")
        import traceback
        print(f"TRACEBACK: {traceback.format_exc()}")
        return jsonify({'error': 'Failed to generate model analysis.', 'details': str(exc)}), 500


@app.route('/api/model-analysis', methods=['POST'])
def model_analysis():
    return _handle_model_analysis_post()


@app.route('/model-analysis', methods=['POST'])
def model_analysis_legacy():
    return _handle_model_analysis_post()


@app.route('/api/model-analysis', methods=['GET'])
def get_cached_model_analysis():
    model_name = request.args.get('name')
    model_type = request.args.get('type', 'llm')

    if not model_name:
        return jsonify({'error': 'Model name is required'}), 400

    payload = load_cached_analysis_payload(model_name, model_type)
    if payload:
        return jsonify(payload)

    return jsonify({'cached': False, 'analysis': None}), 200


@app.route('/model-analysis', methods=['GET'])
def get_cached_model_analysis_legacy():
    return get_cached_model_analysis()


def _handle_model_match_post():
    data = request.get_json(silent=True) or {}
    source = (data.get('source') or '').lower().strip()
    target = (data.get('target') or '').lower().strip()
    model_payload = data.get('model') or {}
    force_refresh = bool(data.get('force', False))

    if not source or not target or not model_payload.get('name'):
        return jsonify({'error': 'source, target, and model name are required'}), 400

    try:
        auth_token = require_user_openrouter_token()
    except MissingOpenRouterKeyError:
        return openrouter_key_required_response()

    try:
        result = perform_model_match(
            source,
            target,
            model_payload,
            force_refresh=force_refresh,
            auth_token=auth_token
        )
        return jsonify(result)
    except ValueError as exc:
        return jsonify({'error': str(exc)}), 400
    except requests.exceptions.RequestException as exc:
        return jsonify({'error': 'Model match request failed', 'details': str(exc)}), 500
    except Exception as exc:
        print(f"ERROR: model_match handler failed: {exc}")
        return jsonify({'error': 'Failed to match models', 'details': str(exc)}), 500


@app.route('/api/model-match', methods=['POST'])
def model_match_api():
    return _handle_model_match_post()


def _handle_model_match_get():
    source = (request.args.get('source') or '').lower().strip()
    target = (request.args.get('target') or '').lower().strip()
    model_name = request.args.get('name') or request.args.get('model')
    provider = request.args.get('provider') or ''

    if not source or not target or not model_name:
        return jsonify({'error': 'source, target, and name are required'}), 400

    persisted = get_persisted_model_match(source, target, model_name, provider)
    if persisted:
        hydrated = hydrate_match_metadata(dict(persisted), target)
        return jsonify({'cached': True, 'result': hydrated}), 200

    return jsonify({'cached': False, 'result': None}), 200


@app.route('/api/model-match', methods=['GET'])
def model_match_get_api():
    return _handle_model_match_get()


@app.route('/model-match', methods=['POST'])
def model_match_api_legacy():
    return _handle_model_match_post()


@app.route('/model-match', methods=['GET'])
def model_match_get_api_legacy():
    return _handle_model_match_get()


@app.route('/api/openrouter-models', methods=['GET'])
def get_openrouter_models():
    """Fetch and cache OpenRouter model catalogue."""
    try:
        force_refresh = request.args.get('cache_bust', 'false').lower() == 'true'
        models = load_openrouter_models(force_refresh=force_refresh)
        return jsonify(models), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }

    except MissingOpenRouterKeyError as exc:
        return jsonify({'error': str(exc)}), 500
    except requests.exceptions.RequestException as exc:
        return jsonify({'error': f'Failed to fetch OpenRouter models: {exc}'}), 500
    except Exception as exc:
        return jsonify({'error': f'Error processing OpenRouter models: {exc}'}), 500

@app.route('/api/fetch-data', methods=['POST'])
def fetch_data_api():
    """Aggregate datasets for the requested categories and return structured summaries."""
    try:
        data = request.get_json(silent=True) or {}
        categories = data.get('categories') or []
        limit = data.get('limit')

        if not isinstance(categories, (list, tuple)) or not categories:
            return jsonify({'error': 'At least one category is required.'}), 400

        limit_value = None
        if isinstance(limit, int) and limit > 0:
            limit_value = limit

        result = fetch_data_for_categories(categories, limit_value)
        return jsonify(result)
    except Exception as exc:
        print(f"ERROR: fetch-data tool failed: {exc}")
        return jsonify({'error': 'Failed to fetch dataset summaries'}), 500

@app.route('/api/intelligent-query', methods=['POST'])
def intelligent_query():
    """Use configured model to intelligently process large datasets."""
    try:
        data = request.json
        query = data.get('query', '')

        if not query:
            return jsonify({'error': 'Query is required'}), 400

        try:
            user_openrouter_token = require_user_openrouter_token()
        except MissingOpenRouterKeyError:
            return openrouter_key_required_response()

        # Get all relevant data
        all_data = get_all_data_for_query()
        
        # If no data available, return empty result
        if not all_data:
            return jsonify({
                'relevant_models': [],
                'summary': 'No cached data available. Please load some model data first.'
            })
        
        analysis_sequence = get_analysis_sequence_map()
        intelligent_query_model = analysis_sequence.get('intelligent-query', 'google/gemini-2.5-flash-lite')

        headers = build_openrouter_headers(user_openrouter_token)
        
        default_intelligent_prompt = """You are a data analysis assistant. Analyze the following dataset and extract only the most relevant information for this query: "{QUERY}"

Dataset:
{DATASET_JSON}

Please return ONLY the relevant models/data in this exact JSON format:
{{
    "relevant_models": [
        {{
            "name": "Model Name",
            "creator": "Creator Name",
            "key_metrics": {{
                "metric1": "value1",
                "metric2": "value2"
            }},
            "relevance_reason": "Why this model is relevant"
        }}
    ],
    "summary": "Brief summary of findings"
}}

Be selective - only include the top 5-10 most relevant results. Focus on models that directly answer the query."""
        intelligent_prompt_template = get_prompt_value(
            ['intelligent-query', 'prompt'],
            default_intelligent_prompt
        )
        prompt = format_prompt(
            intelligent_prompt_template,
            QUERY=query,
            DATASET_JSON=json.dumps(all_data, indent=2)
        )
        
        payload = {
            'model': intelligent_query_model,
            'messages': [
                {
                    'role': 'user',
                    'content': prompt
                }
            ],
            'timeout': 30  # 30 second timeout
        }
        
        response = requests.post(
            f'{OPENROUTER_BASE_URL}/chat/completions',
            headers=headers,
            json=payload,
            timeout=25  # 25 second request timeout
        )
        
        if response.status_code == 200:
            result = response.json()
            try:
                # Parse the JSON response from Gemini
                content = result['choices'][0]['message']['content']
                
                if not content:
                    return jsonify({
                        'relevant_models': [],
                        'summary': 'No content received from analysis'
                    })
                
                # Clean content before parsing (remove markdown code blocks if present)
                cleaned_content = content.strip()
                if cleaned_content.startswith('```json'):
                    cleaned_content = cleaned_content[7:]
                if cleaned_content.endswith('```'):
                    cleaned_content = cleaned_content[:-3]
                cleaned_content = cleaned_content.strip()
                
                parsed_data = json.loads(cleaned_content)
                
                # Validate structure
                if not isinstance(parsed_data, dict):
                    raise ValueError("Response is not a valid JSON object")
                
                if 'relevant_models' not in parsed_data:
                    parsed_data['relevant_models'] = []
                    
                if 'summary' not in parsed_data:
                    parsed_data['summary'] = 'Analysis completed successfully'
                
                return jsonify(parsed_data)
                
            except json.JSONDecodeError as e:
                print(f"JSON decode error in intelligent query: {str(e)}")
                return jsonify({
                    'relevant_models': [],
                    'summary': f'Raw response from analysis: {content[:500]}...' if len(content) > 500 else content
                })
            except (KeyError, IndexError, ValueError) as e:
                print(f"Error processing intelligent query response: {str(e)}")
                return jsonify({
                    'relevant_models': [],
                    'summary': 'Error processing analysis response'
                })
        else:
            print(f"Gemini API failed with status {response.status_code}: {response.text}")
            # Fallback to simple data analysis
            return fallback_intelligent_query(query, all_data)
            
    except requests.exceptions.Timeout:
        print("Gemini API timeout, using fallback")
        return fallback_intelligent_query(query, all_data)
    except Exception as e:
        print(f"Intelligent query error: {str(e)}")
        return fallback_intelligent_query(query, all_data)

def fallback_intelligent_query(query, all_data):
    """Fallback method when Gemini API fails."""
    try:
        query_lower = query.lower()
        relevant_models = []
        
        # Check for fal.ai and replicate model queries
        if any(keyword in query_lower for keyword in ['fal', 'fal.ai', 'generation', 'creative']):
            if 'fal_ai_models' in all_data:
                models = all_data['fal_ai_models']
                for model in models[:5]:  # Top 5 fal.ai models
                    relevant_models.append({
                        'name': model.get('title', ''),
                        'creator': 'fal.ai',
                        'key_metrics': {
                            'category': model.get('category', 'N/A'),
                            'date': model.get('date', 'N/A'),
                            'license': model.get('licenseType', 'N/A'),
                            'credits': model.get('creditsRequired', 'N/A')
                        },
                        'relevance_reason': 'Popular fal.ai model for creative generation'
                    })
        
        elif any(keyword in query_lower for keyword in ['replicate', 'open source', 'community']):
            if 'replicate_models' in all_data:
                models = all_data['replicate_models']
                # Sort by popularity (run count)
                sorted_models = sorted(models, key=lambda x: x.get('run_count', 0), reverse=True)[:5]
                for model in sorted_models:
                    relevant_models.append({
                        'name': model.get('name', ''),
                        'creator': f"{model.get('owner', '')} (Replicate)",
                        'key_metrics': {
                            'category': model.get('category', 'N/A'),
                            'run_count': model.get('run_count', 0),
                            'visibility': model.get('visibility', 'N/A'),
                            'created': model.get('created_at', 'N/A')
                        },
                        'relevance_reason': 'Popular open-source model on Replicate'
                    })
        
        # Image generation queries
        elif any(keyword in query_lower for keyword in ['image', 'picture', 'visual', 'art', 'draw']):
            # Check text-to-image models first
            if 'text_to_image_models' in all_data:
                models = all_data['text_to_image_models']
                sorted_models = sorted(models, key=lambda x: x.get('elo', 0), reverse=True)[:3]
                for model in sorted_models:
                    relevant_models.append({
                        'name': model.get('name', ''),
                        'creator': model.get('model_creator', {}).get('name', ''),
                        'key_metrics': {
                            'elo_score': model.get('elo'),
                            'rank': model.get('rank'),
                            'confidence_interval': model.get('ci95')
                        },
                        'relevance_reason': 'Top-rated text-to-image model'
                    })
            
            # Add relevant fal.ai models
            if 'fal_ai_models' in all_data:
                image_models = [m for m in all_data['fal_ai_models'] if 'image' in m.get('category', '').lower()][:2]
                for model in image_models:
                    relevant_models.append({
                        'name': model.get('title', ''),
                        'creator': 'fal.ai',
                        'key_metrics': {
                            'category': model.get('category', 'N/A'),
                            'date': model.get('date', 'N/A')
                        },
                        'relevance_reason': 'Specialized image generation model from fal.ai'
                    })
        
        # LLM and coding queries
        elif any(keyword in query_lower for keyword in ['llm', 'language', 'coding', 'chat', 'code', 'programming']):
            if 'artificial_analysis_llms' in all_data:
                models = all_data['artificial_analysis_llms']
                
                # Sort by coding index if coding query
                if any(keyword in query_lower for keyword in ['coding', 'code', 'programming']):
                    sorted_models = sorted(models,
                        key=lambda x: x.get('evaluations', {}).get('artificial_analysis_coding_index', 0),
                        reverse=True)[:5]
                    
                    for model in sorted_models:
                        relevant_models.append({
                            'name': model.get('name', ''),
                            'creator': model.get('model_creator', {}).get('name', ''),
                            'key_metrics': {
                                'coding_index': model.get('evaluations', {}).get('artificial_analysis_coding_index'),
                                'intelligence_index': model.get('evaluations', {}).get('artificial_analysis_intelligence_index'),
                                'speed': model.get('median_output_tokens_per_second'),
                                'input_price': model.get('pricing', {}).get('price_1m_input_tokens')
                            },
                            'relevance_reason': 'High coding performance based on Artificial Analysis coding index'
                        })
                
                # Sort by intelligence index for general queries
                else:
                    sorted_models = sorted(models,
                        key=lambda x: x.get('evaluations', {}).get('artificial_analysis_intelligence_index', 0),
                        reverse=True)[:5]
                    
                    for model in sorted_models:
                        relevant_models.append({
                            'name': model.get('name', ''),
                            'creator': model.get('model_creator', {}).get('name', ''),
                            'key_metrics': {
                                'intelligence_index': model.get('evaluations', {}).get('artificial_analysis_intelligence_index'),
                                'coding_index': model.get('evaluations', {}).get('artificial_analysis_coding_index'),
                                'speed': model.get('median_output_tokens_per_second'),
                                'input_price': model.get('pricing', {}).get('price_1m_input_tokens')
                            },
                            'relevance_reason': 'High intelligence performance based on Artificial Analysis metrics'
                        })
        
        # General query - mix of different model types
        else:
            # Add top LLM
            if 'artificial_analysis_llms' in all_data:
                llm_models = all_data['artificial_analysis_llms']
                top_llm = sorted(llm_models,
                    key=lambda x: x.get('evaluations', {}).get('artificial_analysis_intelligence_index', 0),
                    reverse=True)[0:1]
                for model in top_llm:
                    relevant_models.append({
                        'name': model.get('name', ''),
                        'creator': model.get('model_creator', {}).get('name', ''),
                        'key_metrics': {
                            'intelligence_index': model.get('evaluations', {}).get('artificial_analysis_intelligence_index'),
                            'speed': model.get('median_output_tokens_per_second')
                        },
                        'relevance_reason': 'Top-performing language model'
                    })
            
            # Add top image model
            if 'text_to_image_models' in all_data:
                image_models = all_data['text_to_image_models']
                top_image = sorted(image_models, key=lambda x: x.get('elo', 0), reverse=True)[0:1]
                for model in top_image:
                    relevant_models.append({
                        'name': model.get('name', ''),
                        'creator': model.get('model_creator', {}).get('name', ''),
                        'key_metrics': {
                            'elo_score': model.get('elo'),
                            'rank': model.get('rank')
                        },
                        'relevance_reason': 'Top-rated image generation model'
                    })
            
            # Add popular replicate model
            if 'replicate_models' in all_data:
                replicate_models = all_data['replicate_models']
                popular_replicate = sorted(replicate_models, key=lambda x: x.get('run_count', 0), reverse=True)[0:1]
                for model in popular_replicate:
                    relevant_models.append({
                        'name': model.get('name', ''),
                        'creator': f"{model.get('owner', '')} (Replicate)",
                        'key_metrics': {
                            'run_count': model.get('run_count', 0),
                            'category': model.get('category', 'N/A')
                        },
                        'relevance_reason': 'Popular community model on Replicate'
                    })
        
        return jsonify({
            'relevant_models': relevant_models,
            'summary': f'Found {len(relevant_models)} relevant models using fallback analysis (AI analysis temporarily unavailable)'
        })
        
    except Exception as e:
        return jsonify({
            'relevant_models': [],
            'summary': f'Fallback analysis failed: {str(e)}'
        })

def get_all_data_for_query():
    """Get all cached data for intelligent processing with size limits."""
    all_data = {}
    
    # Get Artificial Analysis LLM data
    llm_cache_key = get_cache_key('llms')
    if llm_cache_key in cache:
        all_data['artificial_analysis_llms'] = cache[llm_cache_key]['data']['data']
    
    # Get OpenRouter models data (limit to 50 models to avoid size issues)
    or_cache_key = get_cache_key('openrouter_models')
    if or_cache_key in cache:
        all_data['openrouter_models'] = cache[or_cache_key]['data']['data'][:50]
    
    # Get text-to-image data
    tti_cache_key = get_cache_key('text_to_image', {'include_categories': True})
    if tti_cache_key in cache:
        all_data['text_to_image_models'] = cache[tti_cache_key]['data']['data']
    
    # Get image editing data
    ie_cache_key = get_cache_key('image_editing')
    if ie_cache_key in cache:
        all_data['image_editing_models'] = cache[ie_cache_key]['data']['data']
    
    # Get text-to-speech data
    tts_cache_key = get_cache_key('text_to_speech')
    if tts_cache_key in cache:
        all_data['text_to_speech_models'] = cache[tts_cache_key]['data']['data']
    
    # Get text-to-video data
    ttv_cache_key = get_cache_key('text_to_video')
    if ttv_cache_key in cache:
        all_data['text_to_video_models'] = cache[ttv_cache_key]['data']['data']
    
    # Get image-to-video data
    itv_cache_key = get_cache_key('image_to_video')
    if itv_cache_key in cache:
        all_data['image_to_video_models'] = cache[itv_cache_key]['data']['data']
    
    # Get fal.ai models data (limit to 50 models to avoid size issues)
    fal_cache_key = get_cache_key('fal_models')
    if fal_cache_key in cache:
        fal_models = cache[fal_cache_key]['data']
        # Take top 50 most recent models
        all_data['fal_ai_models'] = sorted(fal_models, key=lambda x: x.get('date', ''), reverse=True)[:50]
    
    # Get Replicate models data (limit to 50 models to avoid size issues)
    replicate_cache_key = get_cache_key('replicate_models')
    if replicate_cache_key in cache:
        replicate_models = cache[replicate_cache_key]['data']
        # Take top 50 most popular models
        all_data['replicate_models'] = sorted(replicate_models, key=lambda x: x.get('run_count', 0), reverse=True)[:50]
    
    return all_data

# QuickChart.io integration for visualizations
QUICKCHART_URL_PATTERN = re.compile(
    r'https://(?:www\.)?quickchart\.io/chart\?[^)\s]+',
    re.IGNORECASE
)


def parse_chart_config_string(raw_config):
    """Parse a chart configuration string that may use JSON or JavaScript-style syntax."""
    if not raw_config or not isinstance(raw_config, str):
        return None

    # Fast path for proper JSON payloads
    try:
        parsed = json.loads(raw_config)
        if isinstance(parsed, dict):
            return parsed
    except json.JSONDecodeError:
        pass

    # Attempt to coerce common JavaScript-style literals to Python equivalents
    sanitized = raw_config.strip()
    replacements = {
        r'(?<![\w$])true(?![\w$])': 'True',
        r'(?<![\w$])false(?![\w$])': 'False',
        r'(?<![\w$])null(?![\w$])': 'None'
    }
    for pattern, replacement in replacements.items():
        sanitized = re.sub(pattern, replacement, sanitized, flags=re.IGNORECASE)

    try:
        parsed = ast.literal_eval(sanitized)
        if isinstance(parsed, dict):
            return parsed
    except (ValueError, SyntaxError):
        return None

    return None


def normalize_quickchart_url(raw_url, theme='light'):
    """Rebuild QuickChart URLs with sanitized configuration payloads."""
    if not raw_url or 'quickchart.io' not in raw_url:
        return raw_url

    try:
        parsed_url = urllib.parse.urlparse(raw_url)
        if parsed_url.netloc.lower().rstrip(':') not in {'quickchart.io', 'www.quickchart.io'}:
            return raw_url

        query_params = urllib.parse.parse_qs(parsed_url.query)
        chart_param = None
        for candidate in ('c', 'chart', 'config'):
            values = query_params.get(candidate)
            if values:
                chart_param = values[0]
                break

        if not chart_param:
            return raw_url

        decoded_config = urllib.parse.unquote(chart_param)
        parsed_config = parse_chart_config_string(decoded_config)
        if not isinstance(parsed_config, dict):
            return raw_url

        return get_quickchart_url(parsed_config, theme=theme)
    except Exception as exc:
        print(f"WARNING: Failed to normalize QuickChart URL '{raw_url}': {exc}")
        return raw_url


def sanitize_quickchart_urls_in_text(content, theme='light'):
    """Replace QuickChart URLs in markdown text with sanitized equivalents."""
    if not content or 'quickchart.io' not in content:
        return content

    def replacer(match):
        url = match.group(0)
        return normalize_quickchart_url(url, theme=theme)

    return QUICKCHART_URL_PATTERN.sub(replacer, content)


def _parse_float(value):
    if value is None:
        return None
    cleaned = str(value).replace(',', '')
    match = re.search(r'-?\d+(?:\.\d+)?', cleaned)
    if not match:
        return None
    try:
        return float(match.group(0))
    except ValueError:
        return None


def _strip_markdown_tokens(text):
    if text is None:
        return ''
    return re.sub(r'[*_`]', '', str(text)).strip()


def _extract_markdown_table_rows(content):
    lines = content.splitlines()
    table_lines = []
    collecting = False
    for line in lines:
        stripped = line.strip()
        if stripped.startswith('|') and '|' in stripped:
            if not collecting and 'model' in stripped.lower():
                collecting = True
            if collecting:
                table_lines.append(stripped)
        elif collecting:
            break

    if len(table_lines) < 3:
        return []

    headers = [_strip_markdown_tokens(part).lower() for part in table_lines[0].strip('|').split('|')]
    data_lines = [
        l for l in table_lines[2:]
        if any(ch not in '-:| ' for ch in l)
    ]

    rows = []
    for line in data_lines:
        cells = [_strip_markdown_tokens(part) for part in line.strip('|').split('|')]
        if len(cells) != len(headers):
            continue
        rows.append(dict(zip(headers, cells)))
    return rows


def _extract_model_rows(content):
    rows = _extract_markdown_table_rows(content)
    if not rows:
        return []

    def find_header(keywords):
        for header in rows[0].keys():
            lowered = header.lower()
            if any(keyword in lowered for keyword in keywords):
                return header
        return None

    model_col = find_header(['model'])
    price_col = find_header(['price'])
    speed_col = find_header(['speed', 'tokens'])
    coding_col = find_header(['coding', 'intelligence'])

    extracted = []
    for row in rows:
        name = _strip_markdown_tokens(row.get(model_col)) if model_col else ''
        if not name:
            continue

        row_text = ' '.join(row.values())
        price = _parse_float(row.get(price_col)) if price_col else None
        if price is None:
            price = _parse_float(row_text)
        if price is None or price <= 0:
            continue

        speed = _parse_float(row.get(speed_col)) if speed_col else None
        if speed is None:
            speed = _parse_float(row_text)
        if speed is None or speed <= 0:
            continue

        coding = _parse_float(row.get(coding_col)) if coding_col else None
        if coding is None:
            coding = _parse_float(row_text)
        if coding is None:
            continue

        extracted.append({
            'name': name,
            'price': price,
            'speed': speed,
            'coding': coding
        })
    return extracted


def ensure_quickchart_visualization(content, theme='light'):
    """Append a QuickChart visualization when the response lacks one."""
    if not content or 'quickchart.io' in content:
        return content, False

    models = _extract_model_rows(content)
    if len(models) < 2:
        return content, False

    bubble_data = []
    for model in models:
        price = model['price']
        speed = model['speed']
        coding = model['coding']
        if price <= 0 or speed <= 0:
            continue
        radius = max(6, min(30, price * 160))
        bubble_data.append({
            'x': speed,
            'y': coding,
            'r': radius,
            'label': model['name']
        })
    if len(bubble_data) < 2:
        return content, False

    if theme == 'dark':
        dataset_color = 'rgba(96, 165, 250, 0.6)'
        border_color = 'rgba(147, 197, 253, 0.9)'
        text_color = 'white'
    else:
        dataset_color = 'rgba(37, 99, 235, 0.6)'
        border_color = 'rgba(29, 78, 216, 0.9)'
        text_color = 'black'

    chart_config = {
        "type": "bubble",
        "data": {
            "datasets": [{
                "label": "Coding Models",
                "data": bubble_data,
                "backgroundColor": dataset_color,
                "borderColor": border_color,
                "borderWidth": 1,
                "hoverRadius": 10
            }]
        },
        "options": {
            "responsive": True,
            "legend": {"display": False},
            "title": {
                "display": True,
                "text": "Coding Models: Price vs Speed (bubble = price)",
                "fontColor": text_color
            },
            "scales": {
                "xAxes": [{
                    "scaleLabel": {
                        "display": True,
                        "labelString": "Speed (tokens/sec)",
                        "fontColor": text_color
                    },
                    "ticks": {"fontColor": text_color}
                }],
                "yAxes": [{
                    "scaleLabel": {
                        "display": True,
                        "labelString": "Coding Intelligence Index",
                        "fontColor": text_color
                    },
                    "ticks": {"fontColor": text_color}
                }]
            }
        }
    }

    quickchart_url = get_quickchart_url(chart_config, theme)
    augmented = f"{content.rstrip()}\n\n![Coding Models QuickChart]({quickchart_url})\n"
    return augmented, True


def build_quickchart_guidance(theme):
    """Construct guidance text for QuickChart-based visualizations."""
    example_config = {
        "type": "scatter",
        "data": {
            "datasets": [
                {
                    "label": "Example Models",
                    "data": [
                        {"x": 45, "y": 82, "r": 6, "label": "Model Alpha"},
                        {"x": 68, "y": 74, "r": 8, "label": "Model Beta"},
                        {"x": 90, "y": 88, "r": 10, "label": "Model Gamma"}
                    ],
                    "backgroundColor": "rgba(17, 24, 39, 0.65)",
                    "borderColor": "rgba(17, 24, 39, 0.9)",
                    "hoverRadius": 12
                }
            ]
        },
        "options": {
            "plugins": {
                "legend": {"display": False},
                "tooltip": {"enabled": True}
            },
            "scales": {
                "x": {"title": {"display": True, "text": "Speed (tokens/sec)"}},
                "y": {"title": {"display": True, "text": "Coding Intelligence Index"}}
            }
        }
    }
    example_url = get_quickchart_url(example_config, theme=theme)
    return (
        f"### QuickChart Visualization Mode ({theme} theme)\n"
        "- When visualizations improve clarity, embed QuickChart.io images using markdown syntax: "
        "![Chart Title](quickchart_url).\n"
        "- Generate valid JSON chart configurations (double quotes only) with explicit axis titles, units, and "
        "sensible numeric scales derived from the provided datasets.\n"
        "- For scatter or bubble charts, map X and Y axes to the requested metrics and encode magnitude with "
        "`data[].r` (radius). Supply readable `backgroundColor` and `borderColor` values that respect the active theme.\n"
        "- Label every point via `data[].label` so each model is identifiable in the chart and ensure tooltips remain informative.\n"
        "- Cite data sources (Database, Web Search, Conversation History) alongside the chart analysis.\n"
        f"- Example QuickChart URL: {example_url}"
    )


def append_quickchart_guidance(prompt_template, theme):
    """Inject QuickChart guidance into the active prompt template."""
    guidance = build_quickchart_guidance(theme)
    placeholder = '{QUICKCHART_GUIDANCE}'
    if placeholder in prompt_template:
        return prompt_template.replace(placeholder, guidance)
    return f"{prompt_template}\n\n{guidance}"


def fetch_non_stream_content(headers, payload, theme, timeout=180):
    """Fetch a non-streamed completion and sanitize the response."""
    response = requests.post(
        f'{OPENROUTER_BASE_URL}/chat/completions',
        headers=headers,
        json=payload,
        timeout=timeout
    )
    if response.status_code >= 400:
        try:
            error_payload = response.json()
        except Exception:
            error_payload = response.text
        raise requests.exceptions.HTTPError(
            f'Request failed with status {response.status_code}: {error_payload}',
            response=response
        )
    result = response.json()
    content = (
        result.get('choices', [{}])[0]
        .get('message', {})
        .get('content') or ''
    )
    sanitized = sanitize_quickchart_urls_in_text(content, theme)
    enhanced, _ = ensure_quickchart_visualization(sanitized, theme)
    return enhanced


def get_quickchart_url(chart_config, theme='light'):
    """Generate a QuickChart.io URL for the given chart configuration."""
    
    # Set background color based on theme
    bkg = 'white' if theme == 'light' else 'black'
    
    # Adjust colors based on theme
    if theme == 'dark':
        # Dark theme colors
        text_color = 'white'
        grid_color = 'rgba(255,255,255,0.15)'
        default_bg_color = 'rgba(255,255,255,0.8)'
    else:
        # Light theme colors
        text_color = 'black'
        grid_color = 'rgba(0,0,0,0.1)'
        default_bg_color = 'rgba(0,0,0,0.8)'
    
    # Apply theme to chart config
    if 'options' not in chart_config:
        chart_config['options'] = {}
    
    if 'legend' not in chart_config['options']:
        chart_config['options']['legend'] = {}
    if 'labels' not in chart_config['options']['legend']:
        chart_config['options']['legend']['labels'] = {}
    chart_config['options']['legend']['labels']['fontColor'] = text_color
    
    if 'scales' not in chart_config['options']:
        chart_config['options']['scales'] = {}
    
    if 'xAxes' not in chart_config['options']['scales']:
        chart_config['options']['scales']['xAxes'] = [{}]
    for axis in chart_config['options']['scales']['xAxes']:
        if 'gridLines' not in axis:
            axis['gridLines'] = {}
        axis['gridLines']['display'] = False
        if 'ticks' not in axis:
            axis['ticks'] = {}
        axis['ticks']['fontColor'] = text_color
    
    if 'yAxes' not in chart_config['options']['scales']:
        chart_config['options']['scales']['yAxes'] = [{}]
    for axis in chart_config['options']['scales']['yAxes']:
        if 'gridLines' not in axis:
            axis['gridLines'] = {}
        axis['gridLines']['color'] = grid_color
        if 'ticks' not in axis:
            axis['ticks'] = {}
        axis['ticks']['fontColor'] = text_color
    
    # Apply default background color to datasets if not specified
    if 'datasets' in chart_config.get('data', {}):
        for dataset in chart_config['data']['datasets']:
            if 'backgroundColor' not in dataset:
                dataset['backgroundColor'] = default_bg_color
    
    # Convert config to JSON string
    chart_json = json.dumps(chart_config)
    
    # Create the QuickChart URL
    base_url = "https://quickchart.io/chart"
    params = {
        'bkg': bkg,
        'c': chart_json
    }
    
    # Build the URL
    url = f"{base_url}?{urllib.parse.urlencode(params)}"
    return url

def detect_chart_request(message):
    """Detect if user message requires chart visualization"""
    chart_keywords = [
        'chart', 'graph', 'plot', 'visualize', 'visualization',
        'compare', 'comparison', 'show me', 'display',
        'scatter', 'bar chart', 'histogram', 'pie chart',
        'trend', 'pattern', 'distribution'
    ]
    
    analysis_phrases = [
        'price comparison', 'performance analysis', 'cost effectiveness',
        'speed vs', 'vs', 'top 10', 'best models',
        'cheapest models', 'fastest models', 'most intelligent'
    ]
    
    message_lower = message.lower()
    
    # Check for explicit chart keywords
    for keyword in chart_keywords:
        if keyword in message_lower:
            return True
    
    # Check for analysis phrases that might benefit from charts
    for phrase in analysis_phrases:
        if phrase in message_lower:
            return True
    
    return False

def analyze_data_correlations(model_data, metrics=None):
    """Analyze correlations between different model metrics"""
    try:
        if not model_data or not isinstance(model_data, list):
            return {"error": "Invalid model data provided"}
        
        # Extract numeric metrics for correlation analysis
        correlation_data = []
        available_metrics = set()
        
        for model in model_data:
            if not isinstance(model, dict):
                continue
                
            model_metrics = {}
            model_metrics['name'] = model.get('name', 'Unknown')
            
            # Extract pricing metrics
            if 'pricing' in model:
                pricing = model['pricing']
                if isinstance(pricing, dict):
                    model_metrics['input_price'] = safe_float(pricing.get('price_1m_input_tokens'))
                    model_metrics['output_price'] = safe_float(pricing.get('price_1m_output_tokens'))
            
            # Extract performance metrics
            if 'evaluations' in model:
                evaluations = model['evaluations']
                if isinstance(evaluations, dict):
                    model_metrics['intelligence_index'] = safe_float(evaluations.get('artificial_analysis_intelligence_index'))
                    model_metrics['coding_index'] = safe_float(evaluations.get('artificial_analysis_coding_index'))
                    available_metrics.update(['intelligence_index', 'coding_index'])
            
            # Extract speed metrics
            if 'median_output_tokens_per_second' in model:
                model_metrics['speed'] = safe_float(model['median_output_tokens_per_second'])
                available_metrics.add('speed')
            
            # Extract additional metrics for other model types
            for field in ['quality', 'elo', 'rank', 'context_length', 'response_time']:
                if field in model:
                    model_metrics[field] = safe_float(model[field])
                    available_metrics.add(field)
            
            correlation_data.append(model_metrics)
        
        # Filter for specific metrics if provided
        if metrics:
            available_metrics = available_metrics.intersection(set(metrics))
        
        # Calculate correlations
        correlations = {}
        metric_list = list(available_metrics)
        
        for i, metric1 in enumerate(metric_list):
            for j, metric2 in enumerate(metric_list[i+1:], i+1):
                values1 = [d.get(metric1) for d in correlation_data if d.get(metric1) is not None]
                values2 = [d.get(metric2) for d in correlation_data if d.get(metric2) is not None]
                
                # Align the values (both metrics must exist for same models)
                aligned_values1 = []
                aligned_values2 = []
                for d in correlation_data:
                    if d.get(metric1) is not None and d.get(metric2) is not None:
                        aligned_values1.append(d[metric1])
                        aligned_values2.append(d[metric2])
                
                if len(aligned_values1) >= 3 and len(aligned_values2) >= 3:
                    try:
                        # Calculate Pearson correlation coefficient
                        correlation = np.corrcoef(aligned_values1, aligned_values2)[0, 1]
                        correlations[f"{metric1}_vs_{metric2}"] = {
                            'correlation': correlation,
                            'strength': get_correlation_strength(correlation),
                            'samples': len(aligned_values1)
                        }
                    except:
                        continue
        
        return {
            'correlations': correlations,
            'available_metrics': list(available_metrics),
            'total_models': len(correlation_data),
            'insights': generate_correlation_insights(correlations)
        }
        
    except Exception as e:
        return {"error": f"Correlation analysis failed: {str(e)}"}

def safe_float(value):
    """Safely convert value to float"""
    try:
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Remove common prefixes/suffixes
            clean_value = value.replace('$', '').replace(',', '').strip()
            return float(clean_value)
        return None
    except:
        return None

def get_correlation_strength(correlation):
    """Determine correlation strength category"""
    if correlation is None or np.isnan(correlation):
        return "No Correlation"
    
    abs_corr = abs(correlation)
    if abs_corr >= 0.8:
        return "Very Strong"
    elif abs_corr >= 0.6:
        return "Strong"
    elif abs_corr >= 0.4:
        return "Moderate"
    elif abs_corr >= 0.2:
        return "Weak"
    else:
        return "Very Weak"

def generate_correlation_insights(correlations):
    """Generate insights from correlation analysis"""
    insights = []
    
    for pair, data in correlations.items():
        correlation = data['correlation']
        strength = data['strength']
        
        if abs(correlation) >= 0.6:  # Strong correlations
            direction = "positively" if correlation > 0 else "negatively"
            metrics = pair.replace('_vs_', ' and ').replace('_', ' ')
            insights.append(f"{metrics} are {direction} correlated ({strength.lower()}, r={correlation:.3f})")
    
    if not insights:
        insights.append("No strong correlations found between the analyzed metrics.")
    
    return insights

def create_smart_query_response(user_message, model_data, relevant_data, web_data):
    """Create intelligent response with data integration and correlation analysis"""
    try:
        # Analyze correlations in the data
        correlation_analysis = analyze_data_correlations(model_data)
        
        # Detect query intent
        query_intent = detect_query_intent(user_message)
        
        # Generate contextual insights
        contextual_insights = generate_contextual_insights(user_message, model_data, correlation_analysis)
        
        # Get theme for QuickChart
        theme = request.args.get('theme', 'light')
        
        # Create enhanced prompt with smart integration
        smart_prompt = f"""You are an advanced AI assistant with deep expertise in AI model analysis and data science.

User Query: {user_message}

Query Intent Analysis: {query_intent}

Data Correlation Analysis:
{json.dumps(correlation_analysis, indent=2)}

Contextual Insights:
{contextual_insights}

Available Data:
- Model Performance Data: {len(model_data) if model_data else 0} models
- Cached Analysis Data: {len(relevant_data) if relevant_data else 0} entries
- Web Context: {len(str(web_data)) if web_data else 0} characters

Your response should:
1. Address the user's specific question with data-driven insights
2. Utilize the correlation analysis to provide deeper understanding
3. If visualizations would help, create QuickChart.io charts (theme: {theme})
4. Provide actionable recommendations based on the data patterns

When creating charts, use QuickChart.io with appropriate styling for {theme} theme.
DO NOT generate Python code. Use QuickChart.io for all visualizations.

Focus on delivering intelligent, contextually-aware responses that go beyond simple data retrieval."""

        return append_quickchart_guidance(smart_prompt, theme)
    
    except Exception as e:
        # Fallback to standard prompt
        fallback_prompt = (
            f"You are an AI assistant focused on AI model analysis.\n\n"
            f"User Query: {user_message}\n\n"
            f"Available Data Summary:\n{relevant_data or 'No cached analysis entries provided.'}\n\n"
            f"Supplementary Context:\n{web_data or 'No web context supplied.'}"
        )
        theme = request.args.get('theme', 'light')
        return append_quickchart_guidance(fallback_prompt, theme)

def detect_query_intent(message):
    """Detect the intent behind user queries for smarter responses"""
    message_lower = message.lower()
    
    intents = {
        'comparison': ['compare', 'vs', 'versus', 'difference', 'better', 'best', 'top'],
        'trend_analysis': ['trend', 'over time', 'change', 'evolution', 'improvement'],
        'correlation': ['relationship', 'correlation', 'connected', 'related', 'impact'],
        'ranking': ['rank', 'order', 'sort', 'list', 'top', 'bottom', 'highest', 'lowest'],
        'pricing': ['price', 'cost', 'expensive', 'cheap', 'budget', 'affordable'],
        'performance': ['performance', 'speed', 'quality', 'accuracy', 'benchmark'],
        'visualization': ['chart', 'graph', 'plot', 'visualize', 'show', 'display']
    }
    
    detected_intents = []
    for intent, keywords in intents.items():
        if any(keyword in message_lower for keyword in keywords):
            detected_intents.append(intent)
    
    return detected_intents if detected_intents else ['general_query']

def generate_contextual_insights(user_message, model_data, correlation_analysis):
    """Generate contextual insights based on query and data analysis"""
    insights = []
    
    try:
        if not model_data:
            return "No model data available for analysis."
        
        # Basic statistics
        total_models = len(model_data)
        insights.append(f"Dataset contains {total_models} AI models for analysis.")
        
        # Price range analysis
        prices = []
        for model in model_data:
            if 'pricing' in model and isinstance(model['pricing'], dict):
                input_price = model['pricing'].get('price_1m_input_tokens')
                if input_price and isinstance(input_price, (int, float)):
                    prices.append(input_price)
        
        if prices:
            min_price, max_price = min(prices), max(prices)
            avg_price = sum(prices) / len(prices)
            insights.append(f"Price range: ${min_price:.4f} - ${max_price:.4f} per 1M input tokens (avg: ${avg_price:.4f})")
        
        # Intelligence analysis for LLMs
        intelligence_scores = []
        for model in model_data:
            if 'evaluations' in model and isinstance(model['evaluations'], dict):
                score = model['evaluations'].get('artificial_analysis_intelligence_index')
                if score and isinstance(score, (int, float)):
                    intelligence_scores.append(score)
        
        if intelligence_scores:
            avg_intelligence = sum(intelligence_scores) / len(intelligence_scores)
            insights.append(f"Average intelligence index: {avg_intelligence:.2f}")
        
        # Correlation insights
        if correlation_analysis and 'insights' in correlation_analysis:
            insights.extend(correlation_analysis['insights'][:3])  # Top 3 insights
        
        return "\n".join(insights)
        
    except Exception as e:
        return f"Could not generate contextual insights: {str(e)}"

@app.route('/api/correlation-analysis', methods=['POST'])
def correlation_analysis_endpoint():
    """API endpoint for data correlation analysis"""
    try:
        data = request.json
        category = data.get('category', 'llms')
        metrics = data.get('metrics', None)
        
        # Get cached data for the category
        cache_key = get_cache_key(category.replace('-', '_'))
        if cache_key not in cache:
            return jsonify({'error': 'No cached data available for this category'}), 404
        
        # Extract model data
        model_data = cache[cache_key]['data'].get('data', [])
        
        # Perform correlation analysis
        analysis_result = analyze_data_correlations(model_data, metrics)
        
        return jsonify(analysis_result), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
    except Exception as e:
        return jsonify({
            'error': 'Correlation analysis failed',
            'details': str(e)
        }), 500

@app.route('/api/smart-insights', methods=['POST'])
def smart_insights_endpoint():
    """API endpoint for generating smart insights from data"""
    try:
        data = request.json
        query = data.get('query', '')
        category = data.get('category', 'llms')
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Get cached data
        cache_key = get_cache_key(category.replace('-', '_'))
        if cache_key not in cache:
            return jsonify({'error': 'No cached data available'}), 404
        
        model_data = cache[cache_key]['data'].get('data', [])
        
        # Generate contextual insights
        correlation_analysis = analyze_data_correlations(model_data)
        contextual_insights = generate_contextual_insights(query, model_data, correlation_analysis)
        query_intent = detect_query_intent(query)
        
        return jsonify({
            'insights': contextual_insights,
            'correlations': correlation_analysis,
            'detected_intent': query_intent,
            'total_models': len(model_data)
        }), 200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
    except Exception as e:
        return jsonify({
            'error': 'Smart insights generation failed',
            'details': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'cache_size': len(cache)
    })

@app.route('/api/debug/utf8', methods=['POST'])
def debug_utf8():
    """Debug endpoint to test UTF-8 roundtrip encoding."""
    try:
        data = request.get_json()
        test_text = data.get('text', '🚀 Hello 世界! Testing UTF-8 éñçødîñg ñow!')
        
        # Test response with UTF-8 content
        response_data = {
            'original': test_text,
            'echo': test_text,
            'length': len(test_text),
            'bytes_length': len(test_text.encode('utf-8')),
            'encoding_test': 'UTF-8 encoding test successful! 🎉 测试成功',
            'emoji_test': '🎯🔥💯✨🚀🌟💎',
            'multilang_test': 'English 中文 Español Français Deutsch 日本語 한국어'
        }
        
        return jsonify(response_data), 200, {
            'Content-Type': 'application/json; charset=utf-8',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        }
        
    except Exception as e:
        return jsonify({
            'error': f'UTF-8 debug test failed: {str(e)}',
            'encoding_status': 'failed'
        }), 500, {
            'Content-Type': 'application/json; charset=utf-8'
        }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='AI Model Analysis Dashboard Server')
    parser.add_argument('--port', type=int, help='Port to bind the server')
    parser.add_argument('--host', type=str, help='Host/IP to bind (default 0.0.0.0)')
    parser.add_argument('--debug', action='store_true', help='Enable Flask debug mode')
    args = parser.parse_args()

    # Create static directory if it doesn't exist
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    if not os.path.exists(static_dir):
        os.makedirs(static_dir)
    
    # Copy HTML, CSS, and JS files to static directory
    import shutil
    for file in ['index.html', 'styles.css', 'script.js']:
        if os.path.exists(file):
            shutil.copy2(file, os.path.join(static_dir, file))
    
    # Determine host/port/debug precedence: CLI > env > defaults
    host = args.host or os.environ.get('HOST', '0.0.0.0')

    port = args.port
    if port is None:
        port_str = os.environ.get('PORT', '8765')
        try:
            port = int(port_str)
        except ValueError:
            print(f"Invalid PORT value '{port_str}', falling back to 8765")
            port = 8765

    debug_mode = args.debug or os.environ.get('FLASK_DEBUG', 'false').lower() in ('1', 'true', 'yes')
    print(f"Starting server on {host}:{port} (debug={debug_mode})")
    app.run(debug=debug_mode, host=host, port=port)
