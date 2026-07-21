const evidenceDeck = [
    {
        id: "route-entry",
        title: "Request Entry",
        type: "Ingress",
        summary: "Flask routes accept dashboard and API requests.",
        fileRef: "server.py",
    },
    {
        id: "aa-api",
        title: "Artificial Analysis API",
        type: "External",
        summary: "Primary source for model benchmarks.",
        fileRef: "server.py:load_artificial_analysis_llms",
    },
    {
        id: "openrouter",
        title: "OpenRouter Calls",
        type: "External",
        summary: "Fallback and agent reasoning for model data.",
        fileRef: "server.py:get_openrouter_headers",
    },
    {
        id: "fal",
        title: "fal.ai Media",
        type: "External",
        summary: "Media model data for image/video sections.",
        fileRef: "server.py:get_fal_models",
    },
    {
        id: "cache",
        title: "Cache Layer",
        type: "Storage",
        summary: "Speeds up responses with in-memory + disk caching.",
        fileRef: "data/",
    },
    {
        id: "templates",
        title: "Jinja Templates",
        type: "UI",
        summary: "Modular templates render the main dashboard.",
        fileRef: "templates/index.html",
    },
    {
        id: "styles",
        title: "Theme System",
        type: "UI",
        summary: "Light/dark/source themes via CSS variables.",
        fileRef: "static/styles.css",
    },
    {
        id: "client",
        title: "Client Loader",
        type: "UI",
        summary: "Fetches data and populates the cards on screen.",
        fileRef: "static/script.js",
    },
    {
        id: "streaming",
        title: "Streaming Agent",
        type: "Orchestration",
        summary: "Experimental streaming responses for AI analysis.",
        fileRef: "server.py:/experimental-agent",
    },
    {
        id: "export",
        title: "Export Tools",
        type: "UI",
        summary: "Users export JSON/CSV snapshots and pins.",
        fileRef: "static/script.js",
    },
];

const surface = document.getElementById("cork-surface");
const drawer = document.getElementById("cork-drawer");
const log = document.getElementById("cork-log");
const pinCount = document.getElementById("pin-count");
const caseStatus = document.getElementById("case-status");
const lines = document.getElementById("cork-lines");

let drawerSelection = null;
let boardSelection = [];
let pins = [];
let connections = [];

function renderDrawer() {
    drawer.innerHTML = "";
    evidenceDeck.forEach((item) => {
        const card = document.createElement("div");
        card.className = "drawer-item";
        if (drawerSelection === item.id) {
            card.classList.add("selected");
        }
        card.innerHTML = `
            <div class="evidence-tag">${item.type}</div>
            <div class="evidence-title">${item.title}</div>
            <div class="evidence-body">${item.summary}</div>
            <div class="evidence-file">${item.fileRef}</div>
        `;
        card.addEventListener("click", () => {
            drawerSelection = item.id;
            renderDrawer();
            logEntry(`Selected evidence: ${item.title}.`);
        });
        drawer.appendChild(card);
    });
}

function logEntry(message) {
    const entry = document.createElement("div");
    entry.className = "cork-log-entry";
    entry.textContent = message;
    log.prepend(entry);
}

function addEvidence() {
    const item = evidenceDeck.find((card) => card.id === drawerSelection);
    if (!item) {
        logEntry("Select evidence from the drawer first.");
        return;
    }
    const pin = {
        ...item,
        x: 30 + (pins.length % 3) * 200,
        y: 40 + Math.floor(pins.length / 3) * 140,
        id: `${item.id}-${Date.now()}`,
    };
    pins.push(pin);
    renderPins();
    updateCase();
    logEntry(`Pinned ${item.title} to the board.`);
}

function renderPins() {
    surface.querySelectorAll(".evidence-card").forEach((node) => node.remove());
    pins.forEach((pin) => {
        const card = document.createElement("div");
        card.className = "evidence-card";
        card.style.left = `${pin.x}px`;
        card.style.top = `${pin.y}px`;
        card.dataset.id = pin.id;

        if (boardSelection.includes(pin.id)) {
            card.classList.add("selected");
        }

        card.innerHTML = `
            <div class="evidence-pin"></div>
            <div class="evidence-tag">${pin.type}</div>
            <div class="evidence-title">${pin.title}</div>
            <div class="evidence-body">${pin.summary}</div>
            <div class="evidence-file">${pin.fileRef}</div>
        `;

        card.addEventListener("click", (event) => {
            event.stopPropagation();
            toggleBoardSelection(pin.id);
        });

        makeDraggable(card, pin);
        surface.appendChild(card);
    });
    drawConnections();
    pinCount.textContent = pins.length;
}

function toggleBoardSelection(id) {
    if (boardSelection.includes(id)) {
        boardSelection = boardSelection.filter((item) => item !== id);
    } else {
        boardSelection.push(id);
        if (boardSelection.length > 2) {
            boardSelection.shift();
        }
    }
    renderPins();
}

function connectEvidence() {
    if (boardSelection.length < 2) {
        logEntry("Select two pinned clues to connect them.");
        return;
    }
    const [from, to] = boardSelection;
    connections.push({ from, to });
    boardSelection = [];
    renderPins();
    updateCase();
    logEntry("Connected evidence with red string.");
}

function drawConnections() {
    const rect = surface.getBoundingClientRect();
    lines.setAttribute("viewBox", `0 0 ${rect.width} ${rect.height}`);
    lines.innerHTML = "";

    connections.forEach((link) => {
        const from = surface.querySelector(`[data-id='${link.from}']`);
        const to = surface.querySelector(`[data-id='${link.to}']`);
        if (!from || !to) {
            return;
        }
        const fromRect = from.getBoundingClientRect();
        const toRect = to.getBoundingClientRect();
        const x1 = fromRect.left - rect.left + fromRect.width / 2;
        const y1 = fromRect.top - rect.top + fromRect.height / 2;
        const x2 = toRect.left - rect.left + toRect.width / 2;
        const y2 = toRect.top - rect.top + toRect.height / 2;

        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "#dc2626");
        line.setAttribute("stroke-width", "2");
        line.setAttribute("stroke-linecap", "round");
        lines.appendChild(line);
    });
}

function makeDraggable(node, pin) {
    let offsetX = 0;
    let offsetY = 0;
    let dragging = false;

    node.addEventListener("mousedown", (event) => {
        dragging = true;
        offsetX = event.offsetX;
        offsetY = event.offsetY;
        node.style.zIndex = 10;
    });

    window.addEventListener("mousemove", (event) => {
        if (!dragging) {
            return;
        }
        const surfaceRect = surface.getBoundingClientRect();
        let x = event.clientX - surfaceRect.left - offsetX;
        let y = event.clientY - surfaceRect.top - offsetY;
        x = Math.max(0, Math.min(x, surfaceRect.width - node.offsetWidth));
        y = Math.max(0, Math.min(y, surfaceRect.height - node.offsetHeight));
        pin.x = x;
        pin.y = y;
        node.style.left = `${x}px`;
        node.style.top = `${y}px`;
        drawConnections();
    });

    window.addEventListener("mouseup", () => {
        if (!dragging) {
            return;
        }
        dragging = false;
        node.style.zIndex = 1;
    });
}

function updateCase() {
    if (pins.length >= 4 && connections.length >= 3) {
        caseStatus.textContent = "Pattern emerging";
    } else if (pins.length >= 2) {
        caseStatus.textContent = "Evidence linked";
    } else {
        caseStatus.textContent = "Collecting evidence";
    }
}

function resetBoard() {
    pins = [];
    connections = [];
    boardSelection = [];
    renderPins();
    updateCase();
    log.innerHTML = "";
    logEntry("Board cleared. Start pinning new evidence.");
}

surface.addEventListener("click", () => {
    boardSelection = [];
    renderPins();
});

window.addEventListener("resize", () => {
    drawConnections();
});

const addButton = document.getElementById("add-evidence");
const connectButton = document.getElementById("connect-evidence");
const resetButton = document.getElementById("reset-board");

addButton.addEventListener("click", addEvidence);
connectButton.addEventListener("click", connectEvidence);
resetButton.addEventListener("click", resetBoard);

renderDrawer();
renderPins();
updateCase();
logEntry("Case opened. Pin your first clue.");
