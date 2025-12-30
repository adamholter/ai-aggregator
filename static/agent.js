(() => {
// Agent page script (uses user-supplied OpenRouter key from Settings)
const BASE_URL = window.location.origin;
const USER_OPENROUTER_KEY_STORAGE = 'dashboard-user-openrouter-key';
const AGENT_MODEL_STORAGE = 'dashboard-agent-exp-model';
let DEFAULT_MODEL = (typeof localStorage !== 'undefined' && localStorage.getItem(AGENT_MODEL_STORAGE)) || 'x-ai/grok-4-fast';
const AVAILABLE_MODELS_STORAGE = 'dashboard-available-models';

const SOURCES = [
  { key: 'latest', label: 'Latest', icon: 'news', params: { tabs: 'latest', limit: 40, include_hype: 'true', cache_bust: '1' } },
  { key: 'openrouter', label: 'OpenRouter', icon: 'openrouter', params: { tabs: 'openrouter', limit: 40, recency: 'week', include_hype: 'true', cache_bust: '1' } },
  { key: 'text-to-image', label: 'AA — Text-to-Image', icon: 'news', params: { tabs: 'text-to-image', limit: 40, cache_bust: '1' } },
  { key: 'image-editing', label: 'AA — Image Editing', icon: 'news', params: { tabs: 'image-editing', limit: 30, cache_bust: '1' } },
  { key: 'text-to-video', label: 'AA — Text-to-Video', icon: 'news', params: { tabs: 'text-to-video', limit: 20, cache_bust: '1' } },
  { key: 'image-to-video', label: 'AA — Image-to-Video', icon: 'news', params: { tabs: 'image-to-video', limit: 20, cache_bust: '1' } },
  { key: 'text-to-speech', label: 'AA — Text-to-Speech', icon: 'news', params: { tabs: 'text-to-speech', limit: 20, cache_bust: '1' } },
  { key: 'llms', label: 'AA — LLMs', icon: 'news', params: { tabs: 'llms', limit: 30, cache_bust: '1' } },
  { key: 'hype', label: 'Hype', icon: 'news', params: { tabs: 'hype', limit: 30, include_hype: 'true', cache_bust: '1' } },
  { key: 'monitor', label: 'Monitor', icon: 'news', params: { tabs: 'monitor', limit: 30, cache_bust: '1' } },
  { key: 'blog', label: 'Blog', icon: 'news', params: { tabs: 'blog', limit: 24, cache_bust: '1' } },
  { key: 'testing-catalog', label: 'Testing Catalog', icon: 'news', params: { tabs: 'testing-catalog', limit: 24, cache_bust: '1' } }
];

const chatArea = document.getElementById('chatArea');
const dataSidebar = document.getElementById('dataSidebar');
const questionInput = document.getElementById('questionInput');
const chatForm = document.getElementById('chatForm');
const refreshBtn = document.getElementById('refreshBtn');
const fileInput = document.getElementById('fileInput');
const attachmentsBar = document.getElementById('attachmentsBar');
const modelSelect = document.getElementById('modelSelect');
const activityLog = document.getElementById('activityLog');
const fullscreenToggle = document.getElementById('fullscreenToggle');

// If the agent markup isn't present, bail early to avoid blocking the main page.
if (!chatArea || !dataSidebar || !questionInput || !chatForm || !refreshBtn || !fileInput || !attachmentsBar || !modelSelect || !activityLog) {
  if (typeof console !== 'undefined') {
    console.warn('Agent UI not found on page; skipping agent.js init.');
  }
  return;
}

let lastQuestion = '';
let conversation = [];
let latestDataCache = {};
let openrouterDataCache = {};
let currentTrace = [];
let lastLLMPayload = null;
let lastLLMResponse = null;
const debugRuns = [];
let pendingAttachments = [];
let availableModels = [];

function hydrateModelsFromStorageOrConfig(agentConfig = {}) {
  const stored = (typeof localStorage !== 'undefined' && localStorage.getItem(AVAILABLE_MODELS_STORAGE)) || '';
  const storedList = stored ? stored.split(',').map((s) => s.trim()).filter(Boolean) : [];
  const configList = Array.isArray(agentConfig.availableModels) ? agentConfig.availableModels : [];
  availableModels = storedList.length ? storedList : configList;
  if (!availableModels.length && agentConfig.defaultModel) {
    availableModels = [agentConfig.defaultModel];
  }
  DEFAULT_MODEL = (typeof localStorage !== 'undefined' && localStorage.getItem(AGENT_MODEL_STORAGE)) || agentConfig.defaultModel || availableModels[0] || DEFAULT_MODEL;
}

async function loadConfigAndModels() {
  try {
    const res = await fetch('/api/model-config');
    if (res.ok) {
      const cfg = await res.json();
      hydrateModelsFromStorageOrConfig((cfg && cfg.agent) || {});
    } else {
      hydrateModelsFromStorageOrConfig({});
    }
  } catch (_) {
    hydrateModelsFromStorageOrConfig({});
  }

  modelSelect.innerHTML = '';
  if (!availableModels.length) {
    availableModels = [DEFAULT_MODEL];
  }
  availableModels.forEach((id) => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = id;
    modelSelect.appendChild(opt);
  });

  const chosen = availableModels.includes(DEFAULT_MODEL) ? DEFAULT_MODEL : availableModels[0];
  modelSelect.value = chosen;
  localStorage.setItem(AGENT_MODEL_STORAGE, chosen);
}

modelSelect.addEventListener('change', () => {
  localStorage.setItem(AGENT_MODEL_STORAGE, modelSelect.value);
});

// hydrate options before wiring the rest of the UI
loadConfigAndModels();

function resetAgentUI() {
  chatArea.innerHTML = '<div class="agent-placeholder">Ready. Ask something like “What’s new with Gemini?” or “Any fresh model launches today?”</div>';
  dataSidebar.innerHTML = `
    <li>OpenRouter</li>
    <li>Fal.ai</li>
    <li>Replicate</li>
    <li>Blog</li>
  `;
  attachmentsBar.innerHTML = '';
  conversation = [];
  currentTrace = [];
  lastLLMPayload = null;
  lastLLMResponse = null;
  latestDataCache = {};
  openrouterDataCache = {};
  lastQuestion = '';
  renderActivityLog();
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  lastQuestion = question;
  questionInput.value = '';
  addMessage('user', question, pendingAttachments);
  conversation.push({ role: 'user', content: question, images: pendingAttachments });
  renderActivityLog(); // show shimmer immediately
  pendingAttachments = [];
  updateAttachmentsBar();
  runAgent(question);
});

refreshBtn.addEventListener('click', () => {
  resetAgentUI();
});

if (fullscreenToggle) {
  fullscreenToggle.addEventListener('click', () => {
    try {
      if (!document.fullscreenElement) {
        (document.documentElement.requestFullscreen || document.body.requestFullscreen || (() => {})).call(document.documentElement);
        fullscreenToggle.textContent = 'Exit Full Screen';
      } else {
        document.exitFullscreen && document.exitFullscreen();
        fullscreenToggle.textContent = 'Full Screen';
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed', err);
    }
  });
  document.addEventListener('fullscreenchange', () => {
    if (!fullscreenToggle) return;
    fullscreenToggle.textContent = document.fullscreenElement ? 'Exit Full Screen' : 'Full Screen';
  });
}

fileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files || []);
  const images = files.filter((f) => f.type.startsWith('image/')).slice(0, 3);
  pendingAttachments = [];
  for (const file of images) {
    const dataUrl = await readFileAsDataURL(file);
    pendingAttachments.push({
      name: file.name,
      markdown: `![${file.name}](${dataUrl})`,
      url: dataUrl
    });
  }
  updateAttachmentsBar();
});

function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function updateAttachmentsBar() {
  attachmentsBar.innerHTML = '';
  if (!pendingAttachments.length) return;
  pendingAttachments.forEach((att) => {
    const chip = document.createElement('div');
    chip.className = 'chip';
    chip.innerHTML = `<span class="truncate max-w-[140px]">${escapeHtml(att.name)}</span>`;
    attachmentsBar.appendChild(chip);
  });
}

function formatTime(date) {
  if (!(date instanceof Date)) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function safeSanitize(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html);
  }
  return html;
}

function renderMarkdown(content) {
  const html = safeSanitize(marked.parse(content || ''));
  const wrapper = document.createElement('div');
  wrapper.className = 'prose prose-sm max-w-none text-gray-900';
  wrapper.innerHTML = html;
  return wrapper;
}

function addMessage(role, content, images = []) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message';
  if (role === 'user') wrapper.classList.add('user-bubble');
  if (role === 'assistant') wrapper.classList.add('assistant-bubble');
  if (role === 'system') wrapper.classList.add('system-bubble');
  const label = document.createElement('div');
  label.className = 'text-xs uppercase tracking-[0.2em] text-neutral-400 mb-1';
  label.textContent = role === 'user' ? 'You' : role === 'assistant' ? 'Agent' : 'System';
  const text = renderMarkdown(content);
  wrapper.appendChild(label);
  wrapper.appendChild(text);
  if (images.length) {
    const gallery = document.createElement('div');
    gallery.className = 'flex gap-3 flex-wrap mt-2';
    images.forEach((img) => {
      const el = document.createElement('img');
      el.src = img.url;
      el.alt = img.name;
      el.className = 'h-20 w-20 object-cover rounded-md border border-gray-200';
      gallery.appendChild(el);
    });
    wrapper.appendChild(gallery);
  }
  chatArea.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;
  return wrapper;
}

function addStackStep(title, detail, status = 'pending', previewHtml = '') {
  const step = { title, detail, status, previewHtml, created: new Date() };
  currentTrace.push(step);
  return step;
}

function updateSidebar(previews) {
  if (!dataSidebar) return;
  dataSidebar.innerHTML = '';
  if (!previews.length) {
    dataSidebar.innerHTML = `
      <li>OpenRouter</li>
      <li>Fal.ai</li>
      <li>Replicate</li>
      <li>Blog</li>
    `;
    return;
  }
  previews.forEach(({ label, count }) => {
    const li = document.createElement('li');
    const countText = typeof count === 'number' ? ` (${count})` : '';
    li.textContent = `${label}${countText}`;
    dataSidebar.appendChild(li);
  });
}

function renderActivityLog() {
  if (!activityLog) return;
  activityLog.innerHTML = '';

  if (!currentTrace.length) {
    activityLog.innerHTML = '<div class="agent-placeholder">Waiting for a question...</div>';
    return;
  }

  const timeline = document.createElement('div');
  timeline.className = 'timeline';

  currentTrace.forEach((step) => {
    const row = document.createElement('div');
    row.className = 'timeline-row';

    const dot = document.createElement('span');
    dot.className = `timeline-dot ${step.status || 'pending'}`;

    const body = document.createElement('div');
    body.className = 'timeline-body';

    const title = document.createElement('p');
    title.className = 'timeline-title';
    title.textContent = step.title;

    const detail = document.createElement('p');
    detail.className = 'timeline-detail';
    const timestamp = formatTime(step.created);
    detail.textContent = timestamp ? `${timestamp} — ${step.detail || ''}` : (step.detail || '');

    body.append(title, detail);
    row.append(dot, body);
    timeline.appendChild(row);
  });

  activityLog.appendChild(timeline);
}

function getUserOpenRouterKey() {
  return (localStorage.getItem(USER_OPENROUTER_KEY_STORAGE) || '').trim();
}

async function runAgent(question) {
  const key = getUserOpenRouterKey();
  if (!key) {
    addMessage('system', 'Add your OpenRouter key in Settings on the main dashboard, then reload this page.');
    return;
  }

  currentTrace = [];

  // 1) Ask LLM to propose tool calls
  const planStep = addStackStep('Planning tools', 'Asking model which tools to use...', 'running');
  let plannedQueries = { latest: question, openrouter: question };
  try {
    plannedQueries = await planTools(question, key);
    planStep.status = 'done';
    planStep.detail = `Planned: Latest="${plannedQueries.latest}" | OpenRouter="${plannedQueries.openrouter}"`;
    renderActivityLog();
  } catch (err) {
    planStep.status = 'error';
    planStep.detail = `Plan failed, using raw question. (${err.message})`;
    renderActivityLog();
  }

  // 2) Execute tool calls
  const selectedSources = chooseSources(`${plannedQueries.latest} ${plannedQueries.openrouter}`);
  const results = [];
  const traceMap = {};
  selectedSources.forEach((src) => {
    traceMap[src.key] = addStackStep(`Searching ${src.label}`, 'Fetching and filtering...', 'running');
  });
  renderActivityLog();

  try {
    const fetches = selectedSources.map((src) =>
      runFilteredFetch(src.label, src.key === 'openrouter' ? plannedQueries.openrouter : plannedQueries.latest, src.params)
        .then((res) => ({ key: src.key, label: src.label, icon: src.icon, data: res }))
        .catch((err) => ({ key: src.key, label: src.label, icon: src.icon, error: err }))
    );
    const settled = await Promise.all(fetches);

    settled.forEach((entry) => {
      const step = traceMap[entry.key];
      if (entry.error) {
        step.status = 'error';
        step.detail = `${entry.label} failed: ${entry.error.message}`;
      } else {
        step.status = 'done';
        step.detail = `${entry.label} filtered (${entry.data.items.length} hits)`;
        step.previewHtml = buildTracePreview(entry.label, entry.data.items, entry.icon === 'openrouter' ? 'openrouter' : 'latest');
        results.push(entry);
        if (entry.key === 'latest') latestDataCache = entry.data.raw;
        if (entry.key === 'openrouter') openrouterDataCache = entry.data.raw;
      }
      renderActivityLog();
    });

    updateSidebar(
      results.map((entry) => ({
        label: entry.label,
        count: Array.isArray(entry.data?.items) ? entry.data.items.length : 0
      }))
    );

    // 3) Final answer call with combined markdown
    const llmStep = addStackStep(`Calling ${modelSelect.value} via OpenRouter`, 'Crafting response with filtered feeds...', 'running');
    let assistantNode = null;
    try {
      const assistantMessage = await callFinalLLM({
        question,
        markdownSections: results.map((r) => ({ label: r.label, markdown: r.data.markdown })),
        key
      });
      llmStep.status = 'done';
      llmStep.detail = 'LLM response received.';
      assistantNode = addMessage('assistant', assistantMessage);
      conversation.push({ role: 'assistant', content: assistantMessage });
    } catch (err) {
      llmStep.status = 'error';
      llmStep.detail = `LLM call failed: ${err.message}`;
      assistantNode = addMessage('assistant', 'Something went wrong reaching OpenRouter. Try again in a bit.');
      conversation.push({ role: 'assistant', content: 'Something went wrong reaching OpenRouter.' });
    }

    renderActivityLog();
  } catch (err) {
    Object.values(traceMap).forEach((step) => {
      step.status = 'error';
      step.detail = `Fetch failed: ${err.message}`;
    });
    addMessage('assistant', 'Tools failed. Try again shortly.');
    renderActivityLog();
  }
}

async function fetchDataset(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`${BASE_URL}/api/fetch?${query}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function runFilteredFetch(label, query, fetchParams) {
  const datasets = await fetchDataset(fetchParams);
  const items = extractItems(datasets);

  if (!items.length) {
    return { items: [], raw: datasets, markdown: `${label}: no relevant items found.` };
  }

  const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
  const providers = ['openai', 'google', 'anthropic', 'meta', 'xai', 'mistral', 'deepseek', 'replicate'];
  const providerMatches = providers.filter((p) => keywords.some((k) => p.includes(k) || k.includes(p)));

  const filtered = items.filter((it) => {
    const haystack = `${it.title || ''} ${it.summary || ''} ${it.description || ''} ${it.provider || it.source || ''}`.toLowerCase();
    const keywordHit = keywords.length ? keywords.some((k) => haystack.includes(k)) : true;
    const providerHit = providerMatches.length ? providerMatches.some((p) => haystack.includes(p)) : true;
    return keywordHit && providerHit;
  });

  const chosen = filtered.length ? filtered : items;
  return {
    items: chosen,
    raw: datasets,
    markdown: itemsToMarkdown(chosen, label)
  };
}

function extractItems(data) {
  const datasets = data?.datasets || {};
  const first = Object.values(datasets)[0];
  if (Array.isArray(first)) return first;
  if (first && first.items) return first.items;
  return [];
}

function buildPreviewCards(letter, items = [], iconType = 'letter') {
  const trimmed = items.slice(0, 4);
  const content = trimmed
    .map((item) => {
      const title = item.title || item.name || 'Untitled';
      const author = item.provider || item.source || item.org || '';
      const link = item.link || item.url || '';
      const icon =
        iconType === 'openrouter'
          ? `<img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/openrouter-icon.png" class="preview-icon" alt="OpenRouter"/>`
          : iconType === 'latest'
            ? `<svg viewBox="0 0 24 24" class="preview-icon text-ink"><path fill="currentColor" d="M4 5h13a1 1 0 0 1 1 1v11a2 2 0 0 0 2 2H7a3 3 0 0 1-3-3V5zm2 2v9a1 1 0 0 0 1 1h9V7H6zm10 0h2v10a1 1 0 0 1-1 1h-1V7zm-8 2h7v2H8V9zm0 4h5v2H8v-2z"></path></svg>`
            : `<div class="preview-letter">${letter}</div>`;
      return `<div class="preview-card">
        ${icon}
        <div>
          <p class="preview-title">${escapeHtml(title)}</p>
          ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="preview-link">${escapeHtml(link)}</a>` : ''}
          <p class="preview-meta">${escapeHtml(author)}</p>
        </div>
      </div>`;
    })
    .join('');
  return `<div class="space-y-2">${content || '<p class="text-xs text-neutral-500">No preview available.</p>'}</div>`;
}

function escapeHtml(str = '') {
  return str.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function buildItemKey(categoryId, item) {
  const identifier =
    item?.id ||
    item?.uuid ||
    item?.model_id ||
    item?.modelId ||
    item?.slug ||
    item?.url ||
    item?.link ||
    item?.name ||
    item?.title;
  return identifier ? `${categoryId}:${identifier}` : `${categoryId}:${Date.now()}`;
}

function inferCategoryForPreview(iconType, item) {
  if (iconType === 'openrouter') return 'openrouter';
  const source = (item?.source || item?.platform || '').toString().toLowerCase();
  if (source.includes('replicate')) return 'replicate';
  if (source === 'fal' || source.includes('fal')) return 'fal';
  if (source.includes('openrouter')) return 'openrouter';
  if (source.includes('hype')) return 'hype';
  if (source.includes('monitor')) return 'monitor';
  if (source.includes('blog')) return 'blog';
  if (source.includes('testing')) return 'testing-catalog';
  if (source.includes('latest')) return 'latest';
  return null;
}

function postActionToParent(action, categoryId, item) {
  if (!categoryId) return;
  const itemKey = buildItemKey(categoryId, item);
  try {
    window.parent?.postMessage({ type: 'dashboard-action', action, categoryId, itemKey }, '*');
  } catch (_) {}
}

function buildTracePreview(label, items = [], iconType = 'letter') {
  if (!items.length) return '';
  const icon =
    iconType === 'openrouter'
      ? `<img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/openrouter-icon.png" class="preview-icon-sm" alt="OpenRouter"/>`
      : `<svg viewBox="0 0 24 24" class="preview-icon-sm text-ink"><path fill="currentColor" d="M4 5h13a1 1 0 0 1 1 1v11a2 2 0 0 0 2 2H7a3 3 0 0 1-3-3V5zm2 2v9a1 1 0 0 0 1 1h9V7H6zm10 0h2v10a1 1 0 0 1-1 1h-1V7zm-8 2h7v2H8V9zm0 4h5v2H8v-2z"></path></svg>`;

  const rows = items.slice(0, 3).map((it) => {
    const title = it.title || it.name || it.id || 'Untitled';
    const author = it.provider || it.source || it.org || '';
    const link = it.link || it.url || '';
    const categoryId = inferCategoryForPreview(iconType, it);
    const actions = categoryId
      ? `
        <button class="text-[10px] underline text-neutral-500" data-action="open">Open</button>
        <button class="text-[10px] underline text-neutral-500" data-action="pin">Pin</button>
        <button class="text-[10px] underline text-neutral-500" data-action="compare">Compare</button>
      `
      : '';
    return `
      <div class="flex items-center gap-2 pill preview-row" data-category="${escapeHtml(categoryId || '')}">
        ${icon}
        <span class="text-xs font-semibold text-ink">${escapeHtml(label)}</span>
        <span class="text-xs text-neutral-500 truncate max-w-[180px]">${escapeHtml(title)}</span>
        <span class="text-[10px] text-neutral-400">${escapeHtml(author)}</span>
        ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="text-[10px] underline text-neutral-500 truncate max-w-[120px]">${escapeHtml(link)}</a>` : ''}
        <span class="ml-auto flex gap-2 preview-actions">${actions}</span>
      </div>
    `;
  }).join('');

  const wrapper = document.createElement('div');
  wrapper.innerHTML = rows;
  wrapper.querySelectorAll('.preview-row').forEach((row, idx) => {
    const it = items[idx];
    const categoryId = inferCategoryForPreview(iconType, it);
    row.querySelectorAll('[data-action]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        postActionToParent(btn.dataset.action, categoryId, it);
      });
    });
  });
  return wrapper.innerHTML;
}

// Tool planner: ask model what to search
async function planTools(question, key) {
  const prompt = [
    {
      role: 'system',
      content:
        'You are an orchestrator that plans which tabs to search for AI news. Given a user question, propose two search strings: one for the Latest tab, one for the OpenRouter tab. Keep them short and natural (no quotes). Return JSON: {"latest":"...","openrouter":"..."}'
    },
    { role: 'user', content: question }
  ];

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: modelSelect.value,
      messages: prompt
    })
  });

  if (!res.ok) {
    throw new Error(`Planner HTTP ${res.status}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  try {
    const parsed = JSON.parse(text);
    return {
      latest: parsed.latest || question,
      openrouter: parsed.openrouter || question
    };
  } catch (_) {
    return { latest: question, openrouter: question };
  }
}

function chooseSources(query) {
  const keywords = query.toLowerCase();
  const picks = [];

  const add = (key) => {
    const src = SOURCES.find((s) => s.key === key);
    if (src && !picks.includes(src)) picks.push(src);
  };

  const wantsImages = /image|photo|picture|art|graphic|render|sdxl|flux/.test(keywords);
  const wantsVideo = /video|animation|frame/.test(keywords);
  const wantsSpeech = /speech|audio|voice|tts/.test(keywords);
  const wantsBenchmarks = /benchmark|eval|score|latency|performance|leaderboard/.test(keywords);
  const wantsHype = /hype|trend|buzz|social|reddit/.test(keywords);
  const wantsBlog = /blog|article|writeup|post/.test(keywords);
  const wantsTesting = /test|testing|catalog/.test(keywords);
  const wantsLLM = /llm|language model|chatbot|gpt|claude|model|reasoning/.test(keywords);

  // Always include a general recency feed
  add('latest');

  if (wantsImages) {
    add('text-to-image');
    add('image-editing');
    add('openrouter'); // model catalogue often includes vision entries
  }
  if (wantsVideo) {
    add('text-to-video');
    add('image-to-video');
    add('openrouter');
  }
  if (wantsSpeech) {
    add('text-to-speech');
    add('openrouter');
  }
  if (wantsLLM) {
    add('llms');
    add('openrouter');
  }

  // If no targeted intent detected, keep the primary catalogues
  if (!picks.length) {
    add('llms');
    add('openrouter');
  }

  if (wantsBenchmarks || keywords.includes('monitor')) add('monitor');
  if (wantsHype || keywords.includes('trend')) add('hype');
  if (wantsBlog || keywords.includes('blog')) add('blog');
  if (wantsTesting || keywords.includes('catalog')) add('testing-catalog');

  // Cap to avoid over-fetching noise
  return picks.filter(Boolean).slice(0, 6);
}

function itemsToMarkdown(items, label) {
  if (!items || !items.length) return `${label}: no relevant items found.`;
  return items
    .map((it) => {
      const title = it.title || it.name || 'Untitled';
      const link = it.link || it.url || '';
      const summary = it.summary || it.description || it.content || '';
      const provider = it.provider || it.source || it.org || '';
      const timing = it.timestamp || it.time || it.date || '';
      const linkPart = link ? ` [link](${link})` : '';
      return `- **${title}** (${provider || label})${timing ? ` — ${timing}` : ''}${linkPart}\n  ${summary}`;
    })
    .join('\n');
}

async function callFinalLLM({ question, markdownSections, key }) {
  const combinedMarkdown = markdownSections.map((section) => `## ${section.label}\n${section.markdown}`).join('\n\n');
  const payloadMessages = [
    {
      role: 'system',
      content:
        'You are a crisp AI news summarizer answering questions about recent AI model activity. Use only the provided filtered feeds. Return 4-6 concise bullets with model/source names, timing if present, and links when available. If only a couple items are relevant, return fewer bullets. Keep it direct and scannable. If nothing relevant, say that shortly.'
    },
    {
      role: 'system',
      content:
        'Feeds below are raw or lightly filtered programmatically. Favor entries matching the user query terms (e.g., Gemini) and ignore unrelated models. Preserve links. Do not invent facts.'
    },
    { role: 'system', content: combinedMarkdown },
    ...conversation
  ];

  const payload = {
    model: modelSelect.value,
    messages: payloadMessages.map((msg) => {
      if (msg.images && msg.images.length) {
        const content = [
          { type: 'text', text: msg.content || '' },
          ...msg.images.map((img) => ({ type: 'image_url', image_url: { url: img.url } }))
        ];
        return { role: msg.role, content };
      }
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: [{ type: 'text', text: msg.content }] };
      }
      return msg;
    })
  };

  lastLLMPayload = payload;
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      message = err?.error?.message || message;
    } catch (_) {}
    throw new Error(message);
  }

  const data = await res.json();
  lastLLMResponse = data;
  debugRuns.push({ timestamp: Date.now(), payload, response: data });
  return data.choices?.[0]?.message?.content || 'No content returned.';
}

window.debugAgent = {
  latestData: () => latestDataCache,
  openrouterData: () => openrouterDataCache,
  payload: () => lastLLMPayload,
  response: () => lastLLMResponse,
  runs: () => debugRuns
};

// Auto-load key warning on first visit
if (!getUserOpenRouterKey()) {
  addMessage('system', 'Add your OpenRouter key in Settings on the main dashboard, then reload this page.');
}

})(); // end IIFE
