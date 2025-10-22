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
    hype: null
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
    hype: null
};

// AI Agent configuration
let agentConfig = {
    model: 'z-ai/glm-4.5',
    availableModels: [], // Will be populated from settings
    conversationHistory: [] // For context memory
};

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

let modelConfig = null;
let settingsInitialized = false;
let experimentalModeEnabled = false;

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
        return localStorage.getItem(EXPERIMENTAL_MODE_STORAGE_KEY) === 'true';
    } catch (error) {
        console.warn('Unable to read experimental mode preference:', error);
        return false;
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
document.addEventListener('DOMContentLoaded', async function() {
    console.info('The quick brown fox jumped over the lazy dogs – experimental canary build active.');
    await preloadModelConfig();
    setupNavigation();
    initializeTheme();
    applyAgentDefaults();
    setupOpenRouterControls();
    populateAgentDropdown();
    loadLLMData(); // Load LLM data by default
});

// Theme management
function initializeTheme() {
    const stored = localStorage.getItem('theme') || 'light';
    const initialTheme = THEME_SEQUENCE.includes(stored) ? stored : 'light';
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
    switch(section) {
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
}

// Create LLM card
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
        
        <div class="evaluations">
            <h4>Evaluations</h4>
            ${Object.entries(evaluations).map(([key, value]) => `
                <div class="evaluation-item">
                    <span>${formatEvaluationKey(key)}</span>
                    <span>${typeof value === 'number' ? value.toFixed(3) : value}</span>
                </div>
            `).join('')}
        </div>
        
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
        
        displayMediaData(data.data, 'image-to-video');
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Image-to-Video data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Load Fal.ai Models data
async function loadFalModelsData() {
    const loadingElement = document.getElementById('fal-models-loading');
    const errorElement = document.getElementById('fal-models-error');
    const dataElement = document.getElementById('fal-models-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/fal-models', null);
        cachedData.falModels = data;
        rawData.falModels = data;
        
        filterFalModelsData();
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Fal.ai models data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

// Load Replicate Models data
async function loadReplicateModelsData() {
    const loadingElement = document.getElementById('replicate-models-loading');
    const errorElement = document.getElementById('replicate-models-error');
    const dataElement = document.getElementById('replicate-models-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        const data = await makeAPICall('/api/replicate-models', null);
        cachedData.replicateModels = data;
        rawData.replicateModels = data;
        
        filterReplicateModelsData();
        loadingElement.style.display = 'none';
    } catch (error) {
        loadingElement.style.display = 'none';
        errorElement.textContent = `Failed to load Replicate models data: ${error.message}`;
        errorElement.style.display = 'block';
    }
}

async function fetchAndCacheOpenRouterModels() {
    const data = await makeAPICall('/api/openrouter-models', null);
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
async function loadOpenRouterModelsData() {
    const loadingElement = document.getElementById('openrouter-models-loading');
    const errorElement = document.getElementById('openrouter-models-error');
    const dataElement = document.getElementById('openrouter-models-data');

    try {
        loadingElement.style.display = 'flex';
        errorElement.style.display = 'none';
        dataElement.innerHTML = '';

        await fetchAndCacheOpenRouterModels();
        populateOpenRouterVendorFilter(openRouterModels);
        filterOpenRouterModelsData();
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
    displayOpenRouterModelsData(filtered);

    const resultsInfo = document.getElementById('openrouter-models-results-info');
    if (resultsInfo) {
        resultsInfo.textContent = `Showing ${filtered.length} of ${rawData.openRouterModels.length} models`;
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
    models.forEach(model => {
        container.appendChild(createOpenRouterCard(model));
    });
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

        const data = await makeAPICall('/api/hype', null);
        cachedData.hype = data;
        rawData.hype = Array.isArray(data?.items) ? data.items : [];

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

    items.forEach((item, index) => {
        container.appendChild(createHypeCard(item, index, fetchedAt));
    });

    if (resultsInfo) {
        const summary = [`${items.length} trending projects`];
        const relativeFetched = formatRelativeTime(fetchedAt);
        if (relativeFetched) {
            summary.push(`fetched ${relativeFetched}`);
        }
        resultsInfo.textContent = summary.join(' · ');
        resultsInfo.style.display = 'block';
    }
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
            <div class="card-rank">#${index + 1}</div>
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

    models.forEach(model => {
        const modelCard = createMediaCard(model, type);
        container.appendChild(modelCard);
    });
}

// Create media card
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
        
        ${model.categories ? `
            <div class="evaluations">
                <h4>Category Breakdown</h4>
                ${model.categories.map(category => `
                    <div class="evaluation-item">
                        <span>${category.style_category || category.subject_matter_category || 'Unknown'}</span>
                        <span>ELO: ${category.elo}</span>
                    </div>
                `).join('')}
            </div>
        ` : ''}
        
        <div class="click-hint">💡 Click to explore full model details</div>
    `;
    
    return card;
}

// AI Agent functionality with streaming support and conversation context
async function sendMessage() {
    const userInput = document.getElementById('user-input');
    const chatMessages = document.getElementById('chat-messages');
    const message = userInput.value.trim();
    
    if (!message) return;
    
    // Add user message to chat
    const userMessage = document.createElement('div');
    userMessage.className = 'message user';
    userMessage.textContent = message;
    chatMessages.appendChild(userMessage);
    
    // Add to conversation history for context
    agentConfig.conversationHistory.push({
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
    });
    
    // Keep conversation history to last 10 exchanges to avoid token limits
    if (agentConfig.conversationHistory.length > 20) {
        agentConfig.conversationHistory = agentConfig.conversationHistory.slice(-20);
    }
    
    // Add initial loading indicator
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'message ai loading-initial';
    loadingMessage.innerHTML = `
        <div class="initial-loading">
            <div class="loading-spinner"></div>
            <span class="loading-text">Fetching data...</span>
        </div>
    `;
    chatMessages.appendChild(loadingMessage);
    
    // Clear input
    userInput.value = '';
    
    // Scroll to bottom after user message
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    try {
        // Call AI agent with streaming and context
        const response = await callGLMAgent(message);
        
        // Add AI response to conversation history
        if (response && response.response) {
            agentConfig.conversationHistory.push({
                role: 'assistant',
                content: response.response,
                timestamp: new Date().toISOString()
            });
        }
        
        // Remove streaming class from the final message
        const streamingMessage = chatMessages.querySelector('.message.ai.streaming');
        if (streamingMessage) {
            streamingMessage.classList.remove('streaming');
        }
        
        // Ensure final scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
    } catch (error) {
        clearAgentLoadingState();

        const errorMessage = document.createElement('div');
        errorMessage.className = 'message ai error';
        errorMessage.innerHTML = `<div class="error-content">❌ <strong>Error:</strong> ${error.message}</div>`;
        chatMessages.appendChild(errorMessage);

        chatMessages.scrollTop = chatMessages.scrollHeight;

        if (!error || !error.__toastHandled) {
            const message = (error && error.message) ? error.message : 'The AI agent request failed.';
            showToast(message, 'error');
        }
    }
}

// Clear chat history function
function clearChatHistory() {
    const chatMessages = document.getElementById('chat-messages');
    chatMessages.innerHTML = '';
    agentConfig.conversationHistory = [];
    
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

// Call AI agent with streaming support
async function callGLMAgent(userMessage) {
    return new Promise((resolve, reject) => {
        handleStreamingWithFetch(userMessage, resolve, reject);
    });
}

// Fallback streaming using fetch
async function handleStreamingWithFetch(userMessage, resolve, reject) {
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
                conversationHistory: agentConfig.conversationHistory
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
                            
                            switch(parsed.type) {
                                case 'traces':
                                    traces = parsed.traces;
                                    break;
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
        handleNonStreamingFallback(userMessage, resolve, reject);
    }
}

// Fallback to non-streaming
async function handleNonStreamingFallback(userMessage, resolve, reject) {
    try {
        const response = await makeAPICall('/api/ai-agent', null, {
            method: 'POST',
            headers: withUserOpenRouterKey({}),
            body: JSON.stringify({
                message: userMessage,
                stream: false,
                model: agentConfig.model,
                conversationHistory: agentConfig.conversationHistory
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

        if (response && typeof response.response === 'string') {
            resolve({
                ...response,
                response: fixEncodingArtifacts(response.response)
            });
        } else {
            resolve(response);
        }
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
    displayLLMData(filteredData);
    
    // Update results info
    const resultsInfo = document.getElementById('llms-results-info');
    resultsInfo.textContent = `Showing ${filteredData.length} of ${rawData.llms.length} models`;
}

function sortLLMData(data, sortBy) {
    const sortedData = [...data];
    
    switch(sortBy) {
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
    
    switch(sortBy) {
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
    
    // Display results
    displayFalModelsData(filteredData);
    
    // Update results info
    const resultsInfo = document.getElementById('fal-models-results-info');
    resultsInfo.textContent = `Showing ${filteredData.length} of ${rawData.falModels.length} models`;
}

function sortFalModelsData(data, sortBy) {
    const sortedData = [...data];
    
    switch(sortBy) {
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

    models.forEach(model => {
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
    
    return card;
}

// Display Replicate models data
function displayReplicateModelsData(models) {
    const container = document.getElementById('replicate-models-data');
    container.innerHTML = '';

    models.forEach(model => {
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
    
    // Display results
    displayReplicateModelsData(filteredData);
    
    // Update results info
    const resultsInfo = document.getElementById('replicate-models-results-info');
    resultsInfo.textContent = `Showing ${filteredData.length} of ${rawData.replicateModels.length} models`;
}

function sortReplicateModelsData(data, sortBy) {
    const sortedData = [...data];
    
    switch(sortBy) {
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
document.addEventListener('DOMContentLoaded', function() {
    const userInput = document.getElementById('user-input');
    if (userInput) {
        userInput.addEventListener('keypress', function(e) {
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
document.addEventListener('DOMContentLoaded', function() {
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

    applyExperimentalMode(getStoredExperimentalMode());

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
    
    // Initialize agent dropdown on page load
    setTimeout(() => {
        fetchOpenRouterModels().then(() => {
            loadSavedSettings();
        });
    }, 100);
    
    if (settingsBtn && settingsModal) {
        // Open settings modal
        settingsBtn.addEventListener('click', function() {
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
                btn.addEventListener('click', function() {
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
        settingsModal.addEventListener('click', function(e) {
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
            settingsSave.addEventListener('click', function() {
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
        experimentalToggle.checked = storedMode;
        if (experimentalModeEnabled !== storedMode) {
            applyExperimentalMode(storedMode);
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
