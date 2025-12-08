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
