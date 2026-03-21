from backend.app.agent.core import run_agent, stream_agent
from backend.app.agent.types import AgentSettings

import backend.app.agent.core as agent_core


class FakeExecutor:
    def __init__(self, results_by_name):
        self.results_by_name = results_by_name
        self.calls = []
        self._counts = {}

    def execute(self, name, args, context):
        self.calls.append((name, args, context))
        self._counts[name] = self._counts.get(name, 0) + 1
        configured = self.results_by_name[name]
        if callable(configured):
            return configured(self._counts[name], name, args, context)
        if isinstance(configured, list):
            return configured[self._counts[name] - 1]
        return configured


def _tool_call(call_id, name, arguments):
    return {
        'id': call_id,
        'type': 'function',
        'function': {
            'name': name,
            'arguments': arguments,
        },
    }


def test_run_agent_blocks_duplicate_successful_tool_calls(monkeypatch):
    completions = iter([
        {'choices': [{'message': {'tool_calls': [_tool_call('tc1', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'tool_calls': [_tool_call('tc2', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'tool_calls': [_tool_call('tc3', 'send_final_response', '{"response":"Done using prior result"}')]}}]},
    ])
    monkeypatch.setattr(agent_core, '_openrouter_chat_completion', lambda **kwargs: next(completions))
    executor = FakeExecutor({
        'read_skill': {'ok': True, 'result': {'content': 'billing skill body'}},
        'send_final_response': {'ok': True, 'result': {'response': 'Done using prior result'}},
    })

    result = run_agent(
        settings=AgentSettings(api_key='sk-test', model='test-model', max_iterations=5),
        system_prompt='system',
        user_messages=[{'role': 'user', 'content': 'read a skill then answer'}],
        tool_executor=executor,
    )

    assert result.response == 'Done using prior result'
    assert [call[0] for call in executor.calls] == ['read_skill', 'send_final_response']
    assert any(log.status == 'duplicate' and log.tool_name == 'read_skill' for log in result.logs)


def test_run_agent_allows_retry_after_tool_failure(monkeypatch):
    completions = iter([
        {'choices': [{'message': {'tool_calls': [_tool_call('tc1', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'tool_calls': [_tool_call('tc2', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'content': 'Recovered after retry'}}]},
    ])
    monkeypatch.setattr(agent_core, '_openrouter_chat_completion', lambda **kwargs: next(completions))
    executor = FakeExecutor({
        'read_skill': [
            {'ok': False, 'error': {'message': 'temporary failure'}},
            {'ok': True, 'result': {'content': 'billing skill body'}},
        ],
    })

    result = run_agent(
        settings=AgentSettings(api_key='sk-test', model='test-model', max_iterations=5),
        system_prompt='system',
        user_messages=[{'role': 'user', 'content': 'retry failed tool'}],
        tool_executor=executor,
    )

    assert result.response == 'Recovered after retry'
    assert [call[0] for call in executor.calls] == ['read_skill', 'read_skill']
    assert not any(log.status == 'duplicate' for log in result.logs)


def test_stream_agent_emits_duplicate_warning_and_then_loop_error(monkeypatch):
    completions = iter([
        {'choices': [{'message': {'tool_calls': [_tool_call('tc1', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'tool_calls': [_tool_call('tc2', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'tool_calls': [_tool_call('tc3', 'read_skill', '{"skill_name":"billing"}')]}}]},
        {'choices': [{'message': {'tool_calls': [_tool_call('tc4', 'read_skill', '{"skill_name":"billing"}')]}}]},
    ])
    monkeypatch.setattr(agent_core, '_openrouter_chat_completion', lambda **kwargs: next(completions))
    executor = FakeExecutor({
        'read_skill': {'ok': True, 'result': {'content': 'billing skill body'}},
    })

    events = list(stream_agent(
        settings=AgentSettings(api_key='sk-test', model='test-model', max_iterations=6),
        system_prompt='system',
        user_messages=[{'role': 'user', 'content': 'loop'}],
        tool_executor=executor,
    ))

    duplicate_events = [event for event in events if event.get('type') == 'tool_result' and event.get('status') == 'duplicate']
    error_events = [event for event in events if event.get('type') == 'error']

    assert len(duplicate_events) == 3
    assert executor.calls == [('read_skill', {'skill_name': 'billing'}, {'api_key': 'sk-test', 'web_search_model': 'perplexity/sonar-pro', 'umi_model': 'google/gemini-2.5-flash'})]
    assert error_events
    assert 'Loop detected' in error_events[-1]['error']
