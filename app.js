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

    if (!startBtn) return; // Not on scan page

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

        // Reset Log
        cliOutput.innerHTML = '<span>> Initializing Secure Handshake...</span><br>';

        // Parallel Visual Sequence (Simulates complexity while API works)
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

            // 2. Prepare Payload
            const formData = new FormData();
            // Note: Backend expects 'receipt', sticking to project convention despite prompt saying 'image'.
            formData.append('receipt', fileBlob);

            // 3. API Call
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                // If 500 or 400, throw to catch block
                const errText = await response.text();
                throw new Error(`API Error ${response.status}: ${errText}`);
            }

            const data = await response.json();
            const result = data.data;

            console.log("[CLIENT] Response Received:", result);

            // Await visuals just in case API was super fast
            await visualPromise;

            // 4. Handle Terminal States
            if (result.outcome === 'UNKNOWN_FORMULATION') {
                console.warn("[CLIENT] Audit Inconclusive:", result.reason);
                processView.style.display = 'none';
                unknownView.style.display = 'block';
                return;
            }

            // 5. Render Success Path
            renderResult(result.outcome, result.confidence, result.ingredients);

            processView.style.display = 'none';
            resultView.style.display = 'block';

            // Auto-Save History if Non-Compliant
            if (result.outcome === 'NON-COMPLIANT') {
                saveLocalScan(result);
            }

            // 6. Post-Scan Modal Trigger (Delayed)
            // Gated: Only show to free users (Simulated check)
            const isPremium = localStorage.getItem('kibblescan_premium') === 'true';

            // Construct mock user for the new function signature
            const user = { isMonitoringActive: isPremium };

            if (!isPremium) {
                setTimeout(() => {
                    // Start of user provided logic integration
                    if (typeof maybeShowMonitoringModal === 'function' && resultView.style.display !== 'none') {
                        maybeShowMonitoringModal(user);
                    }
                }, 2000); // 2s allow "Verdict" to sink in first
            }

        } catch (error) {
            console.error("[CLIENT] Critical Failure:", error);
            processView.style.display = 'none';
            // Determine if it was a network error vs logical error
            // For now, fail-safe to Error View
            errorView.style.display = 'block';
        }
    }

    // -----------------------------------------------------
    // RENDER LOGIC
    // -----------------------------------------------------
    function renderResult(outcome, confidence, ingredients = []) {
        // Reset Header
        resultHeader.className = '';

        // Hydrate Verdict UI
        if (outcome === 'NON-COMPLIANT') {
            // RED STATE
            resultHeader.style.background = '#FEF2F2';
            resultHeader.style.borderBottom = '1px solid #FECACA';
            resultVerdict.innerText = 'NON-COMPLIANT';
            resultVerdict.style.color = '#7F1D1D';

            const violationCount = ingredients.filter(i => i.classification === 'VIOLATION').length;
            resultSubtext.innerText = `${violationCount} Restricted Agents Detected.`;

            resultStamp.innerHTML = 'AUDIT<br>FAIL';
            resultStamp.style.borderColor = '#991B1B';
            resultStamp.style.color = '#991B1B';

        } else if (outcome === 'AMBIGUOUS') {
            // YELLOW STATE
            resultHeader.style.background = '#FFFBEB';
            resultHeader.style.borderBottom = '1px solid #FCD34D';
            resultVerdict.innerText = 'AMBIGUOUS DATA';
            resultVerdict.style.color = '#B45309';

            // Contextual Reason
            let reason = `Confidence: ${(confidence * 100).toFixed(0)}%. Verify Source manually.`;
            if (ingredients.some(i => i.classification === 'UNRESOLVED')) {
                reason = "Unrecognized ingredients detected.";
            } else if (ingredients.some(i => i.classification === 'NON-SPECIFIC')) {
                reason = "Non-specific declarations detected.";
            }
            resultSubtext.innerText = reason;

            resultStamp.innerHTML = 'DATA<br>GAP';
            resultStamp.style.borderColor = '#B45309';
            resultStamp.style.color = '#B45309';

        } else if (outcome === 'VERIFIED') {
            // GREEN STATE
            resultHeader.style.background = '#ECFDF5';
            resultHeader.style.borderBottom = '1px solid #6EE7B7';
            resultVerdict.innerText = 'VERIFIED';
            resultVerdict.style.color = '#065F46';
            resultSubtext.innerText = 'No Restricted Agents Detected.';

            resultStamp.innerHTML = 'AUDIT<br>PASS';
            resultStamp.style.borderColor = '#059669';
            resultStamp.style.color = '#059669';
        }

        // Render Findings List
        let findingsHTML = '';

        // Inject Warning Banners
        if (outcome === 'AMBIGUOUS') {
            const hasUnresolved = ingredients.some(i => i.classification === 'UNRESOLVED');
            const hasNonSpecific = ingredients.some(i => i.classification === 'NON-SPECIFIC');

            if (hasUnresolved) {
                findingsHTML += `
                    <div style="background:#FFFBEB; padding:1rem; border-bottom:1px solid #FCD34D; font-size:0.85rem; color:#92400E; line-height:1.5;">
                        <strong>System Audit Incomplete:</strong><br>
                        Formulation contains ingredients not currently indexed in the Global Toxicology Registry. Treat as potentially unsafe until verified.
                    </div>
                `;
            } else if (hasNonSpecific) {
                findingsHTML += `
                    <div style="background:#FFFBEB; padding:1rem; border-bottom:1px solid #FCD34D; font-size:0.85rem; color:#92400E; line-height:1.5;">
                        <strong>Regulatory Gap Detected:</strong><br>
                        This formulation utilizes permitted "Group Definitions" which obscure the specific biological source. While legal under current labeling acts, this prevents definitive toxicological clearance.
                    </div>
                `;
            }
        }

        // Inject Ingredients
        ingredients.forEach(ing => {
            let bgStyle = 'background:white;';
            let statusText = 'Classification: Unrestricted';
            let link = '#';

            if (ing.classification === 'VIOLATION') {
                bgStyle = 'background:#FFFBFB; border-bottom:1px solid #F1F5F9;';
                statusText = 'Classification: Restricted Agent';
            } else if (ing.classification === 'NON-SPECIFIC') {
                statusText = 'Classification: Source Unverified';
            } else if (ing.classification === 'UNRESOLVED') {
                statusText = 'Classification: Unknown Entity';
            }

            // Simple slugs for links (In prod, use real IDs)
            const lowerName = ing.name.toLowerCase();
            if (lowerName.includes("bha")) link = "ingredient_bha.html";
            else if (lowerName.includes("yellow")) link = "ingredient_yellow_5.html";
            else if (lowerName.includes("meat meal")) link = "ingredient_meat_meal.html";
            else if (lowerName.includes("chicken")) link = "ingredient_chicken.html";

            findingsHTML += `
                <div style="padding:1rem; ${bgStyle} display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-weight:700; color:#1E293B;">${ing.name}</div>
                        <div style="font-size:0.8rem; color:#64748B;">${statusText}</div>
                    </div>
                    ${link !== '#' ? `<a href="${link}" style="font-size:0.8rem; color:var(--primary); font-weight:600;">View Dossier →</a>` : ''}
                </div>
            `;
        });

        resultFindings.innerHTML = findingsHTML;
    }

    // -----------------------------------------------------
    // EVENT LISTENERS
    // -----------------------------------------------------

    // Call history init if on scan page
    initLocalHistory();

    startBtn.addEventListener('click', () => {
        // Manual entry disabled for V2 Production
        alert("MANUAL INPUT LOCKED\n\nPlease use the Camera Scan function for verified audits.");
    });

    // Camera Button Logic (File Upload)
    if (cameraBtn) {
        const fileInput = document.getElementById('file-upload-trigger');

        // Trigger Hidden Input
        cameraBtn.addEventListener('click', () => {
            fileInput.value = ''; // Reset allows selecting same file
            fileInput.click();
        });

        // Handle File Selection
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                // Pass the real file blob to the processing engine
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
