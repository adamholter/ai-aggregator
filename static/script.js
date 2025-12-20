// API Configuration
// NOTE: No hardcoded API keys - all keys are user-provided via Settings modal
// Server-side keys are handled by the backend for catalog data only
const ARTIFICIAL_ANALYSIS_BASE_URL = 'https://artificialanalysis.ai/api/v2';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// Global variables to store cached data
let cachedData = {
    llms: null,
    textToImage: null,
    imageEditing: null,
    textToSpeech: null,
    textToVideo: null,
    imageToVideo: null,
    falModels: null,
    replicateModels: null,
    openRouterModels: null,
    hype: null,
    blog: null,
    latest: null,
    monitor: null,
    testingCatalog: null
};

// Store raw data for filtering
let rawData = {
    llms: null,
    textToImage: null,
    imageEditing: null,
    textToSpeech: null,
    textToVideo: null,
    imageToVideo: null,
    falModels: null,
    replicateModels: null,
    openRouterModels: null,
    hype: null,
    blog: null,
    latest: null,
    monitor: null,
    testingCatalog: null
};

// AI Agent configuration
let agentConfig = {
    model: 'x-ai/grok-4-fast',
    availableModels: [], // Will be populated from settings
    conversationHistory: [] // For context memory
};

const AGENT_EXP_MODEL_STORAGE_KEY = 'dashboard-agent-exp-model';
const AGENT_EXP_DEFAULT_MODEL = 'x-ai/grok-4-fast';
let agentExpState = {
    model: AGENT_EXP_DEFAULT_MODEL,
    conversation: [],
    streaming: false,
    streamBuffer: '',
    activeMessage: null
};
let testingCatalogTagFilter = '__all';
let testingCatalogTagOptions = [];
let testingCatalogLoadId = 0;
let currentUser = null;
let authMode = 'login';
let pinnedItems = [];
const LOCAL_PIN_STORAGE_KEY = 'dashboard-pinned-items';
const EXPERIMENTAL_FILTER_MODEL = 'google/gemini-2.5-flash-lite-preview-09-2025';
const FILTERABLE_SECTIONS = {
    llms: { sectionId: 'llms', category: 'llms', limit: 60, getItems: () => rawData.llms || [] },
    'text-to-image': { sectionId: 'text-to-image', category: 'text-to-image', limit: 60, getItems: () => rawData.textToImage || [] },
    'image-editing': { sectionId: 'image-editing', category: 'image-editing', limit: 60, getItems: () => rawData.imageEditing || [] },
    'text-to-speech': { sectionId: 'text-to-speech', category: 'text-to-speech', limit: 60, getItems: () => rawData.textToSpeech || [] },
    'text-to-video': { sectionId: 'text-to-video', category: 'text-to-video', limit: 60, getItems: () => rawData.textToVideo || [] },
    'image-to-video': { sectionId: 'image-to-video', category: 'image-to-video', limit: 60, getItems: () => rawData.imageToVideo || [] },
    fal: { sectionId: 'fal-models', category: 'fal', limit: 60, getItems: () => rawData.falModels || [] },
    replicate: { sectionId: 'replicate-models', category: 'replicate', limit: 60, getItems: () => rawData.replicateModels || [] },
    openrouter: { sectionId: 'openrouter-models', category: 'openrouter', limit: 60, getItems: () => rawData.openRouterModels || [] },
    hype: { sectionId: 'hype', category: 'hype', limit: 60, getItems: () => rawData.hype || [] },
    latest: { sectionId: 'latest', category: 'latest', limit: 80, getItems: () => rawData.latest || cachedData.latest || [] },
    blog: { sectionId: 'blog', category: 'blog', limit: 60, getItems: () => rawData.blog || [] },
    'testing-catalog': { sectionId: 'testing-catalog', category: 'testing-catalog', limit: 60, getItems: () => rawData.testingCatalog || [] },
    monitor: { sectionId: 'monitor', category: 'monitor', limit: 60, getItems: () => rawData.monitor || [] }
};
const CATEGORY_RAW_DATA_KEYS = {
    'text-to-image': 'textToImage',
    'image-editing': 'imageEditing',
    'text-to-speech': 'textToSpeech',
    'text-to-video': 'textToVideo',
    'image-to-video': 'imageToVideo',
    'fal': 'falModels',
    'replicate': 'replicateModels',
    'openrouter': 'openRouterModels',
    'hype': 'hype',
    'latest': 'latest',
    'blog': 'blog',
    'testing-catalog': 'testingCatalog',
    'monitor': 'monitor'
};
const filterState = {};
const displayedSnapshots = {};
const FILTER_MODEL_STORAGE_KEY = 'dashboard-filter-model-id';
const FILTER_PROMPT_NOTE_STORAGE_KEY = 'dashboard-filter-prompt-note';

function recordDisplayedItems(category, items) {
    if (typeof category !== 'string') {
        return;
    }
    displayedSnapshots[category] = Array.isArray(items) ? items.slice() : [];
}

function getDisplayedItems(category) {
    return displayedSnapshots[category] ? displayedSnapshots[category].slice() : [];
}

function getFilteredItems(category, fallback = []) {
    const state = filterState[category];
    if (!state || !state.enabled || !Array.isArray(state.items)) {
        return fallback;
    }
    return state.items;
}

function normalizeFilterIdentifier(value) {
    if (value === undefined || value === null) {
        return '';
    }
    const normalized = String(value).trim();
    return normalized ? normalized.toLowerCase() : '';
}

function collectFilterMatchKeys(entry) {
    if (!entry || typeof entry !== 'object') {
        return [];
    }
    const keys = new Set();
    const candidates = [
        entry.title,
        entry.name,
        entry.model,
        entry.id,
        entry.slug,
        entry.link,
        entry.url
    ];
    candidates.forEach(value => {
        const normalized = normalizeFilterIdentifier(value);
        if (normalized) {
            keys.add(normalized);
        }
    });
    return Array.from(keys);
}

function mapFilterEntriesToItems(items, filterEntries) {
    if (!Array.isArray(items) || !Array.isArray(filterEntries)) {
        return [];
    }
    const filterKeys = new Set();
    filterEntries.forEach(entry => {
        collectFilterMatchKeys(entry).forEach(key => filterKeys.add(key));
    });
    if (!filterKeys.size) {
        return [];
    }
    const matchedItems = [];
    const seenItems = new Set();
    items.forEach(item => {
        if (seenItems.has(item)) {
            return;
        }
        const candidateKeys = collectFilterMatchKeys(item);
        if (!candidateKeys.length) {
            return;
        }
        const isMatch = candidateKeys.some(key => filterKeys.has(key));
        if (isMatch) {
            matchedItems.push(item);
            seenItems.add(item);
        }
    });
    return matchedItems;
}

function getConfiguredFilterModelId() {
    return localStorage.getItem(FILTER_MODEL_STORAGE_KEY) || EXPERIMENTAL_FILTER_MODEL;
}

function setConfiguredFilterModelId(value) {
    if (value) {
        localStorage.setItem(FILTER_MODEL_STORAGE_KEY, value.trim());
    } else {
        localStorage.removeItem(FILTER_MODEL_STORAGE_KEY);
    }
}

function getFilterPromptNoteSetting() {
    return localStorage.getItem(FILTER_PROMPT_NOTE_STORAGE_KEY) || '';
}

function setFilterPromptNoteSetting(value) {
    if (value) {
        localStorage.setItem(FILTER_PROMPT_NOTE_STORAGE_KEY, value.trim());
    } else {
        localStorage.removeItem(FILTER_PROMPT_NOTE_STORAGE_KEY);
    }
}

function refreshCategoryView(category) {
    switch (category) {
        case 'llms':
            filterLLMData();
            break;
        case 'text-to-image':
        case 'image-editing':
        case 'text-to-speech':
        case 'text-to-video':
        case 'image-to-video': {
            const rawKey = CATEGORY_RAW_DATA_KEYS[category];
            const items = rawKey ? (rawData[rawKey] || []) : [];
            displayMediaData(getFilteredItems(category, items), category);
            break;
        }
        case 'fal':
            filterFalModelsData();
            break;
        case 'replicate':
            filterReplicateModelsData();
            break;
        case 'openrouter':
            filterOpenRouterModelsData();
            break;
        case 'hype':
            displayHypeItems({
                items: getFilteredItems('hype', (cachedData.hype?.items || rawData.hype || [])),
                fetched_at: cachedData.hype?.fetched_at
            });
            break;
        case 'latest':
            displayLatestFeed(getFilteredItems('latest', rawData.latest || cachedData.latest || []));
            break;
        case 'blog':
            displayBlogPosts(cachedData.blog || { posts: rawData.blog || [] });
            break;
        case 'testing-catalog':
            displayTestingCatalogItems(getFilteredItems('testing-catalog', rawData.testingCatalog || []));
            break;
        case 'monitor':
            displayMonitorItems(getFilteredItems('monitor', rawData.monitor || []));
            break;
        default:
            break;
    }
    updatePinButtonStates();
}

function refreshFilterControlsVisibility() {
    const controls = document.querySelectorAll('[data-filter-control]');
    controls.forEach(control => {
        control.style.display = experimentalModeEnabled ? 'flex' : 'none';
    });
}

let openRouterIndex = null;
const modelMatchCache = new Map();
const analysisCache = new Map();
const openRouterMatchCache = new Map();
const USER_OPENROUTER_KEY_STORAGE = 'dashboard-user-openrouter-key';
const EXPERIMENTAL_MODE_STORAGE_KEY = 'dashboard-experimental-mode';

const THEME_SEQUENCE = ['light', 'dark', 'source'];
const THEME_LABELS = {
    light: { label: 'Light Mode', icon: '☀️' },
    dark: { label: 'Dark Mode', icon: '🌙' },
    source: { label: 'Source Mode', icon: '🌈' }
};

const LLM_MAIN_INDEX_KEYS = [
    { key: 'artificial_analysis_coding_index', label: 'Coding Index' },
    { key: 'artificial_analysis_intelligence_index', label: 'Intelligence Index' },
    { key: 'artificial_analysis_math_index', label: 'Math Index' }
];

let modelConfig = null;
let settingsInitialized = false;
let experimentalModeEnabled = true;
let hypeSortMode = 'newest';
let blogSortMode = 'newest';
let agentPendingImages = [];
const BLOG_INITIAL_PAGE_SIZE = 10;
const BLOG_FULL_PAGE_SIZE = 100;
const BLOG_FULL_MAX_PAGES = 5;
let blogPrefetching = false;
let latestTimeframe = 'day';
let latestIncludeHype = false;
let latestMetadata = null;
let latestLoadId = 0;
const LATEST_PREVIEW_LIMIT = 10;
let latestControlsWired = false;

function getLatestControls() {
    const section = document.getElementById('latest');
    return {
        section,
        timeframeSelect: section ? section.querySelector('#latest-timeframe') : document.getElementById('latest-timeframe'),
        includeCheckbox: section ? section.querySelector('#latest-include-hype') : document.getElementById('latest-include-hype'),
        refreshButton: section ? section.querySelector('#latest-refresh') : document.getElementById('latest-refresh'),
        header: section ? section.querySelector('.section-header h2') : null
    };
}

function syncLatestControls() {
    const { timeframeSelect, includeCheckbox } = getLatestControls();
    if (timeframeSelect) {
        const current = timeframeSelect.value;
        if (current !== latestTimeframe) {
            timeframeSelect.value = latestTimeframe;
        }
    }
    if (includeCheckbox) {
        includeCheckbox.checked = Boolean(latestIncludeHype);
    }
}

function ensureLatestControlListeners() {
    const { timeframeSelect, includeCheckbox } = getLatestControls();
    if (timeframeSelect && timeframeSelect.dataset.listenerAttached !== 'true') {
        timeframeSelect.addEventListener('change', () => {
            latestTimeframe = timeframeSelect.value || 'day';
            syncLatestControls();
            loadLatestFeed(true);
        });
        timeframeSelect.dataset.listenerAttached = 'true';
    }
    if (includeCheckbox && includeCheckbox.dataset.listenerAttached !== 'true') {
        includeCheckbox.addEventListener('change', () => {
            latestIncludeHype = includeCheckbox.checked;
            syncLatestControls();
            loadLatestFeed(true);
        });
        includeCheckbox.dataset.listenerAttached = 'true';
    }
    syncLatestControls();
    latestControlsWired = Boolean(timeframeSelect || includeCheckbox);
}

function updateLatestHeading() {
    const { header } = getLatestControls();
    if (header) {
        const windowLabel = latestMetadata?.window_label
            || (latestTimeframe === 'week' ? 'Last 7 days' : 'Last 24 hours');
        header.textContent = `Latest Activity (${windowLabel})`;
    }
}

// Common words to ignore when matching model names between sources
const MATCH_EXCLUSION_TOKENS = [
    'minimal', 'mini', 'base', 'medium', 'high', 'pro', 'ultra', 'turbo',
    'preview', 'beta', 'test', 'experimental', 'fast', 'speed', 'lite',
    'flash', 'standard', 'default', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6',
    'v7', 'v8', 'nano', 'micro', 'small', 'medium', 'large', 'xl', 'xxl',
    'exp', 'experimental', 'research'
];

const CP1252_REVERSE_MAP = {
    0x20AC: 0x80, 0x201A: 0x82, 0x0192: 0x83, 0x201E: 0x84, 0x2026: 0x85,
    0x2020: 0x86, 0x2021: 0x87, 0x02C6: 0x88, 0x2030: 0x89, 0x0160: 0x8A,
    0x2039: 0x8B, 0x0152: 0x8C, 0x017D: 0x8E, 0x2018: 0x91, 0x2019: 0x92,
    0x201C: 0x93, 0x201D: 0x94, 0x2022: 0x95, 0x2013: 0x96, 0x2014: 0x97,
    0x02DC: 0x98, 0x2122: 0x99, 0x0161: 0x9A, 0x203A: 0x9B, 0x0153: 0x9C,
    0x017E: 0x9E, 0x0178: 0x9F
};

function fixEncodingArtifacts(text) {
    if (!text || typeof text !== 'string') return text;

    let requiresFix = false;
    for (const sequence of ['â', 'Â']) {
        if (text.includes(sequence)) {
            requiresFix = true;
            break;
        }
    }

    if (!requiresFix) {
        return text;
    }

    const bytes = [];
    let changed = false;

    for (let i = 0; i < text.length; i++) {
        const code = text.codePointAt(i);

        // Skip surrogate pair second code unit
        if (code > 0xffff) {
            i++;
        }

        if (code <= 0xFF) {
            bytes.push(code);
        } else if (CP1252_REVERSE_MAP[code]) {
            bytes.push(CP1252_REVERSE_MAP[code]);
            changed = true;
        } else {
            // Fallback for characters outside CP1252 - abort fix
            return text;
        }
    }

    try {
        const decoded = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(bytes));
        if (!changed && decoded === text) {
            return text;
        }
        if (decoded.includes('�')) {
            return text;
        }
        return decoded;
    } catch (error) {
        return text;
    }
}

const STREAM_BLOCK_PATTERN = /^(#{1,6}\s|[-*+]\s|```|>|\|)/;
const RELATIVE_TIME_FORMATTER = (typeof Intl !== 'undefined' && typeof Intl.RelativeTimeFormat === 'function')
    ? new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
    : null;

function escapeHtml(value) {
    return (value == null ? '' : String(value)).replace(/[&<>"']/g, char => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    }[char]));
}

function showToast(message, type = 'error', duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
        toast.classList.add('toast-error');
    } else if (type === 'warning') {
        toast.classList.add('toast-warning');
    }

    toast.innerHTML = `
        <span class="toast-message">${escapeHtml(message)}</span>
        <button type="button" aria-label="Dismiss toast">×</button>
    `;

    const dismiss = () => {
        toast.classList.add('fade-out');
        window.setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    };

    const button = toast.querySelector('button');
    if (button) {
        button.addEventListener('click', dismiss);
    }

    container.appendChild(toast);

    if (duration > 0) {
        window.setTimeout(dismiss, duration);
    }
}

function clearAgentLoadingState() {
    const chatMessages = document.getElementById('chat-messages');
    if (!chatMessages) return;

    const loadingIndicator = chatMessages.querySelector('.message.ai.loading-initial');
    if (loadingIndicator) {
        loadingIndicator.remove();
    }

    const streamingMessage = chatMessages.querySelector('.message.ai.streaming');
    if (streamingMessage) {
        chatMessages.removeChild(streamingMessage);
    }
}

function appendStreamChunk(current, chunk) {
    if (!chunk) return current || '';
    if (!current) return chunk;

    const trimmedStart = chunk.trimStart();
    if (STREAM_BLOCK_PATTERN.test(trimmedStart)) {
        if (!current.endsWith('\n')) {
            return current + '\n\n' + chunk;
        }
    }
    return current + chunk;
}

function resolveModelName(model) {
    if (!model) return '';
    return model.name || model.title || model.modelId || model.id || '';
}

function getAnalysisCacheKey(model, type) {
    return `${type || ''}::${resolveModelName(model).toLowerCase()}`;
}

function getUserOpenRouterKey() {
    try {
        return localStorage.getItem(USER_OPENROUTER_KEY_STORAGE) || '';
    } catch (error) {
        console.warn('Unable to access localStorage for OpenRouter key:', error);
        return '';
    }
}

function setUserOpenRouterKey(value) {
    try {
        if (value) {
            localStorage.setItem(USER_OPENROUTER_KEY_STORAGE, value);
        } else {
            localStorage.removeItem(USER_OPENROUTER_KEY_STORAGE);
        }
    } catch (error) {
        console.warn('Unable to persist OpenRouter key:', error);
    }
}

function getStoredExperimentalMode() {
    try {
        const stored = localStorage.getItem(EXPERIMENTAL_MODE_STORAGE_KEY);
        if (stored === null) {
            return null;
        }
        return stored === 'true';
    } catch (error) {
        console.warn('Unable to read experimental mode preference:', error);
        return null;
    }
}

function persistExperimentalMode(enabled) {
    try {
        if (enabled) {
            localStorage.setItem(EXPERIMENTAL_MODE_STORAGE_KEY, 'true');
        } else {
            localStorage.removeItem(EXPERIMENTAL_MODE_STORAGE_KEY);
        }
    } catch (error) {
        console.warn('Unable to store experimental mode preference:', error);
    }
}

function applyExperimentalMode(enabled) {
    experimentalModeEnabled = Boolean(enabled);
    document.documentElement.classList.toggle('experimental-mode', experimentalModeEnabled);

    const experimentalElements = document.querySelectorAll('[data-experimental="true"]');
    experimentalElements.forEach(element => {
        element.setAttribute('aria-hidden', experimentalModeEnabled ? 'false' : 'true');
        element.style.display = experimentalModeEnabled ? '' : 'none';
    });

    if (!experimentalModeEnabled) {
        ensureActiveSectionIsAllowed();
    }
    refreshFilterControlsVisibility();
}

function ensureActiveSectionIsAllowed() {
    const activeButton = document.querySelector('.nav-btn.active');
    if (activeButton && activeButton.dataset.experimental === 'true') {
        const fallbackButton = Array.from(document.querySelectorAll('.nav-btn')).find(btn => btn.dataset.experimental !== 'true') || document.querySelector('.nav-btn');
        if (fallbackButton && fallbackButton !== activeButton) {
            fallbackButton.click();
        }
    }
}

function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
    });
}

async function collectImageAttachments() {
    if (!agentPendingImages.length) {
        return [];
    }
    const attachments = [];
    for (const file of agentPendingImages) {
        try {
            const dataUrl = await readFileAsDataURL(file);
            attachments.push({
                name: file.name,
                type: file.type,
                size: file.size,
                data: dataUrl
            });
        } catch (error) {
            console.error('Failed to read attachment', file.name, error);
        }
    }
    return attachments;
}

function resetImageUploads() {
    agentPendingImages = [];
    const input = document.getElementById('agent-image');
    if (input) {
        input.value = '';
    }
    const preview = document.getElementById('agent-image-preview');
    if (preview) {
        preview.innerHTML = '';
        preview.classList.remove('has-items');
    }
    updateAttachmentButtonState();
}

function updateAttachmentButtonState() {
    const button = document.getElementById('agent-attachment-button');
    if (!button) return;
    if (agentPendingImages.length) {
        button.classList.add('has-attachments');
    } else {
        button.classList.remove('has-attachments');
    }
}

function setupImageUpload() {
    const input = document.getElementById('agent-image');
    if (!input) return;

    const button = document.getElementById('agent-attachment-button');
    if (button) {
        button.addEventListener('click', () => input.click());
    }

    updateAttachmentButtonState();

    input.addEventListener('change', () => {
        agentPendingImages = Array.from(input.files || []);
        const preview = document.getElementById('agent-image-preview');
        if (preview) {
            preview.innerHTML = '';
            preview.classList.remove('has-items');
        }

        if (!agentPendingImages.length) {
            updateAttachmentButtonState();
            return;
        }

        if (preview) {
            preview.classList.add('has-items');
            agentPendingImages.forEach(file => {
                const item = document.createElement('div');
                item.className = 'image-preview-item';
                const sizeKB = (file.size / 1024).toFixed(1);
                item.textContent = `📎 ${file.name} (${sizeKB} KB)`;
                preview.appendChild(item);
            });
        }

        updateAttachmentButtonState();
    });
}

function withUserOpenRouterKey(headers = {}) {
    const token = getUserOpenRouterKey();
    if (token) {
        return {
            ...headers,
            Authorization: `Bearer ${token}`
        };
    }
    return headers;
}

function getCachedAnalysis(model, type) {
    return analysisCache.get(getAnalysisCacheKey(model, type));
}

function hasAnalysisContent(payload) {
    return payload && typeof payload.analysis === 'string';
}

function saveAnalysisToCache(model, type, payload) {
    if (!hasAnalysisContent(payload)) return;
    analysisCache.set(getAnalysisCacheKey(model, type), payload);
}

async function fetchExistingAnalysis(model, type) {
    const modelName = resolveModelName(model);
    if (!modelName) {
        return null;
    }
    const params = new URLSearchParams({ name: modelName, type: type || 'llm' });
    const response = await fetch(`/api/model-analysis?${params.toString()}`);
    if (response.status === 404) {
        return null;
    }
    if (!response.ok) {
        let errorMessage = `HTTP error! status: ${response.status}`;
        try {
            const payload = await response.json();
            errorMessage = payload.error || payload.message || errorMessage;
        } catch (parseError) {
            // Response body might not be JSON; ignore.
        }

        // Handle specific error cases
        if (response.status === 402) {
            errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
        }

        throw new Error(errorMessage);
    }
    const result = await response.json();
    if (!hasAnalysisContent(result)) {
        return null;
    }
    return result;
}

function normalizeModelName(value) {
    if (!value) return '';
    return value
        .toLowerCase()
        .replace(/[\u2010-\u2015]/g, '-') // normalize dashes
        .replace(/[^a-z0-9\s\-\/]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function removeMatchTokens(value) {
    if (!value) return '';
    const tokens = value.split(' ');
    const filtered = tokens.filter(token => !MATCH_EXCLUSION_TOKENS.includes(token));
    return filtered.join(' ').trim();
}

function buildOpenRouterIndex(models) {
    if (!Array.isArray(models)) return null;
    const index = new Map();

    models.forEach(model => {
        const variants = new Set([
            normalizeModelName(model.name),
            normalizeModelName(model.base_name),
            normalizeModelName(model.id),
            normalizeModelName(model.slug),
            removeMatchTokens(normalizeModelName(model.name)),
            removeMatchTokens(normalizeModelName(model.base_name))
        ]);

        variants.forEach(variant => {
            if (!variant) return;
            const existing = index.get(variant) || [];
            existing.push(model);
            index.set(variant, existing);
        });
    });

    return index;
}

function ensureOpenRouterIndex() {
    if (openRouterIndex || !Array.isArray(cachedData.openRouterModels)) {
        return openRouterIndex;
    }
    openRouterIndex = buildOpenRouterIndex(cachedData.openRouterModels);
    return openRouterIndex;
}

async function requestModelMatch(source, target, modelPayload, options = {}) {
    if (!modelPayload || !modelPayload.name) {
        return null;
    }
    const cacheKey = `${source}::${target}::${(modelPayload.name || '').toLowerCase()}::${(modelPayload.provider || '').toLowerCase()}`;
    if (!options.force && modelMatchCache.has(cacheKey)) {
        return modelMatchCache.get(cacheKey);
    }

    const response = await fetch('/api/model-match', {
        method: 'POST',
        headers: withUserOpenRouterKey({
            'Content-Type': 'application/json'
        }),
        body: JSON.stringify({
            source,
            target,
            model: modelPayload,
            force: Boolean(options.force)
        })
    });

    const result = await response.json();
    if (!response.ok) {
        let errorMessage = result.error || 'Model match request failed';

        // Handle specific error cases
        if (response.status === 402) {
            errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
        }

        throw new Error(errorMessage);
    }

    modelMatchCache.set(cacheKey, result);
    return result;
}

function findOpenRouterMatch(modelName, providerHint = '') {
    if (!modelName) return null;
    ensureOpenRouterIndex();
    if (!openRouterIndex) return null;

    const cacheKey = `${modelName}::${providerHint}`;
    if (openRouterMatchCache.has(cacheKey)) {
        return openRouterMatchCache.get(cacheKey);
    }

    const target = normalizeModelName(modelName);
    const simplified = removeMatchTokens(target);
    const candidates = [
        target,
        simplified,
        simplifyWithVendor(target, providerHint),
        simplifyWithVendor(simplified, providerHint)
    ].filter(Boolean);

    for (const candidate of candidates) {
        const matches = openRouterIndex.get(candidate);
        if (matches && matches.length > 0) {
            const match = selectPreferredMatch(matches, providerHint);
            openRouterMatchCache.set(cacheKey, match);
            return match;
        }
    }

    // Fuzzy fallback
    const keys = Array.from(openRouterIndex.keys());
    let bestScore = 0;
    let bestMatch = null;
    candidates.forEach(candidate => {
        if (!candidate) return;
        keys.forEach(key => {
            const score = similarity(candidate, key);
            if (score > bestScore && score >= 0.68) {
                const match = openRouterIndex.get(key);
                if (match && match.length > 0) {
                    bestScore = score;
                    bestMatch = selectPreferredMatch(match, providerHint);
                }
            }
        });
    });

    openRouterMatchCache.set(cacheKey, bestMatch);
    return bestMatch;
}

function simplifyWithVendor(value, vendor) {
    if (!value) return '';
    if (!vendor) return value;
    const normalizedVendor = normalizeModelName(vendor);
    return value.replace(normalizedVendor, '').replace(/\s+/g, ' ').trim();
}

function selectPreferredMatch(matches, providerHint) {
    if (!matches || matches.length === 0) return null;
    if (!providerHint) return matches[0];
    const normalizedHint = normalizeModelName(providerHint);
    const found = matches.find(model => normalizeModelName(model.vendor || '').includes(normalizedHint));
    return found || matches[0];
}

function similarity(a, b) {
    if (!a || !b) return 0;
    const tokensA = new Set(a.split(' '));
    const tokensB = new Set(b.split(' '));
    if (tokensA.size === 0 || tokensB.size === 0) return 0;
    let intersection = 0;
    tokensA.forEach(token => {
        if (tokensB.has(token)) {
            intersection += 1;
        }
    });
    return intersection / Math.max(tokensA.size, tokensB.size);
}

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', async function () {
    console.info('The quick brown fox jumped over the lazy dogs – experimental canary build active.');
    await preloadModelConfig();
    ensureExperimentalSections();
    ensureExperimentalNavButtons();
    setupNavigation();
    initializeTheme();
    initializeAuthControls();
    setupFilterControls();
    setupFilterSettings();
    applyAgentDefaults();
    setupOpenRouterControls();
    populateAgentDropdown();
    initializeAgentExp();
    loadLLMData(); // Load LLM data by default
    setupImageUpload();
    const pinnedRefreshButton = document.getElementById('pinned-refresh');
    if (pinnedRefreshButton) {
        pinnedRefreshButton.addEventListener('click', () => {
            refreshPinnedItems();
        });
    }
    const storedExperimentalMode = getStoredExperimentalMode();
    applyExperimentalMode(storedExperimentalMode === null ? true : storedExperimentalMode);

    const hypeSortSelect = document.getElementById('hype-sort');
    if (hypeSortSelect) {
        hypeSortMode = hypeSortSelect.value || 'newest';
        hypeSortSelect.addEventListener('change', () => {
            hypeSortMode = hypeSortSelect.value || 'newest';
            if (cachedData.hype) {
                displayHypeItems(cachedData.hype);
            }
        });
    }
});

// Theme management
function initializeTheme() {
    const stored = localStorage.getItem('theme');
    const preferredDefault = 'source';
    const initialTheme = THEME_SEQUENCE.includes(stored) ? stored : preferredDefault;
    document.documentElement.setAttribute('data-theme', initialTheme);
    if (!THEME_SEQUENCE.includes(stored)) {
        localStorage.setItem('theme', initialTheme);
    }
    updateThemeToggleText(initialTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const currentIndex = Math.max(THEME_SEQUENCE.indexOf(currentTheme), 0);
    const nextTheme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];

    document.documentElement.setAttribute('data-theme', nextTheme);
    localStorage.setItem('theme', nextTheme);
    updateThemeToggleText(nextTheme);
}

function updateThemeToggleText(theme) {
    const toggle = document.querySelector('.theme-toggle');
    if (toggle) {
        const index = THEME_SEQUENCE.indexOf(theme);
        const currentIndex = index === -1 ? 0 : index;
        const nextTheme = THEME_SEQUENCE[(currentIndex + 1) % THEME_SEQUENCE.length];
        const descriptor = THEME_LABELS[nextTheme] || { label: 'Theme', icon: '🎨' };
        toggle.textContent = `${descriptor.icon} ${descriptor.label}`;
    }
}

async function initializeAuthControls() {
    const authButton = document.getElementById('auth-button');
    const authForm = document.getElementById('auth-form');
    const authClose = document.getElementById('auth-close');
    const modeToggle = document.getElementById('auth-mode-toggle');

    if (authButton) {
        authButton.addEventListener('click', () => {
            if (currentUser) {
                logoutUser();
            } else {
                openAuthModal('login');
            }
        });
    }
    if (authForm) {
        authForm.addEventListener('submit', handleAuthSubmit);
    }
    if (authClose) {
        authClose.addEventListener('click', closeAuthModal);
    }
    if (modeToggle) {
        modeToggle.addEventListener('click', () => {
            setAuthMode(authMode === 'login' ? 'register' : 'login');
        });
    }
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            const modal = document.getElementById('auth-modal');
            if (modal && modal.style.display !== 'none') {
                closeAuthModal();
            }
        }
    });
    await refreshAuthState();
}

async function refreshAuthState() {
    try {
        const response = await fetch('/api/me', { credentials: 'same-origin' });
        if (response.ok) {
            const payload = await response.json();
            currentUser = payload.authenticated ? payload.user : null;
        } else {
            currentUser = null;
        }
    } catch (error) {
        console.error('Failed to check auth state:', error);
        currentUser = null;
    }
    updateAuthButton();
    await refreshPinnedItems();
}

function updateAuthButton() {
    const authButton = document.getElementById('auth-button');
    if (!authButton) return;
    if (currentUser) {
        authButton.textContent = `Log Out (${currentUser.email})`;
        authButton.dataset.authState = 'logout';
    } else {
        authButton.textContent = 'Log In';
        authButton.dataset.authState = 'login';
    }
}

function setAuthMode(mode) {
    authMode = mode;
    const modalTitle = document.getElementById('auth-modal-title');
    const submitButton = document.getElementById('auth-submit');
    const modeToggle = document.getElementById('auth-mode-toggle');
    if (modalTitle) {
        modalTitle.textContent = mode === 'register' ? 'Create Account' : 'Log In';
    }
    if (submitButton) {
        submitButton.textContent = mode === 'register' ? 'Register' : 'Log In';
    }
    if (modeToggle) {
        modeToggle.textContent = mode === 'register'
            ? 'Already have an account? Log In'
            : 'Need an account? Register';
    }
    const passwordInput = document.getElementById('auth-password');
    if (passwordInput) {
        passwordInput.value = '';
    }
    showAuthError('');
}

function openAuthModal(mode = 'login') {
    const modal = document.getElementById('auth-modal');
    if (!modal) return;
    setAuthMode(mode);
    modal.style.display = 'flex';
    const emailInput = document.getElementById('auth-email');
    if (emailInput) {
        emailInput.focus();
    }
}

function closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    showAuthError('');
}

function showAuthError(message) {
    const errorElement = document.getElementById('auth-error');
    if (errorElement) {
        errorElement.textContent = message || '';
    }
}

async function handleAuthSubmit(event) {
    event.preventDefault();
    const emailInput = document.getElementById('auth-email');
    const passwordInput = document.getElementById('auth-password');
    if (!emailInput || !passwordInput) return;
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        showAuthError('Email and password are required.');
        return;
    }
    const endpoint = authMode === 'register' ? '/auth/register' : '/auth/login';
    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'same-origin',
            body: JSON.stringify({ email, password })
        });
        const payload = await response.json();
        if (!response.ok) {
            showAuthError(payload.error || 'Unable to complete the request.');
            return;
        }
        currentUser = payload.user || null;
        closeAuthModal();
        updateAuthButton();
        await refreshPinnedItems();
    } catch (error) {
        console.error('Auth request failed:', error);
        showAuthError('Request failed. Please try again.');
    }
}

async function logoutUser() {
    try {
        await fetch('/auth/logout', { method: 'POST', credentials: 'same-origin' });
    } catch (error) {
        console.error('Failed to log out:', error);
    } finally {
        currentUser = null;
        updateAuthButton();
        await refreshPinnedItems();
    }
}

function buildPinKey(categoryId, item) {
    if (!categoryId) {
        return `uncategorized:${Date.now()}`;
    }
    const identifier =
        item?.id
        || item?.uuid
        || item?.model_id
        || item?.modelId
        || item?.slug
        || item?.url
        || item?.name
        || item?.title;
    if (identifier) {
        return `${categoryId}:${identifier}`;
    }
    const jsonSnippet = JSON.stringify({
        label: item?.name || item?.title || item?.summary || '',
        url: item?.url || ''
    });
    let hash = 0;
    for (let i = 0; i < jsonSnippet.length; i++) {
        hash = (hash * 31 + jsonSnippet.charCodeAt(i)) | 0;
    }
    return `${categoryId}:${Math.abs(hash)}`;
}

function loadLocalPins() {
    try {
        const raw = localStorage.getItem(LOCAL_PIN_STORAGE_KEY);
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return parsed;
        }
    } catch (error) {
        console.error('Failed to parse local pins:', error);
    }
    return [];
}

function saveLocalPins(items) {
    try {
        localStorage.setItem(LOCAL_PIN_STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
        console.error('Failed to save local pins:', error);
    }
}

function isItemPinned(categoryId, item) {
    const key = buildPinKey(categoryId, item);
    return pinnedItems.some(entry => entry.key === key);
}

function attachPinButton(card, categoryId, item) {
    if (!card || !item) {
        return;
    }
    const key = buildPinKey(categoryId, item);
    let button = card.querySelector('.pin-control');
    if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'pin-control';
        button.addEventListener('click', event => {
            event.preventDefault();
            event.stopPropagation();
            togglePin(categoryId, item);
        });
        card.appendChild(button);
    }
    button.dataset.pinKey = key;
    updatePinButton(button);
}

function updatePinButton(button) {
    if (!button) return;
    const key = button.dataset.pinKey;
    const pinned = pinnedItems.some(entry => entry.key === key);
    button.classList.toggle('is-pinned', pinned);
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-pin" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M4.146.146A.5.5 0 0 1 4.5 0h7a.5.5 0 0 1 .5.5c0 .68-.342 1.174-.646 1.479-.126.125-.25.224-.354.298v4.431l.078.048c.203.127.476.314.751.555C12.36 7.775 13 8.527 13 9.5a.5.5 0 0 1-.5.5h-4v4.5c0 .276-.224 1.5-.5 1.5s-.5-1.224-.5-1.5V10h-4a.5.5 0 0 1-.5-.5c0-.973.64-1.725 1.17-2.189A6 6 0 0 1 5 6.708V2.277a3 3 0 0 1-.354-.298C4.342 1.674 4 1.179 4 .5a.5.5 0 0 1 .146-.354m1.58 1.408-.002-.001zm-.002-.001.002.001A.5.5 0 0 1 6 2v5a.5.5 0 0 1-.276.447h-.002l-.012.007-.054.03a5 5 0 0 0-.827.58c-.318.278-.585.596-.725.936h7.792c-.14-.34-.407-.658-.725-.936a5 5 0 0 0-.881-.61l-.012-.006h-.002A.5.5 0 0 1 10 7V2a.5.5 0 0 1 .295-.458 1.8 1.8 0 0 0 .351-.271c.08-.08.155-.17.214-.271H5.14q.091.15.214.271a1.8 1.8 0 0 0 .37.282"/>
        </svg>
    `;
    button.innerHTML = svg;
    button.setAttribute('aria-label', pinned ? 'Unpin this card' : 'Pin this card');
}

function updatePinButtonStates() {
    const buttons = document.querySelectorAll('.pin-control');
    buttons.forEach(updatePinButton);
}

async function togglePin(categoryId, item) {
    const key = buildPinKey(categoryId, item);
    const existing = pinnedItems.find(entry => entry.key === key);
    try {
        if (currentUser) {
            if (existing) {
                await removeRemotePin(existing);
            } else {
                await addRemotePin(categoryId, item, key);
            }
        } else {
            if (existing) {
                removeLocalPin(key);
            } else {
                addLocalPin(categoryId, item, key);
            }
        }
    } catch (error) {
        console.error('Failed to toggle pin:', error);
    }
    await refreshPinnedItems();
}

async function addRemotePin(categoryId, item, key) {
    const response = await fetch('/api/pins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ category: categoryId, item, key })
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to pin item.');
    }
}

async function removeRemotePin(pin) {
    if (!pin?.id && !pin?.key) {
        return;
    }
    const endpoint = pin.id ? `/api/pins/${pin.id}` : `/api/pins?key=${encodeURIComponent(pin.key)}`;
    const response = await fetch(endpoint, {
        method: 'DELETE',
        credentials: 'same-origin'
    });
    if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to remove pin.');
    }
}

function addLocalPin(categoryId, item, key) {
    const entries = loadLocalPins();
    entries.unshift({
        id: key,
        key,
        category: categoryId,
        item,
        created_at: new Date().toISOString()
    });
    saveLocalPins(entries.slice(0, 200));
}

function removeLocalPin(key) {
    const entries = loadLocalPins().filter(entry => entry.key !== key);
    saveLocalPins(entries);
}

async function refreshPinnedItems() {
    try {
        if (currentUser) {
            const response = await fetch('/api/pins', { credentials: 'same-origin' });
            if (response.ok) {
                const payload = await response.json();
                pinnedItems = payload.items || [];
            } else {
                pinnedItems = [];
            }
        } else {
            pinnedItems = loadLocalPins();
        }
    } catch (error) {
        console.error('Failed to refresh pins:', error);
        if (!currentUser) {
            pinnedItems = loadLocalPins();
        }
    }
    renderPinnedItemsSection();
    updatePinButtonStates();
}

function renderPinnedItemsSection() {
    const container = document.getElementById('pinned-data');
    const emptyState = document.getElementById('pinned-empty');
    if (!container || !emptyState) {
        return;
    }
    container.innerHTML = '';
    if (!pinnedItems.length) {
        emptyState.style.display = 'block';
        return;
    }
    emptyState.style.display = 'none';
    pinnedItems.forEach((pin, index) => {
        const card = createCardForPinnedItem(pin, index);
        if (card) {
            container.appendChild(card);
        }
    });
}
const PIN_CARD_CREATORS = {
    llms: (item) => createLLMCard(item),
    'text-to-image': (item) => createMediaCard(item, 'text-to-image'),
    'image-editing': (item) => createMediaCard(item, 'image-editing'),
    'text-to-speech': (item) => createMediaCard(item, 'text-to-speech'),
    'text-to-video': (item) => createMediaCard(item, 'text-to-video'),
    'image-to-video': (item) => createMediaCard(item, 'image-to-video'),
    fal: (item) => createFalModelCard(item),
    replicate: (item) => createReplicateModelCard(item),
    openrouter: (item) => createOpenRouterCard(item),
    hype: (item, index, pin) => createHypeCard(item, index, pin?.item?.fetched_at),
    blog: (item) => createBlogCard(item),
    'testing-catalog': (item) => createTestingCatalogCard(item),
    latest: (item) => createLatestCard(item),
    monitor: (item) => createMonitorCard(item)
};

function createCardForPinnedItem(pin, index = 0) {
    const category = pin.category;
    const item = pin.item || {};
    const creator = PIN_CARD_CREATORS[category];
    if (!creator) {
        return null;
    }
    const card = creator(item, index, pin);
    if (!card) {
        return null;
    }
    const button = card.querySelector('.pin-control');
    if (button) {
        button.dataset.pinKey = pin.key;
        updatePinButton(button);
    } else {
        attachPinButton(card, category, item);
        const newButton = card.querySelector('.pin-control');
        if (newButton) {
            newButton.dataset.pinKey = pin.key;
            updatePinButton(newButton);
        }
    }
    return card;
}

function setupFilterControls() {
    Object.entries(FILTERABLE_SECTIONS).forEach(([category, config]) => {
        const section = document.getElementById(config.sectionId);
        if (!section) {
            return;
        }
        const header = section.querySelector('.section-header');
        if (header && !header.querySelector(`[data-filter-control="${category}"]`)) {
            const control = document.createElement('div');
            control.className = 'filter-controls';
            control.dataset.filterControl = category;
            control.innerHTML = `
                <label class="filter-toggle">
                    <input type="checkbox" data-filter-toggle="${category}">
                    <span>AI Filter</span>
                </label>
                <input type="text" data-filter-input="${category}" placeholder="Importance & recency (optional)" disabled>
                <button type="button" class="filter-run" data-filter-run="${category}" disabled>Run</button>
                <button type="button" class="link-btn" data-filter-clear="${category}">Clear</button>
                <span class="filter-status" data-filter-status="${category}"></span>
            `;
            header.appendChild(control);
            const toggle = control.querySelector(`[data-filter-toggle="${category}"]`);
            const runButton = control.querySelector(`[data-filter-run="${category}"]`);
            const clearButton = control.querySelector(`[data-filter-clear="${category}"]`);
            toggle.addEventListener('change', () => handleFilterToggle(category, toggle.checked));
            runButton.addEventListener('click', () => handleFilterRun(category));
            if (clearButton) {
                clearButton.addEventListener('click', () => {
                    toggle.checked = false;
                    handleFilterToggle(category, false);
                });
            }
            control.style.display = 'flex';
        }
    });
    refreshFilterControlsVisibility();
}

function setupFilterSettings() {
    const modelInput = document.getElementById('filter-model-id');
    const promptInput = document.getElementById('filter-prompt-note');
    if (modelInput) {
        modelInput.value = getConfiguredFilterModelId();
        modelInput.addEventListener('change', () => setConfiguredFilterModelId(modelInput.value));
    }
    if (promptInput) {
        promptInput.value = getFilterPromptNoteSetting();
        promptInput.addEventListener('change', () => setFilterPromptNoteSetting(promptInput.value));
    }
}

function handleFilterToggle(category, enabled) {
    filterState[category] = filterState[category] || { items: [] };
    filterState[category].enabled = enabled;
    const input = document.querySelector(`[data-filter-input="${category}"]`);
    const runButton = document.querySelector(`[data-filter-run="${category}"]`);
    if (input) {
        input.disabled = !enabled;
    }
    if (runButton) {
        runButton.disabled = !enabled;
    }
    if (!enabled) {
        filterState[category].items = [];
        refreshCategoryView(category);
        markFilterStatus(category, '');
    }
}

function markFilterStatus(category, message) {
    const statusElement = document.querySelector(`[data-filter-status="${category}"]`);
    if (statusElement) {
        statusElement.textContent = message || '';
    }
}

async function handleFilterRun(category) {
    const config = FILTERABLE_SECTIONS[category];
    if (!config) {
        return;
    }
    const datasetItems = Array.isArray(config.getItems()) ? config.getItems() : [];
    const displayed = getDisplayedItems(category);
    const items = displayed.length ? displayed : datasetItems;
    if (!items || !items.length) {
        markFilterStatus(category, 'No data available to filter.');
        return;
    }
    const instructionsInput = document.querySelector(`[data-filter-input="${category}"]`);
    const instructions = instructionsInput ? instructionsInput.value.trim() : '';
    markFilterStatus(category, 'Filtering...');
    const runButton = document.querySelector(`[data-filter-run="${category}"]`);
    if (runButton) {
        runButton.disabled = true;
    }
    try {
        const response = await fetch('/api/experimental-filter', {
            method: 'POST',
            headers: withUserOpenRouterKey({ 'Content-Type': 'application/json' }),
            credentials: 'same-origin',
            body: JSON.stringify({
                category: config.category,
                instructions,
                items: prepareFilterItems(items, config.limit || 60),
                model_id: getConfiguredFilterModelId(),
                system_prompt_note: getFilterPromptNoteSetting()
            })
        });
        const payload = await response.json();
        if (!response.ok) {
            throw new Error(payload.error || 'Filtering failed.');
        }
        const filterEntries = Array.isArray(payload.items) ? payload.items : [];
        const matchSource = datasetItems.length ? datasetItems : items;
        const matchedItems = mapFilterEntriesToItems(matchSource, filterEntries);
        filterState[category] = {
            enabled: true,
            items: matchedItems
        };
        refreshCategoryView(category);
        const matchedCount = matchedItems.length;
        markFilterStatus(category, `Filtered ${matchedCount} item${matchedCount === 1 ? '' : 's'}`);
    } catch (error) {
        console.error('Filter request failed:', error);
        markFilterStatus(category, error.message || 'Filtering failed.');
    } finally {
        if (runButton) {
            runButton.disabled = false;
        }
    }
}

function prepareFilterItems(items, limit = 60) {
    return items.slice(0, limit).map(item => ({
        title: item?.title || item?.name || item?.model || item?.id || '',
        summary: item?.summary || item?.excerpt || item?.description || item?.content_text || '',
        link: item?.url || item?.link || '',
        timestamp: buildFilterTimestamp(item),
        tags: item?.tags || item?.categories || []
    }));
}

function buildFilterTimestamp(item) {
    if (!item || typeof item !== 'object') {
        return '';
    }
    if (item.timestamp) {
        return item.timestamp;
    }
    if (item.published_date && item.published_time) {
        return `${item.published_date}T${item.published_time}`;
    }
    return item.published_date || item.date || item.created_at || '';
}



async function preloadModelConfig() {
    if (modelConfig !== null) {
        return modelConfig;
    }

    try {
        const response = await fetch('/api/model-config');
        if (response.ok) {
            modelConfig = await response.json();
        }
    } catch (error) {
        console.error('Failed to load model configuration:', error);
    }

    return modelConfig;
}

function applyAgentDefaults() {
    const agentSettings = (modelConfig && modelConfig.agent) || {};

    if (agentSettings.defaultModel) {
        agentConfig.model = agentSettings.defaultModel;
    }

    if (agentSettings.speedModeModel) {
        agentConfig.speedModeModel = agentSettings.speedModeModel;
    }

    if (!localStorage.getItem('dashboard-available-models') && selectedAvailableModels.length === 0) {
        const defaultIds = agentSettings.availableModels || [];
        if (defaultIds.length) {
            selectedAvailableModels = defaultIds.map(id => ({ id, name: id }));
            updateAvailableModelsDisplay();
        }
    }

    if (!localStorage.getItem('dashboard-fallback-models') && selectedFallbackModels.length === 0) {
        const fallbackIds = agentSettings.fallbackModels || [];
        if (fallbackIds.length) {
            selectedFallbackModels = fallbackIds.map(id => ({ id, name: id }));
            updateFallbackModelsDisplay();
        }
    }

    if (openRouterModels.length) {
        mergeSelectedModelsFromCatalog(openRouterModels);
    }
}

function mergeSelectedModelsFromCatalog(catalog) {
    if (!Array.isArray(catalog) || !catalog.length) {
        return;
    }

    const mapById = new Map(catalog.map(model => [model.id, model]));

    const enhance = (entry) => {
        const catalogModel = mapById.get(entry.id);
        if (!catalogModel) {
            return entry;
        }
        return {
            ...entry,
            name: catalogModel.name || entry.name || entry.id,
            vendor: catalogModel.vendor || entry.vendor || '',
            pricing: catalogModel.pricing || entry.pricing || null
        };
    };

    if (selectedAvailableModels.length) {
        selectedAvailableModels = selectedAvailableModels.map(enhance);
        updateAvailableModelsDisplay();
    }

    if (selectedFallbackModels.length) {
        selectedFallbackModels = selectedFallbackModels.map(enhance);
        updateFallbackModelsDisplay();
    }

    populateAgentDropdown();
}

// Setup navigation functionality
function ensureExperimentalNavButtons() {
    const nav = document.querySelector('.navigation');
    if (!nav) return;

    const ensureButton = (section, label) => {
        let button = nav.querySelector(`.nav-btn[data-section="${section}"]`);
        if (!button) {
            button = document.createElement('button');
            button.className = 'nav-btn';
            button.dataset.section = section;
            button.textContent = label;
            const anchor = nav.querySelector('.nav-btn[data-section="ai-agent"]');
            if (anchor) {
                nav.insertBefore(button, anchor);
            } else {
                nav.appendChild(button);
            }
        } else {
            button.textContent = label;
        }
        button.style.display = '';
        button.removeAttribute('aria-hidden');
    };

    ensureButton('hype', 'Hype');
    ensureButton('latest', 'Latest');
    ensureButton('monitor', 'Monitor');
    ensureButton('blog', 'Blog');
    ensureButton('testing-catalog', 'Testing Catalog');
    ensureButton('agent-exp', 'Agent');
}

function ensureExperimentalSections() {
    const main = document.querySelector('.main-content');
    if (!main) return;

    const ensureLatestControls = (section) => {
        if (!section) return;
        const controls = section.querySelector('.controls');
        if (!controls) return;

        let timeframeSelect = section.querySelector('#latest-timeframe');
        if (!timeframeSelect) {
            timeframeSelect = document.createElement('select');
            timeframeSelect.id = 'latest-timeframe';
            timeframeSelect.setAttribute('aria-label', 'Latest feed timeframe');
            timeframeSelect.innerHTML = `
                <option value="day" selected>Last 24 hours</option>
                <option value="week">Last 7 days</option>
            `;
            controls.insertBefore(timeframeSelect, controls.firstChild);
        }

        let includeCheckbox = section.querySelector('#latest-include-hype');
        if (!includeCheckbox) {
            const label = document.createElement('label');
            label.className = 'toggle-option';
            includeCheckbox = document.createElement('input');
            includeCheckbox.type = 'checkbox';
            includeCheckbox.id = 'latest-include-hype';
            const span = document.createElement('span');
            span.textContent = 'Include Hype';
            label.appendChild(includeCheckbox);
            label.appendChild(span);

            const refreshButton = controls.querySelector('#latest-refresh');
            if (refreshButton) {
                controls.insertBefore(label, refreshButton);
            } else {
                controls.appendChild(label);
            }
        }

        const note = section.querySelector('.section-note');
        if (note) {
            note.textContent = 'Experimental aggregation of Blog, OpenRouter, Replicate, and fal.ai updates from the selected window. Toggle Hype to blend in community buzz.';
        }
        ensureLatestControlListeners();
    };

    const existingLatest = document.getElementById('latest');
    if (!existingLatest) {
        const section = document.createElement('section');
        section.id = 'latest';
        section.className = 'content-section';
        section.innerHTML = `
            <div class="section-header">
                <h2>Latest Activity (Last 24 hours)</h2>
                <div class="controls">
                    <button class="refresh-btn" id="latest-refresh">Refresh Feed</button>
                </div>
            </div>
            <p class="section-note">Experimental aggregation of Blog, OpenRouter, Replicate, and fal.ai updates from the selected window. Toggle Hype to blend in community buzz.</p>
            <div class="loading" id="latest-loading">
                <div class="loading-spinner"></div>
            </div>
            <div class="error" id="latest-error" style="display: none;"></div>
            <div class="results-info" id="latest-results-info" style="display:none;"></div>
            <div class="data-container" id="latest-data"></div>
        `;
        main.appendChild(section);
        ensureLatestControls(section);
    } else {
        existingLatest.style.display = '';
        ensureLatestControls(existingLatest);
    }

    if (!document.getElementById('monitor')) {
        const section = document.createElement('section');
        section.id = 'monitor';
        section.className = 'content-section';
        section.innerHTML = `
            <div class="section-header">
                <h2>Monitor Feed</h2>
                <div class="controls">
                    <button class="refresh-btn" id="monitor-refresh">Refresh Monitor</button>
                </div>
            </div>
            <p class="section-note">Auto-compiles updates from MatVid Pro’s Discord channel and Adam’s personal X feed.</p>
            <div class="loading" id="monitor-loading">
                <div class="loading-spinner"></div>
            </div>
            <div class="error" id="monitor-error" style="display: none;"></div>
            <div class="results-info" id="monitor-results-info" style="display:none;"></div>
            <div class="data-container" id="monitor-data"></div>
        `;
        const blogSection = document.getElementById('blog');
        if (blogSection && blogSection.parentNode === main) {
            main.insertBefore(section, blogSection);
        } else {
            main.appendChild(section);
        }
    } else {
        const existingMonitor = document.getElementById('monitor');
        existingMonitor.style.display = '';
    }

    const attachTestingCatalogListeners = (section) => {
        if (!section) return;
        const refresh = section.querySelector('#testing-catalog-refresh');
        if (refresh && refresh.dataset.listenerAttached !== 'true') {
            refresh.addEventListener('click', () => loadTestingCatalogData(true));
            refresh.dataset.listenerAttached = 'true';
        }
    };

    if (!document.getElementById('blog')) {
        const section = document.createElement('section');
        section.id = 'blog';
        section.className = 'content-section';
        section.innerHTML = `
            <div class="section-header">
                <h2>Latest Blog Posts</h2>
                <div class="controls">
                    <select id="blog-sort" aria-label="Sort blog posts">
                        <option value="newest" selected>Newest</option>
                        <option value="oldest">Oldest</option>
                    </select>
                    <button class="refresh-btn" id="blog-refresh">Refresh Posts</button>
                </div>
            </div>
            <p class="section-note">Experimental feed direct from adam.holter.com.</p>
            <div class="loading" id="blog-loading">
                <div class="loading-spinner"></div>
            </div>
            <div class="error" id="blog-error" style="display: none;"></div>
            <div class="results-info" id="blog-results-info" style="display:none;"></div>
            <div class="data-container" id="blog-data"></div>
        `;
        const textToImage = document.getElementById('text-to-image');
        if (textToImage && textToImage.parentNode === main) {
            main.insertBefore(section, textToImage);
        } else {
            main.appendChild(section);
        }
    }

    if (!document.getElementById('testing-catalog')) {
        const section = document.createElement('section');
        section.id = 'testing-catalog';
        section.className = 'content-section';
        section.innerHTML = `
            <div class="section-header">
                <h2>Testing Catalog</h2>
                <div class="controls">
                    <select id="testing-catalog-tag-filter" aria-label="Filter Testing Catalog by tag">
                        <option value="__all" selected>All Tags</option>
                    </select>
                    <button class="refresh-btn" id="testing-catalog-refresh">Refresh Feed</button>
                </div>
            </div>
            <p class="section-note">Fresh Android testing news sourced from TestingCatalog (updated daily).</p>
            <div class="loading" id="testing-catalog-loading">
                <div class="loading-spinner"></div>
            </div>
            <div class="error" id="testing-catalog-error" style="display: none;"></div>
            <div class="results-info" id="testing-catalog-results-info" style="display:none;"></div>
            <div class="data-container" id="testing-catalog-data"></div>
        `;
        main.appendChild(section);
        attachTestingCatalogListeners(section);
    } else {
        attachTestingCatalogListeners(document.getElementById('testing-catalog'));
    }
}
function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const sections = document.querySelectorAll('.content-section');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetSection = button.getAttribute('data-section');

            // Update active states
            navButtons.forEach(btn => btn.classList.remove('active'));
            sections.forEach(section => section.classList.remove('active'));

            button.classList.add('active');
            document.getElementById(targetSection).classList.add('active');

            // Load data for the selected section
            loadSectionData(targetSection);
        });
    });
}

// Load data based on selected section
function loadSectionData(section) {
    switch (section) {
        case 'llms':
            if (!cachedData.llms) loadLLMData();
            break;
        case 'text-to-image':
            if (!cachedData.textToImage) loadTextToImageData();
            break;
        case 'image-editing':
            if (!cachedData.imageEditing) loadImageEditingData();
            break;
        case 'text-to-speech':
            if (!cachedData.textToSpeech) loadTextToSpeechData();
            break;
        case 'text-to-video':
            if (!cachedData.textToVideo) loadTextToVideoData();
            break;
        case 'image-to-video':
            if (!cachedData.imageToVideo) loadImageToVideoData();
            break;
        case 'fal-models':
            if (!cachedData.falModels) loadFalModelsData();
            break;
        case 'replicate-models':
            if (!cachedData.replicateModels) loadReplicateModelsData();
            break;
        case 'openrouter-models':
            if (!cachedData.openRouterModels) {
                loadOpenRouterModelsData();
            } else {
                filterOpenRouterModelsData();
            }
            break;
        case 'hype':
            if (!cachedData.hype) {
                loadHypeData();
            } else {
                displayHypeItems(cachedData.hype);
            }
            break;
        case 'latest':
            if (!cachedData.latest) {
                loadLatestFeed();
            } else {
                displayLatestFeed(cachedData.latest);
            }
            break;
        case 'monitor':
            if (!cachedData.monitor) {
                loadMonitorFeed();
            } else {
                displayMonitorItems(cachedData.monitor);
            }
            break;
        case 'blog':
            if (!cachedData.blog) {
                loadBlogPosts();
            } else {
                displayBlogPosts(cachedData.blog);
            }
            break;
        case 'testing-catalog':
            if (!cachedData.testingCatalog) {
                loadTestingCatalogData();
            } else {
                displayTestingCatalogItems(rawData.testingCatalog || []);
            }
            break;
        case 'agent-exp':
            focusAgentExpInput();
            break;
    }
}

// Generic API call function
async function makeAPICall(url, apiKey, options = {}) {
    try {
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        if (apiKey) {
            headers['x-api-key'] = apiKey;
        }

        const response = await fetch(url, {
            ...options,
            headers
        });

        if (!response.ok) {
            let message = `HTTP error! status: ${response.status}`;
            try {
                const payload = await response.json();
                message = payload.error || payload.message || message;
            } catch (parseError) {
                // Response body might not be JSON; ignore.
            }

            // Handle specific error cases
            if (response.status === 402) {
                message = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
            }

            throw new Error(message);
        }

        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Load LLM data
async function loadLLMData() {
    const loadingElement = document.getElementById('llms-loading');
    const errorElement = document.getElementById('llms-error');
    const dataElement = document.getElementById('llms-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/llms', null);
        cachedData.llms = data;
        rawData.llms = data.data;

        filterLLMData();
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load LLM data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Display LLM data
function displayLLMData(models) {
    const container = document.getElementById('llms-data');
    container.innerHTML = '';

    models.forEach(model => {
        const modelCard = createLLMCard(model);
        container.appendChild(modelCard);
    });
    recordDisplayedItems('llms', models);
}

// Create LLM card
function buildLLMEvaluationPreview(evaluations = {}) {
    const entries = [];
    LLM_MAIN_INDEX_KEYS.forEach(({ key, label }) => {
        const value = evaluations[key];
        if (value == null) {
            return;
        }
        entries.push({
            label,
            value: typeof value === 'number' ? value.toFixed(3) : value
        });
    });

    if (!entries.length) {
        const fallbackEntries = Object.entries(evaluations)
            .slice(0, 3)
            .map(([key, value]) => ({
                label: formatEvaluationKey(key),
                value: typeof value === 'number' ? value.toFixed(3) : value
            }));
        entries.push(...fallbackEntries);
    }

    if (!entries.length) {
        return '';
    }

    const hasMore = Object.keys(evaluations).length > entries.length;

    return `
        <div class="evaluations">
            <h4>Evaluations</h4>
            ${entries.map(entry => `
                <div class="evaluation-item">
                    <span>${entry.label}</span>
                    <span>${entry.value}</span>
                </div>
            `).join('')}
            ${hasMore ? '<div class="evaluation-note">Click to see the full breakdown.</div>' : ''}
        </div>
    `;
}

function createLLMCard(model) {
    const card = document.createElement('div');
    card.className = 'model-card clickable';
    card.dataset.source = 'aa-llm';
    card.onclick = () => openModelModal(model, 'llm');

    const evaluations = model.evaluations || {};
    const pricing = model.pricing || {};

    card.innerHTML = `
        <div class="source-badge">Artificial Analysis</div>
        <h3>${model.name}</h3>
        <div class="model-creator">${model.model_creator.name}</div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">Output Speed</span>
                <span class="stat-value">${model.median_output_tokens_per_second || 'N/A'} tokens/s</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Time to First Token</span>
                <span class="stat-value">${model.median_time_to_first_token_seconds || 'N/A'}s</span>
            </div>
        </div>
        
        ${buildLLMEvaluationPreview(evaluations)}
        
        <div class="pricing">
            <h4>Pricing (per 1M tokens)</h4>
            <div class="evaluation-item">
                <span>Input</span>
                <span>$${pricing.price_1m_input_tokens || 'N/A'}</span>
            </div>
            <div class="evaluation-item">
                <span>Output</span>
                <span>$${pricing.price_1m_output_tokens || 'N/A'}</span>
            </div>
        </div>
        
        <div class="click-hint">💡 Click to explore full model details</div>
    `;
    attachPinButton(card, 'llms', model);
    return card;
}

// Load Text-to-Image data
async function loadTextToImageData() {
    const loadingElement = document.getElementById('text-to-image-loading');
    const errorElement = document.getElementById('text-to-image-error');
    const dataElement = document.getElementById('text-to-image-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/text-to-image?include_categories=true', null);
        cachedData.textToImage = data;
        rawData.textToImage = data.data;

        filterTextToImageData();
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Text-to-Image data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Load Image Editing data
async function loadImageEditingData() {
    const loadingElement = document.getElementById('image-editing-loading');
    const errorElement = document.getElementById('image-editing-error');
    const dataElement = document.getElementById('image-editing-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/image-editing', null);
        cachedData.imageEditing = data;
        rawData.imageEditing = data.data;

        displayMediaData(data.data, 'image-editing');
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Image Editing data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Load Text-to-Speech data
async function loadTextToSpeechData() {
    const loadingElement = document.getElementById('text-to-speech-loading');
    const errorElement = document.getElementById('text-to-speech-error');
    const dataElement = document.getElementById('text-to-speech-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/text-to-speech', null);
        cachedData.textToSpeech = data;
        rawData.textToSpeech = data.data;

        displayMediaData(data.data, 'text-to-speech');
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Text-to-Speech data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Load Text-to-Video data
async function loadTextToVideoData() {
    const loadingElement = document.getElementById('text-to-video-loading');
    const errorElement = document.getElementById('text-to-video-error');
    const dataElement = document.getElementById('text-to-video-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/text-to-video', null);
        cachedData.textToVideo = data;
        rawData.textToVideo = data.data;

        displayMediaData(data.data, 'text-to-video');
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Text-to-Video data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Load Image-to-Video data
async function loadImageToVideoData() {
    const loadingElement = document.getElementById('image-to-video-loading');
    const errorElement = document.getElementById('image-to-video-error');
    const dataElement = document.getElementById('image-to-video-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/image-to-video', null);
        cachedData.imageToVideo = data;
        rawData.imageToVideo = data.data;

        displayMediaData(data.data, 'image-to-video');
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Image-to-Video data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

async function fetchFalModelsData(forceRefresh = false, limit = null) {
    if (cachedData.falModels && !forceRefresh && !limit) {
        return cachedData.falModels;
    }
    let url = forceRefresh ? '/api/fal-models?cache_bust=true' : '/api/fal-models';
    if (limit) {
        url += (url.includes('?') ? '&' : '?') + `limit=${limit}`;
    }
    const data = await makeAPICall(url, null);

    if (!limit) {
        cachedData.falModels = data;
        rawData.falModels = data;
    }
    return data;
}

// Load Fal.ai Models data with progressive loading
async function loadFalModelsData(forceRefresh = false) {
    const loadingElement = document.getElementById('fal-models-loading');
    const errorElement = document.getElementById('fal-models-error');
    const dataElement = document.getElementById('fal-models-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        // Step 1: Load initial batch for fast UI
        const initialData = await fetchFalModelsData(forceRefresh, 20);
        rawData.falModels = initialData; // Temporary set for rendering
        filterFalModelsData();
        loadingElement.style.display = 'none';

        // Step 2: Load the rest in background
        setTimeout(async () => {
            try {
                const fullData = await fetchFalModelsData(forceRefresh);
                rawData.falModels = fullData;
                filterFalModelsData();
            } catch (bgError) {
                console.warn('Background fetch for Fal.ai failed:', bgError);
            }
        }, 100);

    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Fal.ai models data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

async function fetchReplicateModelsData(forceRefresh = false) {
    if (cachedData.replicateModels && !forceRefresh) {
        return cachedData.replicateModels;
    }
    const url = forceRefresh ? '/api/replicate-models?cache_bust=true' : '/api/replicate-models';
    const data = await makeAPICall(url, null);
    cachedData.replicateModels = data;
    rawData.replicateModels = data;
    return data;
}

// Load Replicate Models data
async function loadReplicateModelsData(forceRefresh = false) {
    const loadingElement = document.getElementById('replicate-models-loading');
    const errorElement = document.getElementById('replicate-models-error');
    const dataElement = document.getElementById('replicate-models-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        await fetchReplicateModelsData(forceRefresh);

        filterReplicateModelsData();
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Replicate models data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

async function fetchAndCacheOpenRouterModels(forceRefresh = false) {
    if (cachedData.openRouterModels && !forceRefresh) {
        return cachedData.openRouterModels;
    }
    const url = forceRefresh ? '/api/openrouter-models?cache_bust=true' : '/api/openrouter-models';
    const data = await makeAPICall(url, null);
    openRouterModels = Array.isArray(data) ? data : [];
    cachedData.openRouterModels = openRouterModels;
    rawData.openRouterModels = openRouterModels;
    openRouterIndex = null;
    openRouterMatchCache.clear();
    ensureOpenRouterIndex();
    mergeSelectedModelsFromCatalog(openRouterModels);
    if (!settingsInitialized) {
        loadSavedSettings();
        settingsInitialized = true;
    }
    return openRouterModels;
}

async function ensureOpenRouterDataLoaded() {
    if (cachedData.openRouterModels) {
        return cachedData.openRouterModels;
    }
    try {
        await fetchAndCacheOpenRouterModels();
        populateOpenRouterVendorFilter(openRouterModels);
        filterOpenRouterModelsData();
        return openRouterModels;
    } catch (error) {
        console.error('Failed to prefetch OpenRouter models:', error);
        return null;
    }
}

// Load OpenRouter models data
async function loadOpenRouterModelsData(forceRefresh = false) {
    const loadingElement = document.getElementById('openrouter-models-loading');
    const errorElement = document.getElementById('openrouter-models-error');
    const dataElement = document.getElementById('openrouter-models-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        await fetchAndCacheOpenRouterModels(forceRefresh);
        populateOpenRouterVendorFilter(openRouterModels);
        filterOpenRouterModelsData();
        populateAgentExpModels();
        loadingElement.style.display = 'none';
        if (dataElement) {
            dataElement.classList.add('loaded');
        }
    } catch (error) {
        console.error('Failed to load OpenRouter models:', error);
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load OpenRouter data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

function populateOpenRouterVendorFilter(models) {
    const vendorInput = document.getElementById('openrouter-vendor');
    const vendorOptions = document.getElementById('openrouter-vendor-options');
    if (!vendorInput || !vendorOptions || !Array.isArray(models)) return;

    const vendors = Array.from(new Set(models.map(model => model.vendor).filter(Boolean))).sort();

    const currentValue = vendorInput.value;
    vendorOptions.innerHTML = vendors.map(vendor => `<option value="${vendor}"></option>`).join('');

    if (currentValue && vendors.includes(currentValue)) {
        vendorInput.value = currentValue;
    } else if (currentValue && !vendors.includes(currentValue)) {
        vendorInput.value = '';
    }
}

function filterOpenRouterModelsData() {
    if (!rawData.openRouterModels) return;

    const loadingElement = document.getElementById('openrouter-models-loading');
    if (loadingElement) {
        loadingElement.style.display = 'none';
    }

    const searchInput = document.getElementById('openrouter-search');
    const sortSelect = document.getElementById('openrouter-sort');
    const vendorSelect = document.getElementById('openrouter-vendor');
    const mediaToggle = document.getElementById('openrouter-media-toggle');

    const searchTerm = ((searchInput && searchInput.value) || '').toLowerCase();
    const sortBy = (sortSelect && sortSelect.value) || 'newest';
    const vendorFilter = (vendorSelect && vendorSelect.value) || '';
    const imageOnly = !!(mediaToggle && mediaToggle.checked);

    let filtered = rawData.openRouterModels.filter(model => {
        const matchesVendor = !vendorFilter || (model.vendor && model.vendor === vendorFilter);
        const architecture = model.architecture || {};
        const inputModalities = Array.isArray(architecture.input_modalities) ? architecture.input_modalities : [];
        const matchesMedia = !imageOnly || inputModalities.indexOf('image') !== -1;
        const matchesSearch = !searchTerm || [
            model.name,
            model.base_name,
            model.id,
            model.slug,
            model.description,
            model.vendor
        ].some(field => normalizeSearchField(field).toLowerCase().includes(searchTerm));

        return matchesVendor && matchesMedia && matchesSearch;
    });

    filtered = sortOpenRouterModelsData(filtered, sortBy);
    const displayModels = getFilteredItems('openrouter', filtered);
    displayOpenRouterModelsData(displayModels);

    const resultsInfo = document.getElementById('openrouter-models-results-info');
    if (resultsInfo) {
        resultsInfo.textContent = `Showing ${displayModels.length} of ${rawData.openRouterModels.length} models`;
    }
}

function sortOpenRouterModelsData(models, sortBy) {
    const sorted = [...models];
    switch (sortBy) {
        case 'name':
            return sorted.sort((a, b) => (a.base_name || a.name || '').localeCompare(b.base_name || b.name || ''));
        case 'vendor':
            return sorted.sort((a, b) => (a.vendor || '').localeCompare(b.vendor || ''));
        case 'context-desc':
            return sorted.sort((a, b) => (b.context_length || 0) - (a.context_length || 0));
        case 'context-asc':
            return sorted.sort((a, b) => (a.context_length || 0) - (b.context_length || 0));
        case 'price':
            return sorted.sort((a, b) => {
                const aPrompt = a.pricing && a.pricing.prompt;
                const bPrompt = b.pricing && b.pricing.prompt;
                const aPrice = parseFloat(aPrompt != null ? aPrompt : Infinity);
                const bPrice = parseFloat(bPrompt != null ? bPrompt : Infinity);
                return aPrice - bPrice;
            });
        case 'newest':
        default:
            return sorted.sort((a, b) => (b.created || 0) - (a.created || 0));
    }
}

function displayOpenRouterModelsData(models) {
    const container = document.getElementById('openrouter-models-data');
    if (!container) return;

    container.innerHTML = '';
    const displayModels = getFilteredItems('openrouter', models);
    recordDisplayedItems('openrouter', displayModels);
    displayModels.forEach(model => {
        container.appendChild(createOpenRouterCard(model));
    });
}

async function fetchHypeData(forceRefresh = false) {
    if (cachedData.hype && !forceRefresh) {
        return cachedData.hype;
    }
    const url = forceRefresh ? '/api/hype?cache_bust=true' : '/api/hype';
    const data = await makeAPICall(url, null);
    cachedData.hype = data;
    rawData.hype = Array.isArray(data?.items) ? data.items : [];
    return data;
}

async function loadHypeData(forceRefresh = false) {
    const loadingElement = document.getElementById('hype-loading');
    const errorElement = document.getElementById('hype-error');
    const dataElement = document.getElementById('hype-data');

    if (!loadingElement || !errorElement || !dataElement) {
        return;
    }

    if (cachedData.hype && !forceRefresh) {
        displayHypeItems(cachedData.hype);
        return;
    }

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await fetchHypeData(forceRefresh);
        displayHypeItems(data);
    } catch (error) {
        errorElement.textContent = `Failed to load hype feed: ${error.message}`;
        errorElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

function displayHypeItems(payload) {
    const container = document.getElementById('hype-data');
    if (!container) return;

    const items = Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : [];
    const fetchedAt = payload?.fetched_at;
    const resultsInfo = document.getElementById('hype-results-info');

    container.innerHTML = '';

    if (!items.length) {
        container.innerHTML = '<div class="empty-state">No hype items available yet. Try refreshing in a bit.</div>';
        if (resultsInfo) {
            resultsInfo.style.display = 'none';
            resultsInfo.textContent = '';
        }
        return;
    }

    const sortedItems = sortHypeItems(items, hypeSortMode);
    const displayItems = getFilteredItems('hype', sortedItems);

    displayItems.forEach((item, index) => {
        container.appendChild(createHypeCard(item, index, fetchedAt));
    });
    recordDisplayedItems('hype', displayItems);

    if (resultsInfo) {
        const summary = [`${displayItems.length} trending projects`];
        const relativeFetched = formatRelativeTime(fetchedAt);
        if (relativeFetched) {
            summary.push(`fetched ${relativeFetched}`);
        }
        summary.push(hypeSortMode === 'newest' ? 'sorted by newest first' : 'sorted by rank');
        resultsInfo.textContent = summary.join(' · ');
        resultsInfo.style.display = 'block';
    }
}

function sortHypeItems(items, mode) {
    if (!Array.isArray(items)) {
        return [];
    }
    const sorted = [...items];
    if (mode === 'newest') {
        sorted.sort((a, b) => getHypeTimestamp(b) - getHypeTimestamp(a));
    } else {
        sorted.sort((a, b) => (b.stars || 0) - (a.stars || 0));
    }
    return sorted;
}

function getHypeTimestamp(item) {
    if (!item || typeof item !== 'object') {
        return 0;
    }
    const candidates = [item.inserted_at, item.created_at, item.updated_at, item.date];
    for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = Date.parse(candidate);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return 0;
}

function createHypeCard(item, index, fetchedAt) {
    const card = document.createElement('div');
    card.className = 'model-card hype-card';
    card.dataset.source = 'hype';

    const name = escapeHtml(item.name || 'Untitled project');
    const url = item.url || '#';
    const points = typeof item.stars === 'number' ? `${item.stars} points` : null;
    const username = item.username ? `by ${escapeHtml(item.username)}` : null;
    const normalizedSource = normalizeHypeSourceId(item.source);
    if (normalizedSource) {
        card.setAttribute('data-hype-source', normalizedSource);
    }
    const sourceLabel = formatHypeSource(item.source);
    const relative = formatRelativeTime(item.created_at || item.inserted_at || item.updated_at || fetchedAt);

    const metaParts = [points, username, relative].filter(Boolean);
    const metaMarkup = metaParts.length
        ? `<div class="card-meta">${metaParts.map(part => `<span class="meta-item">${escapeHtml(part)}</span>`).join('')}</div>`
        : '';

    const summary = item.summary || item.description || '';
    const summaryText = summary ? truncateText(summary, 240) : '';
    const tags = Array.isArray(item.tags) ? item.tags : [];
    const tagEntries = [];

    if (sourceLabel) {
        tagEntries.push({ type: 'source', value: sourceLabel, id: normalizedSource });
    }
    if (item.language) {
        tagEntries.push({ type: 'meta', value: `Lang: ${item.language}` });
    }
    tags.forEach(tag => {
        const label = typeof tag === 'string' ? tag.trim() : '';
        if (label) {
            const normalizedLabel = label.startsWith('#') ? label : `#${label}`;
            tagEntries.push({ type: 'tag', value: normalizedLabel });
        }
    });

    const tagMarkup = tagEntries.length
        ? `<div class="card-tags">${tagEntries.map(renderHypeTag).join('')}</div>`
        : '';
    const summaryMarkup = summaryText ? `<div class="card-summary">${escapeHtml(summaryText)}</div>` : '';

    card.innerHTML = `
        <div class="card-header">
            <div class="card-header-content">
                <div class="source-badge">Hype Signals</div>
                <div class="card-title">
                    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${name}</a>
                </div>
                ${metaMarkup}
            </div>
        </div>
        ${summaryMarkup}
        ${tagMarkup}
        <div class="card-actions">
            <a class="chart-btn secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Open Link</a>
            ${relative ? `<span class="card-badge">Updated ${escapeHtml(relative)}</span>` : ''}
        </div>
    `;

    attachPinButton(card, 'hype', item);
    return card;
}

function renderHypeTag(entry) {
    if (!entry || !entry.value) {
        return '';
    }
    if (entry.type === 'source') {
        const sourceId = normalizeHypeSourceId(entry.id);
        const pillLabel = `Source: ${entry.value}`;
        return `<span class="card-tag source-pill" data-source="${escapeHtml(sourceId)}">${escapeHtml(pillLabel)}</span>`;
    }
    return `<span class="card-tag">${escapeHtml(String(entry.value))}</span>`;
}

function normalizeHypeSourceId(source) {
    if (!source) return '';
    return String(source).toLowerCase().replace(/[\s_-]+/g, '');
}

function formatHypeSource(source) {
    if (!source) return '';
    const normalized = normalizeHypeSourceId(source);
    switch (normalized) {
        case 'github':
            return 'GitHub';
        case 'huggingface':
            return 'Hugging Face';
        case 'replicate':
            return 'Replicate';
        case 'reddit':
            return 'Reddit';
        default:
            return source;
    }
}

function formatRelativeTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
        return '';
    }
    const now = Date.now();
    const diffMs = date.getTime() - now;
    const ranges = [
        { unit: 'year', ms: 1000 * 60 * 60 * 24 * 365 },
        { unit: 'month', ms: 1000 * 60 * 60 * 24 * 30 },
        { unit: 'week', ms: 1000 * 60 * 60 * 24 * 7 },
        { unit: 'day', ms: 1000 * 60 * 60 * 24 },
        { unit: 'hour', ms: 1000 * 60 * 60 },
        { unit: 'minute', ms: 1000 * 60 },
        { unit: 'second', ms: 1000 }
    ];

    for (const range of ranges) {
        if (Math.abs(diffMs) >= range.ms || range.unit === 'second') {
            const value = Math.round(diffMs / range.ms);
            if (RELATIVE_TIME_FORMATTER) {
                return RELATIVE_TIME_FORMATTER.format(value, range.unit);
            }
            const unitLabel = value === 1 || value === -1 ? range.unit : `${range.unit}s`;
            if (value === 0) {
                return 'just now';
            }
            return value > 0 ? `in ${value} ${unitLabel}` : `${Math.abs(value)} ${unitLabel} ago`;
        }
    }
    return '';
}

function formatTestingCatalogTimestamp(dateStr, timeStr) {
    if (!dateStr || !timeStr) return '';
    const iso = `${dateStr}T${timeStr}`;
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) {
        return '';
    }
    return parsed.toLocaleString();
}

async function loadTestingCatalogData(forceRefresh = false) {
    const loadingElement = document.getElementById('testing-catalog-loading');
    const errorElement = document.getElementById('testing-catalog-error');
    const dataElement = document.getElementById('testing-catalog-data');
    const resultsElement = document.getElementById('testing-catalog-results-info');

    if (!loadingElement || !errorElement || !dataElement) {
        return;
    }

    loadingElement.style.display = 'flex';
    errorElement.style.display = 'none';
    dataElement.innerHTML = '';
    if (resultsElement) {
        resultsElement.style.display = 'none';
        resultsElement.textContent = '';
    }

    const quickUrl = `/api/testing-catalog?fast_load=true&cache_bust=true${forceRefresh ? '&force_refresh=true' : ''}`;
    const fullUrl = `/api/testing-catalog?cache_bust=true${forceRefresh ? '&force_refresh=true' : ''}`;
    const loadId = ++testingCatalogLoadId;
    let previewDisplayed = false;

    const renderResultsText = (items, payload, isFull) => {
        if (!resultsElement) {
            return;
        }
        if (!items.length) {
            resultsElement.textContent = 'No TestingCatalog articles are available yet';
            resultsElement.style.display = 'block';
            return;
        }
        if (isFull) {
            const historyTotal = typeof payload?.history_count === 'number'
                ? payload.history_count
                : Array.isArray(payload?.history) ? payload.history.length : items.length;
            resultsElement.textContent = `Showing ${items.length} TestingCatalog articles (history size: ${historyTotal})`;
        } else {
            resultsElement.textContent = `Showing ${items.length} preview TestingCatalog articles (full catalog loading…)`;
        }
        resultsElement.style.display = 'block';
    };

    const startFullFetch = () => {
        (async () => {
            try {
                const payload = await makeAPICall(fullUrl, null);
                if (loadId !== testingCatalogLoadId) {
                    return;
                }
                cachedData.testingCatalog = payload;
                const mergedItems = Array.isArray(payload?.items) ? payload.items : [];
                rawData.testingCatalog = mergedItems;
                displayTestingCatalogItems(rawData.testingCatalog);
                populateTestingCatalogTags(); // Populate tag filter dropdown
                renderResultsText(mergedItems, payload, true);
                errorElement.style.display = 'none';
            } catch (fullError) {
                if (loadId !== testingCatalogLoadId) {
                    return;
                }
                errorElement.textContent = previewDisplayed
                    ? `Updated Testing Catalog load failed: ${fullError.message}`
                    : `Failed to load Testing Catalog: ${fullError.message}`;
                errorElement.style.display = 'block';
            }
        })();
    };

    try {
        const payload = await makeAPICall(quickUrl, null);
        if (loadId !== testingCatalogLoadId) {
            return;
        }
        const previewItems = Array.isArray(payload?.items) ? payload.items : [];
        rawData.testingCatalog = previewItems;
        displayTestingCatalogItems(rawData.testingCatalog);
        renderResultsText(previewItems, payload, false);
        previewDisplayed = true;
    } catch (error) {
        if (loadId !== testingCatalogLoadId) {
            return;
        }
        errorElement.textContent = `Failed to load Testing Catalog preview: ${error.message}`;
        errorElement.style.display = 'block';
    } finally {
        if (loadId !== testingCatalogLoadId) {
            return;
        }
        loadingElement.style.display = 'none';
        startFullFetch();
    }
}

function displayTestingCatalogItems(items) {
    const container = document.getElementById('testing-catalog-data');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    const displayItems = getFilteredItems('testing-catalog', items);
    if (!displayItems || !displayItems.length) {
        container.innerHTML = '<div class="empty-state">No TestingCatalog stories are available yet.</div>';
        return;
    }

    displayItems.forEach(item => {
        container.appendChild(createTestingCatalogCard(item));
    });
    recordDisplayedItems('testing-catalog', displayItems);
}

function createTestingCatalogCard(item) {
    const card = document.createElement('div');
    card.className = 'model-card blog-card';
    card.dataset.source = 'testingcatalog';
    card.dataset.tags = Array.isArray(item?.tags) ? item.tags.join(',').toLowerCase() : '';

    const title = item?.title ? String(item.title).trim() : 'Untitled Update';
    const url = item?.url || '#';
    const timestamp = formatTestingCatalogTimestamp(item?.published_date, item?.published_time);
    const summary = item?.summary || item?.content_text || '';
    const badge = item?.section ? `<span class="blog-tag">${item.section}</span>` : '';
    const tags = Array.isArray(item?.tags) ? item.tags : [];
    const tagsMarkup = tags.length
        ? `<div class="blog-tags">${tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
        : '';

    card.innerHTML = `
        <div class="blog-meta">
            ${timestamp ? `<span class="blog-date">${timestamp}</span>` : ''}
            ${badge}
        </div>
        <h3><a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a></h3>
        ${summary ? `<p class="blog-summary">${summary}</p>` : ''}
        <div class="blog-footer">
            <span class="blog-source">TestingCatalog.com</span>
            ${tagsMarkup}
        </div>
    `;

    attachPinButton(card, 'testing-catalog', item);
    return card;
}

// Populate tag filter dropdown with available tags
function populateTestingCatalogTags() {
    const tagFilter = document.getElementById('testing-catalog-tag-filter');
    const items = rawData.testingCatalog || [];

    if (!tagFilter || !items.length) {
        return;
    }

    // Extract all unique tags from items
    const allTags = new Set();
    items.forEach(item => {
        if (Array.isArray(item?.tags)) {
            item.tags.forEach(tag => {
                if (tag && typeof tag === 'string') {
                    allTags.add(tag.trim());
                }
            });
        }
    });

    // Clear existing options except "All Tags"
    const existingOptions = Array.from(tagFilter.querySelectorAll('option:not([value="__all"])'));
    existingOptions.forEach(option => option.remove());

    // Add tag options
    const sortedTags = Array.from(allTags).sort();
    sortedTags.forEach(tag => {
        const option = document.createElement('option');
        option.value = tag;
        option.textContent = tag;
        tagFilter.appendChild(option);
    });

    // Add event listener for tag filtering
    if (!tagFilter.dataset.listenerAttached) {
        tagFilter.addEventListener('change', filterTestingCatalogByTag);
        tagFilter.dataset.listenerAttached = 'true';
    }
}

// Filter Testing Catalog items by selected tag
function filterTestingCatalogByTag() {
    const tagFilter = document.getElementById('testing-catalog-tag-filter');
    const resultsInfo = document.getElementById('testing-catalog-results-info');
    const items = rawData.testingCatalog || [];

    if (!tagFilter || !items.length) {
        return;
    }

    const selectedTag = tagFilter.value;
    let filteredItems = items;

    // Filter by selected tag if not "All Tags"
    if (selectedTag && selectedTag !== '__all') {
        filteredItems = items.filter(item => {
            if (!Array.isArray(item?.tags)) {
                return false;
            }
            return item.tags.some(tag =>
                tag && typeof tag === 'string' && tag.trim() === selectedTag
            );
        });
    }

    // Display filtered items
    displayTestingCatalogItems(filteredItems);

    // Update results info
    if (resultsInfo) {
        const count = filteredItems.length;
        const total = items.length;
        if (selectedTag && selectedTag !== '__all') {
            resultsInfo.textContent = `Showing ${count} of ${total} articles tagged "${selectedTag}"`;
        } else {
            resultsInfo.textContent = `Showing ${count} articles`;
        }
        resultsInfo.style.display = 'block';
    }
}

async function fetchBlogPostsData(forceRefresh = false, options = {}) {
    const { perPage, maxPages, skipCache } = options;
    if (!forceRefresh && !perPage && cachedData.blog) {
        return cachedData.blog;
    }

    const params = new URLSearchParams();
    if (forceRefresh) {
        params.set('cache_bust', 'true');
    }
    if (perPage) {
        params.set('per_page', perPage);
    }
    if (maxPages) {
        params.set('max_pages', maxPages);
    }
    const url = params.toString() ? `/api/blog-posts?${params}` : '/api/blog-posts';
    const data = await makeAPICall(url, null);

    if (!skipCache) {
        cachedData.blog = data;
        rawData.blog = Array.isArray(data?.posts) ? data.posts : [];
    }

    return data;
}

async function loadBlogPosts(forceRefresh = false) {
    const loadingElement = document.getElementById('blog-loading');
    const errorElement = document.getElementById('blog-error');
    const dataElement = document.getElementById('blog-data');

    if (!loadingElement || !errorElement || !dataElement) {
        return;
    }

    if (cachedData.blog && !forceRefresh) {
        displayBlogPosts(cachedData.blog);
        if (!cachedData.blog?.meta?.complete) {
            setTimeout(() => prefetchRemainingBlogPosts(), 250);
        }
        return;
    }

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await fetchBlogPostsData(forceRefresh, {
            perPage: BLOG_INITIAL_PAGE_SIZE,
            maxPages: 1
        });
        displayBlogPosts(data);
        if (!data?.meta?.complete) {
            setTimeout(() => prefetchRemainingBlogPosts(), 250);
        }
    } catch (error) {
        const message = error?.message || String(error);
        errorElement.textContent = `Failed to load blog posts: ${message}`;
        errorElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

async function prefetchRemainingBlogPosts() {
    if (blogPrefetching) {
        return;
    }
    blogPrefetching = true;
    try {
        const data = await fetchBlogPostsData(true, {
            perPage: BLOG_FULL_PAGE_SIZE,
            maxPages: BLOG_FULL_MAX_PAGES,
            skipCache: true
        });
        if (!data || !Array.isArray(data.posts)) {
            return;
        }
        const existingPosts = Array.isArray(cachedData.blog?.posts) ? cachedData.blog.posts : [];
        const hasMore = data.posts.length > existingPosts.length;
        const newlyComplete = Boolean(data.meta?.complete) && !cachedData.blog?.meta?.complete;
        if (hasMore || newlyComplete) {
            cachedData.blog = data;
            rawData.blog = data.posts;
            displayBlogPosts(data);
        }
    } catch (error) {
        console.warn('Failed to prefetch blog posts:', error);
    } finally {
        blogPrefetching = false;
    }
}

function displayBlogPosts(payload) {
    const container = document.getElementById('blog-data');
    if (!container) return;

    const posts = Array.isArray(payload?.posts) ? payload.posts : Array.isArray(payload) ? payload : [];
    const resultsInfo = document.getElementById('blog-results-info');

    container.innerHTML = '';

    if (!posts.length) {
        container.innerHTML = '<div class="empty-state">No blog posts available yet. Check back soon.</div>';
        if (resultsInfo) {
            resultsInfo.style.display = 'none';
            resultsInfo.textContent = '';
        }
        return;
    }

    const sortedPosts = sortBlogPosts(posts, blogSortMode);
    const displayPosts = getFilteredItems('blog', sortedPosts);
    displayPosts.forEach(post => {
        container.appendChild(createBlogCard(post));
    });
    recordDisplayedItems('blog', displayPosts);

    if (resultsInfo) {
        const summaryParts = [];
        const totalKnown = Number(payload?.meta?.total_posts);
        if (Number.isFinite(totalKnown) && totalKnown > 0) {
            summaryParts.push(`${displayPosts.length} of ${totalKnown} posts`);
        } else {
            summaryParts.push(`${displayPosts.length} posts`);
        }
        const relativeFetched = formatRelativeTime(payload?.fetched_at);
        if (relativeFetched) {
            summaryParts.push(`fetched ${relativeFetched}`);
        }
        summaryParts.push(blogSortMode === 'oldest' ? 'sorted oldest first' : 'sorted newest first');
        resultsInfo.textContent = summaryParts.join(' · ');
        resultsInfo.style.display = 'block';
    }
}

function getBlogTimestamp(post) {
    if (!post || typeof post !== 'object') {
        return 0;
    }
    const candidates = [post.date, post.date_gmt, post.modified];
    for (const candidate of candidates) {
        if (!candidate) continue;
        const parsed = Date.parse(candidate);
        if (!Number.isNaN(parsed)) {
            return parsed;
        }
    }
    return 0;
}

function sortBlogPosts(posts, mode) {
    if (!Array.isArray(posts)) {
        return [];
    }
    const sorted = [...posts].sort((a, b) => getBlogTimestamp(b) - getBlogTimestamp(a));
    if (mode === 'oldest') {
        sorted.reverse();
    }
    return sorted;
}

function createBlogCard(post) {
    const card = document.createElement('div');
    card.className = 'model-card blog-card';
    card.dataset.source = 'blog';

    const href = typeof post?.link === 'string' && post.link ? post.link : '#';
    const titleText = typeof post?.title === 'string' && post.title.trim()
        ? post.title.trim()
        : 'Untitled Post';
    const relativePublished = formatRelativeTime(post?.date || post?.date_gmt || post?.modified);
    const publishedTs = getBlogTimestamp(post);
    const publishedDate = publishedTs ? new Date(publishedTs).toLocaleDateString() : '';
    const readingMinutes = typeof post?.reading_time_minutes === 'number' && post.reading_time_minutes > 0
        ? `${post.reading_time_minutes} min read`
        : '';

    const metaParts = [];
    if (relativePublished) {
        metaParts.push(relativePublished);
    } else if (publishedDate) {
        metaParts.push(publishedDate);
    }

    const metaMarkup = metaParts.length
        ? `<div class="card-meta">${metaParts.map(part => `<span class="meta-item">${escapeHtml(part)}</span>`).join('')}</div>`
        : '';

    const excerpt = typeof post?.excerpt === 'string' && post.excerpt.trim()
        ? truncateText(post.excerpt.trim(), 260)
        : '';
    const summaryMarkup = excerpt
        ? `<div class="card-summary">${escapeHtml(excerpt)}</div>`
        : '';

    const tagEntries = [];
    const seen = new Set();
    const categories = Array.isArray(post?.categories) ? post.categories : [];
    categories.forEach(category => {
        if (typeof category !== 'string') return;
        const label = category.trim();
        if (!label) return;
        const key = `category:${label.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        tagEntries.push({ type: 'category', value: label });
    });

    const tags = Array.isArray(post?.tags) ? post.tags : [];
    tags.forEach(tag => {
        if (typeof tag !== 'string') return;
        const cleaned = tag.trim().replace(/^#/, '').trim();
        if (!cleaned) return;
        const key = `tag:${cleaned.toLowerCase()}`;
        if (seen.has(key)) return;
        seen.add(key);
        tagEntries.push({ type: 'tag', value: cleaned });
    });

    const tagMarkup = tagEntries.length
        ? `<div class="card-tags">${tagEntries.map(renderBlogTag).join('')}</div>`
        : '';

    const badgeMarkup = readingMinutes
        ? `<span class="card-badge">${escapeHtml(readingMinutes)}</span>`
        : '';

    card.innerHTML = `
        <div class="card-header">
            <div class="card-header-content">
                <div class="source-badge">Blog</div>
                <div class="card-title">
                    <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(titleText)}</a>
                </div>
                ${metaMarkup}
            </div>
        </div>
        ${summaryMarkup}
        ${tagMarkup}
        <div class="card-actions">
            <a class="chart-btn secondary" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Read Post</a>
            ${badgeMarkup}
        </div>
    `;
    attachPinButton(card, 'blog', post);
    return card;
}

function renderBlogTag(entry) {
    if (!entry || !entry.value) {
        return '';
    }
    const value = String(entry.value).trim();
    if (!value) {
        return '';
    }
    if (entry.type === 'category') {
        return `<span class="card-tag category-tag">${escapeHtml(value)}</span>`;
    }
    const normalized = value.startsWith('#') ? value.slice(1).trim() : value;
    if (!normalized) {
        return '';
    }
    return `<span class="card-tag tag-pill">#${escapeHtml(normalized)}</span>`;
}

async function loadLatestFeed(forceRefresh = false) {
    const loadingElement = document.getElementById('latest-loading');
    const errorElement = document.getElementById('latest-error');
    const dataElement = document.getElementById('latest-data');
    const resultsInfo = document.getElementById('latest-results-info');

    if (!loadingElement || !errorElement || !dataElement) {
        return;
    }

    loadingElement.style.display = 'flex';
    errorElement.style.display = 'none';
    dataElement.innerHTML = '';
    if (resultsInfo) {
        resultsInfo.style.display = 'none';
        resultsInfo.textContent = '';
    }

    const loadId = ++latestLoadId;
    let previewDisplayed = false;

    const startFullFetch = () => {
        (async () => {
            try {
                const params = new URLSearchParams({ timeframe: latestTimeframe });
                params.set('cache_bust', (forceRefresh || latestTimeframe === 'day') ? 'true' : 'false');
                if (latestIncludeHype) {
                    params.set('include_hype', 'true');
                }
                const data = await makeAPICall(`/latest?${params.toString()}`, null);
                if (loadId !== latestLoadId) {
                    return;
                }
                const items = Array.isArray(data?.items) ? data.items : [];
                cachedData.latest = items;
                rawData.latest = items;
                latestMetadata = data || null;
                if (typeof latestMetadata?.include_hype === 'boolean') {
                    latestIncludeHype = latestMetadata.include_hype;
                }
                ensureLatestControlListeners();
                displayLatestFeed(items);
                errorElement.style.display = 'none';
            } catch (error) {
                if (loadId !== latestLoadId) {
                    return;
                }
                const message = previewDisplayed
                    ? `Updated latest feed failed: ${error.message}`
                    : `Failed to load latest feed: ${error.message}`;
                errorElement.textContent = message;
                errorElement.style.display = 'block';
            }
        })();
    };

    try {
        const previewParams = new URLSearchParams({ timeframe: latestTimeframe });
        previewParams.set('limit', String(LATEST_PREVIEW_LIMIT));
        previewParams.set('cache_bust', forceRefresh ? 'true' : 'false');
        if (latestIncludeHype) {
            previewParams.set('include_hype', 'true');
        }
        const previewPayload = await makeAPICall(`/api/latest-preview?${previewParams.toString()}`, null);
        if (loadId !== latestLoadId) {
            return;
        }
        const previewItems = Array.isArray(previewPayload?.items) ? previewPayload.items : [];
        rawData.latest = previewItems;
        latestMetadata = previewPayload || null;
        ensureLatestControlListeners();
        displayLatestFeed(previewItems);
        previewDisplayed = true;
    } catch (error) {
        if (loadId !== latestLoadId) {
            return;
        }
        errorElement.textContent = `Failed to load latest preview: ${error.message}`;
        errorElement.style.display = 'block';
    } finally {
        if (loadId !== latestLoadId) {
            return;
        }
        loadingElement.style.display = 'none';
        startFullFetch();
    }
}

function displayLatestFeed(items) {
    const container = document.getElementById('latest-data');
    const resultsInfo = document.getElementById('latest-results-info');
    if (!container) {
        return;
    }

    container.innerHTML = '';

    const windowLabel = latestMetadata?.window_label || (latestTimeframe === 'week' ? 'Last 7 days' : 'Last 24 hours');
    const hypeIncluded = latestMetadata?.include_hype || latestIncludeHype;

    updateLatestHeading();
    syncLatestControls();

    if (!items || !items.length) {
        const hypeNote = hypeIncluded ? ' including Hype sources' : '';
        container.innerHTML = `<div class="empty-state">No updates in the ${escapeHtml(windowLabel.toLowerCase())}${escapeHtml(hypeNote)}. Check back soon!</div>`;
        if (resultsInfo) {
            resultsInfo.style.display = 'none';
            resultsInfo.textContent = '';
        }
        return;
    }

    const displayItems = getFilteredItems('latest', items);
    displayItems.forEach(item => {
        container.appendChild(createLatestCard(item));
    });
    recordDisplayedItems('latest', displayItems);

    if (resultsInfo) {
        const total = displayItems.length;
        const sources = latestMetadata?.sources || {};
        const sourceSummary = Object.keys(sources).length
            ? ` · Sources: ${Object.entries(sources).map(([key, count]) => `${key} (${count})`).join(', ')}`
            : '';
        const hypeSummary = hypeIncluded ? ' · Hype included' : ' · Hype excluded';
        const summaryParts = [`${total} updates`, windowLabel];
        if (latestMetadata?.preview) {
            summaryParts.push('Preview');
        }
        resultsInfo.textContent = `${summaryParts.join(' · ')}${hypeSummary}${sourceSummary}`;
        resultsInfo.style.display = 'block';
    }
}

function formatLatestSourceLabel(source) {
    switch (source) {
        case 'openrouter':
            return 'OpenRouter Model';
        case 'blog':
            return 'Blog Post';
        case 'replicate':
            return 'Replicate Model';
        case 'hype':
            return 'Hype Signal';
        case 'fal':
            return 'fal.ai Release';
        case 'monitor':
            return 'Monitor Feed';
        default:
            return '';
    }
}

function renderLatestTags(tags) {
    if (!Array.isArray(tags) || !tags.length) {
        return '';
    }
    const unique = [];
    const seen = new Set();
    tags.forEach(tag => {
        const label = typeof tag === 'string' ? tag.trim() : '';
        if (!label) return;
        const normalized = label.toLowerCase();
        if (seen.has(normalized)) return;
        seen.add(normalized);
        unique.push(label.startsWith('#') ? label : `#${label}`);
    });
    if (!unique.length) {
        return '';
    }
    return `<div class="card-tags">${unique.map(tag => `<span class="card-tag tag-pill">${escapeHtml(tag)}</span>`).join('')}</div>`;
}

function createLatestCard(item) {
    const card = document.createElement('div');
    card.className = 'model-card latest-card';
    card.dataset.source = item.source || 'latest';

    const sourceLabel = item.source_label || formatLatestSourceLabel(item.source);
    const relative = formatRelativeTime(item.timestamp);
    const excerptRaw = typeof item.excerpt === 'string' && item.excerpt.trim()
        ? item.excerpt.trim()
        : (item.description || '');
    const description = excerptRaw ? truncateText(excerptRaw, 260) : '';
    const titleText = item.title ? escapeHtml(item.title) : 'Recent Update';
    const badge = item.badge ? `<span class="card-badge">${escapeHtml(item.badge)}</span>` : '';
    const tagsMarkup = renderLatestTags(item.tags);
    const actionLabel = item.action_label || item.actionLabel || 'Open Link';
    const linkMarkup = item.url
        ? `<a class="chart-btn secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">`
        + `${escapeHtml(actionLabel)}</a>`
        : '';

    const metaParts = [
        sourceLabel ? `<span class="meta-item">${escapeHtml(sourceLabel)}</span>` : '',
        relative ? `<span class="meta-item">${escapeHtml(relative)}</span>` : ''
    ].filter(Boolean);

    const metaMarkup = metaParts.length
        ? `<div class="card-meta">${metaParts.join('')}</div>`
        : '';

    const badgeLabel = sourceLabel || 'Latest';

    card.innerHTML = `
        <div class="card-header">
            <div class="card-header-content">
                <div class="source-badge">${escapeHtml(badgeLabel)}</div>
                <div class="card-title">
                    ${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">${titleText}</a>` : `<span class="title-text">${titleText}</span>`}
                </div>
                ${metaMarkup}
            </div>
        </div>
        ${description ? `<div class="card-summary">${escapeHtml(description)}</div>` : ''}
        ${tagsMarkup}
        <div class="card-actions">
            ${linkMarkup}
            ${badge}
        </div>
    `;

    attachPinButton(card, 'latest', item);
    return card;
}

async function loadMonitorFeed(forceRefresh = false) {
    const loadingElement = document.getElementById('monitor-loading');
    const errorElement = document.getElementById('monitor-error');
    const dataElement = document.getElementById('monitor-data');
    const resultsInfo = document.getElementById('monitor-results-info');

    if (!loadingElement || !errorElement || !dataElement) {
        return;
    }

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';
        if (resultsInfo) {
            resultsInfo.style.display = 'none';
            resultsInfo.textContent = '';
        }

        const params = new URLSearchParams({
            cache_bust: forceRefresh ? 'true' : 'false'
        });
        const data = await makeAPICall(`/api/monitor${params.toString() ? `?${params.toString()}` : ''}`, null);
        const items = Array.isArray(data?.items) ? data.items : [];
        cachedData.monitor = items;
        rawData.monitor = items;
        displayMonitorItems(items);

        if (resultsInfo) {
            const summaryParts = [];
            if (data?.count != null) {
                summaryParts.push(`${data.count} updates`);
            }
            if (data?.generated_at) {
                const relative = formatRelativeTime(data.generated_at);
                if (relative) {
                    summaryParts.push(`refreshed ${relative}`);
                }
            }
            resultsInfo.textContent = summaryParts.length ? summaryParts.join(' · ') : 'Monitor feed updates';
            resultsInfo.style.display = 'block';
        }
    } catch (error) {
        const message = error?.message || String(error);
        errorElement.textContent = `Failed to load monitor feed: ${message}`;
        errorElement.style.display = 'block';
    } finally {
        loadingElement.style.display = 'none';
    }
}

function displayMonitorItems(items) {
    const container = document.getElementById('monitor-data');
    if (!container) {
        return;
    }

    container.innerHTML = '';
    const displayItems = getFilteredItems('monitor', items);
    if (!displayItems || !displayItems.length) {
        container.innerHTML = '<div class="empty-state">No monitor updates available yet. Check back soon.</div>';
        return;
    }

    displayItems.forEach(item => {
        container.appendChild(createMonitorCard(item));
    });
    recordDisplayedItems('monitor', displayItems);
}

function createMonitorCard(item) {
    const card = document.createElement('div');
    card.className = 'model-card latest-card';
    card.dataset.source = 'monitor';

    const title = item.title ? escapeHtml(item.title) : 'Monitor Update';
    const relative = formatRelativeTime(item.timestamp);
    const excerpt = item.excerpt ? escapeHtml(item.excerpt) : '';
    const url = item.url ? escapeHtml(item.url) : '';

    const metaParts = [`<span class="meta-item">Monitor Feed</span>`];
    if (relative) {
        metaParts.push(`<span class="meta-item">${escapeHtml(relative)}</span>`);
    }
    const metaMarkup = `<div class="card-meta">${metaParts.join('')}</div>`;

    card.innerHTML = `
        <div class="card-header">
            <div class="card-header-content">
                <div class="source-badge">Monitor</div>
                <div class="card-title">
                    ${url ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>` : title}
                </div>
                ${metaMarkup}
            </div>
        </div>
        ${excerpt ? `<div class="card-summary">${excerpt}</div>` : ''}
        <div class="card-actions">
            ${url ? `<a class="chart-btn secondary" href="${url}" target="_blank" rel="noopener noreferrer">Open Source</a>` : ''}
        </div>
    `;

    attachPinButton(card, 'monitor', item);
    return card;
}

function formatContextLength(contextLength) {
    if (!contextLength || Number.isNaN(Number(contextLength))) return '—';
    if (contextLength >= 1_000_000) {
        return `${(contextLength / 1_000_000).toFixed(1)}M tokens`;
    }
    if (contextLength >= 1_000) {
        return `${Math.round(contextLength / 1_000)}K tokens`;
    }
    return `${contextLength} tokens`;
}

function formatPricing(pricing) {
    if (!pricing) return 'Not provided';

    const parts = [];

    if (pricing.request && parseFloat(pricing.request) > 0) {
        const perRequest = formatUsd(parseFloat(pricing.request));
        if (perRequest) {
            parts.push(`${perRequest} per request`);
        }
    }

    const inputRaw = parseFloat(pricing.prompt ?? pricing.input ?? pricing.price_1m_input_tokens);
    if (Number.isFinite(inputRaw)) {
        const perMillion = pricing.price_1m_input_tokens ? inputRaw : inputRaw * 1_000_000;
        const formatted = formatUsd(perMillion);
        if (formatted) {
            parts.push(`${formatted} / 1M input tokens`);
        }
    }

    const outputRaw = parseFloat(pricing.completion ?? pricing.output ?? pricing.price_1m_output_tokens);
    if (Number.isFinite(outputRaw)) {
        const perMillion = pricing.price_1m_output_tokens ? outputRaw : outputRaw * 1_000_000;
        const formatted = formatUsd(perMillion);
        if (formatted) {
            parts.push(`${formatted} / 1M output tokens`);
        }
    }

    if (parts.length) {
        return parts.join(' · ');
    }

    return 'Not provided';
}

function truncateText(text, limit = 220) {
    if (!text) return '';
    if (text.length <= limit) return text;
    return `${text.slice(0, limit - 1)}…`;
}

function normalizeSearchField(value) {
    if (typeof value === 'string') {
        return value;
    }
    if (value === null || value === undefined) {
        return '';
    }
    if (typeof value === 'object') {
        if (value.name) return String(value.name);
        if (value.title) return String(value.title);
        return JSON.stringify(value);
    }
    return String(value);
}

function getOpenRouterCardTitle(model) {
    if (!model) return 'Unknown Model';
    if (typeof model.base_name === 'string' && model.base_name.trim()) {
        return model.base_name.trim();
    }
    if (typeof model.name === 'string' && model.name.trim()) {
        return model.name.trim();
    }
    if (model.id) {
        const parts = model.id.split('/');
        const candidate = parts[parts.length - 1];
        return candidate ? candidate.replace(/[-_]/g, ' ') : model.id;
    }
    return 'Unknown Model';
}

function getOpenRouterProvider(model) {
    if (!model) return 'OpenRouter';
    if (typeof model.vendor === 'string' && model.vendor.trim()) {
        return model.vendor.trim();
    }
    if (model.id && model.id.includes('/')) {
        return model.id.split('/')[0];
    }
    return 'OpenRouter';
}

function createOpenRouterCard(model) {
    const card = document.createElement('div');
    card.className = 'model-card clickable';
    card.dataset.source = 'openrouter';
    card.onclick = () => openModelModal(model, 'openrouter');

    const title = getOpenRouterCardTitle(model);
    const provider = getOpenRouterProvider(model);
    const createdDate = typeof model.created === 'number' ? new Date(model.created * 1000).toLocaleDateString() : '';
    const rawDescription = (model.description || '').replace(/\s+/g, ' ').trim();
    const descriptionSnippet = truncateText(rawDescription, 220) || 'No description provided.';
    const contextLength = formatContextLength(model.context_length);
    const pricing = formatPricing(model.pricing);
    const architecture = model.architecture || {};
    const inputModalities = Array.isArray(architecture.input_modalities) ? architecture.input_modalities : [];
    const modalities = inputModalities.length ? inputModalities.join(', ') : 'Text';

    card.innerHTML = `
        <div class="source-badge">OpenRouter Catalog</div>
        <h3>${title}</h3>
        <div class="model-creator">${provider}</div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">Context Length</span>
                <span class="stat-value">${contextLength}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Pricing</span>
                <span class="stat-value">${pricing}</span>
            </div>
        </div>

        <div class="model-meta">
            <div><strong>Modalities:</strong> ${modalities}</div>
            ${createdDate ? `<div><strong>Added:</strong> ${createdDate}</div>` : ''}
        </div>

        <p class="model-description">${descriptionSnippet}</p>
        <div class="links-block">
            ${model.display_url ? `<a class="external-link" href="${model.display_url}" target="_blank" rel="noopener">View on OpenRouter ↗</a>` : ''}
            ${model.hugging_face_id ? `<a class="external-link" href="https://huggingface.co/${model.hugging_face_id}" target="_blank" rel="noopener">Hugging Face ↗</a>` : ''}
        </div>
    `;
    attachPinButton(card, 'openrouter', model);
    return card;
}

function setupOpenRouterControls() {
    const search = document.getElementById('openrouter-search');
    if (search) {
        search.addEventListener('input', () => filterOpenRouterModelsData());
    }

    const sort = document.getElementById('openrouter-sort');
    if (sort) {
        sort.addEventListener('change', () => filterOpenRouterModelsData());
    }

    const vendor = document.getElementById('openrouter-vendor');
    if (vendor) {
        vendor.addEventListener('input', () => filterOpenRouterModelsData());
    }

    const mediaToggle = document.getElementById('openrouter-media-toggle');
    if (mediaToggle) {
        mediaToggle.addEventListener('change', () => filterOpenRouterModelsData());
    }

    const refresh = document.getElementById('openrouter-refresh');
    if (refresh) {
        refresh.addEventListener('click', () => {
            cachedData.openRouterModels = null;
            rawData.openRouterModels = null;
            openRouterIndex = null;
            openRouterMatchCache.clear();
            loadOpenRouterModelsData();
        });
    }
}

// Display media data (for non-LLM endpoints)
function displayMediaData(models, type) {
    const container = document.getElementById(`${type}-data`);
    container.innerHTML = '';

    const displayModels = getFilteredItems(type, Array.isArray(models) ? models : []);
    displayModels.forEach(model => {
        const modelCard = createMediaCard(model, type);
        container.appendChild(modelCard);
    });
    recordDisplayedItems(type, displayModels);
}

// Create media card
function simplifyCategoryLabel(category) {
    if (!category) {
        return '';
    }
    return (category.style_category || category.subject_matter_category || 'total').trim();
}

function buildCategoryPreviewMarkup(categories = [], limit = 3) {
    if (!Array.isArray(categories) || !categories.length) {
        return '';
    }
    const uniqueEntries = [];
    const seen = new Set();
    categories.forEach(category => {
        const label = simplifyCategoryLabel(category);
        if (!label) {
            return;
        }
        const normalizedLabel = label.toLowerCase();
        if (seen.has(normalizedLabel)) {
            return;
        }
        seen.add(normalizedLabel);
        uniqueEntries.push({
            label,
            elo: category.elo || category.elo_score || 'N/A'
        });
    });

    if (!uniqueEntries.length) {
        return '';
    }

    const previewEntries = uniqueEntries.slice(0, limit);
    const hasMore = uniqueEntries.length > previewEntries.length;

    return `
        <div class="evaluations">
            <h4>Category Breakdown</h4>
            ${previewEntries.map(entry => `
                <div class="evaluation-item">
                    <span>${entry.label}</span>
                    <span>ELO: ${entry.elo}</span>
                </div>
            `).join('')}
            ${hasMore ? '<div class="evaluation-note">Click for the full breakdown.</div>' : ''}
        </div>
    `;
}

function createMediaCard(model, mediaCategory = '') {
    const card = document.createElement('div');
    card.className = 'model-card clickable';
    card.dataset.source = 'aa-media';
    const decoratedModel = { ...model };
    if (mediaCategory) {
        decoratedModel.mediaCategory = mediaCategory;
    }
    card.onclick = () => openModelModal(decoratedModel, 'media');

    card.innerHTML = `
        <div class="source-badge">Artificial Analysis</div>
        <h3>${model.name}</h3>
        <div class="model-creator">${model.model_creator.name}</div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">ELO Score</span>
                <span class="stat-value">${model.elo || 'N/A'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Rank</span>
                <span class="stat-value">#${model.rank || 'N/A'}</span>
            </div>
        </div>
        
        <div class="stat-item">
            <span class="stat-label">Confidence Interval</span>
            <span class="stat-value">${model.ci95 || 'N/A'}</span>
        </div>
        
        ${buildCategoryPreviewMarkup(model.categories)}
        
        <div class="click-hint">💡 Click to explore full model details</div>
    `;
    attachPinButton(card, mediaCategory || 'media', model);
    return card;
}

// AI Agent functionality with streaming support and conversation context
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const message = userInput.value.trim();

    if (!message) {
        return;
    }

    const attachments = await collectImageAttachments();

    // Render user bubble
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';

    const messageText = document.createElement('div');
    messageText.className = 'message-text';
    messageText.textContent = message;
    userMessage.appendChild(messageText);

    if (attachments.length) {
        const attachmentList = document.createElement('div');
        attachmentList.className = 'attachment-preview';
        attachments.forEach(att => {
            const sizeKB = (att.size / 1024).toFixed(1);
            const item = document.createElement('div');
            item.textContent = `📎 ${att.name} (${sizeKB} KB)`;
            attachmentList.appendChild(item);
        });
        userMessage.appendChild(attachmentList);
    }

    chatMessages.appendChild(userMessage);

    // Track conversation history
    agentConfig.conversationHistory.push({
        role: 'user',
        content: message,
        attachments,
        timestamp: new Date().toISOString()
    });
    if (agentConfig.conversationHistory.length > 20) {
        agentConfig.conversationHistory = agentConfig.conversationHistory.slice(-20);
    }

    // Add loading indicator for AI response
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message ai loading-initial';
    loadingMessage.innerHTML = `
        <div class="initial-loading">
            <div class="loading-spinner"></div>
            <span class="loading-text">Fetching data...</span>
        </div>
    `;
    chatMessages.appendChild(loadingMessage);

    // Reset input
    userInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        const response = await callGLMAgent(message, attachments);

        if (response && response.response) {
            agentConfig.conversationHistory.push({
                role: 'assistant',
                content: response.response,
                timestamp: new Date().toISOString()
            });
        }

        const streamingMessage = chatMessages.querySelector('.message.ai.streaming');
        if (streamingMessage) {
            streamingMessage.classList.remove('streaming');
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;
        resetImageUploads();
    } catch (error) {
        clearAgentLoadingState();

        const errorMessage = document.createElement('div');
        errorMessage.className = 'message ai error';
        errorMessage.innerHTML = `<div class="error-content">❌ <strong>Error:</strong> ${error.message}</div>`;
        chatMessages.appendChild(errorMessage);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (!error || !error.__toastHandled) {
            const messageText = (error && error.message) ? error.message : 'The AI agent request failed.';
            showToast(messageText, 'error');
        }
    }
}

// Clear chat history function
function clearChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    agentConfig.conversationHistory = [];
    resetImageUploads();

    // Add a welcome message
    const welcomeMessage = document.createElement('div');
    welcomeMessage.className = 'message ai';
    welcomeMessage.innerHTML = `
        <div class="response-content">
            <p>👋 <strong>Chat cleared!</strong> I'm ready to help you analyze AI models and answer your questions.</p>
            <p>You can ask me about:</p>
            <ul>
                <li>🤖 Model comparisons and recommendations</li>
                <li>📊 Performance benchmarks and metrics</li>
                <li>💰 Pricing and cost analysis</li>
                <li>🎯 Use case recommendations</li>
                <li>📈 Data visualizations and charts</li>
            </ul>
        </div>
    `;
    chatMessages.appendChild(welcomeMessage);

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Agent chatbot (Gemini 2.5 Flash Preview 09-2025 powered, fetch_data + Perplexity)
function initializeAgentExp() {
    const modelSelect = document.getElementById('agent-exp-model');
    const form = document.getElementById('agent-exp-form');
    if (!modelSelect || !form) {
        return;
    }

    const storedModel = localStorage.getItem(AGENT_EXP_MODEL_STORAGE_KEY);
    if (storedModel) {
        agentExpState.model = storedModel;
    }

    populateAgentExpModels();

    if (modelSelect.value !== agentExpState.model) {
        modelSelect.value = agentExpState.model;
    }

    modelSelect.addEventListener('change', () => {
        const nextValue = modelSelect.value;
        if (!nextValue) {
            return;
        }
        agentExpState.model = nextValue;
        localStorage.setItem(AGENT_EXP_MODEL_STORAGE_KEY, nextValue);
        setAgentExpStatus(`Using ${nextValue}`);
    });

    form.addEventListener('submit', sendAgentExpMessage);

    const clearButton = document.getElementById('agent-exp-clear');
    if (clearButton) {
        clearButton.addEventListener('click', clearAgentExpHistory);
    }

    const input = document.getElementById('agent-exp-input');
    if (input) {
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                form.requestSubmit();
            }
        });
    }

    renderAgentExpWelcome();
}

function getAgentExpModelOptions() {
    const entries = new Map();
    const addEntry = (id, label) => {
        if (!id || entries.has(id)) {
            return;
        }
        entries.set(id, label || id);
    };

    addEntry(AGENT_EXP_DEFAULT_MODEL);
    if (agentConfig && agentConfig.model) {
        addEntry(agentConfig.model);
    }

    const agentSettings = (modelConfig && modelConfig.agent) || {};
    (agentSettings.availableModels || []).forEach(id => addEntry(id));
    (agentSettings.fallbackModels || []).forEach(id => addEntry(id));

    if (cachedData.openRouterModels && Array.isArray(cachedData.openRouterModels)) {
        cachedData.openRouterModels.slice(0, 30).forEach(model => {
            addEntry(model.id, model.name || model.id);
        });
    }

    return Array.from(entries.entries());
}

function populateAgentExpModels() {
    const modelSelect = document.getElementById('agent-exp-model');
    if (!modelSelect) {
        return;
    }

    const choices = getAgentExpModelOptions();
    modelSelect.innerHTML = '';

    choices.forEach(([id, label]) => {
        const option = document.createElement('option');
        option.value = id;
        const info = typeof getAgentModelInfo === 'function' ? getAgentModelInfo(id) : null;
        option.textContent = (info && (info.name || info.displayName)) || label || id;
        modelSelect.appendChild(option);
    });

    if (choices.length === 0) {
        const fallbackOption = document.createElement('option');
        fallbackOption.value = AGENT_EXP_DEFAULT_MODEL;
        fallbackOption.textContent = AGENT_EXP_DEFAULT_MODEL;
        modelSelect.appendChild(fallbackOption);
        agentExpState.model = AGENT_EXP_DEFAULT_MODEL;
    }

    if (!choices.find(([id]) => id === agentExpState.model)) {
        agentExpState.model = choices.length ? choices[0][0] : AGENT_EXP_DEFAULT_MODEL;
    }

    modelSelect.value = agentExpState.model;
    localStorage.setItem(AGENT_EXP_MODEL_STORAGE_KEY, agentExpState.model);
}

function renderAgentExpWelcome() {
    const container = document.getElementById('agent-exp-messages');
    if (!container || container.dataset.welcomeRendered === 'true') {
        return;
    }

    const welcome = document.createElement('div');
    welcome.className = 'message ai';
    welcome.innerHTML = `
        <div class="response-content">
            <p>👋 <strong>Welcome to the Agent.</strong> This lightweight Gemini 2.5 Flash Preview (09-2025) assistant can pull live dashboard datasets and run Perplexity searches.</p>
            <p>Try asking for <em>fal.ai image models</em>, <em>fresh leaderboard changes</em>, or <em>pricing comparisons</em>.</p>
        </div>
    `;
    container.appendChild(welcome);
    container.dataset.welcomeRendered = 'true';
    scrollAgentExpToBottom();
}

function clearAgentExpHistory(event) {
    if (event) {
        event.preventDefault();
    }
    const container = document.getElementById('agent-exp-messages');
    if (container) {
        container.innerHTML = '';
        delete container.dataset.welcomeRendered;
    }
    agentExpState.conversation = [];
    agentExpState.streamBuffer = '';
    agentExpState.activeMessage = null;
    agentExpState.streaming = false;
    setAgentExpStatus('');
    renderAgentExpWelcome();
}

function appendAgentExpMessage(role, content, options = {}) {
    const container = document.getElementById('agent-exp-messages');
    if (!container) {
        return null;
    }

    const message = document.createElement('div');
    message.className = `message ${role}`;
    if (options.streaming) {
        message.classList.add('streaming');
    }

    const responseContent = document.createElement('div');
    responseContent.className = 'response-content';
    if (content) {
        responseContent.innerHTML = renderAgentExpMarkdown(content);
    } else if (options.streaming) {
        responseContent.innerHTML = '<div class="typing-indicator">Thinking...</div>';
    }
    message.appendChild(responseContent);
    container.appendChild(message);
    scrollAgentExpToBottom();
    return message;
}

function renderAgentExpMarkdown(markdown) {
    if (!markdown) {
        return '';
    }
    let sanitized = typeof fixEncodingArtifacts === 'function' ? fixEncodingArtifacts(markdown) : markdown;
    if (typeof marked !== 'undefined' && marked.parse) {
        try {
            return marked.parse(sanitized);
        } catch (error) {
            console.warn('Marked.js failed, using fallback markdown renderer.', error);
        }
    }
    return simpleMarkdownToHtml(sanitized);
}

function setAgentExpStatus(message, isError = false) {
    const status = document.getElementById('agent-exp-status');
    if (!status) {
        return;
    }
    if (!message) {
        status.textContent = '';
        status.classList.remove('error');
        return;
    }
    status.textContent = message;
    status.classList.toggle('error', Boolean(isError));
}

function pushAgentExpHistory(entry) {
    agentExpState.conversation.push(entry);
    if (agentExpState.conversation.length > 10) {
        agentExpState.conversation = agentExpState.conversation.slice(-10);
    }
}

function scrollAgentExpToBottom() {
    const container = document.getElementById('agent-exp-messages');
    if (!container) {
        return;
    }
    container.scrollTop = container.scrollHeight;
}

function focusAgentExpInput() {
    const input = document.getElementById('agent-exp-input');
    if (input && typeof input.focus === 'function') {
        setTimeout(() => input.focus(), 50);
    }
}

async function sendAgentExpMessage(event) {
    event.preventDefault();
    if (agentExpState.streaming) {
        showToast('Please wait for the current response to finish.', 'info');
        return;
    }

    const input = document.getElementById('agent-exp-input');
    if (!input) {
        return;
    }
    const message = input.value.trim();
    if (!message) {
        return;
    }

    if (!getUserOpenRouterKey()) {
        showToast('🔑 Add your OpenRouter key in Settings to chat with the Agent.', 'warning');
        setAgentExpStatus('Add your OpenRouter key in Settings to talk to the Agent.', true);
        return;
    }

    appendAgentExpMessage('user', message);
    pushAgentExpHistory({ role: 'user', content: message });
    input.value = '';
    scrollAgentExpToBottom();

    try {
        await streamAgentExpResponse(message);
    } catch (error) {
        const errorMessage = error && error.message ? error.message : 'Agent request failed.';
        setAgentExpStatus(errorMessage, true);
        showToast(errorMessage, 'error');
    }
}

if (submitButton) {
    submitButton.disabled = false;
}
    }
}

// Safety timeout to prevent infinite hanging
const AGENT_STREAM_TIMEOUT_MS = 60000; // 60 seconds

async function streamAgentExpResponse(message) {
    const form = document.getElementById('agent-exp-form');
    const submitButton = form ? form.querySelector('button[type="submit"]') : null;

    agentExpState.streamBuffer = '';
    agentExpState.streaming = true;

    if (submitButton) {
        submitButton.disabled = true;
    }

    const assistantMessage = appendAgentExpMessage('ai', '', { streaming: true });
    const responseContent = assistantMessage ? assistantMessage.querySelector('.response-content') : null;
    agentExpState.activeMessage = assistantMessage;
    setAgentExpStatus(`Calling ${agentExpState.model}...`);

    // Setup safety timeout
    const timeoutId = setTimeout(() => {
        if (agentExpState.streaming) {
            console.warn('Agent stream timed out');
            setAgentExpStatus('Request timed out.', true);
            if (assistantMessage) {
                assistantMessage.classList.remove('streaming');
            }
            if (responseContent && !responseContent.textContent.trim()) {
                responseContent.innerHTML = '<div class="error-content">❌ Request timed out. Please try again.</div>';
            }
            agentExpState.activeMessage = null;
            agentExpState.streaming = false;
            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }, AGENT_STREAM_TIMEOUT_MS);

    try {
        const response = await fetch('/api/agent-exp', {
            method: 'POST',
            headers: withUserOpenRouterKey({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                message,
                model: agentExpState.model,
                conversation: agentExpState.conversation,
                experimental: getStoredExperimentalMode(),
                stream: true
            })
        });

        clearTimeout(timeoutId); // Clear timeout on response start

        if (!response.ok) {
            let errorMessage = `HTTP error ${response.status}`;
            try {
                const payload = await response.json();
                errorMessage = payload.error || payload.message || errorMessage;
            } catch (parseError) {
                // ignore
            }
            if (response.status === 402) {
                errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use the Agent.";
            }
            throw new Error(errorMessage);
        }

        const reader = response.body && response.body.getReader ? response.body.getReader() : null;
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }

            buffer += decoder.decode(value, { stream: true });

            let newlineIndex = buffer.indexOf('\n');
            while (newlineIndex !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                if (line) {
                    processAgentExpLine(line, assistantMessage, responseContent);
                }
                newlineIndex = buffer.indexOf('\n');
            }
        }

        const remaining = buffer.trim();
        if (remaining) {
            processAgentExpLine(remaining, assistantMessage, responseContent);
        }
    } catch (error) {
        clearTimeout(timeoutId);
        const errorMessage = error && error.message ? error.message : 'Agent streaming failed.';
        setAgentExpStatus(errorMessage, true);
        if (assistantMessage && responseContent) {
            assistantMessage.classList.remove('streaming');
            responseContent.innerHTML = `<div class="error-content">❌ ${errorMessage}</div>`;
        }
        agentExpState.activeMessage = null;
        agentExpState.streaming = false;
        agentExpState.streamBuffer = '';
        throw error;
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
        }
    }
}

function processAgentExpLine(line, assistantMessage, responseContent) {
    if (!line.startsWith('data:')) {
        return;
    }
    const payload = line.slice(5).trim();
    if (!payload || payload === '[DONE]') {
        return;
    }
    let event;
    try {
        event = JSON.parse(payload);
    } catch (error) {
        return;
    }
    handleAgentExpEvent(event, assistantMessage, responseContent);
}

function handleAgentExpEvent(event, assistantMessage, responseContent) {
    if (!event || typeof event !== 'object') {
        return;
    }

    switch (event.type) {
        case 'status':
            if (event.message) {
                setAgentExpStatus(event.message);
            }
            break;
        case 'tool':
            renderAgentExpToolLog(event, assistantMessage);
            if (event.tool === 'fetch_data') {
                const dataLabels = (event.datasets || []).map(entry => entry.label || entry.id).join(', ');
                if (dataLabels) {
                    setAgentExpStatus(`Loaded datasets: ${dataLabels}`);
                }
            }
            break;
        case 'content': {
            const chunk = event.content || '';
            agentExpState.streamBuffer += chunk;
            if (responseContent) {
                responseContent.innerHTML = renderAgentExpMarkdown(agentExpState.streamBuffer);
            }
            scrollAgentExpToBottom();
            break;
        }
        case 'error':
            setAgentExpStatus(event.error || 'The Agent encountered an error.', true);
            if (assistantMessage) {
                assistantMessage.classList.remove('streaming');
            }
            if (responseContent) {
                responseContent.innerHTML = `<div class="error-content">❌ ${event.error || 'The Agent encountered an error.'}</div>`;
            }
            agentExpState.activeMessage = null;
            agentExpState.streaming = false;
            agentExpState.streamBuffer = '';
            break;
        case 'done': {
            if (assistantMessage) {
                assistantMessage.classList.remove('streaming');
            }
            const finalText = agentExpState.streamBuffer ? fixEncodingArtifacts(agentExpState.streamBuffer.trim()) : '';
            if (responseContent) {
                responseContent.innerHTML = finalText ? renderAgentExpMarkdown(finalText) : '<div class="response-content">No response generated.</div>';
            }
            if (finalText) {
                pushAgentExpHistory({ role: 'assistant', content: finalText });
            }
            setAgentExpStatus('');
            agentExpState.activeMessage = null;
            agentExpState.streaming = false;
            agentExpState.streamBuffer = '';
            scrollAgentExpToBottom();
            break;
        }
    }
}

function renderAgentExpToolLog(event, assistantMessage) {
    if (!assistantMessage) {
        return;
    }
    let container = assistantMessage.querySelector('.agent-exp-tools');
    if (!container) {
        container = document.createElement('div');
        container.className = 'agent-exp-tools';
        assistantMessage.insertBefore(container, assistantMessage.firstChild);
    }

    const row = document.createElement('div');
    row.className = 'agent-exp-tool-row';
    if (event.status === 'error') {
        row.classList.add('error');
    }

    const parts = [];
    if (event.tool === 'fetch_data') {
        const categories = (event.args && event.args.categories) ? event.args.categories.join(', ') : 'no categories';
        parts.push(`fetch_data → ${categories}`);
        if (event.args && event.args.limit !== undefined) {
            parts.push(`limit: ${event.args.limit}`);
        }
        if (event.args && event.args.timeframe) {
            parts.push(`timeframe: ${event.args.timeframe}`);
        }
        if (event.datasets && event.datasets.length) {
            const counts = event.datasets.map(entry => `${entry.label || entry.id} (${entry.items ?? 0})`).join(', ');
            if (counts) {
                parts.push(counts);
            }
        }
    } else if (event.tool === 'ask_perplexity') {
        const query = event.args && event.args.query ? event.args.query : 'query';
        parts.push(`ask_perplexity → ${query}`);
    } else if (event.tool) {
        parts.push(`${event.tool} invoked`);
    }

    if (event.error) {
        parts.push(`⚠️ ${event.error}`);
    }

    row.textContent = parts.join(' · ');
    container.appendChild(row);
    scrollAgentExpToBottom();
}

// Call AI agent with streaming support
async function callGLMAgent(userMessage, attachments = []) {
    return new Promise((resolve, reject) => {
        handleStreamingWithFetch(userMessage, attachments, resolve, reject);
    });
}

// Fallback streaming using fetch
async function handleStreamingWithFetch(userMessage, attachments, resolve, reject) {
    try {
        const response = await fetch('/api/ai-agent', {
            method: 'POST',
            headers: withUserOpenRouterKey({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                message: userMessage,
                stream: true,
                model: agentConfig.model,
                conversationHistory: agentConfig.conversationHistory,
                imageAttachments: attachments
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const payload = await response.json();
                errorMessage = payload.error || payload.message || errorMessage;
            } catch (parseError) {
                // No-op: response may not contain JSON when streaming fails before start.
            }

            // Handle specific error cases
            if (response.status === 402) {
                errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
            }

            throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullResponse = '';
        let traces = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });

                while (true) {
                    const lineEnd = buffer.indexOf('\n');
                    if (lineEnd === -1) break;

                    const line = buffer.slice(0, lineEnd).trim();
                    buffer = buffer.slice(lineEnd + 1);

                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') break;

                        try {
                            const parsed = JSON.parse(data);

                            switch (parsed.type) {
                                case 'traces':
                                    traces = parsed.traces;
                                    break;
                                case 'context': {
                                    if (parsed.context) {
                                        console.groupCollapsed('Agent context update');
                                        console.log('Loaded categories:', parsed.context.categories || []);
                                        console.log('Highlights:', parsed.context.highlights || []);
                                        console.log('Generated at:', parsed.context.last_generated_at);
                                        console.groupEnd();
                                    }
                                    break;
                                }
                                case 'content': {
                                    const sanitizedChunk = fixEncodingArtifacts(parsed.content);
                                    fullResponse = appendStreamChunk(fullResponse, sanitizedChunk);
                                    updateStreamingResponse(fullResponse, traces);
                                    break;
                                }
                                case 'done':
                                    resolve({ response: fullResponse, traces: traces });
                                    return;
                                case 'error': {
                                    const errorMessage = parsed.error || 'The AI agent encountered an error.';
                                    clearAgentLoadingState();
                                    showToast(errorMessage, 'error');
                                    const errorObject = new Error(errorMessage);
                                    errorObject.__toastHandled = true;
                                    reject(errorObject);
                                    return;
                                }
                            }
                        } catch (e) {
                            // Ignore invalid JSON
                        }
                    }
                }
            }

            resolve({ response: fixEncodingArtifacts(fullResponse), traces: traces });
        } finally {
            reader.cancel();
        }
    } catch (error) {
        handleNonStreamingFallback(userMessage, attachments, resolve, reject);
    }
}

// Fallback to non-streaming
async function handleNonStreamingFallback(userMessage, attachments, resolve, reject) {
    try {
        const response = await fetch('/api/ai-agent', {
            method: 'POST',
            headers: withUserOpenRouterKey({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                message: userMessage,
                stream: false,
                model: agentConfig.model,
                conversationHistory: agentConfig.conversationHistory,
                imageAttachments: attachments
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const payload = await response.json();
                errorMessage = payload.error || payload.message || errorMessage;
            } catch (parseError) {
                // Ignore parsing error
            }

            if (response.status === 402) {
                errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
            }

            throw new Error(errorMessage);
        }

        const payload = await response.json();
        const sanitized = payload && typeof payload.response === 'string'
            ? fixEncodingArtifacts(payload.response)
            : (payload && payload.response) || '';

        resolve({
            ...payload,
            response: sanitized
        });
    } catch (error) {
        reject(error);
    }
}

// Update streaming response in real-time
function updateStreamingResponse(content, traces) {
    const chatMessages = document.getElementById('chat-messages');
    const sanitizedContent = fixEncodingArtifacts(content || '');

    // Only remove initial loading indicator if we have traces to show
    const loadingIndicator = chatMessages.querySelector('.message.ai.loading-initial');
    if (loadingIndicator && traces && traces.length > 0) {
        loadingIndicator.remove();
    }

    let aiMessage = chatMessages.querySelector('.message.ai.streaming');

    if (!aiMessage) {
        // Create the AI message container if it doesn't exist, but only if we have traces or content
        if ((traces && traces.length > 0) || content) {
            // Remove loading indicator now since we're creating the actual message
            if (loadingIndicator) {
                loadingIndicator.remove();
            }

            aiMessage = document.createElement('div');
            aiMessage.className = 'message ai streaming';
            chatMessages.appendChild(aiMessage);
        } else {
            // Don't create message yet, keep showing loading indicator
            return;
        }
    }

    // Clear and rebuild the message
    aiMessage.innerHTML = '';

    // Add traces if available
    if (traces && traces.length > 0) {
        const tracesContainer = document.createElement('div');
        tracesContainer.className = 'traces-container';

        const tracesHeader = document.createElement('div');
        tracesHeader.className = 'traces-header';
        tracesHeader.innerHTML = `
            <span class="traces-title">🔍 Reasoning Trace (${traces.length} steps)</span>
            <span class="traces-toggle">▼</span>
        `;
        tracesHeader.onclick = () => toggleTraces(tracesContainer);

        const tracesList = document.createElement('div');
        tracesList.className = 'traces-list collapsed';

        traces.forEach((trace, index) => {
            const traceItem = document.createElement('div');
            traceItem.className = 'trace-item';
            traceItem.innerHTML = `
                <div class="trace-step">${index + 1}. ${trace.step}</div>
                <div class="trace-description">${trace.description}</div>
                <div class="trace-tool">Tool: ${trace.tool}</div>
                <div class="trace-status status-${trace.status}">${trace.status}</div>
            `;
            tracesList.appendChild(traceItem);
        });

        tracesContainer.appendChild(tracesHeader);
        tracesContainer.appendChild(tracesList);
        aiMessage.appendChild(tracesContainer);
    }

    // Add streaming content
    const responseContent = document.createElement('div');
    responseContent.className = 'response-content';

    if (sanitizedContent) {
        if (typeof marked !== 'undefined' && marked.parse) {
            try {
                responseContent.innerHTML = marked.parse(sanitizedContent);
            } catch (error) {
                console.log('Marked.js error, using fallback:', error);
                responseContent.innerHTML = simpleMarkdownToHtml(sanitizedContent);
            }
        } else {
            responseContent.innerHTML = simpleMarkdownToHtml(sanitizedContent);
        }
    } else {
        responseContent.innerHTML = '<div class="typing-indicator">Thinking...</div>';
    }

    aiMessage.appendChild(responseContent);

    // Scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Toggle traces visibility
function toggleTraces(container) {
    const tracesList = container.querySelector('.traces-list');
    const toggle = container.querySelector('.traces-toggle');

    if (tracesList.classList.contains('collapsed')) {
        tracesList.classList.remove('collapsed');
        toggle.textContent = '▲';
    } else {
        tracesList.classList.add('collapsed');
        toggle.textContent = '▼';
    }
}

// Prepare context for AI agent
function prepareAIContext() {
    let context = 'Current AI Model Data:\n\n';

    if (cachedData.llms && cachedData.llms.data) {
        context += 'LLM Models:\n';
        cachedData.llms.data.slice(0, 5).forEach(model => {
            context += `- ${model.name} by ${model.model_creator.name}: `;
            context += `Intelligence Index: ${model.evaluations.artificial_analysis_intelligence_index || 'N/A'}, `;
            context += `Speed: ${model.median_output_tokens_per_second || 'N/A'} tokens/s, `;
            context += `Price: $${model.pricing.price_1m_input_tokens || 'N/A'}/$${model.pricing.price_1m_output_tokens || 'N/A'} per 1M tokens\n`;
        });
        context += '\n';
    }

    if (cachedData.textToImage && cachedData.textToImage.data) {
        context += 'Text-to-Image Models:\n';
        cachedData.textToImage.data.slice(0, 5).forEach(model => {
            context += `- ${model.name} by ${model.model_creator.name}: `;
            context += `ELO: ${model.elo}, Rank: #${model.rank}\n`;
        });
        context += '\n';
    }

    return context;
}

// Format evaluation keys for display
function formatEvaluationKey(key) {
    return key.split('_').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

// Filtering and sorting functions
function filterLLMData() {
    if (!rawData.llms) return;

    const searchTerm = document.getElementById('llm-search').value.toLowerCase();
    const sortBy = document.getElementById('llm-sort').value;

    let filteredData = rawData.llms.filter(model => {
        return model.name.toLowerCase().includes(searchTerm) ||
            model.model_creator.name.toLowerCase().includes(searchTerm);
    });

    // Sort data
    filteredData = sortLLMData(filteredData, sortBy);

    // Display results
    const displayModels = getFilteredItems('llms', filteredData);
    displayLLMData(displayModels);

    // Update results info
    const resultsInfo = document.getElementById('llms-results-info');
    resultsInfo.textContent = `Showing ${displayModels.length} of ${rawData.llms.length} models`;
}

function sortLLMData(data, sortBy) {
    const sortedData = [...data];

    switch (sortBy) {
        case 'intelligence':
            return sortedData.sort((a, b) => {
                const aVal = a.evaluations?.artificial_analysis_intelligence_index || 0;
                const bVal = b.evaluations?.artificial_analysis_intelligence_index || 0;
                return bVal - aVal;
            });
        case 'speed':
            return sortedData.sort((a, b) => {
                const aVal = a.median_output_tokens_per_second || 0;
                const bVal = b.median_output_tokens_per_second || 0;
                return bVal - aVal;
            });
        case 'cost':
            return sortedData.sort((a, b) => {
                const aPricing = a.pricing && a.pricing.price_1m_input_tokens;
                const bPricing = b.pricing && b.pricing.price_1m_input_tokens;
                const aVal = aPricing != null ? aPricing : Infinity;
                const bVal = bPricing != null ? bPricing : Infinity;
                return aVal - bVal;
            });
        case 'name':
            return sortedData.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return sortedData;
    }
}

function filterTextToImageData() {
    if (!rawData.textToImage) return;

    const searchTerm = document.getElementById('text-to-image-search').value.toLowerCase();
    const sortBy = document.getElementById('text-to-image-sort').value;

    let filteredData = rawData.textToImage.filter(model => {
        return model.name.toLowerCase().includes(searchTerm) ||
            model.model_creator.name.toLowerCase().includes(searchTerm);
    });

    // Sort data
    filteredData = sortTextToImageData(filteredData, sortBy);

    // Display results
    displayMediaData(filteredData, 'text-to-image');

    // Update results info
    const resultsInfo = document.getElementById('text-to-image-results-info');
    resultsInfo.textContent = `Showing ${filteredData.length} of ${rawData.textToImage.length} models`;
}

function sortTextToImageData(data, sortBy) {
    const sortedData = [...data];

    switch (sortBy) {
        case 'elo':
            return sortedData.sort((a, b) => (b.elo || 0) - (a.elo || 0));
        case 'rank':
            return sortedData.sort((a, b) => (a.rank || Infinity) - (b.rank || Infinity));
        case 'name':
            return sortedData.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return sortedData;
    }
}

// Filtering and sorting functions for Fal.ai models
function filterFalModelsData() {
    if (!rawData.falModels) return;

    const searchTerm = document.getElementById('fal-models-search').value.toLowerCase();
    const sortBy = document.getElementById('fal-models-sort').value;
    const categoryFilter = document.getElementById('fal-models-category').value;

    let filteredData = rawData.falModels.filter(model => {
        const matchesSearch = model.title.toLowerCase().includes(searchTerm) ||
            model.description.toLowerCase().includes(searchTerm) ||
            model.tags.some(tag => tag.toLowerCase().includes(searchTerm));

        const matchesCategory = !categoryFilter || model.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Sort data
    filteredData = sortFalModelsData(filteredData, sortBy);

    const displayModels = getFilteredItems('fal', filteredData);
    displayFalModelsData(displayModels);

    // Update results info
    const resultsInfo = document.getElementById('fal-models-results-info');
    resultsInfo.textContent = `Showing ${displayModels.length} of ${rawData.falModels.length} models`;
}

function sortFalModelsData(data, sortBy) {
    const sortedData = [...data];

    switch (sortBy) {
        case 'date':
            return sortedData.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
        case 'category':
            return sortedData.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        case 'name':
            return sortedData.sort((a, b) => a.title.localeCompare(b.title));
        default:
            return sortedData;
    }
}

// Display Fal.ai models data
function displayFalModelsData(models) {
    const container = document.getElementById('fal-models-data');
    container.innerHTML = '';

    const displayModels = getFilteredItems('fal', models);
    recordDisplayedItems('fal', displayModels);
    displayModels.forEach(model => {
        const modelCard = createFalModelCard(model);
        container.appendChild(modelCard);
    });
}

// Create Fal.ai model card
function createFalModelCard(model) {
    const card = document.createElement('div');
    card.className = 'model-card clickable';
    card.dataset.source = 'fal';
    card.onclick = () => openModelModal(model, 'fal-models');

    // Format date
    const date = model.date ? new Date(model.date).toLocaleDateString() : 'N/A';

    // Format tags
    const tags = model.tags && model.tags.length > 0
        ? model.tags.map(tag => `<span class="tag">${tag}</span>`).join('')
        : '';

    // Format pricing info
    const pricing = model.pricing || 'Pricing details available on platform';

    card.innerHTML = `
        <div class="source-badge">fal.ai</div>
        <h3>${model.title}</h3>
        <div class="model-creator">fal.ai</div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">Category</span>
                <span class="stat-value">${model.category || 'N/A'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Release Date</span>
                <span class="stat-value">${date}</span>
            </div>
        </div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">License</span>
                <span class="stat-value">${model.licenseType || 'N/A'}</span>
            </div>
            ${model.creditsRequired ? `
                <div class="stat-item">
                    <span class="stat-label">Credits Required</span>
                    <span class="stat-value">${model.creditsRequired}</span>
                </div>
            ` : ''}
        </div>
        
        <div class="evaluations">
            <h4>Description</h4>
            <p style="font-size: 0.85rem; line-height: 1.4; color: var(--info-text);">${model.description}</p>
            
            ${tags ? `<div style="margin-top: 12px;">${tags}</div>` : ''}
        </div>
        
        <div class="pricing">
            <h4>Pricing Information</h4>
            <p style="font-size: 0.85rem; color: var(--info-text); line-height: 1.4;">${pricing}</p>
            ${model.modelUrl ? `
                <div style="margin-top: 8px;">
                    <a href="${model.modelUrl}" target="_blank" style="font-size: 0.85rem; color: var(--button-bg);" onclick="event.stopPropagation();">View on fal.ai →</a>
                </div>
            ` : ''}
        </div>
        
        <div class="click-hint">💡 Click to explore full model details</div>
    `;
    attachPinButton(card, 'fal', model);
    return card;
}

// Create Replicate model card
function createReplicateModelCard(model) {
    const card = document.createElement('div');
    card.className = 'model-card clickable';
    card.dataset.source = 'replicate';
    card.onclick = () => openModelModal(model, 'replicate-models');

    // Format date
    const date = model.created_at ? new Date(model.created_at).toLocaleDateString() : 'N/A';

    // Format run count
    const runCount = model.run_count ? model.run_count.toLocaleString() : 'N/A';

    card.innerHTML = `
        <div class="source-badge">Replicate</div>
        <h3>${model.name}</h3>
        <div class="model-creator">${model.owner} (Replicate)</div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">Category</span>
                <span class="stat-value">${model.category || 'N/A'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Run Count</span>
                <span class="stat-value">${runCount}</span>
            </div>
        </div>
        
        <div class="model-stats">
            <div class="stat-item">
                <span class="stat-label">Visibility</span>
                <span class="stat-value">${model.visibility || 'N/A'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Created</span>
                <span class="stat-value">${date}</span>
            </div>
        </div>
        
        <div class="evaluations">
            <h4>Description</h4>
            <p style="font-size: 0.85rem; line-height: 1.4; color: var(--info-text);">${model.description || 'No description available.'}</p>
        </div>
        
        <div class="pricing">
            <h4>Links</h4>
            <div style="font-size: 0.85rem;">
                ${model.url ? `<a href="${model.url}" target="_blank" style="color: var(--button-bg); text-decoration: none;" onclick="event.stopPropagation();">View on Replicate →</a><br>` : ''}
                ${model.github_url ? `<a href="${model.github_url}" target="_blank" style="color: var(--button-bg); text-decoration: none;" onclick="event.stopPropagation();">GitHub →</a><br>` : ''}
                ${model.paper_url ? `<a href="${model.paper_url}" target="_blank" style="color: var(--button-bg); text-decoration: none;" onclick="event.stopPropagation();">Paper →</a>` : ''}
            </div>
        </div>
        
        <div class="click-hint">💡 Click to explore full model details</div>
    `;
    attachPinButton(card, 'replicate', model);
    return card;
}

// Display Replicate models data
function displayReplicateModelsData(models) {
    const container = document.getElementById('replicate-models-data');
    container.innerHTML = '';

    const displayModels = getFilteredItems('replicate', models);
    recordDisplayedItems('replicate', displayModels);
    displayModels.forEach(model => {
        const modelCard = createReplicateModelCard(model);
        container.appendChild(modelCard);
    });
}

// Filtering and sorting functions for Replicate models
function filterReplicateModelsData() {
    if (!rawData.replicateModels) return;

    const searchTerm = document.getElementById('replicate-models-search').value.toLowerCase();
    const sortBy = document.getElementById('replicate-models-sort').value;
    const categoryFilter = document.getElementById('replicate-models-category').value;

    let filteredData = rawData.replicateModels.filter(model => {
        const matchesSearch = model.name.toLowerCase().includes(searchTerm) ||
            model.description.toLowerCase().includes(searchTerm) ||
            model.owner.toLowerCase().includes(searchTerm);

        const matchesCategory = !categoryFilter || model.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Sort data
    filteredData = sortReplicateModelsData(filteredData, sortBy);

    const displayModels = getFilteredItems('replicate', filteredData);
    displayReplicateModelsData(displayModels);

    // Update results info
    const resultsInfo = document.getElementById('replicate-models-results-info');
    resultsInfo.textContent = `Showing ${displayModels.length} of ${rawData.replicateModels.length} models`;
}

function sortReplicateModelsData(data, sortBy) {
    const sortedData = [...data];

    switch (sortBy) {
        case 'popularity':
            return sortedData.sort((a, b) => (b.run_count || 0) - (a.run_count || 0));
        case 'date':
            return sortedData.sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        case 'category':
            return sortedData.sort((a, b) => (a.category || '').localeCompare(b.category || ''));
        case 'name':
            return sortedData.sort((a, b) => a.name.localeCompare(b.name));
        default:
            return sortedData;
    }
}

// Add enter key support for AI agent
document.addEventListener('DOMContentLoaded', function () {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }
});

function toggleSpeedMode() {
    const speedModeCheckbox = document.getElementById('speed-mode');
    if (speedModeCheckbox) {
        agentConfig.speedMode = speedModeCheckbox.checked;
        console.log('Speed mode:', agentConfig.speedMode ? 'enabled' : 'disabled');

        // Update model selection when speed mode is toggled
        updateModelForSpeedMode();
    }
}

function updateModelForSpeedMode() {
    const modelSelect = document.getElementById('agent-model');
    if (!modelSelect) return;

    if (agentConfig.speedMode) {
        // Switch to speed mode model if not already selected
        const speedModelId = localStorage.getItem('dashboard-speed-model') || agentConfig.speedModeModel || 'openai/gpt-4o-mini';
        if (agentConfig.model !== speedModelId) {
            agentConfig.previousModel = agentConfig.model; // Save current model
            agentConfig.model = speedModelId;
            modelSelect.value = agentConfig.model;
        }
    } else {
        // Restore previous model or default
        if (agentConfig.previousModel) {
            agentConfig.model = agentConfig.previousModel;
            modelSelect.value = agentConfig.model;
            delete agentConfig.previousModel;
        } else if (selectedAvailableModels.length > 0) {
            agentConfig.model = selectedAvailableModels[0].id;
            modelSelect.value = agentConfig.model;
        }
    }
}

// Modal functionality for model analysis with structured details
async function openModelModal(model, type) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay analysis-modal';
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    const modalContent = document.createElement('div');
    modalContent.className = 'modal-content';

    modalContent.innerHTML = `
        <div class="modal-header">
            <div class="modal-title-group">
                <h2 class="modal-title"></h2>
                <p class="modal-subtitle"></p>
            </div>
            <button class="modal-close" type="button">×</button>
        </div>
        <div class="modal-body">
            <div class="modal-tabs">
                <button class="modal-tab active" data-tab="overview">Data Overview</button>
                <button class="modal-tab" data-tab="openrouter" hidden>OpenRouter Data</button>
                <button class="modal-tab" data-tab="analysis">AI Analysis</button>
            </div>
            <div class="modal-tab-content active" data-tab="overview">
                <div class="modal-overview"></div>
            </div>
            <div class="modal-tab-content" data-tab="openrouter" hidden></div>
            <div class="modal-tab-content" data-tab="analysis">
                <div class="analysis-container">
                    <div class="analysis-intro">
                        <p>Generate a fresh AI summary for this model using the configured analysis pipeline.</p>
                        <button class="primary-btn" data-action="start-analysis">Generate AI Analysis</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const closeButton = modalContent.querySelector('.modal-close');
    closeButton.addEventListener('click', closeModal);

    modal.appendChild(modalContent);
    document.body.appendChild(modal);

    const titleElement = modalContent.querySelector('.modal-title');
    titleElement.textContent = resolveModalTitle(model, type);

    const subtitleElement = modalContent.querySelector('.modal-subtitle');
    const providerName = getModelProvider(model, type);
    if (providerName) {
        subtitleElement.textContent = providerName;
    } else {
        subtitleElement.remove();
    }

    const overviewContainer = modalContent.querySelector('.modal-overview');
    buildModelOverviewSection(overviewContainer, model, type);
    configureOpenRouterModalTab(modalContent, model, type);

    const tabs = modalContent.querySelectorAll('.modal-tab');
    const tabContents = modalContent.querySelectorAll('.modal-tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            tabs.forEach(btn => btn.classList.toggle('active', btn === tab));
            tabContents.forEach(content => {
                content.classList.toggle('active', content.dataset.tab === targetTab);
            });
        });
    });

    const analysisContainer = modalContent.querySelector('.analysis-container');
    const analysisButton = modalContent.querySelector('[data-action="start-analysis"]');

    const runAnalysis = (force = false) => {
        return startModelAnalysis(analysisContainer, model, type, { force });
    };

    const loadExistingAnalysis = async () => {
        const cacheKey = getAnalysisCacheKey(model, type);
        const cached = getCachedAnalysis(model, type);
        if (hasAnalysisContent(cached)) {
            renderAnalysisPayload(analysisContainer, cached, { model, type });
            return true;
        }
        if (cached) {
            analysisCache.delete(cacheKey);
        }
        try {
            const existing = await fetchExistingAnalysis(model, type);
            if (existing) {
                saveAnalysisToCache(model, type, existing);
                renderAnalysisPayload(analysisContainer, existing, { model, type });
                return true;
            }
        } catch (error) {
            console.log('No cached analysis available:', error);
        }
        return false;
    };

    if (analysisButton) {
        analysisButton.addEventListener('click', () => runAnalysis(true));
    }

    loadExistingAnalysis();
}

function configureOpenRouterModalTab(modalContent, model, type) {
    const tabButton = modalContent.querySelector('.modal-tab[data-tab="openrouter"]');
    const tabContent = modalContent.querySelector('.modal-tab-content[data-tab="openrouter"]');
    if (!tabButton || !tabContent) {
        return;
    }

    tabButton.hidden = true;
    tabButton.classList.remove('active');
    tabContent.hidden = true;
    tabContent.classList.remove('active');
    tabContent.innerHTML = '';

    if (type !== 'llm') {
        return;
    }

    tabButton.hidden = false;
    tabContent.hidden = false;

    const section = createSection('OpenRouter Catalogue');
    tabContent.appendChild(section);
    populateOpenRouterComparison(section, model);
}

function buildModelOverviewSection(container, model, type) {
    if (!container) {
        return;
    }
    container.innerHTML = '';

    switch (type) {
        case 'llm':
            renderLLMOverview(container, model);
            break;
        case 'media':
            renderMediaOverview(container, model);
            break;
        case 'fal-models':
            renderFalOverview(container, model);
            break;
        case 'replicate-models':
            renderReplicateOverview(container, model);
            break;
        case 'openrouter':
            renderOpenRouterOverview(container, model);
            break;
        default:
            container.appendChild(createEmptyState('No structured data available for this model.'));
    }
}

function renderLLMOverview(container, model) {
    const summarySection = createSection('Artificial Analysis Summary');
    const summaryGrid = createDetailGrid();
    appendDetailRow(summaryGrid, 'Provider', (model.model_creator && model.model_creator.name) || 'Unknown');
    appendDetailRow(summaryGrid, 'Model ID', model.id || '—');
    appendDetailRow(summaryGrid, 'Output Speed', model.median_output_tokens_per_second ? `${model.median_output_tokens_per_second} tokens/s` : 'N/A');
    appendDetailRow(summaryGrid, 'Time to First Token', model.median_time_to_first_token_seconds ? `${model.median_time_to_first_token_seconds}s` : 'N/A');
    appendDetailRow(summaryGrid, 'Input Price (1M tokens)', formatPricePerMillion(model.pricing && model.pricing.price_1m_input_tokens));
    appendDetailRow(summaryGrid, 'Output Price (1M tokens)', formatPricePerMillion(model.pricing && model.pricing.price_1m_output_tokens));
    summarySection.appendChild(summaryGrid);
    container.appendChild(summarySection);

    const evaluations = model.evaluations || {};
    const evaluationEntries = Object.entries(evaluations);
    const metricsSection = createSection('Benchmark Metrics');
    if (evaluationEntries.length) {
        const metricsGrid = createDetailGrid();
        evaluationEntries.forEach(([key, value]) => {
            let displayValue = value;
            if (typeof value === 'number') {
                displayValue = Number(value).toFixed(3);
            }
            appendDetailRow(metricsGrid, formatEvaluationKey(key), displayValue || 'N/A');
        });
        metricsSection.appendChild(metricsGrid);
    } else {
        metricsSection.appendChild(createEmptyState('No benchmark data available.'));
    }
    container.appendChild(metricsSection);

    const openRouterSection = createSection('OpenRouter Catalogue');
    const placeholder = document.createElement('div');
    placeholder.className = 'inline-loading';
    placeholder.textContent = 'Matching against OpenRouter catalogue...';
    openRouterSection.appendChild(placeholder);
    container.appendChild(openRouterSection);
    populateOpenRouterComparison(openRouterSection, model);
}

function renderMediaOverview(container, model) {
    const summarySection = createSection('Artificial Analysis Summary');
    const summaryGrid = createDetailGrid();
    appendDetailRow(summaryGrid, 'Provider', (model.model_creator && model.model_creator.name) || 'Unknown');
    appendDetailRow(summaryGrid, 'ELO Score', model.elo != null ? model.elo : 'N/A');
    appendDetailRow(summaryGrid, 'Rank', model.rank ? `#${model.rank}` : 'N/A');
    appendDetailRow(summaryGrid, 'Confidence Interval', model.ci95 || 'N/A');
    summarySection.appendChild(summaryGrid);
    container.appendChild(summarySection);

    if (Array.isArray(model.categories) && model.categories.length > 0) {
        const categoriesSection = createSection('Category Performance');
        const list = document.createElement('ul');
        list.className = 'detail-list';
        model.categories.forEach(category => {
            const item = document.createElement('li');
            const name = category.style_category || category.subject_matter_category || 'Category';
            const eloScore = category.elo != null ? `ELO ${category.elo}` : '';
            item.textContent = eloScore ? `${name} — ${eloScore}` : name;
            list.appendChild(item);
        });
        categoriesSection.appendChild(list);
        container.appendChild(categoriesSection);
    }
}

function renderFalOverview(container, model) {
    const summarySection = createSection('fal.ai Summary');
    const summaryGrid = createDetailGrid();
    appendDetailRow(summaryGrid, 'Category', model.category || 'N/A');
    appendDetailRow(summaryGrid, 'License', model.licenseType || 'N/A');
    appendDetailRow(summaryGrid, 'Credits Required', model.creditsRequired != null ? model.creditsRequired : 'N/A');
    appendDetailRow(summaryGrid, 'Duration Estimate', model.durationEstimate ? `${model.durationEstimate}s` : 'N/A');
    appendDetailRow(summaryGrid, 'Highlighted', model.highlighted ? 'Yes' : 'No');
    summarySection.appendChild(summaryGrid);
    container.appendChild(summarySection);

    if (model.description) {
        const descriptionSection = createSection('Description');
        appendParagraph(descriptionSection, model.description, 'detail-description');
        container.appendChild(descriptionSection);
    }

    if (Array.isArray(model.tags) && model.tags.length > 0) {
        const tagsSection = createSection('Tags');
        const tagList = document.createElement('div');
        tagList.className = 'tag-list';
        model.tags.forEach(tag => {
            const chip = document.createElement('span');
            chip.className = 'tag';
            chip.textContent = tag;
            tagList.appendChild(chip);
        });
        tagsSection.appendChild(tagList);
        container.appendChild(tagsSection);
    }

    if (model.modelUrl) {
        const linksSection = createSection('Links');
        const linksBlock = document.createElement('div');
        linksBlock.className = 'links-block';
        const anchor = document.createElement('a');
        anchor.className = 'external-link';
        anchor.href = model.modelUrl;
        anchor.target = '_blank';
        anchor.rel = 'noopener';
        anchor.textContent = 'Open on fal.ai ↗';
        linksBlock.appendChild(anchor);
        linksSection.appendChild(linksBlock);
        container.appendChild(linksSection);
    }
}

function renderReplicateOverview(container, model) {
    const summarySection = createSection('Replicate Summary');
    const summaryGrid = createDetailGrid();
    appendDetailRow(summaryGrid, 'Owner', model.owner || 'Unknown');
    appendDetailRow(summaryGrid, 'Category', model.category || 'N/A');
    appendDetailRow(summaryGrid, 'Visibility', model.visibility || 'N/A');
    appendDetailRow(summaryGrid, 'Run Count', model.run_count != null ? model.run_count.toLocaleString() : 'N/A');
    appendDetailRow(summaryGrid, 'Latest Version', formatDateValue(model.latest_version_created_at || model.created_at));
    appendDetailRow(summaryGrid, 'Latency (default example)', model.latency_seconds != null ? `${model.latency_seconds.toFixed(2)}s` : 'N/A');
    summarySection.appendChild(summaryGrid);
    container.appendChild(summarySection);

    if (model.description) {
        const descriptionSection = createSection('Description');
        appendParagraph(descriptionSection, model.description, 'detail-description');
        container.appendChild(descriptionSection);
    }

    if (model.default_inputs && Object.keys(model.default_inputs).length > 0) {
        const inputsSection = createSection('Default Inputs');
        const list = document.createElement('ul');
        list.className = 'detail-list';
        Object.entries(model.default_inputs).forEach(([key, value]) => {
            const item = document.createElement('li');
            item.textContent = `${key}: ${String(value)}`;
            list.appendChild(item);
        });
        inputsSection.appendChild(list);
        container.appendChild(inputsSection);
    }

    const links = [];
    if (model.url) {
        links.push({ href: model.url, label: 'View on Replicate ↗' });
    }
    if (model.github_url) {
        links.push({ href: model.github_url, label: 'GitHub ↗' });
    }
    if (model.paper_url) {
        links.push({ href: model.paper_url, label: 'Paper ↗' });
    }

    if (links.length) {
        const linksSection = createSection('Links');
        const linksBlock = document.createElement('div');
        linksBlock.className = 'links-block';
        links.forEach(link => {
            const anchor = document.createElement('a');
            anchor.className = 'external-link';
            anchor.href = link.href;
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.textContent = link.label;
            linksBlock.appendChild(anchor);
        });
        linksSection.appendChild(linksBlock);
        container.appendChild(linksSection);
    }
}

function renderOpenRouterOverview(container, model) {
    const metadataSection = createSection('OpenRouter Metadata');
    metadataSection.appendChild(renderOpenRouterSummary(model));
    container.appendChild(metadataSection);

    const architecture = model.architecture || {};
    if (architecture && (architecture.input_modalities || architecture.output_modalities || architecture.tokenizer || architecture.instruct_type)) {
        const architectureSection = createSection('Architecture');
        const architectureGrid = createDetailGrid();
        appendDetailRow(architectureGrid, 'Input Modalities', Array.isArray(architecture.input_modalities) && architecture.input_modalities.length ? architecture.input_modalities.join(', ') : 'Not specified');
        appendDetailRow(architectureGrid, 'Output Modalities', Array.isArray(architecture.output_modalities) && architecture.output_modalities.length ? architecture.output_modalities.join(', ') : 'Not specified');
        appendDetailRow(architectureGrid, 'Tokenizer', architecture.tokenizer || 'Not specified');
        appendDetailRow(architectureGrid, 'Instruct Type', architecture.instruct_type || 'Not specified');
        architectureSection.appendChild(architectureGrid);
        container.appendChild(architectureSection);
    }

    if (Array.isArray(model.supported_parameters) && model.supported_parameters.length) {
        const parametersSection = createSection('Supported Parameters');
        const list = document.createElement('ul');
        list.className = 'detail-list';
        model.supported_parameters.slice(0, 20).forEach(param => {
            const item = document.createElement('li');
            item.textContent = param;
            list.appendChild(item);
        });
        parametersSection.appendChild(list);
        container.appendChild(parametersSection);
    }

    const aaSection = createSection('Artificial Analysis Benchmarks');
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'inline-loading';
    loadingIndicator.textContent = 'Matching against Artificial Analysis dataset...';
    aaSection.appendChild(loadingIndicator);
    container.appendChild(aaSection);
    populateArtificialAnalysisComparison(aaSection, model);
}

function createSection(title) {
    const section = document.createElement('section');
    section.className = 'modal-section';
    if (title) {
        const heading = document.createElement('h3');
        heading.textContent = title;
        section.appendChild(heading);
    }
    return section;
}

function createDetailGrid(columns = 2) {
    const grid = document.createElement('div');
    grid.className = 'detail-grid';
    if (columns === 1) {
        grid.classList.add('single-column');
    }
    return grid;
}

function appendDetailRow(grid, label, value) {
    const item = document.createElement('div');
    item.className = 'detail-item';

    const labelElement = document.createElement('span');
    labelElement.className = 'detail-label';
    labelElement.textContent = label;

    const valueElement = document.createElement('span');
    valueElement.className = 'detail-value';
    valueElement.textContent = value !== undefined && value !== null && value !== '' ? value : '—';

    item.appendChild(labelElement);
    item.appendChild(valueElement);
    grid.appendChild(item);
}

function createEmptyState(message) {
    const placeholder = document.createElement('div');
    placeholder.className = 'empty-state';
    placeholder.textContent = message;
    return placeholder;
}

function appendParagraph(container, text, className) {
    if (!text) {
        return;
    }
    const paragraph = document.createElement('p');
    paragraph.textContent = text;
    if (className) {
        paragraph.className = className;
    }
    container.appendChild(paragraph);
}

function formatUsd(amount) {
    if (!Number.isFinite(amount)) {
        return null;
    }
    const options = { style: 'currency', currency: 'USD' };
    if (amount < 1) {
        options.minimumFractionDigits = 4;
        options.maximumFractionDigits = 4;
    } else if (amount < 10) {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    } else {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    }
    return amount.toLocaleString('en-US', options);
}

function formatPricePerMillion(value) {
    if (value === undefined || value === null || value === '') {
        return 'Not provided';
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
        return `$${value}`;
    }
    const formatted = formatUsd(numeric);
    return formatted || `$${numeric}`;
}

function formatDateValue(value) {
    if (!value) {
        return 'N/A';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}

function resolveModalTitle(model, type) {
    if (!model) {
        return 'Unknown Model';
    }

    switch (type) {
        case 'llm':
        case 'media':
            return model.name || 'Unknown Model';
        case 'fal-models':
            return model.title || model.name || 'fal.ai Model';
        case 'replicate-models':
            return model.name || `${model.owner || 'Replicate'} Model`;
        case 'openrouter':
            return getOpenRouterCardTitle(model);
        default:
            return model.name || model.title || 'Model';
    }
}

function getModelProvider(model, type) {
    switch (type) {
        case 'llm':
        case 'media':
            return (model.model_creator && model.model_creator.name) || '';
        case 'fal-models':
            return (model.group && model.group.name) || 'fal.ai';
        case 'replicate-models':
            return model.owner ? `${model.owner} · Replicate` : 'Replicate';
        case 'openrouter':
            return model.vendor ? `${model.vendor} · OpenRouter` : 'OpenRouter';
        default:
            return '';
    }
}

async function populateOpenRouterComparison(section, model) {
    if (!section) {
        return;
    }

    const heading = section.querySelector('h3');
    Array.from(section.children).forEach(child => {
        if (child !== heading) {
            section.removeChild(child);
        }
    });

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'inline-loading';
    loadingIndicator.textContent = 'Matching against OpenRouter catalogue...';
    section.appendChild(loadingIndicator);

    try {
        await ensureOpenRouterDataLoaded();
        Array.from(section.children).forEach(child => {
            if (child !== heading) {
                section.removeChild(child);
            }
        });

        const providerName = (model.model_creator && model.model_creator.name) || '';
        const matchResponse = await requestModelMatch('artificial-analysis', 'openrouter', {
            name: model.name,
            provider: providerName,
            aliases: model.aliases || [],
            category: model.mediaCategory || model.category || ''
        });

        const match = matchResponse && matchResponse.match;
        if (match && match.metadata) {
            section.appendChild(renderOpenRouterSummary(match.metadata, match));
        } else {
            section.appendChild(createEmptyState('No matching OpenRouter entry found.'));
        }
    } catch (error) {
        Array.from(section.children).forEach(child => {
            if (child !== heading) {
                section.removeChild(child);
            }
        });
        section.appendChild(createEmptyState('OpenRouter lookup failed.'));
    }
}

function renderOpenRouterSummary(model, matchInfo) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-subsection';

    const summaryGrid = createDetailGrid();
    appendDetailRow(summaryGrid, 'Provider', model.vendor || 'Unknown');
    appendDetailRow(summaryGrid, 'Model ID', model.id || '—');
    appendDetailRow(summaryGrid, 'Context Length', formatContextLength(model.context_length));
    appendDetailRow(summaryGrid, 'Pricing', formatPricing(model.pricing));
    wrapper.appendChild(summaryGrid);

    if (matchInfo && matchInfo.reason) {
        const reason = document.createElement('div');
        reason.className = 'match-reason';
        reason.textContent = `Match confidence ${(matchInfo.confidence ? Math.round(matchInfo.confidence * 100) : '—')}% — ${matchInfo.reason}`;
        wrapper.appendChild(reason);
    }

    if (model.description) {
        appendParagraph(wrapper, model.description, 'detail-description');
    }

    if (Array.isArray(model.supported_parameters) && model.supported_parameters.length) {
        const paramsDetails = document.createElement('details');
        paramsDetails.className = 'collapsible-section';
        const summary = document.createElement('summary');
        summary.textContent = `Supported Parameters (${model.supported_parameters.length})`;
        paramsDetails.appendChild(summary);

        const list = document.createElement('ul');
        list.className = 'detail-list';
        model.supported_parameters.forEach(param => {
            const item = document.createElement('li');
            item.textContent = param;
            list.appendChild(item);
        });
        paramsDetails.appendChild(list);
        wrapper.appendChild(paramsDetails);
    }

    const links = [];
    if (model.display_url) {
        links.push({ href: model.display_url, label: 'View on OpenRouter ↗' });
    } else if (model.slug) {
        links.push({ href: `https://openrouter.ai/models/${model.slug}`, label: 'View on OpenRouter ↗' });
    }
    if (model.hugging_face_id) {
        links.push({ href: `https://huggingface.co/${model.hugging_face_id}`, label: 'Hugging Face ↗' });
    }

    if (links.length) {
        const linksBlock = document.createElement('div');
        linksBlock.className = 'links-block';
        links.forEach(link => {
            const anchor = document.createElement('a');
            anchor.className = 'external-link';
            anchor.href = link.href;
            anchor.target = '_blank';
            anchor.rel = 'noopener';
            anchor.textContent = link.label;
            linksBlock.appendChild(anchor);
        });
        wrapper.appendChild(linksBlock);
    }

    return wrapper;
}

async function populateArtificialAnalysisComparison(section, model) {
    if (!section) {
        return;
    }

    const heading = section.querySelector('h3');
    Array.from(section.children).forEach(child => {
        if (child !== heading) {
            section.removeChild(child);
        }
    });

    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'inline-loading';
    loadingIndicator.textContent = 'Matching against Artificial Analysis dataset...';
    section.appendChild(loadingIndicator);

    try {
        const matchResponse = await requestModelMatch('openrouter', 'artificial-analysis', {
            name: getOpenRouterCardTitle(model),
            provider: model.vendor || '',
            aliases: model.aliases || [],
            category: model.category || ''
        });

        Array.from(section.children).forEach(child => {
            if (child !== heading) {
                section.removeChild(child);
            }
        });

        const match = matchResponse && matchResponse.match;
        if (match && match.metadata) {
            section.appendChild(renderArtificialAnalysisMatch(match.metadata));
        } else {
            section.appendChild(createEmptyState('No Artificial Analysis entry found.'));
        }
    } catch (error) {
        Array.from(section.children).forEach(child => {
            if (child !== heading) {
                section.removeChild(child);
            }
        });
        section.appendChild(createEmptyState('Artificial Analysis lookup failed.'));
    }
}

function renderArtificialAnalysisMatch(metadata) {
    const wrapper = document.createElement('div');
    wrapper.className = 'modal-subsection';

    const summaryGrid = createDetailGrid();
    appendDetailRow(summaryGrid, 'Provider', (metadata.model_creator && metadata.model_creator.name) || 'Unknown');
    appendDetailRow(summaryGrid, 'Rank', metadata.rank ? `#${metadata.rank}` : 'N/A');
    appendDetailRow(summaryGrid, 'ELO Score', metadata.elo != null ? metadata.elo : 'N/A');
    appendDetailRow(summaryGrid, 'Category', metadata.category || metadata.media_type || 'N/A');
    appendDetailRow(summaryGrid, 'Input Price (1M tokens)', formatPricePerMillion(metadata.pricing && metadata.pricing.price_1m_input_tokens));
    appendDetailRow(summaryGrid, 'Output Price (1M tokens)', formatPricePerMillion(metadata.pricing && metadata.pricing.price_1m_output_tokens));
    wrapper.appendChild(summaryGrid);

    if (metadata.description) {
        appendParagraph(wrapper, metadata.description, 'detail-description');
    }

    const evaluations = metadata.evaluations || {};
    const evaluationEntries = Object.entries(evaluations);
    if (evaluationEntries.length) {
        const evaluationSection = createSection('Artificial Analysis Benchmarks');
        const evalGrid = createDetailGrid();
        evaluationEntries.slice(0, 8).forEach(([key, value]) => {
            let displayValue = value;
            if (typeof value === 'number') {
                displayValue = Number(value).toFixed(3);
            }
            appendDetailRow(evalGrid, formatEvaluationKey(key), displayValue || 'N/A');
        });
        evaluationSection.appendChild(evalGrid);
        wrapper.appendChild(evaluationSection);
    }

    return wrapper;
}

function startModelAnalysis(analysisContainer, model, type, options = {}) {
    if (!analysisContainer) {
        return null;
    }

    analysisContainer.innerHTML = '';
    const loading = document.createElement('div');
    loading.className = 'initial-loading';
    loading.innerHTML = `
        <div class="loading-spinner"></div>
        <span class="loading-text">Preparing analysis...</span>
    `;
    analysisContainer.appendChild(loading);

    const task = streamModelAnalysis(analysisContainer, model, type, options).catch(error => {
        analysisContainer.innerHTML = '';
        const errorBox = document.createElement('div');
        errorBox.className = 'analysis-error';
        const title = document.createElement('h3');
        title.textContent = '⚠️ Analysis Failed';
        errorBox.appendChild(title);
        appendParagraph(errorBox, 'Unable to generate detailed analysis at this time. Please try again later.');
        const details = document.createElement('p');
        details.className = 'error-details';
        details.textContent = `Error: ${error.message}`;
        errorBox.appendChild(details);
        analysisContainer.appendChild(errorBox);
    });
    return task;
}

async function streamModelAnalysis(analysisContainer, model, type, options = {}) {
    try {
        const response = await fetch('/api/model-analysis', {
            method: 'POST',
            headers: withUserOpenRouterKey({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                model: model,
                type: type,
                stream: true,
                force: Boolean(options.force)
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const payload = await response.json();
                errorMessage = payload.error || payload.message || errorMessage;
            } catch (parseError) {
                // Ignore parse failures; we already have a fallback message.
            }

            // Handle specific error cases
            if (response.status === 402) {
                errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
            }

            throw new Error(errorMessage);
        }

        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let fullResponse = '';
        let traces = [];

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    break;
                }

                buffer += decoder.decode(value, { stream: true });

                let newlineIndex;
                while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                    const line = buffer.slice(0, newlineIndex).trim();
                    buffer = buffer.slice(newlineIndex + 1);

                    if (!line.startsWith('data: ')) {
                        continue;
                    }

                    const payload = line.slice(6);
                    if (payload === '[DONE]') {
                        const finalContent = fixEncodingArtifacts(fullResponse);
                        finalizeModalAnalysis(analysisContainer, finalContent, traces, { model, type });
                        saveAnalysisToCache(model, type, {
                            analysis: finalContent,
                            traces: traces,
                            fetch_data: null,
                            saved_at: new Date().toISOString()
                        });
                        return;
                    }

                    try {
                        const parsed = JSON.parse(payload);
                        switch (parsed.type) {
                            case 'traces':
                                traces = parsed.traces;
                                break;
                            case 'content': {
                                const sanitizedChunk = fixEncodingArtifacts(parsed.content);
                                fullResponse = appendStreamChunk(fullResponse, sanitizedChunk);
                                updateModalStreamingResponse(analysisContainer, fullResponse, traces);
                                break;
                            }
                            case 'done':
                                const finalValue = fixEncodingArtifacts(fullResponse);
                                finalizeModalAnalysis(analysisContainer, finalValue, traces, { model, type });
                                saveAnalysisToCache(model, type, {
                                    analysis: finalValue,
                                    traces: traces,
                                    fetch_data: null,
                                    saved_at: new Date().toISOString()
                                });
                                return;
                            case 'error':
                                throw new Error(parsed.error);
                        }
                    } catch (error) {
                        // Ignore invalid streaming payloads
                    }
                }
            }

            const finalContent = fixEncodingArtifacts(fullResponse);
            finalizeModalAnalysis(analysisContainer, finalContent, traces, { model, type });
            saveAnalysisToCache(model, type, {
                analysis: finalContent,
                traces: traces,
                fetch_data: null,
                saved_at: new Date().toISOString()
            });
        } finally {
            reader.cancel();
        }
    } catch (error) {
        console.log('Streaming failed, falling back to non-streaming:', error);
        await handleNonStreamingModalAnalysis(analysisContainer, model, type);
    }
}

function updateModalStreamingResponse(analysisContainer, content, traces) {
    if (!analysisContainer) {
        return;
    }

    const sanitizedContent = fixEncodingArtifacts(content || '');
    if (!(sanitizedContent && sanitizedContent.trim()) && (!traces || !traces.length)) {
        return;
    }

    const loading = analysisContainer.querySelector('.initial-loading');
    if (loading) {
        loading.remove();
    }

    let analysisContent = analysisContainer.querySelector('.analysis-content');
    if (!analysisContent) {
        analysisContent = document.createElement('div');
        analysisContent.className = 'analysis-content streaming';
        analysisContainer.appendChild(analysisContent);
    }

    analysisContent.innerHTML = '';

    if (traces && traces.length > 0) {
        const tracesContainer = document.createElement('details');
        tracesContainer.className = 'analysis-trace';
        const summary = document.createElement('summary');
        summary.textContent = `Analysis Process (${traces.length} steps)`;
        tracesContainer.appendChild(summary);

        const traceContent = document.createElement('div');
        traceContent.className = 'trace-content';
        traces.forEach((trace, index) => {
            const item = document.createElement('div');
            item.className = 'trace-item';

            const step = document.createElement('div');
            step.className = 'trace-step';
            step.textContent = `${index + 1}. ${trace.step}`;
            item.appendChild(step);

            if (trace.description) {
                const description = document.createElement('div');
                description.className = 'trace-description';
                description.textContent = trace.description;
                item.appendChild(description);
            }

            if (trace.tool) {
                const tool = document.createElement('div');
                tool.className = 'trace-tool';
                tool.textContent = `Tool: ${trace.tool}`;
                item.appendChild(tool);
            }

            if (trace.status) {
                const status = document.createElement('div');
                status.className = `trace-status status-${trace.status}`;
                status.textContent = trace.status;
                item.appendChild(status);
            }

            traceContent.appendChild(item);
        });
        tracesContainer.appendChild(traceContent);
        analysisContent.appendChild(tracesContainer);
    }

    const responseContent = document.createElement('div');
    responseContent.className = 'analysis-text';

    if (sanitizedContent) {
        if (typeof marked !== 'undefined' && marked.parse) {
            try {
                responseContent.innerHTML = marked.parse(sanitizedContent);
            } catch (error) {
                console.log('Marked.js error, using fallback:', error);
                responseContent.innerHTML = simpleMarkdownToHtml(sanitizedContent);
            }
        } else {
            responseContent.innerHTML = simpleMarkdownToHtml(sanitizedContent);
        }
    } else {
        responseContent.innerHTML = '<div class="typing-indicator">Analyzing model...</div>';
    }

    analysisContent.appendChild(responseContent);
}

function finalizeModalAnalysis(analysisContainer, content, traces, options = {}) {
    renderAnalysisPayload(analysisContainer, {
        analysis: content,
        traces: traces,
        saved_at: new Date().toISOString()
    }, options);
}

function renderAnalysisPayload(analysisContainer, result, options = {}) {
    if (!analysisContainer || !result) {
        return;
    }

    const sanitizedAnalysis = fixEncodingArtifacts(result.analysis || '');
    analysisContainer.innerHTML = '';
    const analysisContent = document.createElement('div');
    analysisContent.className = 'analysis-content';

    if (result.saved_at) {
        const meta = document.createElement('div');
        meta.className = 'analysis-meta';
        const savedDate = new Date(result.saved_at);
        if (!Number.isNaN(savedDate.valueOf())) {
            meta.textContent = `Last generated ${savedDate.toLocaleString()}`;
            analysisContent.appendChild(meta);
        }
    }

    let htmlContent = sanitizedAnalysis;
    if (sanitizedAnalysis) {
        if (typeof marked !== 'undefined' && marked.parse) {
            try {
                htmlContent = marked.parse(sanitizedAnalysis);
            } catch (error) {
                console.log('Marked.js error, using fallback:', error);
                htmlContent = simpleMarkdownToHtml(sanitizedAnalysis);
            }
        } else {
            htmlContent = simpleMarkdownToHtml(sanitizedAnalysis);
        }
    }

    const textBlock = document.createElement('div');
    textBlock.className = 'analysis-text';
    textBlock.innerHTML = htmlContent;
    analysisContent.appendChild(textBlock);

    const actions = document.createElement('div');
    actions.className = 'analysis-actions';
    const regenerateButton = document.createElement('button');
    regenerateButton.type = 'button';
    regenerateButton.className = 'primary-btn secondary';
    regenerateButton.textContent = 'Regenerate AI Analysis';
    regenerateButton.addEventListener('click', () => {
        startModelAnalysis(
            analysisContainer,
            options.model,
            options.type,
            { force: true }
        );
    });
    actions.appendChild(regenerateButton);
    analysisContent.appendChild(actions);

    if (Array.isArray(result.traces) && result.traces.length > 0) {
        const tracesContainer = document.createElement('details');
        tracesContainer.className = 'analysis-trace';
        const summary = document.createElement('summary');
        summary.textContent = `Analysis Process (${result.traces.length} steps)`;
        tracesContainer.appendChild(summary);

        const traceContent = document.createElement('div');
        traceContent.className = 'trace-content';
        result.traces.forEach((trace, index) => {
            const item = document.createElement('div');
            item.className = 'trace-item';

            const step = document.createElement('div');
            step.className = 'trace-step';
            step.textContent = `${index + 1}. ${trace.step}`;
            item.appendChild(step);

            if (trace.description) {
                const description = document.createElement('div');
                description.className = 'trace-description';
                description.textContent = trace.description;
                item.appendChild(description);
            }

            if (trace.tool) {
                const tool = document.createElement('div');
                tool.className = 'trace-tool';
                tool.textContent = `Tool: ${trace.tool}`;
                item.appendChild(tool);
            }

            if (trace.status) {
                const status = document.createElement('div');
                status.className = `trace-status status-${trace.status}`;
                status.textContent = trace.status;
                item.appendChild(status);
            }

            traceContent.appendChild(item);
        });
        tracesContainer.appendChild(traceContent);
        analysisContent.appendChild(tracesContainer);
    }

    analysisContainer.appendChild(analysisContent);
}

async function handleNonStreamingModalAnalysis(analysisContainer, model, type) {
    if (!analysisContainer) {
        return;
    }

    try {
        const response = await fetch('/api/model-analysis', {
            method: 'POST',
            headers: withUserOpenRouterKey({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify({
                model: model,
                type: type,
                stream: false
            })
        });

        if (!response.ok) {
            let errorMessage = `HTTP error! status: ${response.status}`;
            try {
                const payload = await response.json();
                errorMessage = payload.error || payload.message || errorMessage;
            } catch (parseError) {
                // Ignore parsing error
            }

            // Handle specific error cases
            if (response.status === 402) {
                errorMessage = "🔑 OpenRouter API key required. Please add your key in Settings to use AI features.";
            }

            throw new Error(errorMessage);
        }

        const result = await response.json();
        saveAnalysisToCache(model, type, result);
        renderAnalysisPayload(analysisContainer, result, { model, type });
    } catch (error) {
        analysisContainer.innerHTML = '';
        const errorBox = document.createElement('div');
        errorBox.className = 'analysis-error';
        const title = document.createElement('h3');
        title.textContent = '⚠️ Analysis Failed';
        errorBox.appendChild(title);
        appendParagraph(errorBox, 'Unable to generate detailed analysis at this time. Please try again later.');
        const details = document.createElement('p');
        details.className = 'error-details';
        details.textContent = `Error: ${error.message}`;
        errorBox.appendChild(details);
        analysisContainer.appendChild(errorBox);
    }
}

// Simple markdown to HTML converter (fallback)
function simpleMarkdownToHtml(markdown) {
    return markdown
        // Headers
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        // Bold
        .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
        // Italic
        .replace(/\*(.*?)\*/gim, '<em>$1</em>')
        // Code blocks
        .replace(/```([\s\S]*?)```/gim, '<pre><code>$1</code></pre>')
        // Inline code
        .replace(/`(.*?)`/gim, '<code>$1</code>')
        // Lists
        .replace(/^\* (.*$)/gim, '<li>$1</li>')
        .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
        // Line breaks
        .replace(/\n\n/gim, '</p><p>')
        .replace(/\n/gim, '<br>')
        // Wrap in paragraphs
        .replace(/^(?!<[hul])/gim, '<p>')
        .replace(/(?<!>)$/gim, '</p>')
        // Clean up empty paragraphs
        .replace(/<p><\/p>/gim, '')
        .replace(/<p><br><\/p>/gim, '');
}
function closeModal() {
    const modal = document.querySelector('.modal-overlay.analysis-modal');
    if (modal) {
        modal.remove();
    }
}

// Export functions to global scope
window.openModelModal = openModelModal;
window.closeModal = closeModal;

// Settings functionality with enhanced dropdowns
let openRouterModels = [];
let selectedFallbackModels = [];
let selectedAvailableModels = [];

function refreshOpenRouterKeyField() {
    const input = document.getElementById('setting-openrouter-key');
    if (!input) {
        return;
    }
    const storedKey = getUserOpenRouterKey();
    input.value = '';
    if (storedKey) {
        input.placeholder = 'Key stored locally';
        input.dataset.hasStoredKey = 'true';
    } else {
        input.placeholder = 'sk-or-...';
        input.dataset.hasStoredKey = 'false';
    }
}

function attachOpenRouterKeyHandlers() {
    const input = document.getElementById('setting-openrouter-key');
    if (input && !input.dataset.listenerAttached) {
        input.addEventListener('input', () => {
            if (input.value.trim()) {
                input.dataset.hasStoredKey = 'false';
            }
        });
        input.dataset.listenerAttached = 'true';
    }

    const clearButton = document.getElementById('clear-openrouter-key');
    if (clearButton && !clearButton.dataset.listenerAttached) {
        clearButton.addEventListener('click', () => {
            setUserOpenRouterKey('');
            refreshOpenRouterKeyField();
        });
        clearButton.dataset.listenerAttached = 'true';
    }
}

// Fetch OpenRouter models
async function fetchOpenRouterModels() {
    if (openRouterModels.length) {
        return openRouterModels;
    }
    try {
        return await fetchAndCacheOpenRouterModels();
    } catch (error) {
        console.error('Error fetching OpenRouter models:', error);
    }
    return openRouterModels;
}

// Filter models based on search query
function filterModels(query) {
    if (!query) return openRouterModels.slice(0, 20); // Show top 20 if no query

    const lowerQuery = query.toLowerCase();
    return openRouterModels.filter(model =>
        model.id.toLowerCase().includes(lowerQuery) ||
        model.name.toLowerCase().includes(lowerQuery)
    ).slice(0, 20);
}

// Create model option element
function createModelOption(model) {
    const option = document.createElement('div');
    option.className = 'model-option';
    option.dataset.modelId = model.id;

    const pricing = model.pricing || {};
    const prompt = pricing.prompt ? `$${pricing.prompt}` : 'N/A';
    const completion = pricing.completion ? `$${pricing.completion}` : 'N/A';

    option.innerHTML = `
        <div class="model-option-name">${model.name}</div>
        <div class="model-option-details">${model.id}</div>
        <div class="model-option-price">Input: ${prompt}/1M • Output: ${completion}/1M tokens</div>
    `;

    return option;
}

// Show dropdown with filtered models
function showModelDropdown(inputId, dropdownId, query = '') {
    const dropdown = document.getElementById(dropdownId);
    const loadingId = dropdownId.replace('-dropdown', '-loading');
    const loading = document.getElementById(loadingId);

    if (!dropdown || !loading) {
        return;
    }

    if (openRouterModels.length === 0) {
        loading.style.display = 'block';
        dropdown.style.display = 'none';

        fetchOpenRouterModels().then(models => {
            loading.style.display = 'none';
            if (models.length > 0) {
                showModelDropdown(inputId, dropdownId, query);
            }
        });
        return;
    }

    const filteredModels = filterModels(query);
    dropdown.innerHTML = '';

    if (filteredModels.length === 0) {
        dropdown.innerHTML = '<div class="loading-indicator">No models found</div>';
    } else {
        filteredModels.forEach(model => {
            const option = createModelOption(model);
            option.addEventListener('click', () => selectModel(inputId, dropdownId, model));
            dropdown.appendChild(option);
        });
    }

    dropdown.style.display = 'block';
}

// Hide dropdown
function hideModelDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    if (dropdown) {
        dropdown.style.display = 'none';
    }
    const loading = document.getElementById(dropdownId.replace('-dropdown', '-loading'));
    if (loading) {
        loading.style.display = 'none';
    }
}

// Select model for single selection inputs
function selectModel(inputId, dropdownId, model) {
    const input = document.getElementById(inputId);
    input.value = model.id;
    hideModelDropdown(dropdownId);

    // Special handling for fallback models and available models
    if (inputId === 'setting-fallback-models') {
        addFallbackModel(model);
    } else if (inputId === 'setting-available-models') {
        addAvailableModel(model);
    }
}

// Add model to fallback models list
function addFallbackModel(model) {
    if (!selectedFallbackModels.find(m => m.id === model.id)) {
        selectedFallbackModels.push(model);
        updateFallbackModelsDisplay();
    }

    // Clear the input
    document.getElementById('setting-fallback-models').value = '';
    hideModelDropdown('fallback-models-dropdown');
}

// Remove model from fallback models list
function removeFallbackModel(modelId) {
    selectedFallbackModels = selectedFallbackModels.filter(m => m.id !== modelId);
    updateFallbackModelsDisplay();
}

// Update fallback models display
function updateFallbackModelsDisplay() {
    const container = document.getElementById('selected-fallback-models');
    if (!container) {
        return;
    }
    container.innerHTML = '';

    selectedFallbackModels.forEach(model => {
        const tag = document.createElement('div');
        tag.className = 'selected-model-tag';
        tag.innerHTML = `
            <span>${model.name}</span>
            <button class="remove-btn" onclick="removeFallbackModel('${model.id}')">&times;</button>
        `;
        container.appendChild(tag);
    });
}

// Add model to available models list
function addAvailableModel(model) {
    if (!selectedAvailableModels.find(m => m.id === model.id)) {
        selectedAvailableModels.push(model);
        updateAvailableModelsDisplay();
        populateAgentDropdown();
    }

    // Clear the input
    document.getElementById('setting-available-models').value = '';
    hideModelDropdown('available-models-dropdown');
}

// Remove model from available models list
function removeAvailableModel(modelId) {
    selectedAvailableModels = selectedAvailableModels.filter(m => m.id !== modelId);
    updateAvailableModelsDisplay();
    populateAgentDropdown();
}

// Update available models display
function updateAvailableModelsDisplay() {
    const container = document.getElementById('selected-available-models');
    if (!container) {
        return;
    }
    container.innerHTML = '';

    selectedAvailableModels.forEach(model => {
        const tag = document.createElement('div');
        tag.className = 'selected-model-tag';
        tag.innerHTML = `
            <span>${model.name}</span>
            <button class="remove-btn" onclick="removeAvailableModel('${model.id}')">&times;</button>
        `;
        container.appendChild(tag);
    });
}

// Populate agent dropdown with available models
function populateAgentDropdown() {
    const agentSelect = document.getElementById('agent-model');
    if (!agentSelect) return;

    const currentValue = agentSelect.value;
    agentSelect.innerHTML = '';

    if (selectedAvailableModels.length === 0) {
        agentSelect.innerHTML = '<option value="" disabled>No models configured - check settings</option>';
        agentConfig.model = '';
        return;
    }

    // Add regular models
    selectedAvailableModels.forEach(model => {
        const option = document.createElement('option');
        option.value = model.id;
        option.textContent = model.name || model.id;
        agentSelect.appendChild(option);
    });

    // Add speed mode option
    const speedModeOption = document.createElement('option');
    const speedModel = localStorage.getItem('dashboard-speed-model') || agentConfig.speedModeModel || 'openai/gpt-4o-mini';
    speedModeOption.value = `speed:${speedModel}`;
    speedModeOption.textContent = `⚡ Speed Mode (${getModelDisplayName(speedModel)})`;
    agentSelect.appendChild(speedModeOption);

    // Restore previous selection or set default
    if (currentValue && [...agentSelect.options].some(opt => opt.value === currentValue)) {
        agentSelect.value = currentValue;
    } else if (selectedAvailableModels.length > 0) {
        agentSelect.value = selectedAvailableModels[0].id;
    }

    // Update agent config
    updateAgentModel();
}

// Get model display name helper
function getModelDisplayName(modelId) {
    const model = openRouterModels.find(m => m.id === modelId);
    return model ? model.name : modelId;
}

// Update agent model selection (handles speed mode)
function updateAgentModel() {
    const agentSelect = document.getElementById('agent-model');
    if (!agentSelect) return;

    const selectedValue = agentSelect.value;
    if (!selectedValue) {
        return;
    }

    if (selectedValue.startsWith('speed:')) {
        // Speed mode selected
        const speedModel = selectedValue.replace('speed:', '');
        agentConfig.model = speedModel;
        console.log('Speed mode enabled with model:', speedModel);
    } else {
        // Regular model selected
        agentConfig.model = selectedValue;
        console.log('Agent model updated to:', selectedValue);
    }
}

// Setup dropdown functionality
function setupModelDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Show dropdown on focus
    input.addEventListener('focus', () => {
        showModelDropdown(inputId, dropdownId, input.value);
    });

    // Filter on input
    input.addEventListener('input', (e) => {
        showModelDropdown(inputId, dropdownId, e.target.value);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input || !dropdown) {
            return;
        }
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideModelDropdown(dropdownId);
        }
    });
}

// Setup dropdown functionality
function setupModelDropdown(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);

    if (!input || !dropdown) return;

    // Show dropdown on focus
    input.addEventListener('focus', () => {
        showModelDropdown(inputId, dropdownId, input.value);
    });

    // Filter on input
    input.addEventListener('input', (e) => {
        showModelDropdown(inputId, dropdownId, e.target.value);
    });

    // Hide dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            hideModelDropdown(dropdownId);
        }
    });
}

// Main settings functionality
document.addEventListener('DOMContentLoaded', function () {
    const settingsBtn = document.getElementById('settings-btn');
    const settingsModal = document.getElementById('settings-modal');
    const settingsClose = document.getElementById('settings-close');
    const settingsSave = document.getElementById('settings-save');
    const settingsCancel = document.getElementById('settings-cancel');

    // Setup dropdowns
    setupModelDropdown('setting-speed-model', 'speed-model-dropdown');
    setupModelDropdown('setting-analysis-model', 'analysis-model-dropdown');
    setupModelDropdown('setting-fallback-models', 'fallback-models-dropdown');
    setupModelDropdown('setting-available-models', 'available-models-dropdown');

    const storedExperimentalMode = getStoredExperimentalMode();
    applyExperimentalMode(storedExperimentalMode === null ? true : storedExperimentalMode);

    const hypeRefreshButton = document.getElementById('hype-refresh');
    if (hypeRefreshButton) {
        hypeRefreshButton.addEventListener('click', async () => {
            hypeRefreshButton.disabled = true;
            try {
                await loadHypeData(true);
            } catch (error) {
                console.error('Failed to refresh hype feed:', error);
            } finally {
                hypeRefreshButton.disabled = false;
            }
        });
    }

    const blogRefreshButton = document.getElementById('blog-refresh');
    if (blogRefreshButton) {
        blogRefreshButton.addEventListener('click', async () => {
            blogRefreshButton.disabled = true;
            try {
                await loadBlogPosts(true);
            } catch (error) {
                console.error('Failed to refresh blog posts:', error);
            } finally {
                blogRefreshButton.disabled = false;
            }
        });
    }

    const latestRefreshButton = document.getElementById('latest-refresh');
    if (latestRefreshButton) {
        latestRefreshButton.addEventListener('click', async () => {
            latestRefreshButton.disabled = true;
            try {
                await loadLatestFeed(true);
            } catch (error) {
                console.error('Failed to refresh latest feed:', error);
            } finally {
                latestRefreshButton.disabled = false;
            }
        });
    }

    ensureLatestControlListeners();

    const monitorRefreshButton = document.getElementById('monitor-refresh');
    if (monitorRefreshButton) {
        monitorRefreshButton.addEventListener('click', async () => {
            monitorRefreshButton.disabled = true;
            try {
                await loadMonitorFeed(true);
            } catch (error) {
                console.error('Failed to refresh monitor feed:', error);
            } finally {
                monitorRefreshButton.disabled = false;
            }
        });
    }

    const blogSortSelect = document.getElementById('blog-sort');
    if (blogSortSelect) {
        if (blogSortSelect.value) {
            blogSortMode = blogSortSelect.value;
        }
        blogSortSelect.addEventListener('change', () => {
            blogSortMode = blogSortSelect.value;
            if (cachedData.blog) {
                displayBlogPosts(cachedData.blog);
            }
        });
    }

    // Initialize agent dropdown on page load
    setTimeout(() => {
        fetchOpenRouterModels().then(() => {
            loadSavedSettings();
        });
    }, 100);

    if (settingsBtn && settingsModal) {
        // Open settings modal
        settingsBtn.addEventListener('click', function () {
            settingsModal.style.display = 'flex';
            // Pre-fetch models when opening settings
            if (openRouterModels.length === 0) {
                fetchOpenRouterModels();
            }
            refreshOpenRouterKeyField();
            attachOpenRouterKeyHandlers();
        });

        // Close modal handlers
        [settingsClose, settingsCancel].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', function () {
                    settingsModal.style.display = 'none';
                    // Hide any open dropdowns
                    hideModelDropdown('speed-model-dropdown');
                    hideModelDropdown('analysis-model-dropdown');
                    hideModelDropdown('fallback-models-dropdown');
                    hideModelDropdown('available-models-dropdown');
                });
            }
        });

        // Close on overlay click
        settingsModal.addEventListener('click', function (e) {
            if (e.target === settingsModal) {
                settingsModal.style.display = 'none';
                // Hide any open dropdowns
                hideModelDropdown('speed-model-dropdown');
                hideModelDropdown('analysis-model-dropdown');
                hideModelDropdown('fallback-models-dropdown');
                hideModelDropdown('available-models-dropdown');
            }
        });

        // Save settings
        if (settingsSave) {
            settingsSave.addEventListener('click', function () {
                // Save settings to localStorage
                const openRouterInput = document.getElementById('setting-openrouter-key');
                if (openRouterInput) {
                    const enteredKey = openRouterInput.value.trim();
                    const hadStored = openRouterInput.dataset.hasStoredKey === 'true';
                    if (enteredKey) {
                        setUserOpenRouterKey(enteredKey);
                        openRouterInput.value = '';
                        openRouterInput.placeholder = 'Key stored locally';
                        openRouterInput.dataset.hasStoredKey = 'true';
                    } else if (!hadStored) {
                        setUserOpenRouterKey('');
                        openRouterInput.placeholder = 'sk-or-...';
                        openRouterInput.dataset.hasStoredKey = 'false';
                    }
                }

                const speedModel = document.getElementById('setting-speed-model').value;
                const analysisModel = document.getElementById('setting-analysis-model').value;
                const fallbackModelsString = selectedFallbackModels.map(m => m.id).join(', ');
                const availableModelsString = selectedAvailableModels.map(m => m.id).join(', ');
                const experimentalToggle = document.getElementById('setting-experimental-mode');

                if (speedModel) localStorage.setItem('dashboard-speed-model', speedModel);
                if (analysisModel) localStorage.setItem('dashboard-analysis-model', analysisModel);
                if (fallbackModelsString) localStorage.setItem('dashboard-fallback-models', fallbackModelsString);
                if (availableModelsString) localStorage.setItem('dashboard-available-models', availableModelsString);

                if (experimentalToggle) {
                    const enabled = experimentalToggle.checked;
                    persistExperimentalMode(enabled);
                    applyExperimentalMode(enabled);
                }

                // Update agent dropdown with new available models
                populateAgentDropdown();

                settingsModal.style.display = 'none';
                refreshOpenRouterKeyField();

                // Show success message
                const originalText = settingsSave.textContent;
                settingsSave.textContent = 'Settings Saved!';
                settingsSave.style.background = '#10b981';
                setTimeout(() => {
                    settingsSave.textContent = originalText;
                    settingsSave.style.background = '';
                }, 2000);
            });
        }
    }
});

// Load saved settings
function loadSavedSettings() {
    const savedSpeedModel = localStorage.getItem('dashboard-speed-model');
    const savedAnalysisModel = localStorage.getItem('dashboard-analysis-model');
    const savedFallbackModels = localStorage.getItem('dashboard-fallback-models');
    const savedAvailableModels = localStorage.getItem('dashboard-available-models');

    const speedInput = document.getElementById('setting-speed-model');
    const analysisInput = document.getElementById('setting-analysis-model');

    if (speedInput) {
        const configAgent = (modelConfig && modelConfig.agent) || {};
        const defaultSpeed = savedSpeedModel || agentConfig.speedModeModel || configAgent.speedModeModel || '';
        speedInput.value = defaultSpeed;
    }

    if (analysisInput) {
        const configAnalysis = (modelConfig && modelConfig.analysis) || {};
        const defaultAnalysis = savedAnalysisModel || configAnalysis.defaultModel || '';
        analysisInput.value = defaultAnalysis;
    }

    const catalogById = new Map((openRouterModels || []).map(model => [model.id, model]));
    const agentDefaults = (modelConfig && modelConfig.agent) || {};

    const buildModelEntry = (id) => {
        const catalogModel = catalogById.get(id);
        if (catalogModel) {
            return {
                id: catalogModel.id,
                name: catalogModel.name || catalogModel.id,
                vendor: catalogModel.vendor || ''
            };
        }
        return { id, name: id };
    };

    const availableIds = savedAvailableModels
        ? savedAvailableModels.split(',').map(id => id.trim()).filter(Boolean)
        : (selectedAvailableModels.length ? selectedAvailableModels.map(model => model.id) : (agentDefaults.availableModels || []));

    if (availableIds.length) {
        selectedAvailableModels = availableIds.map(buildModelEntry);
        updateAvailableModelsDisplay();
        populateAgentDropdown();
    }

    const fallbackIds = savedFallbackModels
        ? savedFallbackModels.split(',').map(id => id.trim()).filter(Boolean)
        : (selectedFallbackModels.length ? selectedFallbackModels.map(model => model.id) : (agentDefaults.fallbackModels || []));

    if (fallbackIds.length) {
        selectedFallbackModels = fallbackIds.map(buildModelEntry);
        updateFallbackModelsDisplay();
    }

    const experimentalToggle = document.getElementById('setting-experimental-mode');
    if (experimentalToggle) {
        const storedMode = getStoredExperimentalMode();
        const preferredMode = storedMode === null ? true : storedMode;
        experimentalToggle.checked = preferredMode;
        if (experimentalModeEnabled !== preferredMode) {
            applyExperimentalMode(preferredMode);
        }
    }

    refreshOpenRouterKeyField();
    attachOpenRouterKeyHandlers();
}

// Make functions available globally
window.removeFallbackModel = removeFallbackModel;
window.removeAvailableModel = removeAvailableModel;
window.clearChatHistory = clearChatHistory;
window.updateAgentModel = updateAgentModel;
window.loadMonitorFeed = loadMonitorFeed;

// ============================================
// Chart Comparison Functions
// ============================================

// Store models selected for comparison
let chartComparisonModels = [];

const CHART_AVAILABLE_METRICS = [
    { id: 'quality', label: 'Quality Score' },
    { id: 'speed', label: 'Speed' },
    { id: 'price', label: 'Price' },
    { id: 'latency', label: 'Latency' },
    { id: 'context_length', label: 'Context Length' }
];

/**
 * Add a model to the comparison list
 * @param {Object} model - Model data object
 */
function addToComparison(model) {
    if (!model) return;

    const modelId = model.id || model.name || model.model;
    if (!modelId) return;

    // Check if already in list
    if (chartComparisonModels.some(m => (m.id || m.name) === modelId)) {
        showToast('Model already in comparison', 'warning');
        return;
    }

    // Limit to 8 models
    if (chartComparisonModels.length >= 8) {
        showToast('Maximum 8 models for comparison', 'warning');
        return;
    }

    chartComparisonModels.push(model);
    showToast(`Added ${model.name || modelId} to comparison (${chartComparisonModels.length}/8)`, 'info');
    updateCompareButtonStates();
}

/**
 * Remove a model from comparison
 * @param {string} modelId - Model identifier
 */
function removeFromComparison(modelId) {
    chartComparisonModels = chartComparisonModels.filter(m => (m.id || m.name) !== modelId);
    updateCompareButtonStates();
}

/**
 * Clear all models from comparison
 */
function clearComparison() {
    chartComparisonModels = [];
    updateCompareButtonStates();
}

/**
 * Update compare button states across the UI
 */
function updateCompareButtonStates() {
    // Update any compare buttons in cards
    document.querySelectorAll('[data-compare-id]').forEach(btn => {
        const modelId = btn.dataset.compareId;
        const isInComparison = chartComparisonModels.some(m => (m.id || m.name) === modelId);
        btn.classList.toggle('active', isInComparison);
        btn.textContent = isInComparison ? '✓ Compare' : 'Compare';
    });

    // Update floating compare button if exists
    updateFloatingCompareButton();
}

/**
 * Create or update the floating compare button
 */
function updateFloatingCompareButton() {
    let floatBtn = document.getElementById('floating-compare-btn');

    if (chartComparisonModels.length >= 2) {
        if (!floatBtn) {
            floatBtn = document.createElement('button');
            floatBtn.id = 'floating-compare-btn';
            floatBtn.className = 'floating-compare-btn';
            floatBtn.onclick = () => openChartModal();
            document.body.appendChild(floatBtn);

            // Add styles if not present
            if (!document.getElementById('chart-float-styles')) {
                const style = document.createElement('style');
                style.id = 'chart-float-styles';
                style.textContent = `
                    .floating-compare-btn {
                        position: fixed;
                        bottom: 24px;
                        right: 24px;
                        background: #111827;
                        color: white;
                        border: none;
                        border-radius: 50px;
                        padding: 14px 24px;
                        font-weight: 600;
                        cursor: pointer;
                        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
                        z-index: 1000;
                        transition: transform 0.2s, box-shadow 0.2s;
                    }
                    .floating-compare-btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 6px 24px rgba(0,0,0,0.3);
                    }
                `;
                document.head.appendChild(style);
            }
        }
        floatBtn.textContent = `Compare ${chartComparisonModels.length} Models`;
        floatBtn.style.display = 'block';
    } else if (floatBtn) {
        floatBtn.style.display = 'none';
    }
}

/**
 * Open the chart comparison modal
 */
function openChartModal() {
    if (chartComparisonModels.length < 2) {
        showToast('Select at least 2 models to compare', 'warning');
        return;
    }

    const modal = document.getElementById('chart-modal');
    if (!modal) return;

    modal.style.display = 'flex';

    // Initialize metrics toggles
    const metricsContainer = document.getElementById('chart-metrics-container');
    if (metricsContainer) {
        metricsContainer.innerHTML = CHART_AVAILABLE_METRICS.map(m => `
            <label style="display:inline-flex;align-items:center;gap:4px;cursor:pointer;padding:6px 10px;background:#f3f4f6;border-radius:6px;">
                <input type="checkbox" class="chart-metric-toggle" value="${m.id}" ${['quality', 'speed', 'price'].includes(m.id) ? 'checked' : ''}>
                ${m.label}
            </label>
        `).join('');

        // Add event listeners
        metricsContainer.querySelectorAll('.chart-metric-toggle').forEach(cb => {
            cb.addEventListener('change', () => renderChart());
        });
    }

    // Add chart type listener
    const typeSelect = document.getElementById('chart-type-select');
    if (typeSelect && !typeSelect.dataset.listenerAttached) {
        typeSelect.addEventListener('change', () => renderChart());
        typeSelect.dataset.listenerAttached = 'true';
    }

    // Render initial chart
    renderChart();

    // Update models list
    const modelsList = document.getElementById('chart-models-list');
    if (modelsList) {
        modelsList.innerHTML = `Comparing: ${chartComparisonModels.map(m => m.name || m.id).join(', ')}`;
    }
}

/**
 * Close the chart modal
 */
function closeChartModal() {
    const modal = document.getElementById('chart-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Get selected metrics from UI
 */
function getSelectedMetrics() {
    const checked = document.querySelectorAll('.chart-metric-toggle:checked');
    return Array.from(checked).map(cb => cb.value);
}

/**
 * Render the chart using the API
 */
async function renderChart() {
    const container = document.getElementById('chart-container');
    if (!container) return;

    container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:400px;color:#6b7280;">Loading chart...</div>';

    const chartType = document.getElementById('chart-type-select')?.value || 'bar';
    const metrics = getSelectedMetrics();

    if (metrics.length === 0) {
        container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:400px;color:#6b7280;">Select at least one metric</div>';
        return;
    }

    try {
        const response = await fetch('/api/charts/model-comparison', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                models: chartComparisonModels,
                chart_type: chartType,
                metrics: metrics,
                title: `Model Comparison (${chartComparisonModels.length} models)`
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();

        if (result.error) {
            throw new Error(result.error);
        }

        // Render with Plotly
        if (typeof Plotly !== 'undefined' && result.plotly_data && result.plotly_layout) {
            container.innerHTML = '';
            Plotly.newPlot(container, result.plotly_data, result.plotly_layout, {
                responsive: true,
                displayModeBar: true,
                displaylogo: false
            });
        } else {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:400px;color:#ef4444;">Plotly not loaded or invalid data</div>';
        }
    } catch (error) {
        console.error('Chart render error:', error);
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:400px;color:#ef4444;">Error: ${error.message}</div>`;
    }
}

// Setup chart modal close handlers
document.addEventListener('DOMContentLoaded', () => {
    const chartClose = document.getElementById('chart-close');
    if (chartClose) {
        chartClose.addEventListener('click', closeChartModal);
    }

    const chartModal = document.getElementById('chart-modal');
    if (chartModal) {
        chartModal.addEventListener('click', (e) => {
            if (e.target === chartModal) {
                closeChartModal();
            }
        });
    }
});

// Export chart functions globally
window.addToComparison = addToComparison;
window.removeFromComparison = removeFromComparison;
window.clearComparison = clearComparison;
window.openChartModal = openChartModal;
window.closeChartModal = closeChartModal;
