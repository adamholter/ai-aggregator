(() => {
// Agent page script (uses user-supplied OpenRouter key from Settings)
const BASE_URL = window.location.origin;
const USER_OPENROUTER_KEY_STORAGE = 'dashboard-user-openrouter-key';
const AGENT_MODEL_STORAGE = 'dashboard-agent-exp-model';
const DEFAULT_MODEL = (typeof localStorage !== 'undefined' && localStorage.getItem(AGENT_MODEL_STORAGE)) || 'x-ai/grok-4-fast';

const SOURCES = [
  { key: 'latest', label: 'Latest', icon: 'news', params: { tabs: 'latest', limit: 40, include_hype: 'true', cache_bust: '1' } },
  { key: 'openrouter', label: 'OpenRouter', icon: 'openrouter', params: { tabs: 'openrouter', limit: 40, recency: 'week', include_hype: 'true', cache_bust: '1' } },
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

// If the agent markup isn't present, bail early to avoid blocking the main page.
if (!chatArea || !dataSidebar || !questionInput || !chatForm || !refreshBtn || !fileInput || !attachmentsBar || !modelSelect) {
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
let lastTraceAnchor = null;
let pendingAttachments = [];

modelSelect.value = DEFAULT_MODEL;
modelSelect.addEventListener('change', () => {
  localStorage.setItem(AGENT_MODEL_STORAGE, modelSelect.value);
});

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  if (!question) return;
  lastQuestion = question;
  questionInput.value = '';
  const userNode = addMessage('user', question, pendingAttachments);
  lastTraceAnchor = userNode;
  conversation.push({ role: 'user', content: question, images: pendingAttachments });
  renderTraceInline(); // show shimmer immediately
  pendingAttachments = [];
  updateAttachmentsBar();
  runAgent(question);
});

refreshBtn.addEventListener('click', () => {
  if (lastQuestion) {
    addMessage('system', 'Refreshed run with cached question.');
    runAgent(lastQuestion);
  } else {
    addMessage('system', 'Ask a question to see the agent in action.');
  }
});

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

function safeSanitize(html) {
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(html);
  }
  return html;
}

function renderMarkdown(content) {
  const html = safeSanitize(marked.parse(content || ''));
  const wrapper = document.createElement('div');
  wrapper.className = 'prose prose-sm max-w-none text-ink';
  wrapper.innerHTML = html;
  return wrapper;
}

function addMessage(role, content, images = []) {
  const wrapper = document.createElement('div');
  wrapper.className = 'message p-4';
  if (role === 'user') wrapper.classList.add('user-bubble');
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
      el.className = 'h-20 w-20 object-cover rounded-md border border-softline';
      gallery.appendChild(el);
    });
    wrapper.appendChild(gallery);
  }
  chatArea.appendChild(wrapper);
  chatArea.scrollTop = chatArea.scrollHeight;
  return wrapper;
}

function addStackStep(title, detail, status = 'pending', previewHtml = '') {
  const step = { title, detail, status, previewHtml };
  currentTrace.push(step);
  return step;
}

function updateSidebar(previews) {
  dataSidebar.innerHTML = '';
  if (!previews.length) {
    dataSidebar.innerHTML = '<div class="text-sm text-neutral-500">No data yet.</div>';
    return;
  }
  previews.forEach(({ label, items }) => {
    const card = document.createElement('div');
    card.className = 'stack-card p-3';
    card.innerHTML = `<p class="pill mb-2">${label}</p>${items}`;
    dataSidebar.appendChild(card);
  });
}

function renderTraceInline(anchor = lastTraceAnchor) {
  document.querySelectorAll('.trace-container').forEach((el) => el.remove());
  if (!currentTrace.length && !anchor) return;

  const container = document.createElement('div');
  container.className = 'trace-container p-0 mb-2';

  const chip = document.createElement('div');
  chip.className = 'trace-chip';
  chip.innerHTML = `<span class="dot bg-emerald-500"></span><span>View stack trace</span>`;

  const body = document.createElement('div');
  body.className = 'hidden mt-3 space-y-2';

  currentTrace.forEach((step) => {
    const dotColor =
      step.status === 'done'
        ? 'bg-emerald-500'
        : step.status === 'error'
          ? 'bg-rose-500'
          : step.status === 'running'
            ? 'bg-amber-500'
            : 'bg-neutral-300';
    const block = document.createElement('div');
    block.className = 'trace-step';
    block.innerHTML = `
      <span class="dot ${dotColor} mt-1"></span>
      <div class="flex-1 space-y-1">
        <p class="text-sm font-semibold text-ink">${step.title}</p>
        <p class="text-sm text-neutral-600">${step.detail}</p>
        ${step.previewHtml || ''}
      </div>
    `;
    body.appendChild(block);
  });

  chip.addEventListener('click', () => {
    body.classList.toggle('hidden');
    chip.classList.toggle('animate-none');
  });

  container.append(chip, body);
  if (anchor && anchor.parentNode === chatArea) {
    chatArea.insertBefore(container, anchor);
  } else {
    chatArea.appendChild(container);
  }
  chatArea.scrollTop = chatArea.scrollHeight;
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
    renderTraceInline();
  } catch (err) {
    planStep.status = 'error';
    planStep.detail = `Plan failed, using raw question. (${err.message})`;
    renderTraceInline();
  }

  // 2) Execute tool calls
  const selectedSources = chooseSources(`${plannedQueries.latest} ${plannedQueries.openrouter}`);
  const results = [];
  const traceMap = {};
  selectedSources.forEach((src) => {
    traceMap[src.key] = addStackStep(`Searching ${src.label}`, 'Fetching and filtering...', 'running');
  });
  renderTraceInline();

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
      renderTraceInline();
    });

    updateSidebar(
      results.map((entry) => ({
        label: `${entry.label} preview`,
        items: buildPreviewCards(entry.label[0] || 'X', entry.data.items, entry.icon)
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

    renderTraceInline(assistantNode);
  } catch (err) {
    Object.values(traceMap).forEach((step) => {
      step.status = 'error';
      step.detail = `Fetch failed: ${err.message}`;
    });
    addMessage('assistant', 'Tools failed. Try again shortly.');
    renderTraceInline();
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
          ? `<img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/openrouter-icon.png" class="h-6 w-6 flex-shrink-0" alt="OpenRouter"/>`
          : iconType === 'latest'
            ? `<svg viewBox="0 0 24 24" class="h-6 w-6 text-ink flex-shrink-0"><path fill="currentColor" d="M4 5h13a1 1 0 0 1 1 1v11a2 2 0 0 0 2 2H7a3 3 0 0 1-3-3V5zm2 2v9a1 1 0 0 0 1 1h9V7H6zm10 0h2v10a1 1 0 0 1-1 1h-1V7zm-8 2h7v2H8V9zm0 4h5v2H8v-2z"></path></svg>`
            : `<div class="h-8 w-8 rounded-full bg-ink text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">${letter}</div>`;
      return `<div class="flex items-start gap-3 p-3 border border-softline rounded-xl bg-white">
        ${icon}
        <div>
          <p class="text-sm font-semibold text-ink line-clamp-2 leading-snug">${escapeHtml(title)}</p>
          ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="text-[11px] text-neutral-500 underline break-all">${escapeHtml(link)}</a>` : ''}
          <p class="text-xs text-neutral-500">${escapeHtml(author)}</p>
        </div>
      </div>`;
    })
    .join('');
  return `<div class="space-y-2">${content || '<p class="text-xs text-neutral-500">No preview available.</p>'}</div>`;
}

function escapeHtml(str = '') {
  return str.replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

function buildTracePreview(label, items = [], iconType = 'letter') {
  const first = items[0];
  if (!first) return '';
  const title = first.title || first.name || 'Untitled';
  const author = first.provider || first.source || first.org || '';
  const link = first.link || first.url || '';
  const icon =
    iconType === 'openrouter'
      ? `<img src="https://uxwing.com/wp-content/themes/uxwing/download/brands-and-social-media/openrouter-icon.png" class="h-4 w-4 flex-shrink-0" alt="OpenRouter"/>`
      : `<svg viewBox="0 0 24 24" class="h-5 w-5 text-ink flex-shrink-0"><path fill="currentColor" d="M4 5h13a1 1 0 0 1 1 1v11a2 2 0 0 0 2 2H7a3 3 0 0 1-3-3V5zm2 2v9a1 1 0 0 0 1 1h9V7H6zm10 0h2v10a1 1 0 0 1-1 1h-1V7zm-8 2h7v2H8V9zm0 4h5v2H8v-2z"></path></svg>`;
  return `
    <div class="flex items-center gap-2 pill">
      ${icon}
      <span class="text-xs font-semibold text-ink">${escapeHtml(label)}</span>
      <span class="text-xs text-neutral-500 truncate max-w-[180px]">${escapeHtml(title)}</span>
      <span class="text-[10px] text-neutral-400">${escapeHtml(author)}</span>
      ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener" class="text-[10px] underline text-neutral-500 truncate max-w-[120px]">${escapeHtml(link)}</a>` : ''}
    </div>
  `;
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
  const picks = [SOURCES.find((s) => s.key === 'latest'), SOURCES.find((s) => s.key === 'openrouter')];

  const wantsBenchmarks = /benchmark|eval|score|latency|performance|leaderboard/.test(keywords);
  const wantsHype = /hype|trend|buzz|social|reddit/.test(keywords);
  const wantsBlog = /blog|article|writeup|post/.test(keywords);
  const wantsTesting = /test|testing|catalog/.test(keywords);

  if (wantsHype || keywords.includes('trend')) picks.push(SOURCES.find((s) => s.key === 'hype'));
  if (wantsBenchmarks || keywords.includes('monitor')) picks.push(SOURCES.find((s) => s.key === 'monitor'));
  if (wantsBlog || keywords.includes('blog')) picks.push(SOURCES.find((s) => s.key === 'blog'));
  if (wantsTesting || keywords.includes('catalog')) picks.push(SOURCES.find((s) => s.key === 'testing-catalog'));

  if (picks.length < 5) {
    ['hype', 'monitor', 'blog', 'testing-catalog'].forEach((k) => {
      if (picks.length < 5) {
        const src = SOURCES.find((s) => s.key === k);
        if (src && !picks.includes(src)) picks.push(src);
      }
    });
  }
  return picks.filter(Boolean).slice(0, 5);
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
