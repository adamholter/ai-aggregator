"""
Chart API routes for visual model comparisons.

Provides endpoints for generating interactive comparison charts using Plotly.
"""
from flask import Blueprint, request, jsonify


charts_bp = Blueprint('charts', __name__, url_prefix='/api/charts')


def get_charts_service():
    """Lazy import to avoid circular dependencies."""
    from backend.app.services.charts import generate_comparison_chart, extract_model_metrics
    return generate_comparison_chart, extract_model_metrics


@charts_bp.route('/model-comparison', methods=['POST'])
def model_comparison():
    """
    Generate a comparison chart for provided models.
    
    Request JSON:
        {
            "models": [{"name": "...", "quality": 85, ...}, ...],
            "chart_type": "bar" | "radar" | "scatter",
            "metrics": ["quality", "speed", "price"],
            "title": "Optional custom title"
        }
    
    Response:
        {
            "plotly_data": [...],
            "plotly_layout": {...},
            "models_included": [...],
            "metrics_shown": [...]
        }
    """
    generate_comparison_chart, _ = get_charts_service()
    
    data = request.get_json() or {}
    
    models = data.get('models', [])
    if not models:
        return jsonify({'error': 'No models provided'}), 400
    
    chart_type = data.get('chart_type', 'bar')
    if chart_type not in ('bar', 'radar', 'scatter'):
        chart_type = 'bar'
    
    metrics = data.get('metrics')
    if metrics and not isinstance(metrics, list):
        metrics = None
    
    title = data.get('title')
    
    # Additional kwargs for scatter charts
    kwargs = {}
    if chart_type == 'scatter':
        kwargs['x_metric'] = data.get('x_metric', 'price')
        kwargs['y_metric'] = data.get('y_metric', 'quality')
    
    try:
        result = generate_comparison_chart(
            models=models,
            chart_type=chart_type,
            metrics=metrics,
            title=title,
            **kwargs
        )
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@charts_bp.route('/model-comparison', methods=['GET'])
def model_comparison_get():
    """
    GET endpoint for chart generation (accepts query parameters).
    
    Query params:
        - models: comma-separated model IDs (will fetch from cache)
        - chart_type: bar, radar, or scatter
        - metrics: comma-separated metric names
    """
    # This endpoint requires model lookup, so we return instructions
    return jsonify({
        'message': 'Use POST /api/charts/model-comparison with model data in the request body',
        'example': {
            'models': [
                {'name': 'GPT-4', 'quality': 90, 'speed': 50, 'price': 30},
                {'name': 'Claude-3', 'quality': 88, 'speed': 60, 'price': 15}
            ],
            'chart_type': 'bar',
            'metrics': ['quality', 'speed', 'price']
        },
        'supported_chart_types': ['bar', 'radar', 'scatter'],
        'available_metrics': [
            'quality', 'speed', 'price', 'latency', 
            'context_length', 'overall_score'
        ]
    })


@charts_bp.route('/metrics', methods=['GET'])
def available_metrics():
    """Return list of available metrics for comparison."""
    from backend.app.services.charts import METRIC_CONFIG
    
    return jsonify({
        'metrics': [
            {
                'id': key,
                'label': config['label'],
                'unit': config['unit'],
                'higher_better': config['higher_better']
            }
            for key, config in METRIC_CONFIG.items()
        ]
    })


@charts_bp.route('/extract-metrics', methods=['POST'])
def extract_metrics_ai():
    """
    Use AI to extract/estimate metrics for models missing data.
    Uses a fast, cheap model: google/gemini-2.5-flash-lite-preview-09-2025
    
    Request JSON:
        {
            "models": [{"name": "Model Name", ...}, ...],
            "api_key": "user's OpenRouter API key"
        }
    
    Response:
        {
            "models": [
                {"name": "Model Name", "quality": 85, "speed": 100, "price": 2.5, "latency": 500},
                ...
            ]
        }
    """
    import requests as req
    
    data = request.get_json() or {}
    models = data.get('models', [])
    api_key = data.get('api_key')
    
    if not models:
        return jsonify({'error': 'No models provided'}), 400
    
    if not api_key:
        return jsonify({'error': 'OpenRouter API key required'}), 400
    
    # First try to extract metrics programmatically
    _, extract_model_metrics = get_charts_service()
    
    enriched_models = []
    models_needing_ai = []
    
    for model in models:
        metrics = extract_model_metrics(model)
        name = model.get('name') or model.get('id') or 'Unknown'
        
        # Check if we have enough data
        has_quality = 'quality' in metrics
        has_speed = 'speed' in metrics
        has_price = 'price' in metrics
        
        if has_quality and has_speed and has_price:
            enriched_models.append({
                'name': name,
                **metrics,
                '_source': 'programmatic'
            })
        else:
            models_needing_ai.append({
                'name': name,
                'existing_metrics': metrics,
                'original': model
            })
    
    # Use AI to fill in missing metrics
    if models_needing_ai:
        model_names = [m['name'] for m in models_needing_ai]
        
        prompt = f"""You are a fast data lookup assistant. For each AI model listed below, provide the best available metrics.

MODELS TO LOOK UP:
{', '.join(model_names)}

OUTPUT REQUIREMENTS:
Return ONLY a JSON array, no markdown, no explanation. Each object must have:
- name: exact model name
- quality: 0-100 score (use benchmark scores like MMLU, coding ability, or overall quality ranking)
- speed: tokens per second output speed (typical range: 20-300)
- price: USD per 1M tokens (blended input/output average, typical range: 0.1-30)
- latency: milliseconds to first token (typical range: 100-5000)

If you don't know a value, estimate based on the model family/size. For example:
- GPT-4 class: quality ~85-90, speed ~50-80, price ~10-20
- GPT-3.5/Claude instant: quality ~70-80, speed ~100-200, price ~0.5-2
- Open source 7B: quality ~60-70, speed ~150-250, price ~0.1-0.5

RESPOND WITH ONLY THE JSON ARRAY:"""

        try:
            response = req.post(
                'https://openrouter.ai/api/v1/chat/completions',
                headers={
                    'Authorization': f'Bearer {api_key}',
                    'Content-Type': 'application/json'
                },
                json={
                    'model': 'google/gemini-2.5-flash-lite-preview-06-2025',
                    'messages': [{'role': 'user', 'content': prompt}],
                    'max_tokens': 1000,
                    'temperature': 0.1
                },
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                ai_text = result.get('choices', [{}])[0].get('message', {}).get('content', '')
                
                # Try to parse JSON from response
                import json
                import re
                
                # Extract JSON array from response
                json_match = re.search(r'\[[\s\S]*\]', ai_text)
                if json_match:
                    try:
                        ai_models = json.loads(json_match.group())
                        for ai_model in ai_models:
                            enriched_models.append({
                                **ai_model,
                                '_source': 'ai_extracted'
                            })
                    except json.JSONDecodeError:
                        # If parsing fails, add models with existing metrics
                        for m in models_needing_ai:
                            enriched_models.append({
                                'name': m['name'],
                                **m['existing_metrics'],
                                '_source': 'partial'
                            })
                else:
                    for m in models_needing_ai:
                        enriched_models.append({
                            'name': m['name'],
                            **m['existing_metrics'],
                            '_source': 'partial'
                        })
            else:
                for m in models_needing_ai:
                    enriched_models.append({
                        'name': m['name'],
                        **m['existing_metrics'],
                        '_source': 'partial'
                    })
                    
        except Exception as e:
            print(f"AI extraction error: {e}")
            for m in models_needing_ai:
                enriched_models.append({
                    'name': m['name'],
                    **m['existing_metrics'],
                    '_source': 'partial'
                })
    
    return jsonify({
        'models': enriched_models,
        'programmatic_count': len([m for m in enriched_models if m.get('_source') == 'programmatic']),
        'ai_extracted_count': len([m for m in enriched_models if m.get('_source') == 'ai_extracted'])
    })
