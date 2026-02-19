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

            const response = await fetch('/api/scans/analyze', {
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
    // -----------------------------------------------------
    // UTILITY: Render Results (Premium Upgrade)
    // -----------------------------------------------------
    function renderResult(outcome, confidence, ingredients) {
        // Reset State
        const resultHeader = document.getElementById('result-header');

        // Apply Glass Card Style
        if (resultHeader) {
            resultHeader.className = 'glass-card'; // Removes inline styles if any, or add to list
            resultHeader.style.textAlign = 'center';
            resultHeader.style.padding = '30px';
            resultHeader.style.marginBottom = '20px';
        }

        let iconHtml = '';
        let verdictHtml = '';
        let subtextHtml = '';

        if (outcome === 'VERIFIED' || outcome === 'COMPLIANT') {
            // GREEN SHIELD
            iconHtml = `<div class="outcome-icon icon-pulse-green" style="background:rgba(16, 185, 129, 0.1); color:#10B981;">
                <ion-icon name="shield-checkmark"></ion-icon>
            </div>`;
            verdictHtml = `<div class="result-verdict-large" style="color:#10B981;">VERIFIED</div>`;
            subtextHtml = `<div style="color:#475569; font-weight:500;">Safe for consumption.</div>`;
        } else if (outcome === 'AMBIGUOUS' || outcome === 'UNKNOWN_FORMULATION') {
            // YELLOW ALERT
            iconHtml = `<div class="outcome-icon icon-blink-yellow" style="background:rgba(234, 179, 8, 0.1); color:#EAB308;">
                <ion-icon name="alert-circle"></ion-icon>
            </div>`;
            verdictHtml = `<div class="result-verdict-large" style="color:#EAB308;">ANALYZING</div>`;
            subtextHtml = `<div style="color:#475569;">Incomplete data detected.</div>`;
        } else {
            // RED WARNING
            iconHtml = `<div class="outcome-icon" style="background:rgba(239, 68, 68, 0.1); color:#EF4444;">
                <ion-icon name="warning"></ion-icon>
            </div>`;
            verdictHtml = `<div class="result-verdict-large" style="color:#EF4444;">RESTRICTED</div>`;
            subtextHtml = `<div style="color:#475569;">Ingredients flagged.</div>`;
        }

        // Inject HTML
        if (resultHeader) {
            resultHeader.innerHTML = `
                ${iconHtml}
                ${verdictHtml}
                ${subtextHtml}
                <div style="font-size:0.7rem; text-transform:uppercase; letter-spacing:1px; color:#94A3B8; margin-top:15px;">
                    Confidence: ${(confidence * 100).toFixed(0)}%
                </div>
            `;
        }

        // Render Ingredient List with Stagger
        const resultFindings = document.getElementById('result-findings');
        if (resultFindings) {
            resultFindings.innerHTML = '';
            resultFindings.style.background = 'transparent'; // Remove white bg for glass feel
            resultFindings.style.border = 'none';

            if (ingredients && ingredients.length > 0) {
                ingredients.forEach((ing, index) => {
                    const li = document.createElement('div'); // Div for better control
                    li.className = 'stagger-entry';
                    li.style.animationDelay = `${index * 50}ms`;
                    li.style.background = 'white';
                    li.style.marginBottom = '8px';
                    li.style.padding = '12px 16px';
                    li.style.borderRadius = '12px';
                    li.style.display = 'flex';
                    li.style.justifyContent = 'space-between';
                    li.style.alignItems = 'center';
                    li.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)';

                    let statusIcon = '<ion-icon name="checkmark-circle" style="color:#CBD5E1;"></ion-icon>';
                    if (ing.flagged) statusIcon = '<ion-icon name="alert-circle" style="color:#EF4444;"></ion-icon>';

                    li.innerHTML = `
                        <span style="font-weight:600; color:#1E293B; text-transform:capitalize;">${ing.name}</span>
                        ${statusIcon}
                    `;
                    resultFindings.appendChild(li);
                });
            } else {
                resultFindings.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">No data extracted.</div>';
            }
        }

        // Setup Download Button
        const btnDownload = document.getElementById('btn-download-report');
        if (btnDownload) {
            // Clone to remove old listeners
            const newBtn = btnDownload.cloneNode(true);
            btnDownload.parentNode.replaceChild(newBtn, btnDownload);

            newBtn.addEventListener('click', () => {
                const timestamp = new Date().toLocaleString();
                let reportText = `KIBBLESCAN AUDIT REPORT\n`;
                reportText += `=======================\n`;
                reportText += `Date: ${timestamp}\n`;
                reportText += `Verdict: ${outcome}\n`;
                reportText += `Confidence: ${(confidence * 100).toFixed(1)}%\n\n`;

                reportText += `INGREDIENTS ANALYZED:\n`;
                reportText += `---------------------\n`;
                if (ingredients && ingredients.length > 0) {
                    ingredients.forEach(ing => {
                        const status = ing.flagged ? "[FLAGGED]" : "[OK]";
                        reportText += `${status.padEnd(10)} ${ing.name}\n`;
                        if (ing.flagged) reportText += `           Risk: ${ing.reason || 'Restricted'}\n`;
                    });
                } else {
                    reportText += `(No ingredients detected)\n`;
                }

                reportText += `\n=======================\n`;
                reportText += `Generated by KibbleScan v8.2\n`;
                reportText += `End of Report.\n`;

                const blob = new Blob([reportText], { type: 'text/plain' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit_report_${Date.now()}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            });
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


// -----------------------------------------------------
// PHASE 5: HISTORY & REMOTE FETCH
// -----------------------------------------------------

const btnHistory = document.getElementById('btn-show-history');
const modalHistory = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const historyList = document.getElementById('history-list');

if (btnHistory && modalHistory) {
    // Open Modal
    btnHistory.addEventListener('click', () => {
        modalHistory.style.display = 'flex'; // Override inline none
        modalHistory.classList.remove('hidden');
        // Small delay to trigger CSS transition
        setTimeout(() => {
            modalHistory.classList.add('active');
        }, 10);
        fetchScanHistory(); // Fetch fresh data
    });

    // Close Modal
    const closeHistory = () => {
        modalHistory.classList.remove('active');
        setTimeout(() => {
            modalHistory.classList.add('hidden');
            modalHistory.style.display = 'none'; // Restore inline none
        }, 300); // Wait for transition
    };

    btnCloseHistory.addEventListener('click', closeHistory);

    // click outside to close
    modalHistory.addEventListener('click', (e) => {
        if (e.target === modalHistory) closeHistory();
    });
}

async function fetchScanHistory() {
    if (!historyList) return;
    historyList.innerHTML = '<div style="text-align:center; padding:20px; color:#94A3B8;">Loading history...</div>';

    try {
        const res = await fetch('/api/recent'); // Ensure this matches backend route
        if (!res.ok) throw new Error("Failed to load");
        const scans = await res.json();
        renderHistoryList(scans);
    } catch (e) {
        console.error("History Error:", e);
        historyList.innerHTML = '<div style="text-align:center; padding:20px; color:#EF4444;">Failed to load history.<br>Try again later.</div>';
    }
}

function renderHistoryList(scans) {
    historyList.innerHTML = '';
    if (scans.length === 0) {
        historyList.innerHTML = '<div style="text-align:center; padding:40px; color:#94A3B8;">No scans recorded yet.</div>';
        return;
    }

    scans.forEach(scan => {
        const date = new Date(scan.created_at);
        const timeAgo = Math.floor((new Date() - date) / 60000); // Minutes
        let timeStr = timeAgo < 60 ? `${timeAgo}m ago` : `${Math.floor(timeAgo / 60)}h ago`;
        if (timeAgo > 1440) timeStr = date.toLocaleDateString();

        // SMART TITLE EXTRACTION
        let title = "Unknown Product";
        let subLabel = "";

        // 1. Try to get brand/name from structured data (if we had it, but we only have ingredients list usually)
        // 2. Fallback to smarter raw text parsing
        if (scan.raw_text) {
            const lines = scan.raw_text.split('\n')
                .map(l => l.trim())
                .filter(l => l.length > 4) // Ignore tiny lines
                .filter(l => !/^\d+/.test(l)) // Ignore lines starting with numbers (weights, phones)
                .filter(l => !/^(tel|fax|www|http)/i.test(l)); // Ignore contact info

            if (lines.length > 0) {
                // Capitalize first letter of each word for prettiness
                title = lines[0].replace(/\w\S*/g, (w) => (w.replace(/^\w/, (c) => c.toUpperCase())));
                if (title.length > 30) title = title.substring(0, 28) + "...";

                if (lines.length > 1) {
                    subLabel = lines[1].substring(0, 30);
                }
            }
        }

        // Determine Style & Labels
        let iconClass = 'warn';
        let iconName = 'help-circle';
        let verdictLabel = "ANALYSIS";
        let verdictColor = "#94A3B8";

        if (scan.verdict === 'VERIFIED' || scan.verdict === 'COMPLIANT') {
            iconClass = 'safe';
            iconName = 'shield-checkmark';
            verdictLabel = "SAFE";
            verdictColor = "#10B981";
        } else if (scan.verdict === 'NON_COMPLIANT' || scan.verdict === 'RESTRICTED') {
            iconClass = 'risk';
            iconName = 'warning';
            verdictLabel = "FLAGGED";
            verdictColor = "#EF4444";
        } else {
            verdictLabel = "COMPLETE"; // Fixed typo
        }

        const el = document.createElement('div');
        el.className = 'history-item';
        // Inline styles for immediate "Card" look without waiting for CSS flush
        el.style.cssText = `
            background: white;
            border: 1px solid #E2E8F0;
            border-radius: 12px;
            padding: 12px 16px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 16px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
            transition: transform 0.1s;
        `;

        el.innerHTML = `
                <div class="h-icon" style="
                    width: 40px; 
                    height: 40px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    font-size: 1.5rem;
                    background: ${iconClass === 'safe' ? '#ECFDF5' : (iconClass === 'risk' ? '#FEF2F2' : '#F1F5F9')};
                    color: ${iconClass === 'safe' ? '#10B981' : (iconClass === 'risk' ? '#EF4444' : '#64748B')};
                    flex-shrink: 0;
                ">
                    <ion-icon name="${iconName}"></ion-icon>
                </div>
                
                <div class="h-info" style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; color: #1E293B; font-size: 0.95rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${title}
                    </div>
                    <div style="font-size: 0.75rem; color: #64748B; display: flex; align-items: center; gap: 6px; margin-top: 2px;">
                        <span style="color:${verdictColor}; font-weight:600; letter-spacing:0.5px;">${verdictLabel}</span>
                        <span>•</span>
                        <span>${timeStr}</span>
                    </div>
                </div>
                
                <ion-icon name="chevron-forward" style="color:#CBD5E1; font-size:1.2rem;"></ion-icon>
            `;

        // Click -> Load Result
        el.addEventListener('click', () => {
            console.log("[HISTORY] Item clicked:", scan.id); // Validates click

            try {
                // 1. Close Modal Immediately (UX First)
                if (typeof modalHistory !== 'undefined') {
                    modalHistory.classList.remove('active');
                    setTimeout(() => {
                        modalHistory.classList.add('hidden');
                        if (modalHistory.style) modalHistory.style.display = 'none';
                    }, 300);
                }

                // 2. Safely Parse Data
                let list = [];
                try {
                    let raw = scan.ingredients_found;
                    if (typeof raw === 'string') raw = JSON.parse(raw);
                    list = (raw && raw.ingredients) ? raw.ingredients : raw;
                    if (!Array.isArray(list)) list = [];
                } catch (parseErr) {
                    console.warn("Data parsing failed:", parseErr);
                    list = [];
                }

                // 3. Switch View *BEFORE* Render (So if render fails, we at least see the result screen)
                const entryView = document.getElementById('scan-entry');
                const resultView = document.getElementById('scan-result');
                const viewport = document.getElementById('app-viewport');

                if (entryView) entryView.style.display = 'none';
                if (resultView) {
                    resultView.style.display = 'block';
                    if (viewport) viewport.scrollTop = 0; // Scroll to top
                }

                // 4. Render Trigger
                if (typeof renderResult === 'function') {
                    renderResult(scan.verdict, 1.0, list);
                }

            } catch (err) {
                console.error("[CRITICAL] History Click Error:", err);
                alert("Could not load scan. Please try again.");
            }
        });

        historyList.appendChild(el);
    });
}

// Dummy init functions to keep old calls safe
function initLocalHistory() { }
function initRegistrySearch() { }
function initMainSearch() { }

document.addEventListener('DOMContentLoaded', () => {
    initScanFlow();
    initLiveTimestamps();
    initLiveLogs();
    initRegistrySearch();
    initMainSearch();

    // --- PWA SERVICE WORKER REGISTRATION ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(reg => console.log('[Client] SW Registered:', reg.scope))
                .catch(err => console.error('[Client] SW Registration Failed:', err));
        });
    }

    // --- OFFLINE DETECTION ---
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            showToast("You are offline. Scans may be limited.", "warn");
        } else if (navigator.onLine) {
            // Optional: Show "Restored" only if we were previously offline (complicated state), 
            // or just show it. Ideally we don't spam "Restored" on every load.
            // For now, let's only show "Restored" on the EVENT, not initial check.
        }
    }
    // Initial Check
    if (!navigator.onLine) {
        showToast("You are offline. Scans may be limited.", "warn");
    }

    // Event Listeners
    window.addEventListener('online', () => showToast("Connection restored.", "success"));
    window.addEventListener('offline', () => showToast("You are offline. Scans may be limited.", "warn"));
});

// Helper for Toasts (Simple implementation)
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.background = type === 'warn' ? '#DC2626' : (type === 'success' ? '#16A34A' : '#334155');
    toast.style.color = 'white';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '20px';
    toast.style.zIndex = '10000';
    toast.style.fontSize = '0.9rem';
    toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    toast.style.transition = 'opacity 0.5s';

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}
