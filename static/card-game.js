const stages = [
    {
        id: "ingest",
        name: "Ingest",
        hint: "Incoming requests, user actions, external feeds",
    },
    {
        id: "orchestrate",
        name: "Orchestrate",
        hint: "Routing, deciding which APIs to call",
    },
    {
        id: "transform",
        name: "Transform",
        hint: "Normalize, enrich, and cache data",
    },
    {
        id: "store",
        name: "Store & Cache",
        hint: "Local cache, disk, and saved responses",
    },
    {
        id: "render",
        name: "Render",
        hint: "Templates, UI, and user-facing views",
    },
];

const deck = [
    {
        id: "server-router",
        title: "Flask Router",
        type: "Ingress",
        stage: "ingest",
        summary: "Routes `/` and API endpoints, turning HTTP into app actions.",
        fileRef: "server.py",
    },
    {
        id: "api-llms",
        title: "LLM API Handler",
        type: "API",
        stage: "orchestrate",
        summary: "Fetches model data, handles cache busting, and returns JSON.",
        fileRef: "server.py:get_llms",
    },
    {
        id: "api-media",
        title: "Media Model Handler",
        type: "API",
        stage: "orchestrate",
        summary: "Fetches media model stats across providers and merges payloads.",
        fileRef: "server.py:get_text_to_image",
    },
    {
        id: "cache-layer",
        title: "Cache Guard",
        type: "Storage",
        stage: "store",
        summary: "Keeps results fresh while avoiding redundant external calls.",
        fileRef: "server.py:cache",
    },
    {
        id: "refresh-config",
        title: "Model Config Refresh",
        type: "Transform",
        stage: "transform",
        summary: "Loads configuration before responses are served.",
        fileRef: "server.py:refresh_model_config",
    },
    {
        id: "template-index",
        title: "Index Template",
        type: "UI",
        stage: "render",
        summary: "Defines the dashboard layout and sections.",
        fileRef: "templates/index.html",
    },
    {
        id: "template-partials",
        title: "Header + Navigation",
        type: "UI",
        stage: "render",
        summary: "Reusable UI shell with search, theme, and navigation.",
        fileRef: "templates/partials",
    },
    {
        id: "styles-theme",
        title: "Theme Variables",
        type: "UI",
        stage: "render",
        summary: "CSS variables define light/dark palettes and accents.",
        fileRef: "static/styles.css",
    },
    {
        id: "script-data",
        title: "Client Data Loader",
        type: "UI",
        stage: "render",
        summary: "Fetches API data and hydrates the dashboard cards.",
        fileRef: "static/script.js",
    },
    {
        id: "config-data",
        title: "Model Config",
        type: "Data",
        stage: "store",
        summary: "Defines provider endpoints, keys, and display metadata.",
        fileRef: "config/",
    },
    {
        id: "data-cache",
        title: "Data Cache Files",
        type: "Storage",
        stage: "store",
        summary: "Persisted JSON snapshots for recent API pulls.",
        fileRef: "data/",
    },
    {
        id: "runtime-env",
        title: "Runtime Env",
        type: "Transform",
        stage: "transform",
        summary: "Reads tokens and toggles from env to tune behavior.",
        fileRef: "config/",
    },
    {
        id: "frontend-actions",
        title: "User Interaction",
        type: "Ingress",
        stage: "ingest",
        summary: "Search, filter, pin, and refresh buttons feed new requests.",
        fileRef: "static/script.js",
    },
    {
        id: "response-shaper",
        title: "Response Shaper",
        type: "Transform",
        stage: "transform",
        summary: "Normalizes payloads before JSON reaches the client.",
        fileRef: "server.py",
    },
    {
        id: "external-apis",
        title: "External APIs",
        type: "Ingress",
        stage: "ingest",
        summary: "Artificial Analysis, OpenRouter, fal.ai, Replicate feeds.",
        fileRef: "server.py",
    },
    {
        id: "export-tools",
        title: "Export Tools",
        type: "UI",
        stage: "render",
        summary: "Allows CSV/JSON export for shareable snapshots.",
        fileRef: "static/script.js",
    },
    {
        id: "session-state",
        title: "Session State",
        type: "Storage",
        stage: "store",
        summary: "Keeps user pins and preferences available.",
        fileRef: "server.py:session",
    },
    {
        id: "streaming",
        title: "Streaming Agent",
        type: "API",
        stage: "orchestrate",
        summary: "Experimental endpoints that stream model responses.",
        fileRef: "server.py:/experimental-agent",
    },
    {
        id: "docs",
        title: "Docs Page",
        type: "UI",
        stage: "render",
        summary: "Static HTML explaining API endpoints and usage.",
        fileRef: "docs.html",
    },
    {
        id: "about",
        title: "About Page",
        type: "UI",
        stage: "render",
        summary: "Static HTML for the product story and context.",
        fileRef: "about.html",
    },
    {
        id: "log-monitor",
        title: "Monitoring Logs",
        type: "Storage",
        stage: "store",
        summary: "Log streams used to populate monitoring cards.",
        fileRef: "logs/",
    },
    {
        id: "automation",
        title: "Scripts",
        type: "Transform",
        stage: "transform",
        summary: "Scheduled jobs that keep data updated.",
        fileRef: "scripts/",
    },
];

let drawPile = [];
let discardPile = [];
let hand = [];
let selectedCardId = null;
let tokens = 1;
let flowPosition = 0;

const deckCount = document.getElementById("deck-count");
const discardCount = document.getElementById("discard-count");
const tokenCount = document.getElementById("token-count");
const handGrid = document.getElementById("hand-grid");
const board = document.getElementById("flow-board");
const inspector = document.getElementById("card-inspector");
const flowLog = document.getElementById("flow-log");

function shuffle(list) {
    const copy = [...list];
    for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
}

function resetGame() {
    drawPile = shuffle(deck);
    discardPile = [];
    hand = [];
    selectedCardId = null;
    tokens = 1;
    flowPosition = 0;
    logFlow("Game reset. Draw cards to begin.");
    updateCounts();
    renderBoard();
    renderHand();
    updateInspector();
}

function updateCounts() {
    deckCount.textContent = drawPile.length;
    discardCount.textContent = discardPile.length;
    tokenCount.textContent = tokens;
}

function drawCard() {
    if (!drawPile.length) {
        drawPile = shuffle(discardPile);
        discardPile = [];
    }
    if (!drawPile.length) {
        logFlow("No cards left to draw.");
        return;
    }
    const card = drawPile.pop();
    hand.push(card);
    logFlow(`Drew ${card.title}.`);
    updateCounts();
    renderHand();
}

function playSelectedCard() {
    if (!selectedCardId) {
        logFlow("Select a card to play it.");
        return;
    }
    const cardIndex = hand.findIndex((card) => card.id === selectedCardId);
    if (cardIndex === -1) {
        return;
    }
    const card = hand[cardIndex];
    const stageSlot = document.querySelector(`[data-stage='${card.stage}'] .flow-slot`);
    if (!stageSlot) {
        return;
    }
    hand.splice(cardIndex, 1);
    stageSlot.appendChild(renderPlayedCard(card));
    selectedCardId = null;
    logFlow(`Played ${card.title} into ${getStageName(card.stage)}.`);
    updateCounts();
    renderHand();
    updateInspector();
}

function renderBoard() {
    board.innerHTML = "";
    stages.forEach((stage, index) => {
        const stageEl = document.createElement("div");
        stageEl.className = "flow-stage";
        stageEl.dataset.stage = stage.id;

        const header = document.createElement("h3");
        header.textContent = `${index + 1}. ${stage.name}`;

        const hint = document.createElement("p");
        hint.className = "section-note";
        hint.textContent = stage.hint;

        const token = document.createElement("div");
        token.className = "flow-token";
        token.innerHTML = flowPosition === index ? "<span></span>Active flow" : "";

        const slot = document.createElement("div");
        slot.className = "flow-slot";

        stageEl.append(header, hint, token, slot);
        board.appendChild(stageEl);
    });
}

function renderPlayedCard(card) {
    const cardEl = document.createElement("div");
    cardEl.className = "card-slot";

    const tag = document.createElement("div");
    tag.className = "card-tag";
    tag.textContent = card.type;

    const title = document.createElement("div");
    title.className = "card-title";
    title.textContent = card.title;

    const body = document.createElement("div");
    body.className = "card-body";
    body.textContent = card.summary;

    const file = document.createElement("div");
    file.className = "card-file";
    file.textContent = card.fileRef;

    cardEl.append(tag, title, body, file);
    return cardEl;
}

function renderHand() {
    handGrid.innerHTML = "";
    if (!hand.length) {
        const empty = document.createElement("div");
        empty.className = "section-note";
        empty.textContent = "No cards in hand. Draw to learn about the codebase.";
        handGrid.appendChild(empty);
        return;
    }
    hand.forEach((card) => {
        const cardEl = document.createElement("div");
        cardEl.className = "card-item";
        if (card.id === selectedCardId) {
            cardEl.classList.add("selected");
        }
        cardEl.addEventListener("click", () => {
            selectedCardId = card.id;
            renderHand();
            updateInspector(card);
        });

        cardEl.innerHTML = `
            <div class="card-tag">${card.type}</div>
            <div class="card-title">${card.title}</div>
            <div class="card-body">${card.summary}</div>
            <div class="card-file">${card.fileRef}</div>
        `;
        handGrid.appendChild(cardEl);
    });
}

function updateInspector(card) {
    inspector.innerHTML = "";
    if (!card) {
        inspector.innerHTML = "<p class='section-note'>Select a card to see how it maps to the codebase.</p>";
        return;
    }
    const title = document.createElement("h3");
    title.textContent = card.title;

    const tag = document.createElement("div");
    tag.className = "card-tag";
    tag.textContent = card.type;

    const summary = document.createElement("p");
    summary.textContent = card.summary;

    const file = document.createElement("div");
    file.className = "card-file";
    file.textContent = `Code reference: ${card.fileRef}`;

    inspector.append(tag, title, summary, file);
}

function getStageName(stageId) {
    const stage = stages.find((item) => item.id === stageId);
    return stage ? stage.name : stageId;
}

function runFlow() {
    const missingStage = stages.find((stage) => {
        const slot = document.querySelector(`[data-stage='${stage.id}'] .flow-slot`);
        return slot && slot.children.length === 0;
    });

    if (missingStage) {
        logFlow(`Flow blocked at ${missingStage.name}. Place at least one card there.`);
        return;
    }

    logFlow("Flow started. Tracking request through the system...");
    flowPosition = 0;
    renderBoard();

    stages.forEach((stage, index) => {
        const stageSlot = document.querySelector(`[data-stage='${stage.id}'] .flow-slot`);
        const firstCard = stageSlot ? stageSlot.querySelector(".card-title") : null;
        const cardName = firstCard ? firstCard.textContent : "Unknown module";
        setTimeout(() => {
            flowPosition = index;
            renderBoard();
            logFlow(`${stage.name}: ${cardName} processed the request.`, stage.hint);
            if (index === stages.length - 1) {
                logFlow("Flow complete. The dashboard UI updates for the user.");
            }
        }, index * 650);
    });
}

function logFlow(message, detail) {
    const entry = document.createElement("div");
    entry.className = "flow-log-entry";
    entry.textContent = message;
    if (detail) {
        const extra = document.createElement("span");
        extra.textContent = detail;
        entry.appendChild(extra);
    }
    flowLog.prepend(entry);
}


document.getElementById("draw-card").addEventListener("click", drawCard);
document.getElementById("play-card").addEventListener("click", playSelectedCard);
document.getElementById("run-flow").addEventListener("click", runFlow);
document.getElementById("reset-game").addEventListener("click", resetGame);

resetGame();
