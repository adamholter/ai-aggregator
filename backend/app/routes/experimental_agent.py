"""
Flask blueprint for the experimental agent.

Provides /experimental-agent page and /api/experimental-agent endpoint.
"""
import asyncio
import json
from flask import Blueprint, request, jsonify, Response, send_from_directory
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
    Run the experimental agent.
    
    Request JSON:
        {
            "question": "What's the best image model?",
            "model": "x-ai/grok-4-fast"
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
            run = loop.run_until_complete(
                run_agent(question, api_key, model_id, base_url)
            )
        finally:
            loop.close()
        
        return jsonify({
            'response': run.response,
            'tool_calls': [
                {'tool': tc.tool, 'args': tc.args, 'result': tc.result[:500], 'status': tc.status}
                for tc in run.tool_calls
            ],
            'model': model_id,
            'error': run.error or None
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@experimental_agent_bp.route('/api/experimental-agent/stream', methods=['POST'])
def experimental_agent_stream():
    """
    Stream the experimental agent with SSE events.
    """
    run_agent, run_agent_stream = get_agent_module()
    
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
            async def collect_events():
                events = []
                async for event in run_agent_stream(question, api_key, model_id, base_url):
                    events.append(event)
                return events
            
            events = loop.run_until_complete(collect_events())
            for event in events:
                yield f"data: {json.dumps(event)}\n\n"
        except Exception as e:
            import traceback
            traceback.print_exc()
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
            {'name': 'fetch_latest_feed', 'description': 'Fetch the latest AI news and updates'},
            {'name': 'search_openrouter_models', 'description': 'Search OpenRouter model catalog'},
            {'name': 'fetch_image_models', 'description': 'Get image generation models'},
            {'name': 'fetch_llm_benchmarks', 'description': 'Get LLM benchmark data'},
            {'name': 'fetch_hype_feed', 'description': 'Get trending AI repos'}
        ]
    })
