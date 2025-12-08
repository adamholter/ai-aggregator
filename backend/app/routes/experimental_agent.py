"""
Flask blueprint for the experimental Pydantic AI agent.

Provides /experimental-agent page and /api/experimental-agent endpoint.
"""
import asyncio
import json
from flask import Blueprint, request, jsonify, Response, render_template_string, send_from_directory
import os


experimental_agent_bp = Blueprint(
    'experimental_agent', 
    __name__,
    url_prefix=''
)


def get_agent_module():
    """Lazy import to avoid circular dependencies."""
    from backend.app.services.pydantic_agent import run_agent, run_agent_stream
    return run_agent, run_agent_stream


@experimental_agent_bp.route('/experimental-agent')
def experimental_agent_page():
    """Serve the experimental agent HTML page."""
    static_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'static')
    return send_from_directory(static_dir, 'experimental-agent.html')


@experimental_agent_bp.route('/api/experimental-agent', methods=['POST'])
def experimental_agent_api():
    """
    Run the experimental Pydantic AI agent.
    
    Request JSON:
        {
            "question": "What's new with Gemini?",
            "model": "x-ai/grok-4-fast",
            "api_key": "sk-or-..."  (optional, uses header if not provided)
        }
    
    Response:
        {
            "response": "...",
            "tool_calls": [...],
            "model": "..."
        }
    """
    run_agent, _ = get_agent_module()
    
    data = request.get_json() or {}
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({'error': 'No question provided'}), 400
    
    # Get API key from request or Authorization header
    api_key = data.get('api_key', '')
    if not api_key:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.lower().startswith('bearer '):
            api_key = auth_header[7:].strip()
    
    if not api_key:
        return jsonify({'error': 'OpenRouter API key required'}), 401
    
    model_id = data.get('model', 'x-ai/grok-4-fast')
    base_url = request.host_url.rstrip('/')
    
    try:
        # Run the async agent in a sync context
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            result = loop.run_until_complete(
                run_agent(question, api_key, model_id, base_url)
            )
        finally:
            loop.close()
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@experimental_agent_bp.route('/api/experimental-agent/stream', methods=['POST'])
def experimental_agent_stream():
    """
    Stream the experimental agent response.
    
    Uses Server-Sent Events (SSE) format.
    """
    _, run_agent_stream = get_agent_module()
    
    data = request.get_json() or {}
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({'error': 'No question provided'}), 400
    
    api_key = data.get('api_key', '')
    if not api_key:
        auth_header = request.headers.get('Authorization', '')
        if auth_header.lower().startswith('bearer '):
            api_key = auth_header[7:].strip()
    
    if not api_key:
        return jsonify({'error': 'OpenRouter API key required'}), 401
    
    model_id = data.get('model', 'x-ai/grok-4-fast')
    base_url = request.host_url.rstrip('/')
    
    def generate():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            async def stream_events():
                async for event in run_agent_stream(question, api_key, model_id, base_url):
                    yield f"data: {json.dumps(event)}\n\n"
            
            # Collect all events
            async def collect():
                events = []
                async for event in run_agent_stream(question, api_key, model_id, base_url):
                    events.append(event)
                return events
            
            events = loop.run_until_complete(collect())
            for event in events:
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
        finally:
            loop.close()
    
    return Response(
        generate(),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no'
        }
    )


@experimental_agent_bp.route('/api/experimental-agent/tools', methods=['GET'])
def list_tools():
    """List available tools for the experimental agent."""
    return jsonify({
        'tools': [
            {
                'name': 'fetch_latest_feed',
                'description': 'Fetch the latest AI news and updates',
                'parameters': ['query', 'limit']
            },
            {
                'name': 'search_openrouter_models',
                'description': 'Search OpenRouter model catalog',
                'parameters': ['query', 'limit']
            },
            {
                'name': 'fetch_llm_benchmarks',
                'description': 'Get LLM benchmark data from Artificial Analysis',
                'parameters': ['limit']
            },
            {
                'name': 'fetch_hype_feed',
                'description': 'Get trending AI repos from GitHub, HuggingFace, Reddit',
                'parameters': ['query', 'limit']
            },
            {
                'name': 'fetch_media_models',
                'description': 'Get media generation models (image, video, speech)',
                'parameters': ['category', 'limit']
            }
        ]
    })
