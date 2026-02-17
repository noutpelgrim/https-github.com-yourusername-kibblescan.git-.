console.log("Kibblescan System Active - Production Mode v2.1");

/* \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d
   PHASE 3: SCAN FLOW LOGIC
   \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d */

function initScanFlow() {
    const startBtn = document.getElementById('btn-start-scan');
    const cameraBtn = document.getElementById('btn-camera-scan');
    const resetBtn = document.getElementById('btn-reset');

    // View States
    const entryView = document.getElementById('scan-entry');
    const processView = document.getElementById('scan-processing');
    const resultView = document.getElementById('scan-result');
    const errorView = document.getElementById('scan-error');
    const unknownView = document.getElementById('scan-unknown');
    const cliOutput = document.getElementById('cli-output');

    // Config: New Viewport for scrolling
    const appViewport = document.getElementById('app-viewport');

    if (!cameraBtn) return; // Not on scan page (simplified check)

    // Result Nodes (for dynamic updates)
    const resultHeader = document.getElementById('result-header');
    const resultVerdict = document.getElementById('result-verdict');
    const resultSubtext = document.getElementById('result-subtext');
    const resultStamp = document.getElementById('result-stamp');
    const resultFindings = document.getElementById('result-findings');

    // -----------------------------------------------------
    // CORE PROCESSING ENGINE (Async / Await)
    // -----------------------------------------------------
    async function startProcessing(fileBlob) {
        // 1. UI State: Processing
        entryView.style.display = 'none';
        processView.style.display = 'block';

        // Auto-Scroll to top of viewport
        if (appViewport) appViewport.scrollTop = 0;

        // Reset Log
        cliOutput.innerHTML = '<span>> Initializing Secure Handshake...</span><br>';

        // ... (Visuals same as before)
        const runVisuals = async () => {
            const steps = [
                { text: "> Quantizing Ingredient Deck...", delay: 50 },
                { text: "> Uploading Manifest [OCR-A]...", delay: 800 },
                { text: "> Querying Global Registry...", delay: 1500 }
            ];
            for (const step of steps) {
                await new Promise(r => setTimeout(r, step.delay));
                cliOutput.innerHTML += `<span>${step.text}</span><br>`;
                cliOutput.scrollTop = cliOutput.scrollHeight;
            }
        };
        const visualPromise = runVisuals();

        try {
            console.log("[CLIENT] Uploading file for analysis...");

            const formData = new FormData();
            formData.append('receipt', fileBlob);

            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const result = data.data;

            await visualPromise;

            if (result.outcome === 'UNKNOWN_FORMULATION') {
                processView.style.display = 'none';
                unknownView.style.display = 'block';

                // POPULATE DEBUG INFO
                const debugElem = document.getElementById('debug-raw-text');
                if (debugElem) {
                    const debugInfo = `REASON: ${result.reason || "N/A"}\n\nRAW OCR:\n${data.rawText || "No text detected"}`;
                    debugElem.innerText = debugInfo;
                }

                if (appViewport) appViewport.scrollTop = 0;
                return;
            }

            renderResult(result.outcome, result.confidence, result.ingredients);

            processView.style.display = 'none';
            resultView.style.display = 'block';

            // CRITICAL: Auto-Scroll to result
            if (appViewport) appViewport.scrollTop = 0;

            if (result.outcome === 'NON-COMPLIANT') {
                saveLocalScan(result);
            }

            // ... (Rest of logic)

        } catch (error) {
            console.error("[CLIENT] Critical Failure:", error);
            processView.style.display = 'none';
            // Determine if it was a network error vs logical error
            // Fail-safe to Error View
            errorView.style.display = 'block';

            const errElem = document.getElementById('error-details');
            if (errElem) errElem.innerText = error.message;

            if (appViewport) appViewport.scrollTop = 0;
        }
    }

    // -----------------------------------------------------
    // UTILITY: Render Results
    // -----------------------------------------------------
    function renderResult(outcome, confidence, ingredients) {
        // Reset State
        if (resultVerdict) resultVerdict.className = '';
        if (resultStamp) resultStamp.className = 'stamp';

        let verdictText = "UNKNOWN";
        let verdictClass = "unknown";
        let subtext = "Analysis Inconclusive";
        let stampText = "VOID";
        let stampClass = "stamp void";

        if (outcome === 'COMPLIANT') {
            verdictText = "COMPLIANT";
            verdictClass = "safe";
            subtext = "No restricted ingredients found.";
            stampText = "APPROVED";
            stampClass = "stamp approved";
        } else if (outcome === 'NON-COMPLIANT') {
            verdictText = "WARNING";
            verdictClass = "danger";
            subtext = "Restricted ingredients detected.";
            stampText = "REJECTED";
            stampClass = "stamp rejected";
        }

        // Apply Text & Classes
        if (resultVerdict) {
            resultVerdict.innerText = verdictText;
            resultVerdict.classList.add(verdictClass);
        }
        if (resultSubtext) resultSubtext.innerText = subtext;

        if (resultStamp) {
            resultStamp.innerText = stampText;
            resultStamp.className = stampClass;
        }

        // Render Ingredient List
        if (resultFindings) {
            resultFindings.innerHTML = '';
            if (ingredients && ingredients.length > 0) {
                ingredients.forEach(ing => {
                    const li = document.createElement('li');
                    li.innerText = ing.name;
                    if (ing.flagged) {
                        li.style.color = '#EF4444';
                        li.style.fontWeight = 'bold';
                        li.innerText += ' ⚠️';
                    }
                    resultFindings.appendChild(li);
                });
            } else {
                resultFindings.innerHTML = '<li style="color:#94A3B8; font-style:italic;">No distinct ingredients identified.</li>';
            }
        }
    }

    // -----------------------------------------------------
    // EVENT LISTENERS
    // -----------------------------------------------------

    initLocalHistory();

    // Removed Start Button (Manual Entry) Listener since button is gone from HTML

    if (cameraBtn) {
        const fileInput = document.getElementById('file-upload-trigger');

        cameraBtn.addEventListener('click', () => {
            fileInput.value = '';
            fileInput.click();
        });

        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                startProcessing(fileInput.files[0]);
            }
        });
    }

    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            resultView.style.display = 'none';
            entryView.style.display = 'block';
        });
    }

    // Gated Feature Simulators
    const saveBtn = document.getElementById('btn-save-history');
    const monitorBtn = document.getElementById('btn-monitor-drift');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            alert("ACCOUNT REQUIRED\n\nCreate a profile to save scans to your inventory.");
        });
    }

    if (monitorBtn) {
        monitorBtn.addEventListener('click', () => {
            alert("MONITORING REQUIRED\n\n'Drift Detection' monitors this formula for silent recipe changes.\nEnable monitoring to access this feature.");
        });
    }
}


/* \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d
   PHASE 4: LIVE DASHBOARD LOGIC
   \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d */

// 1. Header Sync Animation
function initLiveTimestamps() {
    const timeDisplay = document.getElementById('last-update');
    if (!timeDisplay) return;

    let cycle = 0;
    setInterval(() => {
        cycle++;
        if (cycle % 4 === 0) timeDisplay.textContent = "Syncing...";
        else if (cycle % 4 === 1) timeDisplay.textContent = "Updating Index...";
        else timeDisplay.textContent = "Active";
    }, 3500);
}

// 2. Live Log Simulator
const LOG_EVENTS = [
    { event: "Check: Brand A / Sensitive Stomach", status: "NO CHANGE", type: "ok" },
    { event: "Check: Brand B / Adult Formula", status: "NO CHANGE", type: "ok" },
    { event: "Alert: Brand C / Puppy Chow (v4.2)", status: "DRIFT DETECTED", type: "warn" },
    { event: "Check: Brand D / Grain-Free", status: "NO CHANGE", type: "ok" },
    { event: "Scan: User #8821 verified product", status: "COMPLIANT", type: "ok" },
    { event: "Update: Database Def v2.4.2", status: "PATCHED", type: "ok" },
    { event: "Alert: High Sodium Detected", status: "FLAGGED", type: "warn" },
    { event: "Scan: Legacy SKU found", status: "ARCHIVED", type: "neutral" }
];

function initLiveLogs() {
    const logContainer = document.querySelector('.log-body');
    if (!logContainer) return;

    // Add a new log every 2-5 seconds
    setInterval(() => {
        addNewLogEntry(logContainer);
    }, 4500);
}

function addNewLogEntry(container) {
    const randomEvent = LOG_EVENTS[Math.floor(Math.random() * LOG_EVENTS.length)];
    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });

    const entry = document.createElement('div');
    entry.className = 'log-entry';
    entry.style.animation = 'fadeIn 0.5s ease-out';
    entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-event">${randomEvent.event}</span>
        <span class="log-status ${randomEvent.type}">${randomEvent.status}</span>
    `;

    // Insert at top
    container.insertBefore(entry, container.firstChild);

    // Keep list clean (max 8 items)
    if (container.children.length > 8) {
        container.removeChild(container.lastChild);
    }
}


/* \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d
   PHASE 5: HISTORY & SEARCH
   \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d */

function initLocalHistory() {
    const list = document.getElementById('local-history-list');
    const container = document.getElementById('local-history-container');
    if (!list || !container) return;

    const history = JSON.parse(localStorage.getItem('kibble_scan_history') || '[]');

    if (history.length > 0) {
        container.style.display = 'block';
        list.innerHTML = '';
        history.forEach(item => {
            const div = document.createElement('div');
            div.style.cssText = "background:white; border:1px solid #E2E8F0; padding:10px; border-radius:6px; font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;";
            div.innerHTML = `
                <div>
                    <div style="font-weight:600; color:#1E293B;">${item.name}</div>
                    <div style="font-size:0.75rem; color:#64748B;">${item.date}</div>
                </div>
                <div style="font-weight:700; font-size:0.75rem; color:${item.status === 'Non-Compliant' ? '#EF4444' : '#10B981'};">
                    ${item.status === 'Non-Compliant' ? 'FAIL' : 'PASS'}
                </div>
            `;
            list.appendChild(div);
        });
    }
}

function saveLocalScan(result) {
    const newScan = {
        name: "Scan #" + Math.floor(Math.random() * 1000), // Could improve with detected names later
        status: result ? (result.outcome === 'VERIFIED' ? 'Compliant' : 'Non-Compliant') : 'Non-Compliant',
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    };

    let history = JSON.parse(localStorage.getItem('kibble_scan_history') || '[]');

    // Add to top
    history.unshift(newScan);
    if (history.length > 3) history = history.slice(0, 3);

    localStorage.setItem('kibble_scan_history', JSON.stringify(history));
}

function initMainSearch() {
    const btn = document.getElementById('btn-main-search');
    const input = document.getElementById('main-search-input');

    if (!btn || !input) return;

    btn.addEventListener('click', () => {
        if (input.value.trim() !== '') {
            window.location.href = `registry.html?q=${encodeURIComponent(input.value.trim())}`;
        }
    });

    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.value.trim() !== '') {
            window.location.href = `registry.html?q=${encodeURIComponent(input.value.trim())}`;
        }
    });
}

function initRegistrySearch() {
    const searchInput = document.getElementById('registry-search-input');
    if (!searchInput) return;

    // 1. Handle URL Params (from index.html)
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (query) {
        searchInput.value = query;
        performSearch(query);
    }

    // 2. Handle Live Input
    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    function performSearch(term) {
        term = term.toLowerCase();
        const rows = document.querySelectorAll('tbody tr');
        let hasResults = false;

        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            if (term === '' || text.includes(term)) {
                row.style.display = '';
                hasResults = true;
            } else {
                row.style.display = 'none';
            }
        });

        // Toggle "No Results" message
        const noResults = document.getElementById('registry-no-results');
        const searchTermDisplay = document.getElementById('registry-search-term');

        if (noResults) {
            if (hasResults) {
                noResults.style.display = 'none';
            } else {
                noResults.style.display = 'block';
                if (searchTermDisplay) searchTermDisplay.innerText = `"${term}"`;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initScanFlow();
    initLiveTimestamps();
    initLiveLogs();
    initRegistrySearch();
    initMainSearch();
});
