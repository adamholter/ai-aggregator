(() => {
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
  document.body.style.colorScheme = 'light';

  const STORAGE_KEY = 'agent-v4-settings';
  const DASHBOARD_KEY_STORAGE = 'dashboard-user-openrouter-key';
  const DASHBOARD_MODEL_STORAGE = 'dashboard-agent-exp-model';
  const STREAM_ENDPOINT = '/api/agent-v2/chat/stream';

  const CHART_TYPES = ['bar', 'line', 'scatter', 'pie', 'doughnut', 'radar'];
  const SUGGESTED_PROMPTS = [
    'What are the best models for coding this week?',
    'Compare Claude Opus and GPT for coding + price',
    'Summarize monitor news from the past 3 days',
    'Find low-cost fast models for batch summarization',
  ];

  const el = {
    runState: document.getElementById('runState'),
    clearThreadBtn: document.getElementById('clearThreadBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    thread: document.getElementById('thread'),
    composerForm: document.getElementById('composerForm'),
    promptInput: document.getElementById('promptInput'),
    modeBadge: document.getElementById('modeBadge'),
    keyBadge: document.getElementById('keyBadge'),
    modelBadge: document.getElementById('modelBadge'),
    sendBtn: document.getElementById('sendBtn'),
    stopBtn: document.getElementById('stopBtn'),
    processColumn: document.getElementById('processColumn'),
    processToggle: document.getElementById('processToggle'),
    runSummary: document.getElementById('runSummary'),
    processSteps: document.getElementById('processSteps'),
    toolPayload: document.getElementById('toolPayload'),
    settingsDrawer: document.getElementById('settingsDrawer'),
    closeSettingsBtn: document.getElementById('closeSettingsBtn'),
    closeSettingsBtn2: document.getElementById('closeSettingsBtn2'),
    agentMode: document.getElementById('agentMode'),
    maxIterations: document.getElementById('maxIterations'),
    temperature: document.getElementById('temperature'),
    tempLabel: document.getElementById('tempLabel'),
    umiModel: document.getElementById('umiModel'),
    webSearchModel: document.getElementById('webSearchModel'),
    promptOverride: document.getElementById('promptOverride'),
    saveSettingsBtn: document.getElementById('saveSettingsBtn'),
  };

  const requiredIds = [
    "runState", "clearThreadBtn", "settingsBtn", "thread", "composerForm", "promptInput",
    "modeBadge", "keyBadge", "modelBadge", "sendBtn", "stopBtn", "processColumn",
    "processToggle", "runSummary", "processSteps", "toolPayload", "settingsDrawer",
    "closeSettingsBtn", "closeSettingsBtn2", "agentMode", "maxIterations", "temperature",
    "tempLabel", "umiModel", "webSearchModel", "promptOverride", "saveSettingsBtn"
  ];

  for (let i = 0; i < requiredIds.length; i += 1) {
    if (!el[requiredIds[i]]) {
      return;
    }
  }

  let settings;
  let conversation = [];
  let abortController = null;
  let chartInstances = [];
  let currentRun = null;
  let selectedStepNode = null;

  function defaults() {
    return {
      mode: 'quick',
      max_iterations: 20,
      temperature: 0.3,
      umi_model: 'google/gemini-2.5-flash',
      web_search_model: 'perplexity/sonar-pro',
      system_prompt_override: '',
    };
  }

  function loadSettings() {
    try {
      settings = { ...defaults(), ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') };
    } catch {
      settings = defaults();
    }
  }

  function saveSettings() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }

  function dashboardKey() {
    return (localStorage.getItem(DASHBOARD_KEY_STORAGE) || '').trim();
  }

  function dashboardModel() {
    return (localStorage.getItem(DASHBOARD_MODEL_STORAGE) || '').trim();
  }

  function effectiveModel() {
    return dashboardModel() || 'anthropic/claude-sonnet-4';
  }

  function effectiveSettings() {
    return {
      ...settings,
      api_key: dashboardKey(),
      model: effectiveModel(),
    };
  }

  function updateBadges() {
    el.modeBadge.textContent = settings.mode === 'heavy' ? 'Heavy Mode' : 'Quick Mode';
    const model = effectiveModel();
    const modelName = model.includes('/') ? model.split('/').pop() : model;
    el.modelBadge.textContent = 'Model: ' + modelName;
    el.modelBadge.title = model;

    const hasKey = Boolean(dashboardKey());
    el.keyBadge.textContent = hasKey ? 'Key: set' : 'Key: missing';
    el.keyBadge.title = hasKey
      ? 'Using dashboard OpenRouter key from localStorage'
      : 'Set OpenRouter key in dashboard settings';
  }

  function applySettingsToForm() {
    el.agentMode.value = settings.mode;
    el.maxIterations.value = String(settings.max_iterations);
    el.temperature.value = String(settings.temperature);
    el.tempLabel.textContent = Number(settings.temperature).toFixed(2);
    el.umiModel.value = settings.umi_model;
    el.webSearchModel.value = settings.web_search_model;
    el.promptOverride.value = settings.system_prompt_override;
  }

  function readSettingsFromForm() {
    settings = {
      ...settings,
      mode: el.agentMode.value,
      max_iterations: Number(el.maxIterations.value || 20),
      temperature: Number(el.temperature.value || 0.3),
      umi_model: (el.umiModel.value || '').trim() || 'google/gemini-2.5-flash',
      web_search_model: (el.webSearchModel.value || '').trim() || 'perplexity/sonar-pro',
      system_prompt_override: el.promptOverride.value || '',
    };
  }

  function autoResize(textarea) {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 230) + 'px';
  }

  function setRunState(state, label) {
    el.runState.className = 'state ' + state;
    if (label) {
      el.runState.textContent = label;
    } else if (state === 'running') {
      el.runState.textContent = 'Running';
    } else if (state === 'done') {
      el.runState.textContent = 'Done';
    } else if (state === 'error') {
      el.runState.textContent = 'Error';
    } else {
      el.runState.textContent = 'Idle';
    }

    const running = state === 'running';
    el.sendBtn.disabled = running;
    el.stopBtn.disabled = !running;
  }

  function destroyCharts() {
    for (let i = 0; i < chartInstances.length; i += 1) {
      try { chartInstances[i].destroy(); } catch {}
    }
    chartInstances = [];
  }

  function markdownToNode(text) {
    const raw = marked.parse(text || '', {
      gfm: true,
      breaks: true,
      highlight(code, lang) {
        if (!window.hljs) return code;
        if (lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return hljs.highlightAuto(code).value;
      },
    });

    const wrapper = document.createElement('div');
    wrapper.innerHTML = DOMPurify.sanitize(raw); // eslint-disable-line no-unsanitized/property
    return wrapper;
  }

  function renderCharts(container) {
    const blocks = container.querySelectorAll('pre code');
    for (let i = 0; i < blocks.length; i += 1) {
      const block = blocks[i];
      if (!(block.className || '').includes('language-chart')) continue;

      try {
        const spec = JSON.parse(block.textContent || '{}');
        const type = CHART_TYPES.includes((spec.type || '').toLowerCase()) ? spec.type.toLowerCase() : 'bar';

        const host = document.createElement('div');
        host.className = 'chart-host';
        const canvas = document.createElement('canvas');
        host.appendChild(canvas);

        const pre = block.closest('pre');
        if (pre && pre.parentNode) pre.parentNode.replaceChild(host, pre);

        const palette = ['#111827', '#6b7280', '#9ca3af', '#4b5563'];

        const isScatter = type === 'scatter';

        const normalizedDatasets = (spec.datasets || []).map((ds, idx) => {
          // Normalize scatter data: handle [[x,y]] array-of-arrays format
          const rawData = ds.data || [];
          const data = isScatter
            ? rawData.map(pt => (Array.isArray(pt) ? { x: pt[0], y: pt[1] } : pt))
            : rawData;

          return {
            ...ds,
            data,
            borderWidth: ds.borderWidth != null ? ds.borderWidth : 1.5,
            borderColor: ds.borderColor || palette[idx % palette.length],
            backgroundColor: ds.backgroundColor || (palette[idx % palette.length] + '99'),
            // scatter charts need visible points; set radius unless caller overrides
            ...(isScatter && ds.pointRadius == null
              ? { pointRadius: 5, pointHoverRadius: 7 }
              : {}),
          };
        });

        const chart = new Chart(canvas.getContext('2d'), {
          type,
          data: {
            labels: spec.labels || [],
            datasets: normalizedDatasets,
          },
          options: {
            responsive: true,
            // .chart-host has explicit height — maintainAspectRatio:false fills it correctly
            maintainAspectRatio: false,
            plugins: {
              legend: {
                labels: {
                  color: '#6b7280',
                  font: { family: '-apple-system, BlinkMacSystemFont, sans-serif', size: 12 },
                },
              },
            },
            scales: ['pie', 'doughnut'].includes(type)
              ? undefined
              : {
                  x: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: '#eef0f3' } },
                  y: { ticks: { color: '#6b7280', font: { size: 11 } }, grid: { color: '#eef0f3' } },
                },
          },
        });

        chartInstances.push(chart);
      } catch {
        // keep raw code block on malformed chart spec
      }
    }
  }

  function addMessage(role, content, isLive) {
    const node = document.createElement('article');
    node.className = 'msg ' + role + (isLive ? ' live' : '');

    if (role === 'assistant') {
      node.appendChild(markdownToNode(content));
      renderCharts(node);
    } else {
      node.textContent = content;
    }

    el.thread.appendChild(node);
    el.thread.scrollTop = el.thread.scrollHeight;
    return node;
  }

  function shortText(value, limit) {
    const text = String(value || '');
    if (text.length <= limit) return text;
    return text.slice(0, limit - 1) + '...';
  }

  function nowTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }

  function ensureRun(iteration) {
    if (!currentRun || currentRun.iteration !== iteration) {
      currentRun = {
        iteration,
        stepMap: new Map(),
      };
      el.runSummary.textContent = 'Run ' + iteration + ' in progress';
    }

    return currentRun;
  }

  function selectStep(node, payload) {
    if (selectedStepNode) selectedStepNode.classList.remove('active');
    selectedStepNode = node;
    node.classList.add('active');
    el.toolPayload.textContent = JSON.stringify(payload || {}, null, 2);
  }

  function addProcessStep(run, id, title, note, tone, payload, tag) {
    let step = run.stepMap.get(id);
    if (!step) {
      const node = document.createElement('button');
      node.type = 'button';
      node.className = 'process-item ' + (tone || 'ok');

      const line1 = document.createElement('div');
      line1.className = 'process-line1';
      const titleNode = document.createElement('span');
      titleNode.className = 'process-title';
      const tagNode = document.createElement('span');
      tagNode.className = 'process-tag';
      line1.append(titleNode, tagNode);

      const noteNode = document.createElement('div');
      noteNode.className = 'process-note';

      node.append(line1, noteNode);
      el.processSteps.prepend(node);

      step = { node, titleNode, noteNode, tagNode };
      run.stepMap.set(id, step);
    }

    step.node.classList.remove('ok', 'warn', 'err');
    step.node.classList.add(tone || 'ok');
    step.titleNode.textContent = title;
    step.noteNode.textContent = note;
    step.tagNode.textContent = tag || nowTime();
    step.node.onclick = () => selectStep(step.node, payload);
  }

  function clearEmptySteps() {
    const empty = el.processSteps.querySelector('.process-empty');
    if (empty) empty.remove();
  }

  function showEmptySteps() {
    if (el.processSteps.querySelector('.process-empty')) return;
    const node = document.createElement('div');
    node.className = 'process-empty';
    node.textContent = 'Run steps and tool actions appear here.';
    el.processSteps.appendChild(node);
  }

  function showWelcome() {
    const block = document.createElement('section');
    block.className = 'welcome';

    const h3 = document.createElement('h3');
    h3.textContent = 'Agent ready';
    const p = document.createElement('p');
    p.textContent = 'Ask for comparisons, benchmark snapshots, pricing tradeoffs, or trend briefs.';

    const actions = document.createElement('div');
    actions.className = 'welcome-actions';
    for (let i = 0; i < SUGGESTED_PROMPTS.length; i += 1) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'prompt-chip';
      btn.textContent = SUGGESTED_PROMPTS[i];
      btn.addEventListener('click', () => submitPrompt(SUGGESTED_PROMPTS[i]));
      actions.appendChild(btn);
    }

    block.append(h3, p, actions);
    el.thread.appendChild(block);
  }

  function submitPrompt(text) {
    el.promptInput.value = text;
    autoResize(el.promptInput);
    el.composerForm.dispatchEvent(new Event('submit', { cancelable: true }));
  }

  function addStatusEvent(event) {
    if (event.stage === 'start') {
      const run = ensureRun(1);
      addProcessStep(run, 'plan', 'Planning request', (event.mode || settings.mode) + ' mode', 'ok', event, '#1');
      return;
    }

    if (event.stage === 'iteration_start') {
      const iter = Number(event.iteration || 1);
      const run = ensureRun(iter);
      addProcessStep(run, 'iter:' + iter, 'Iteration ' + iter, 'Reasoning and tool selection', 'ok', event, '#' + iter);
    }
  }

  function onToolStart(event) {
    const iter = Number(event.iteration || 1);
    const run = ensureRun(iter);
    const toolName = event.tool_name || 'tool';

    addProcessStep(
      run,
      'tool:' + iter + ':' + toolName,
      toolName,
      'Running',
      'warn',
      event,
      '#' + iter
    );
  }

  function onToolResult(event) {
    const iter = Number(event.iteration || 1);
    const run = ensureRun(iter);
    const toolName = event.tool_name || 'tool';

    const failed = event.status === 'error';
    const note = failed
      ? shortText(event.error?.message || event.error || 'Tool failed', 95)
      : shortText(event.result_preview || 'Completed', 95);

    addProcessStep(
      run,
      'tool:' + iter + ':' + toolName,
      toolName,
      note,
      failed ? 'err' : 'ok',
      event,
      '#' + iter
    );
  }

  function onDraftUpdate(chars) {
    if (!currentRun) return;
    addProcessStep(
      currentRun,
      'draft:' + currentRun.iteration,
      'Drafting response',
      chars + ' characters generated',
      'ok',
      { chars },
      'live'
    );
  }

  function onDone(event) {
    if (!currentRun) return;
    addProcessStep(
      currentRun,
      'done:' + currentRun.iteration,
      'Final response',
      'Delivered to thread',
      'ok',
      event,
      nowTime()
    );

    el.runSummary.textContent = 'Run ' + currentRun.iteration + ' completed at ' + nowTime();
  }

  function parseSseChunk(buffer, onEvent) {
    const frames = buffer.split('\n\n');
    const remainder = frames.pop() || '';

    for (let i = 0; i < frames.length; i += 1) {
      const lines = frames[i].split('\n');
      const dataLines = [];
      for (let j = 0; j < lines.length; j += 1) {
        if (lines[j].startsWith('data:')) dataLines.push(lines[j].replace(/^data:\s?/, ''));
      }

      if (!dataLines.length) continue;
      const raw = dataLines.join('\n');

      try {
        onEvent(JSON.parse(raw));
      } catch {
        onEvent({ type: 'error', error: 'Malformed stream event: ' + shortText(raw, 220) });
      }
    }

    return remainder;
  }

  function renderUMICards(donePayload, container) {
    const logs = donePayload.logs || [];
    for (let i = 0; i < logs.length; i += 1) {
      const log = logs[i];
      if (log.tool_name !== 'create_model_identity' || !log.raw_result) continue;
      const umi = log.raw_result;

      const card = document.createElement('section');
      card.className = 'umi-card';

      const h4 = document.createElement('h4');
      h4.textContent = umi.canonical_name || 'Universal Model Identity';

      const p = document.createElement('p');
      p.textContent = shortText(
        umi.summary || `${umi.provider || 'Unknown provider'} | ${(umi.variants || []).length || 0} linked variants`,
        260
      );

      card.append(h4, p);
      container.appendChild(card);
    }
  }

  function threadError(text) {
    const node = document.createElement('article');
    node.className = 'msg assistant';
    node.textContent = 'Error: ' + text;
    el.thread.appendChild(node);
    el.thread.scrollTop = el.thread.scrollHeight;
  }

  function assertDashboardConfig() {
    if (dashboardKey()) return true;

    setRunState('error', 'Missing key');
    const run = ensureRun((currentRun?.iteration || 0) + 1);
    addProcessStep(
      run,
      'missing-key',
      'OpenRouter key missing',
      'Set key in dashboard settings before sending prompts.',
      'err',
      { missing_storage_key: DASHBOARD_KEY_STORAGE },
      '!' 
    );

    threadError('OpenRouter API key is missing from dashboard settings. Save it there and retry.');
    return false;
  }

  async function runAgentStream(userText) {
    if (!assertDashboardConfig()) return;

    const welcome = el.thread.querySelector('.welcome');
    if (welcome) welcome.remove();

    conversation.push({ role: 'user', content: userText });
    addMessage('user', userText, false);

    const liveNode = addMessage('assistant', '', true);
    let liveText = '';
    let stagedChars = 0;

    abortController = new AbortController();
    setRunState('running');
    clearEmptySteps();

    try {
      const response = await fetch(STREAM_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ settings: effectiveSettings(), messages: conversation }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error('Stream request failed (' + response.status + ')');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let donePayload = null;

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });

        buffer = parseSseChunk(buffer, (event) => {
          if (event.type === 'status') {
            addStatusEvent(event);
            return;
          }

          if (event.type === 'tool_start') {
            onToolStart(event);
            return;
          }

          if (event.type === 'tool_result') {
            onToolResult(event);
            return;
          }

          if (event.type === 'content_chunk') {
            const delta = event.delta || '';
            liveText += delta;

            while (liveNode.firstChild) liveNode.removeChild(liveNode.firstChild);
            liveNode.appendChild(markdownToNode(liveText));
            renderCharts(liveNode);

            stagedChars += delta.length;
            if (stagedChars >= 180 || !currentRun?.stepMap.has('draft:' + currentRun?.iteration)) {
              onDraftUpdate(liveText.length);
              stagedChars = 0;
            }

            el.thread.scrollTop = el.thread.scrollHeight;
            return;
          }

          if (event.type === 'done') {
            donePayload = event;
            onDone(event);
            return;
          }

          if (event.type === 'error') {
            throw new Error(event.error || 'Agent stream failed');
          }
        });
      }

      liveNode.classList.remove('live');

      if (donePayload) {
        const finalText = donePayload.response || liveText;
        conversation.push({ role: 'assistant', content: finalText });

        while (liveNode.firstChild) liveNode.removeChild(liveNode.firstChild);
        liveNode.appendChild(markdownToNode(finalText));
        renderCharts(liveNode);
        renderUMICards(donePayload, liveNode);
      }

      setRunState('done');
    } catch (error) {
      if (error?.name === 'AbortError') {
        setRunState('idle', 'Stopped');
        if (currentRun) {
          addProcessStep(
            currentRun,
            'stopped:' + currentRun.iteration,
            'Stopped by user',
            'Run halted before completion',
            'warn',
            { reason: 'user_abort' },
            nowTime()
          );
          el.runSummary.textContent = 'Run stopped';
        }
      } else {
        setRunState('error');
        const run = ensureRun((currentRun?.iteration || 0) + 1);
        addProcessStep(run, 'runtime-error', 'Runtime error', shortText(error?.message || error, 95), 'err', {
          error: String(error?.message || error),
        }, nowTime());

        while (liveNode.firstChild) liveNode.removeChild(liveNode.firstChild);
        liveNode.classList.remove('live');
        liveNode.textContent = 'Error: ' + (error?.message || error);
      }
    } finally {
      abortController = null;
    }
  }

  function clearThread() {
    conversation = [];
    currentRun = null;
    selectedStepNode = null;

    while (el.thread.firstChild) el.thread.removeChild(el.thread.firstChild);
    while (el.processSteps.firstChild) el.processSteps.removeChild(el.processSteps.firstChild);

    destroyCharts();
    el.toolPayload.textContent = 'Select a step to inspect details.';
    el.runSummary.textContent = 'Waiting for a prompt.';

    setRunState('idle');
    showWelcome();
    showEmptySteps();
  }

  function bindUi() {
    el.clearThreadBtn.addEventListener('click', clearThread);

    el.processToggle.addEventListener('click', function() {
      const collapsed = el.processColumn.classList.toggle('collapsed');
      el.processToggle.textContent = collapsed ? 'Open' : 'Collapse';
      el.processToggle.setAttribute('aria-expanded', String(!collapsed));
    });

    el.settingsBtn.addEventListener('click', function() {
      el.settingsDrawer.classList.remove('hidden');
    });

    const closeDrawer = function() {
      el.settingsDrawer.classList.add('hidden');
    };

    el.closeSettingsBtn.addEventListener('click', closeDrawer);
    el.closeSettingsBtn2.addEventListener('click', closeDrawer);

    el.settingsDrawer.addEventListener('click', function(event) {
      if (event.target === el.settingsDrawer) closeDrawer();
    });

    el.temperature.addEventListener('input', function() {
      el.tempLabel.textContent = Number(el.temperature.value).toFixed(2);
    });

    el.saveSettingsBtn.addEventListener('click', function() {
      readSettingsFromForm();
      saveSettings();
      updateBadges();
      closeDrawer();

      const run = ensureRun((currentRun?.iteration || 0) + 1);
      addProcessStep(run, 'settings-saved:' + run.iteration, 'Settings saved', settings.mode + ' mode', 'ok', {
        settings_saved: true,
        settings,
      }, nowTime());
      el.runSummary.textContent = 'Settings updated';
    });

    el.stopBtn.addEventListener('click', function() {
      if (abortController) abortController.abort();
    });

    el.promptInput.addEventListener('input', function() {
      autoResize(el.promptInput);
    });

    el.composerForm.addEventListener('submit', async function(event) {
      event.preventDefault();
      const text = (el.promptInput.value || '').trim();
      if (!text || abortController) return;

      el.promptInput.value = '';
      autoResize(el.promptInput);
      await runAgentStream(text);
    });

    el.promptInput.addEventListener('keydown', async function(event) {
      if (event.key !== 'Enter' || event.shiftKey) return;
      event.preventDefault();
      const text = (el.promptInput.value || '').trim();
      if (!text || abortController) return;

      el.promptInput.value = '';
      autoResize(el.promptInput);
      await runAgentStream(text);
    });

    window.addEventListener('storage', function(event) {
      if (event.key === DASHBOARD_KEY_STORAGE || event.key === DASHBOARD_MODEL_STORAGE) {
        updateBadges();
      }
    });
  }

  function init() {
    loadSettings();
    bindUi();
    applySettingsToForm();
    updateBadges();
    setRunState('idle');
    showWelcome();
    showEmptySteps();
  }

  init();
})();
