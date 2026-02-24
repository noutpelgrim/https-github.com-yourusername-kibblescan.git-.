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

    // Manual paste elements
    const toggleManualBtn = document.getElementById('btn-toggle-manual');
    const manualPanel = document.getElementById('manual-paste-panel');
    const manualTextarea = document.getElementById('manual-text-input');
    const submitManualBtn = document.getElementById('btn-submit-manual');

    // ── Toggle manual paste panel ──────────────────────────
    if (toggleManualBtn && manualPanel) {
        toggleManualBtn.addEventListener('click', () => {
            const open = manualPanel.style.display !== 'none';
            manualPanel.style.display = open ? 'none' : 'block';
            toggleManualBtn.classList.toggle('active', !open);
            if (!open && manualTextarea) manualTextarea.focus();
        });
    }

    // Result Nodes (for dynamic updates)
    const resultHeader = document.getElementById('result-header');
    const resultVerdict = document.getElementById('result-verdict');
    const resultSubtext = document.getElementById('result-subtext');
    const resultStamp = document.getElementById('result-stamp');
    const resultFindings = document.getElementById('result-findings');

    // -----------------------------------------------------
    // CORE PROCESSING ENGINE — IMAGE (Async / Await)
    // -----------------------------------------------------
    async function startProcessing(fileBlob) {
        // 1. UI State: Processing
        entryView.style.display = 'none';
        processView.style.display = 'block';

        // Auto-Scroll to top of viewport
        if (appViewport) appViewport.scrollTop = 0;

        // Artificial delay so the user can see the new loading UI briefly
        const visualPromise = new Promise(r => setTimeout(r, 1200));

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

            renderResult(result.outcome, result.confidence, result.ingredients, data.scanSummary, data.formulationHistory);


            processView.style.display = 'none';
            resultView.style.display = 'block';

            // CRITICAL: Auto-Scroll to result
            if (appViewport) appViewport.scrollTop = 0;

            // Smart upgrade triggers (localStorage-driven, non-blocking)
            checkSmartTriggers(result.outcome, result.ingredients);

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
    // CORE PROCESSING ENGINE — MANUAL TEXT (Async / Await)
    // -----------------------------------------------------
    async function startProcessingText(rawText) {
        // 1. UI State: Processing
        entryView.style.display = 'none';
        processView.style.display = 'block';
        if (appViewport) appViewport.scrollTop = 0;

        // Artificial delay so the user can see the new loading UI briefly
        const visualPromise = new Promise(r => setTimeout(r, 1200));

        try {
            const response = await fetch('/api/scans/analyze-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: rawText })
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

            renderResult(result.outcome, result.confidence, result.ingredients, data.scanSummary, data.formulationHistory);


            processView.style.display = 'none';
            resultView.style.display = 'block';
            if (appViewport) appViewport.scrollTop = 0;

            checkSmartTriggers(result.outcome, result.ingredients);

        } catch (error) {
            console.error('[CLIENT-TEXT] Failure:', error);
            processView.style.display = 'none';
            errorView.style.display = 'block';
            const errElem = document.getElementById('error-details');
            if (errElem) errElem.innerText = error.message;
            if (appViewport) appViewport.scrollTop = 0;
        }
    }

    // ── Bind submit-manual button ───────────────────────────
    if (submitManualBtn && manualTextarea) {
        submitManualBtn.addEventListener('click', () => {
            const text = manualTextarea.value.trim();
            if (!text) {
                manualTextarea.focus();
                manualTextarea.classList.add('textarea-shake');
                setTimeout(() => manualTextarea.classList.remove('textarea-shake'), 500);
                return;
            }
            startProcessingText(text);
        });

        // Also allow Ctrl+Enter / Cmd+Enter to submit
        manualTextarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                submitManualBtn.click();
            }
        });
    }

    function renderResult(outcome, confidence, ingredients, scanSummary, formulationHistory) {


        // 0. Scan Summary Card
        const summaryCard = document.getElementById('scan-summary-card');
        if (summaryCard && scanSummary) {
            const metaContainer = document.getElementById('scan-summary-meta');

            // Helper: format a Yes/No boolean
            const yesNo = val => val ? 'Yes' : 'No';

            // Helper: confidence colour class
            const confClass = pct => pct >= 97 ? 'conf-high' : pct >= 90 ? 'conf-mid' : 'conf-low';

            const pct = scanSummary.overallOCRMatch;

            metaContainer.innerHTML = `
                <div class="summary-meta-grid">
                    <div class="summary-meta-row">
                        <span class="summary-meta-label">Overall OCR match</span>
                        <span class="summary-meta-value ${confClass(pct)}">${pct}%</span>
                    </div>
                    <div class="summary-meta-row">
                        <span class="summary-meta-label">Product type</span>
                        <span class="summary-meta-value">${scanSummary.productType}</span>
                    </div>
                    <div class="summary-meta-row">
                        <span class="summary-meta-label">Life stage</span>
                        <span class="summary-meta-value">${scanSummary.lifeStage}</span>
                    </div>
                    <div class="summary-meta-row">
                        <span class="summary-meta-label">Guaranteed analysis</span>
                        <span class="summary-meta-value">${yesNo(scanSummary.guaranteedAnalysisPresent)}</span>
                    </div>
                    ${scanSummary.scanSource ? `
                    <div class="summary-meta-row">
                        <span class="summary-meta-label">Scan source</span>
                        <span class="summary-meta-value source-tag source-${scanSummary.scanSource.toLowerCase()}">${scanSummary.scanSource}</span>
                    </div>` : ''}
                </div>
            `;

            // AAFCO collapsible
            const aafcoSection = document.getElementById('scan-summary-aafco');
            if (scanSummary.aafcoStatement && aafcoSection) {
                document.getElementById('aafco-text').textContent = scanSummary.aafcoStatement;
                aafcoSection.style.display = 'block';

                const toggleBtn = document.getElementById('aafco-toggle-btn');
                const aafcoBody = document.getElementById('aafco-body');
                toggleBtn.addEventListener('click', () => {
                    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
                    toggleBtn.setAttribute('aria-expanded', String(!expanded));
                    aafcoBody.classList.toggle('open');
                    toggleBtn.querySelector('.aafco-chevron').style.transform = expanded ? 'rotate(0deg)' : 'rotate(180deg)';
                });
            }

            summaryCard.style.display = 'block';
        }

        const badgeContainer = document.getElementById('badge-container');
        if (badgeContainer) {
            let badgeClass = 'badge-warn';
            let badgeIcon = 'alert-circle';
            let badgeText = 'ANALYZING';

            if (outcome === 'VERIFIED' || outcome === 'COMPLIANT') {
                badgeClass = 'badge-safe';
                badgeIcon = 'shield-checkmark';
                badgeText = 'VERIFIED SAFE';
            } else if (outcome === 'NON_COMPLIANT' || outcome === 'RESTRICTED') {
                badgeClass = 'badge-risk';
                badgeIcon = 'warning';
                badgeText = 'RESTRICTED LIST';
            }

            badgeContainer.innerHTML = `
                <div class="classification-badge ${badgeClass}">
                    <ion-icon name="${badgeIcon}"></ion-icon> ${badgeText}
                </div>
            `;
        }

        // 2. Confidence Score Update
        const scoreElem = document.getElementById('confidence-score');
        if (scoreElem) {
            scoreElem.innerText = `${(confidence * 100).toFixed(0)}% Match`;
        }

        // 3. Render Ingredient Accordion
        const resultFindings = document.getElementById('result-findings');
        if (resultFindings) {
            resultFindings.innerHTML = '';

            if (ingredients && ingredients.length > 0) {

                // ─────────────────────────────────────────────────────────────
                // Helper: map ing.status → icon, badge label, default copy
                // ─────────────────────────────────────────────────────────────
                function getIngredientUI(ing) {
                    switch (ing.status) {
                        case 'EVIDENCE_FLAG':
                            return {
                                icon: '<ion-icon name="warning" class="ing-icon ing-icon--flag"></ion-icon>',
                                badge: '<span class="ing-status-badge status-flag">Evidence flag</span>',
                                // Body is always ing.rationale (the short rationale from registry)
                                defaultExplanation: ing.rationale || 'A specific concern rule was triggered for this ingredient.',
                                accordionClass: 'status-flag'
                            };
                        case 'NEEDS_REVIEW': {
                            // Two distinct body variants:
                            //   • OCR uncertain  → exact OCR copy
                            //   • dose/context   → exact review copy
                            const isOCRPath = ing.rationale && ing.rationale.startsWith('OCR match uncertain');
                            const body = isOCRPath
                                ? 'OCR match uncertain. Please verify this ingredient on the label.'
                                : 'Review context: clinical relevance depends on dose, processing, and the individual pet (e.g., allergies, GI sensitivity).';
                            return {
                                icon: '<ion-icon name="alert-circle" class="ing-icon ing-icon--review"></ion-icon>',
                                badge: '<span class="ing-status-badge status-review">Needs review</span>',
                                defaultExplanation: body,
                                accordionClass: 'status-review'
                            };
                        }
                        default: // TYPICAL or undefined (backward compat)
                            return {
                                icon: '<ion-icon name="checkmark-circle" class="ing-icon ing-icon--typical"></ion-icon>',
                                badge: '<span class="ing-status-badge status-typical">Identified</span>',
                                defaultExplanation: 'Common pet-food ingredient. No specific evidence flags triggered from the name alone.',
                                accordionClass: 'status-typical'
                            };
                    }
                }

                ingredients.forEach((ing, index) => {
                    const accordion = document.createElement('div');
                    const ui = getIngredientUI(ing);
                    accordion.className = `ingredient-accordion stagger-entry ${ui.accordionClass}`;
                    accordion.style.animationDelay = `${index * 50}ms`;

                    // ── Clinic-safe 3-bullet template ───────────────────────
                    // Clinical Notes bullet — status-aware copy selection:
                    //   EVIDENCE_FLAG → short rationale from registry (ui.defaultExplanation)
                    //   NEEDS_REVIEW  → exact spec copy already encoded in ui.defaultExplanation
                    //   TYPICAL       → ing.clinicalNotes from knowledge base, or generic default
                    const clinicalNotes = (ing.status === 'EVIDENCE_FLAG' || ing.status === 'NEEDS_REVIEW')
                        ? ui.defaultExplanation
                        : (ing.clinicalNotes || ui.defaultExplanation);

                    let clinicBulletsHTML = '<ul class="ing-clinic-bullets">';
                    if (ing.whatItIs) {
                        clinicBulletsHTML += `
                            <li class="ing-clinic-row">
                                <span class="ing-clinic-label">What it is</span>
                                <span class="ing-clinic-text">${ing.whatItIs}</span>
                            </li>`;
                    }
                    if (ing.whyUsed) {
                        clinicBulletsHTML += `
                            <li class="ing-clinic-row">
                                <span class="ing-clinic-label">Why it's used</span>
                                <span class="ing-clinic-text">${ing.whyUsed}</span>
                            </li>`;
                    }
                    clinicBulletsHTML += `
                        <li class="ing-clinic-row">
                            <span class="ing-clinic-label">Clinical notes</span>
                            <span class="ing-clinic-text">${clinicalNotes}</span>
                        </li>`;
                    clinicBulletsHTML += '</ul>';

                    // ── Sources — only for EVIDENCE_FLAG or hasClinicalEvidence ──
                    const showSources = ing.status === 'EVIDENCE_FLAG' || ing.hasClinicalEvidence;
                    let citationsHTML = '';
                    if (showSources && ing.citations && ing.citations.length > 0) {
                        const links = ing.citations
                            .map(url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="ing-citation-link">${url.replace(/^https?:\/\//, '').split('/')[0]}</a>`)
                            .join('');
                        citationsHTML = `<div class="ing-citations"><span class="ing-citations-label">Sources:</span>${links}</div>`;
                    }

                    // ── OCR transparency panel ───────────────────────────────
                    const hasOCRData = ing.rawToken !== undefined || ing.ingredientConfidence !== undefined;
                    const ingConf = (ing.ingredientConfidence !== undefined) ? ing.ingredientConfidence : 100;
                    const confClass = ingConf < 90 ? 'conf-low' : ingConf < 97 ? 'conf-mid' : 'conf-high';
                    const rawDisplay = ing.rawToken ? ing.rawToken.trim() : (ing.matchedName || ing.name);
                    const matchedDisplay = ing.matchedName || ing.name;

                    const ocrWarning = (ing.status === 'NEEDS_REVIEW' && ingConf < 90 && ing.classification !== 'NON-SPECIFIC' && ing.classification !== 'UNRESOLVED')
                        ? `<div class="ocr-warning"><ion-icon name="alert-circle-outline"></ion-icon> OCR match uncertain. Please verify this ingredient on the label.</div>`
                        : '';

                    const ocrPanelHTML = hasOCRData ? `
                        <div class="ocr-transparency">
                            <div class="ocr-row">
                                <span class="ocr-label">Detected</span>
                                <span class="ocr-value ocr-raw">"${rawDisplay}"</span>
                            </div>
                            <div class="ocr-row">
                                <span class="ocr-label">Matched</span>
                                <span class="ocr-value">${matchedDisplay}</span>
                            </div>
                            <div class="ocr-row">
                                <span class="ocr-label">Confidence</span>
                                <span class="ocr-value ${confClass}">${ingConf}%</span>
                            </div>
                        </div>
                        ${ocrWarning}
                    ` : '';

                    accordion.innerHTML = `
                        <div class="accordion-header ${ui.accordionClass}">
                            <div class="accordion-title">
                                ${ui.icon}
                                <span class="accordion-name">${ing.name}</span>
                                ${ui.badge}
                            </div>
                            <ion-icon class="accordion-icon" name="chevron-down-outline"></ion-icon>
                        </div>
                        <div class="accordion-body">
                            ${clinicBulletsHTML}
                            ${citationsHTML}
                            ${ocrPanelHTML}
                        </div>
                    `;

                    // Toggle logic
                    const header = accordion.querySelector('.accordion-header');
                    header.addEventListener('click', () => {
                        accordion.classList.toggle('open');
                    });

                    resultFindings.appendChild(accordion);
                });
            } else {
                resultFindings.innerHTML = '<div style="text-align:center; padding:30px; color:#94A3B8; background:white; border-radius:20px; border:1px solid #E2E8F0;">No ingredients extracted.</div>';
            }

            // Update ingredient count label
            const countElem = document.getElementById('ingredient-count');
            if (countElem) {
                const n = (ingredients && ingredients.length) ? ingredients.length : 0;
                countElem.textContent = n > 0 ? `(${n})` : '';
            }
        }

        // ── Formulation History ─────────────────────────────────
        // Render from API response (backend is the source of truth).
        renderFormulationHistoryFromAPI(formulationHistory);
    }


    // -----------------------------------------------------
    // EVENT LISTENERS
    // -----------------------------------------------------

    initLocalHistory();


    // ============================================================
    //  FORMULATION HISTORY — API-driven Timeline Renderer
    // ============================================================

    /**
     * Renders the formulation history timeline from API response data.
     * Backend (PostgreSQL) is the source of truth — localStorage is no longer used.
     *
     * @param {object|null} formulationHistory  The `formulationHistory` field from the scan API response.
     *   Shape: { productId, versionNumber, changeStatus, versions: [{ version_number, change_status, created_at, scan_source, product_name }] }
     */
    function renderFormulationHistoryFromAPI(formulationHistory) {
        const container = document.getElementById('fh-timeline');
        const countBadge = document.getElementById('fh-version-count');
        const proHint = document.getElementById('fh-pro-hint');
        if (!container) return;

        // Graceful fallback — API may have been unavailable
        const versions = (formulationHistory && Array.isArray(formulationHistory.versions))
            ? formulationHistory.versions : [];

        if (versions.length === 0) {
            container.innerHTML = '<p class="fh-empty">Snapshot saved — history will appear here on future scans.</p>';
            if (countBadge) countBadge.textContent = '';
            return;
        }

        // Simple Pro check (Paddle access stored in localStorage by access.js)
        const isPro = (() => { try { return localStorage.getItem('ks_access') === 'pro'; } catch (_) { return false; } })();

        if (countBadge) countBadge.textContent = `${versions.length} version${versions.length === 1 ? '' : 's'}`;

        container.innerHTML = versions.map((entry, idx) => {
            const date = new Date(entry.created_at);
            const dateStr = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            const isCurrentVersion = idx === 0; // newest first from API
            const label = isCurrentVersion ? 'Current Snapshot' : 'Snapshot';
            const versionLabel = `Version ${entry.version_number}`;

            // --- Change status pill ---
            const status = entry.change_status || '';
            let changePill;
            if (status === 'First Record') {
                changePill = '<span class="fh-pill fh-pill--new">First Record</span>';
            } else if (status === 'Updated – Ingredient Change Detected') {
                changePill = isCurrentVersion
                    ? '<span class="fh-pill fh-pill--changed">Change Detected</span>'
                    : '<span class="fh-pill fh-pill--changed">Changed</span>';
            } else {
                // 'No Change Detected' or unknown
                changePill = isCurrentVersion
                    ? '<span class="fh-pill fh-pill--current">Latest</span>'
                    : '<span class="fh-pill fh-pill--stable">No Change Detected</span>';
            }

            // --- Pro comparison button ---
            // Current version (idx 0): no compare button (nothing to compare to yet)
            // Past versions: Compare (Pro) or lock icon (Free)
            const compareBtn = idx === 0 ? '' : isPro
                ? `<button class="fh-compare-btn" onclick="alert('Ingredient diff view coming in a future update.')">Compare <ion-icon name="git-compare-outline"></ion-icon></button>`
                : `<button class="fh-compare-btn fh-compare-btn--locked" title="Pro feature" onclick="document.getElementById('upgrade-modal').classList.remove('hidden')"><ion-icon name="lock-closed-outline"></ion-icon></button>`;

            return `
            <div class="fh-entry${isCurrentVersion ? ' fh-entry--current' : ''}">
                <div class="fh-entry-dot"></div>
                <div class="fh-entry-body">
                    <div class="fh-entry-top">
                        <div class="fh-entry-meta">
                            <span class="fh-entry-date">${dateStr}</span>
                            <span class="fh-entry-version">${versionLabel}</span>
                        </div>
                        <div class="fh-entry-right">
                            ${changePill}
                            ${compareBtn}
                        </div>
                    </div>
                    <div class="fh-entry-label">${label}</div>
                </div>
            </div>`;
        }).join('');

        // Pro upsell hint: show when 2+ versions and user is free
        if (proHint) proHint.style.display = (!isPro && versions.length >= 2) ? 'flex' : 'none';
    }

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
    const enableMonitoringBtn = document.getElementById('btn-enable-monitoring');

    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            alert("ACCOUNT REQUIRED\n\nCreate a profile to save scans to your inventory.");
        });
    }

    if (enableMonitoringBtn) {
        enableMonitoringBtn.addEventListener('click', () => {
            const upgradeModal = document.getElementById('upgrade-modal');
            if (upgradeModal) upgradeModal.classList.remove('hidden');
        });
    }

    // Modal Dismiss Trigger
    const closeUpgradeBtn = document.getElementById('btn-close-upgrade-modal');
    if (closeUpgradeBtn) {
        closeUpgradeBtn.addEventListener('click', () => {
            const upgradeModal = document.getElementById('upgrade-modal');
            if (upgradeModal) upgradeModal.classList.add('hidden');
        });
    }
}


/* \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d
   PHASE 4: LIVE DASHBOARD LOGIC
   \u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d\u003d */

// 1. Header Sync Animation
/*
 * =====================================================
 * SMART UPGRADE TRIGGERS
 * Non-blocking, dismissible, localStorage-driven.
 * =====================================================
 */

/**
 * Stable product fingerprint from sorted ingredient names.
 * Used to detect when a user re-scans the same formula.
 */
function buildProductFingerprint(ingredients) {
    if (!ingredients || !ingredients.length) return null;
    return ingredients
        .map(i => (i.name || '').toLowerCase().trim())
        .filter(Boolean)
        .sort()
        .join('|');
}

/**
 * Show a small, dismissible inline banner above the monitoring card.
 * @param {string} variant  CSS class: 'trigger-info' | 'trigger-amber' | 'trigger-green'
 * @param {string} icon     Ionicon name string
 * @param {string} message  Plain-text message
 */
function showTriggerBanner(variant, icon, message) {
    const container = document.getElementById('smart-trigger-banner');
    if (!container) return;

    container.innerHTML = `
        <div class="smart-trigger-banner ${variant}">
            <ion-icon name="${icon}"></ion-icon>
            <span>${message}</span>
            <button class="smart-trigger-dismiss" aria-label="Dismiss">
                <ion-icon name="close-outline"></ion-icon>
            </button>
        </div>
    `;
    container.style.display = 'block';

    container.querySelector('.smart-trigger-dismiss').addEventListener('click', () => {
        container.style.opacity = '0';
        container.style.transition = 'opacity 0.2s ease';
        setTimeout(() => { container.style.display = 'none'; }, 200);
    });
}

/**
 * Evaluate triggers and show at most one banner. Priority:
 *   1. Returning user re-scanned the same product formula
 *   2. Result is ambiguous/restricted (monitoring especially useful)
 *   3. User has scanned 2+ times total (repeat user)
 */
function checkSmartTriggers(outcome, ingredients) {
    const SCAN_COUNT_KEY = 'ks_scan_count';
    const FINGERPRINTS_KEY = 'ks_scan_fingerprints';

    // Update total scan count
    let scanCount = parseInt(localStorage.getItem(SCAN_COUNT_KEY) || '0', 10);
    scanCount += 1;
    localStorage.setItem(SCAN_COUNT_KEY, String(scanCount));

    // Update fingerprint history
    let prints = [];
    try {
        prints = JSON.parse(localStorage.getItem(FINGERPRINTS_KEY) || '[]');
        if (!Array.isArray(prints)) prints = [];
    } catch (_) { prints = []; }

    const fp = buildProductFingerprint(ingredients);
    const isRescan = Boolean(fp && prints.includes(fp));

    if (fp && !isRescan) {
        prints.push(fp);
        if (prints.length > 40) prints.shift(); // cap history
        localStorage.setItem(FINGERPRINTS_KEY, JSON.stringify(prints));
    }

    // --- Priority 1: Rescan detected ---
    if (isRescan) {
        showTriggerBanner(
            'trigger-green',
            'refresh-circle-outline',
            "You've scanned this formula before. Monitoring tracks changes automatically — no re-scanning needed."
        );
        return;
    }

    // --- Priority 2: Ambiguous / restricted outcome ---
    const cleanOutcome = (outcome || '').toUpperCase().replace(/-/g, '_');
    if (!['VERIFIED', 'COMPLIANT'].includes(cleanOutcome)) {
        showTriggerBanner(
            'trigger-amber',
            'warning-outline',
            "Ambiguous ingredients detected. Monitoring can alert you if this formula's status changes."
        );
        return;
    }

    // --- Priority 3: Repeat user (2nd scan or beyond) ---
    if (scanCount >= 2) {
        showTriggerBanner(
            'trigger-info',
            'bulb-outline',
            "Running multiple scans? Monitoring does this automatically — no manual re-checking needed."
        );
    }
}

/* =====================================================
   PHASE 4: LIVE DASHBOARD LOGIC
   ===================================================== */

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
