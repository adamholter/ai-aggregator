"""
Chart generation service for visual model comparisons.

Uses Plotly to generate interactive charts comparing AI models across various metrics.
"""
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import json
from typing import Any


# Default metrics for model comparison
DEFAULT_METRICS = ['quality', 'speed', 'price']

# Metric display names and units
METRIC_CONFIG = {
    'quality': {
        'label': 'Quality Score',
        'unit': '',
        'higher_better': True,
        'color': '#3b82f6'  # blue
    },
    'speed': {
        'label': 'Speed (tokens/s)',
        'unit': 'tok/s',
        'higher_better': True,
        'color': '#10b981'  # green
    },
    'price': {
        'label': 'Price',
        'unit': '$/1M tokens',
        'higher_better': False,
        'color': '#f59e0b'  # amber
    },
    'latency': {
        'label': 'Latency',
        'unit': 'ms',
        'higher_better': False,
        'color': '#ef4444'  # red
    },
    'context_length': {
        'label': 'Context Length',
        'unit': 'tokens',
        'higher_better': True,
        'color': '#8b5cf6'  # purple
    },
    'overall_score': {
        'label': 'Overall Score',
        'unit': '',
        'higher_better': True,
        'color': '#06b6d4'  # cyan
    }
}


def extract_model_metrics(model_data: dict) -> dict:
    """
    Extract comparable metrics from a model data dictionary.
    
    Handles various data formats from different sources (AA, OpenRouter, etc.)
    """
    metrics = {}
    
    # Quality metrics - check evaluations object for AA models
    quality = None
    evaluations = model_data.get('evaluations')
    if isinstance(evaluations, dict):
        # AA models use artificial_analysis_intelligence_index, artificial_analysis_coding_index, etc.
        quality = (
            evaluations.get('artificial_analysis_intelligence_index') or
            evaluations.get('artificial_analysis_coding_index') or
            evaluations.get('artificial_analysis_math_index') or
            evaluations.get('overall') or 
            evaluations.get('quality_index') or
            evaluations.get('coding') or
            evaluations.get('math')
        )
    if quality is None:
        quality = (
            model_data.get('quality_index') or
            model_data.get('quality') or
            model_data.get('overall_quality') or
            model_data.get('score') or
            model_data.get('elo_score')
        )
    if quality is not None:
        try:
            metrics['quality'] = float(quality)
        except (TypeError, ValueError):
            pass

    
    # Speed metrics - AA uses median_output_tokens_per_second
    speed = (
        model_data.get('median_output_tokens_per_second') or
        model_data.get('tokens_per_second') or
        model_data.get('speed') or
        model_data.get('output_speed') or
        model_data.get('throughput')
    )
    if speed is not None:
        try:
            metrics['speed'] = float(speed)
        except (TypeError, ValueError):
            pass
    
    # Price metrics (normalize to per-million tokens)
    price = None
    if 'pricing' in model_data and isinstance(model_data['pricing'], dict):
        pricing = model_data['pricing']
        # Try AA format first (price_1m_input_tokens, price_1m_output_tokens)
        prompt_price = (
            pricing.get('price_1m_input_tokens') or 
            pricing.get('prompt') or 
            pricing.get('input')
        )
        completion_price = (
            pricing.get('price_1m_output_tokens') or
            pricing.get('completion') or 
            pricing.get('output')
        )
        if prompt_price is not None and completion_price is not None:
            try:
                # For AA format (already per-million), just average
                if pricing.get('price_1m_input_tokens'):
                    price = (float(prompt_price) + float(completion_price)) / 2
                else:
                    # For OpenRouter format, scale to per-million
                    price = (float(prompt_price) + float(completion_price)) / 2 * 1000000
            except (TypeError, ValueError):
                pass
    elif 'blended_price_per_1m' in model_data:
        try:
            price = float(model_data['blended_price_per_1m'])
        except (TypeError, ValueError):
            pass
    elif 'price_per_token' in model_data:
        try:
            price = float(model_data['price_per_token']) * 1000000
        except (TypeError, ValueError):
            pass
    
    if price is not None:
        metrics['price'] = price
    
    # Latency - AA uses median_time_to_first_token_seconds (convert to ms)
    latency = None
    ttft_seconds = model_data.get('median_time_to_first_token_seconds')
    if ttft_seconds is not None:
        try:
            latency = float(ttft_seconds) * 1000  # Convert to ms
        except (TypeError, ValueError):
            pass
    if latency is None:
        latency = (
            model_data.get('latency_ms') or
            model_data.get('latency') or
            model_data.get('time_to_first_token') or
            model_data.get('median_time_to_first_answer_token')
        )
        if latency is not None:
            try:
                latency = float(latency)
            except (TypeError, ValueError):
                latency = None
    
    if latency is not None:
        metrics['latency'] = latency
    
    # Context length
    context = (
        model_data.get('context_length') or
        model_data.get('context_window') or
        model_data.get('max_context')
    )
    if context is not None:
        try:
            metrics['context_length'] = int(context)
        except (TypeError, ValueError):
            pass
    
    return metrics


def generate_bar_chart(
    models: list[dict],
    metrics: list[str] = None,
    title: str = "Model Comparison"
) -> dict:
    """
    Generate a grouped bar chart comparing models across metrics.
    
    Returns Plotly figure as a JSON-serializable dict.
    """
    if metrics is None:
        metrics = DEFAULT_METRICS
    
    model_names = []
    metric_values = {m: [] for m in metrics}
    
    for model in models:
        name = (
            model.get('name') or 
            model.get('model') or 
            model.get('id') or 
            'Unknown'
        )
        model_names.append(name[:30])  # Truncate long names
        
        extracted = extract_model_metrics(model)
        for m in metrics:
            metric_values[m].append(extracted.get(m, 0))
    
    fig = go.Figure()
    
    for metric in metrics:
        config = METRIC_CONFIG.get(metric, {'label': metric, 'color': '#6b7280'})
        fig.add_trace(go.Bar(
            name=config['label'],
            x=model_names,
            y=metric_values[metric],
            marker_color=config['color'],
            text=[f"{v:.2f}" if v else '' for v in metric_values[metric]],
            textposition='outside'
        ))
    
    fig.update_layout(
        title=dict(
            text=title,
            font=dict(size=20, color='#1f2937')
        ),
        barmode='group',
        xaxis=dict(
            title='Model',
            tickangle=-45,
            tickfont=dict(size=12)
        ),
        yaxis=dict(
            title='Value',
            tickfont=dict(size=12)
        ),
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=1.02,
            xanchor='right',
            x=1
        ),
        template='plotly_white',
        height=500,
        margin=dict(l=60, r=40, t=80, b=120)
    )
    
    return json.loads(fig.to_json())


def generate_radar_chart(
    models: list[dict],
    metrics: list[str] = None,
    title: str = "Model Comparison Radar"
) -> dict:
    """
    Generate a radar/spider chart comparing models across metrics.
    
    Returns Plotly figure as a JSON-serializable dict.
    """
    if metrics is None:
        metrics = DEFAULT_METRICS
    
    fig = go.Figure()
    
    # Normalize values to 0-100 scale for radar chart
    all_values = {m: [] for m in metrics}
    for model in models:
        extracted = extract_model_metrics(model)
        for m in metrics:
            val = extracted.get(m)
            if val is not None:
                all_values[m].append(val)
    
    # Calculate min/max for normalization
    ranges = {}
    for m in metrics:
        vals = all_values[m]
        if vals:
            min_val, max_val = min(vals), max(vals)
            ranges[m] = (min_val, max_val) if max_val > min_val else (0, max_val or 1)
        else:
            ranges[m] = (0, 1)
    
    colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4']
    
    for i, model in enumerate(models):
        name = (
            model.get('name') or 
            model.get('model') or 
            model.get('id') or 
            'Unknown'
        )
        
        extracted = extract_model_metrics(model)
        normalized = []
        
        for m in metrics:
            val = extracted.get(m, 0)
            min_val, max_val = ranges[m]
            config = METRIC_CONFIG.get(m, {'higher_better': True})
            
            if max_val > min_val:
                norm = (val - min_val) / (max_val - min_val) * 100
            else:
                norm = 50
            
            # Invert if lower is better (e.g., price, latency)
            if not config.get('higher_better', True):
                norm = 100 - norm
            
            normalized.append(norm)
        
        # Close the radar by repeating first value
        categories = [METRIC_CONFIG.get(m, {}).get('label', m) for m in metrics]
        categories.append(categories[0])
        normalized.append(normalized[0])
        
        fig.add_trace(go.Scatterpolar(
            r=normalized,
            theta=categories,
            fill='toself',
            name=name[:25],
            line=dict(color=colors[i % len(colors)]),
            opacity=0.7
        ))
    
    fig.update_layout(
        title=dict(
            text=title,
            font=dict(size=20, color='#1f2937')
        ),
        polar=dict(
            radialaxis=dict(
                visible=True,
                range=[0, 100],
                tickfont=dict(size=10)
            )
        ),
        legend=dict(
            orientation='h',
            yanchor='bottom',
            y=-0.2,
            xanchor='center',
            x=0.5
        ),
        template='plotly_white',
        height=550,
        margin=dict(l=80, r=80, t=80, b=100)
    )
    
    return json.loads(fig.to_json())


def generate_scatter_chart(
    models: list[dict],
    x_metric: str = 'price',
    y_metric: str = 'quality',
    size_metric: str = None,
    title: str = "Price vs Quality"
) -> dict:
    """
    Generate a scatter plot comparing models on two axes.
    
    Returns Plotly figure as a JSON-serializable dict.
    """
    x_vals = []
    y_vals = []
    sizes = []
    names = []
    
    for model in models:
        name = (
            model.get('name') or 
            model.get('model') or 
            model.get('id') or 
            'Unknown'
        )
        
        extracted = extract_model_metrics(model)
        x = extracted.get(x_metric)
        y = extracted.get(y_metric)
        
        if x is not None and y is not None:
            x_vals.append(x)
            y_vals.append(y)
            names.append(name[:30])
            
            if size_metric and size_metric in extracted:
                sizes.append(extracted[size_metric])
            else:
                sizes.append(20)
    
    # Normalize sizes
    if sizes and size_metric:
        max_size = max(sizes) if max(sizes) > 0 else 1
        sizes = [max(10, (s / max_size) * 50) for s in sizes]
    else:
        sizes = [20] * len(names)
    
    x_config = METRIC_CONFIG.get(x_metric, {'label': x_metric, 'unit': ''})
    y_config = METRIC_CONFIG.get(y_metric, {'label': y_metric, 'unit': ''})
    
    fig = go.Figure(data=go.Scatter(
        x=x_vals,
        y=y_vals,
        mode='markers+text',
        marker=dict(
            size=sizes,
            color='#3b82f6',
            opacity=0.7,
            line=dict(width=1, color='#1e40af')
        ),
        text=names,
        textposition='top center',
        textfont=dict(size=10),
        hovertemplate=(
            '<b>%{text}</b><br>' +
            f'{x_config["label"]}: %{{x:.2f}}<br>' +
            f'{y_config["label"]}: %{{y:.2f}}<extra></extra>'
        )
    ))
    
    fig.update_layout(
        title=dict(
            text=title,
            font=dict(size=20, color='#1f2937')
        ),
        xaxis=dict(
            title=f'{x_config["label"]} ({x_config["unit"]})' if x_config['unit'] else x_config['label'],
            tickfont=dict(size=12)
        ),
        yaxis=dict(
            title=f'{y_config["label"]} ({y_config["unit"]})' if y_config['unit'] else y_config['label'],
            tickfont=dict(size=12)
        ),
        template='plotly_white',
        height=500,
        margin=dict(l=60, r=40, t=80, b=60)
    )
    
    return json.loads(fig.to_json())


def generate_comparison_chart(
    models: list[dict],
    chart_type: str = 'bar',
    metrics: list[str] = None,
    title: str = None,
    **kwargs
) -> dict:
    """
    Generate a comparison chart of the specified type.
    
    Args:
        models: List of model data dictionaries
        chart_type: 'bar', 'radar', or 'scatter'
        metrics: List of metrics to compare
        title: Chart title
        **kwargs: Additional arguments for specific chart types
    
    Returns:
        Dict containing plotly_data, plotly_layout, and metadata
    """
    if not models:
        return {
            'error': 'No models provided for comparison',
            'plotly_data': [],
            'plotly_layout': {}
        }
    
    if metrics is None:
        metrics = DEFAULT_METRICS
    
    # Filter to metrics that have data
    available_metrics = set()
    for model in models:
        extracted = extract_model_metrics(model)
        available_metrics.update(extracted.keys())
    
    metrics = [m for m in metrics if m in available_metrics]
    
    if not metrics:
        metrics = list(available_metrics)[:3] or DEFAULT_METRICS
    
    if title is None:
        title = f"Model Comparison ({chart_type.title()} Chart)"
    
    if chart_type == 'radar':
        result = generate_radar_chart(models, metrics, title)
    elif chart_type == 'scatter':
        x_metric = kwargs.get('x_metric', 'price')
        y_metric = kwargs.get('y_metric', 'quality')
        result = generate_scatter_chart(models, x_metric, y_metric, title=title)
    else:
        result = generate_bar_chart(models, metrics, title)
    
    return {
        'plotly_data': result.get('data', []),
        'plotly_layout': result.get('layout', {}),
        'models_included': [
            m.get('name') or m.get('model') or m.get('id') 
            for m in models
        ],
        'metrics_shown': metrics,
        'chart_type': chart_type
    }
