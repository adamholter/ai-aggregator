"""
Application configuration extracted from server.py.

This centralizes all environment variables, constants, and configuration settings.
"""
import os
from datetime import timedelta

# Base directories
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DATA_DIR = os.path.join(BASE_DIR, 'data')
CONFIG_DIR = os.path.join(BASE_DIR, 'config')
ANALYSIS_DIR = os.path.join(BASE_DIR, 'analyses')
LOGS_DIR = os.path.join(BASE_DIR, 'logs')

# File paths
USERS_DB_PATH = os.path.join(DATA_DIR, 'users.json')
PINS_DB_PATH = os.path.join(DATA_DIR, 'pins.json')
MODEL_CONFIG_PATH = os.path.join(CONFIG_DIR, 'model_config.json')
PROMPT_CONFIG_PATH = os.path.join(CONFIG_DIR, 'prompt_config.json')
MODEL_MATCHES_PATH = os.path.join(DATA_DIR, 'model_matches.json')

# API Keys (from environment)
ARTIFICIAL_ANALYSIS_API_KEY = (os.environ.get('ARTIFICIAL_ANALYSIS_API_KEY') or '').strip()
OPENROUTER_API_KEY = (os.environ.get('OPENROUTER_API_KEY') or '').strip()
REPLICATE_API_KEY = (os.environ.get('REPLICATE_API_KEY') or '').strip()
GOOGLE_SHEETS_API_KEY = (os.environ.get('GOOGLE_SHEETS_API_KEY') or '').strip()

# API URLs
ARTIFICIAL_ANALYSIS_BASE_URL = 'https://artificialanalysis.ai/api/v2'
OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1'
REPLICATE_BASE_URL = 'https://api.replicate.com/v1'

# Replicate settings
MAX_REPLICATE_MODELS = max(int(os.environ.get('MAX_REPLICATE_MODELS', '60')), 1)
MAX_REPLICATE_TOTAL = max(int(os.environ.get('MAX_REPLICATE_TOTAL', '250')), MAX_REPLICATE_MODELS)
MAX_REPLICATE_PAGES = max(int(os.environ.get('MAX_REPLICATE_PAGES', '5')), 1)

# Hype/Supabase settings
HYPE_SUPABASE_URL = (os.environ.get('HYPE_SUPABASE_URL') or 
                     'https://chhtbdfienvbfdvdmdoa.supabase.co/rest/v1/repositories').strip()
HYPE_SUPABASE_SOURCES = (os.environ.get('HYPE_SUPABASE_SOURCES') or 
                         'github,huggingface,reddit,replicate').strip()
HYPE_SUPABASE_API_KEY = (os.environ.get('HYPE_SUPABASE_API_KEY') or '').strip()
HYPE_SUPABASE_BEARER = (os.environ.get('HYPE_SUPABASE_BEARER') or HYPE_SUPABASE_API_KEY).strip()
HYPE_SUPABASE_TIMEOUT_SECONDS = max(int(os.environ.get('HYPE_SUPABASE_TIMEOUT_SECONDS', '15')), 1)
HYPE_LOOKBACK_DAYS_DEFAULT = max(int(os.environ.get('HYPE_LOOKBACK_DAYS', '14')), 1)
HYPE_MAX_LIMIT = max(int(os.environ.get('HYPE_MAX_LIMIT', '120')), 1)

# Blog settings
BLOG_POSTS_API_URL = (os.environ.get('BLOG_POSTS_API_URL') or 
                      'https://adam.holter.com/wp-json/wp/v2/posts').strip()
BLOG_POSTS_PER_PAGE = max(int(os.environ.get('BLOG_POSTS_PER_PAGE', '100')), 1)
BLOG_POSTS_MAX_PAGES = max(int(os.environ.get('BLOG_POSTS_MAX_PAGES', '5')), 1)
BLOG_POSTS_TIMEOUT_SECONDS = max(int(os.environ.get('BLOG_POSTS_TIMEOUT_SECONDS', '12')), 1)
BLOG_POSTS_CACHE_MINUTES = max(int(os.environ.get('BLOG_POSTS_CACHE_MINUTES', '15')), 1)
BLOG_POSTS_CACHE_DURATION = timedelta(minutes=BLOG_POSTS_CACHE_MINUTES)
BLOG_POSTS_READING_WPM = max(int(os.environ.get('BLOG_POSTS_READING_WPM', '220')), 60)

# Google Sheets / Monitor settings
MONITOR_SHEET_ID = (os.environ.get('MONITOR_SHEET_ID') or 
                    '1Dg58BUnlBwREG__ls6qcUrj3PHE9LMAOvQMZGesQI84').strip()
MONITOR_SHEET_RANGE = os.environ.get('MONITOR_SHEET_RANGE', 'Data for Dashboard!A:D').strip()
MONITOR_SHEET_GID = (os.environ.get('MONITOR_SHEET_GID') or '435981851').strip()
MONITOR_CACHE_TTL = timedelta(minutes=15)

# Testing Catalog settings
TESTING_CATALOG_BASE_URL = 'https://www.testingcatalog.com/'
TESTING_CATALOG_RSS_URL = 'https://www.testingcatalog.com/rss/'
TESTING_CATALOG_CACHE_TTL = timedelta(hours=24)
TESTING_CATALOG_LOG_PATH = os.path.join(LOGS_DIR, 'testing_catalog.jsonl')
TESTING_CATALOG_HISTORY_PATH = os.path.join(LOGS_DIR, 'testing_catalog_history.json')
FAST_TESTING_CATALOG_PREVIEW_LIMIT = 6
TESTING_CATALOG_MAX_PAGES = max(int(os.environ.get('TESTING_CATALOG_MAX_PAGES', '20')), 1)

# Latest feed settings
LATEST_PREVIEW_LIMIT = max(int(os.environ.get('LATEST_PREVIEW_LIMIT', '10')), 1)
LATEST_CACHE_TTL = timedelta(minutes=max(int(os.environ.get('LATEST_CACHE_MINUTES', '10')), 1))

# Rate limiting
RATE_LIMIT_WINDOW_SECONDS = max(int(os.environ.get('RATE_LIMIT_WINDOW_SECONDS', '60')), 1)
RATE_LIMIT_MAX_REQUESTS = max(int(os.environ.get('RATE_LIMIT_MAX_REQUESTS', '180')), 1)

# Cache settings
CACHE_DURATION = timedelta(hours=1)

# Agent settings
AGENT_EXP_DEFAULT_MODEL = 'x-ai/grok-4-fast'
AGENT_EXP_DEFAULT_LIMIT = 50
AGENT_EXP_MAX_LIMIT = 200
DEEP_RESEARCH_MODEL_ID = 'openai/o4-mini-deep-research'
EXPERIMENTAL_FILTER_MODEL = os.environ.get('EXPERIMENTAL_FILTER_MODEL', 'google/gemini-2.5-flash-0905')

# Usage tracking
USAGE_HISTORY_LIMIT = 400

# Flask settings
APP_SECRET_KEY = os.environ.get('APP_SECRET_KEY') or 'change-me-in-production'

# Error messages
OPENROUTER_KEY_REQUIRED_MESSAGE = (
    'An OpenRouter API key is required for this feature. Add your key in Settings to continue.'
)

# Fallback files
FALLBACK_CATEGORY_FILES = {
    'fal': os.path.join(DATA_DIR, 'fallback', 'fal_models.json'),
    'replicate': os.path.join(DATA_DIR, 'fallback', 'replicate_models.json')
}


def warn_if_missing(name: str, value: str) -> None:
    """Log a warning if an environment variable is not set."""
    if not value:
        print(f"WARNING: Environment variable '{name}' is not set; related features may be unavailable.")


# Warn about missing keys on import
warn_if_missing('ARTIFICIAL_ANALYSIS_API_KEY', ARTIFICIAL_ANALYSIS_API_KEY)
warn_if_missing('OPENROUTER_API_KEY', OPENROUTER_API_KEY)
warn_if_missing('REPLICATE_API_KEY', REPLICATE_API_KEY)
warn_if_missing('HYPE_SUPABASE_API_KEY', HYPE_SUPABASE_API_KEY)
