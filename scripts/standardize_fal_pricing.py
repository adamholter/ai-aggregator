#!/usr/bin/env python3
"""
Standardize fal.ai pricing formats using GPT-OSS 120B.

This script:
1. Fetches current fal.ai models from the API
2. Groups by category and processes with LLM
3. Extracts standardized pricing (5s video at lowest res, 1MP for images)
4. Saves to data/fal_pricing_standardized.json
"""

import os
import json
import re
import time
import requests
from typing import Optional

# Try loading .env file if present
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
except ImportError:
    pass

# Configuration
OPENROUTER_API_KEY = os.environ.get('OPENROUTER_API_KEY', '')
LLM_MODEL = 'openai/gpt-oss-120b'
BASE_URL = os.environ.get('FAL_API_BASE', 'http://localhost:8765')
OUTPUT_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'fal_pricing_standardized.json')

# Try to get API key from server if not in environment
def get_api_key():
    global OPENROUTER_API_KEY
    if OPENROUTER_API_KEY:
        return OPENROUTER_API_KEY
    # Try fetching from server's user-stored key
    try:
        # Check if there's a way to get the key from server
        # For now, prompt the user
        key = os.environ.get('OPENROUTER_API_KEY') or input("Enter OpenRouter API key (or set OPENROUTER_API_KEY env var): ").strip()
        OPENROUTER_API_KEY = key
        return key
    except:
        return ''

# Pricing extraction prompt - STRICT JSON enforcement
SYSTEM_PROMPT = """You are a JSON-only pricing parser. Output ONLY valid JSON, no other text.

RULES:
1. VIDEO models: Cost for 5 seconds at LOWEST resolution
2. IMAGE models: Cost for 1 megapixel (1024x1024 = 1MP) output
3. 3D models: Cost for 1 generation at lowest quality
4. AUDIO/SPEECH: Cost for 10 seconds of audio
5. Use the CHEAPEST option when multiple tiers exist
6. Ignore audio add-ons for video unless it's the only option

RESPOND WITH ONLY THIS JSON (no markdown, no explanation):
{"model_type":"video|image|3d|audio|other","reference_price_usd":0.00,"price_per_unit":0.00,"unit":"second|megapixel|image|generation","reference_unit":"5s at 720p","confidence":0.95,"notes":"calculation"}

If unparseable: {"error":"unable to parse","confidence":0}"""

def fetch_fal_models() -> list:
    """Fetch all fal.ai models from the API."""
    try:
        resp = requests.get(f'{BASE_URL}/api/fal-models?limit=1000', timeout=30)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        print(f"Error fetching models: {e}")
        return []

def call_llm(messages: list, retries: int = 2) -> Optional[str]:
    """Call GPT-OSS 120B via OpenRouter with retries."""
    api_key = get_api_key()
    if not api_key:
        print("Warning: No OpenRouter API key available")
        return None
    
    for attempt in range(retries + 1):
        try:
            resp = requests.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json',
                },
                json={
                    'model': LLM_MODEL,
                    'messages': messages,
                    'temperature': 0.0,  # Zero temp for consistent JSON
                    'max_tokens': 500,  # High enough for reasoning + output tokens
                },
                timeout=60
            )
            resp.raise_for_status()
            return resp.json()['choices'][0]['message']['content']
        except Exception as e:
            if attempt < retries:
                continue
            print(f"LLM error: {e}")
            return None
    return None

def extract_json(text: str) -> Optional[dict]:
    """Extract JSON object from text with multiple strategies."""
    if not text:
        return None
    
    # Strategy 1: Direct parse
    try:
        return json.loads(text.strip())
    except:
        pass
    
    # Strategy 2: Find JSON with nested braces support
    try:
        # Find the first { and last }
        start = text.find('{')
        end = text.rfind('}')
        if start != -1 and end != -1 and end > start:
            return json.loads(text[start:end+1])
    except:
        pass
    
    # Strategy 3: Clean markdown code blocks
    try:
        cleaned = re.sub(r'```json\s*', '', text)
        cleaned = re.sub(r'```\s*', '', cleaned)
        return json.loads(cleaned.strip())
    except:
        pass
    
    return None

def parse_pricing_with_llm(model_title: str, category: str, pricing_text: str, max_retries: int = 2) -> dict:
    """Parse a single pricing string using LLM with retries."""
    if not pricing_text or 'Pricing details available on platform' in pricing_text:
        return {'error': 'no_pricing_data', 'confidence': 0}
    
    user_message = f"""Model: {model_title}
Category: {category}
Pricing: {pricing_text}

Output JSON only:"""

    for attempt in range(max_retries + 1):
        response = call_llm([
            {'role': 'system', 'content': SYSTEM_PROMPT},
            {'role': 'user', 'content': user_message}
        ])
        
        if not response:
            if attempt < max_retries:
                continue
            return {'error': 'llm_failed', 'confidence': 0}
        
        result = extract_json(response)
        if result:
            return result
        
        # Retry with stricter prompt
        if attempt < max_retries:
            user_message = f"ONLY OUTPUT JSON. {user_message}"
            continue
    
    return {'error': 'json_parse_failed', 'raw_response': response[:150] if response else '', 'confidence': 0}

def batch_process_models(models: list, batch_size: int = 5) -> dict:
    """Process models and extract standardized pricing."""
    results = {}
    
    # Filter to models with pricing text
    models_with_pricing = [
        m for m in models 
        if m.get('pricing') and 'Pricing details available on platform' not in m.get('pricing', '')
    ]
    
    print(f"Processing {len(models_with_pricing)} models with pricing data...")
    
    for i, model in enumerate(models_with_pricing):
        model_id = model.get('id', model.get('title', f'unknown_{i}'))
        title = model.get('title', 'Unknown')
        category = model.get('category', 'unknown')
        pricing = model.get('pricing', '')
        
        print(f"[{i+1}/{len(models_with_pricing)}] {title[:40]}...", end=' ')
        
        result = parse_pricing_with_llm(title, category, pricing)
        
        results[model_id] = {
            'model_id': model_id,
            'title': title,
            'category': category,
            'pricing_raw': pricing,
            'pricing_standardized': result
        }
        
        if result.get('reference_price_usd'):
            print(f"${result['reference_price_usd']:.3f} ({result.get('reference_unit', 'unit')})")
        else:
            print(f"Error: {result.get('error', 'unknown')}")
        
        # Small delay to avoid rate limiting
        time.sleep(0.5)
    
    return results

def save_results(results: dict):
    """Save standardized pricing to JSON file."""
    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    
    # Load existing if present to merge
    existing = {}
    if os.path.exists(OUTPUT_FILE):
        try:
            with open(OUTPUT_FILE, 'r') as f:
                existing = json.load(f)
        except:
            pass
    
    # Merge new results (overwrite existing)
    existing.update(results)
    
    with open(OUTPUT_FILE, 'w') as f:
        json.dump(existing, f, indent=2)
    
    print(f"\nSaved {len(existing)} entries to {OUTPUT_FILE}")

def main():
    print("Fal.ai Pricing Standardization")
    print("=" * 50)
    
    # Fetch models
    print("Fetching fal.ai models...")
    models = fetch_fal_models()
    print(f"Found {len(models)} models")
    
    if not models:
        print("No models found. Make sure the server is running.")
        return
    
    # Process with LLM
    results = batch_process_models(models)
    
    # Save
    save_results(results)
    
    # Summary
    successful = sum(1 for r in results.values() if r['pricing_standardized'].get('reference_price_usd'))
    print(f"\nSummary: {successful}/{len(results)} models successfully standardized")

if __name__ == '__main__':
    main()
