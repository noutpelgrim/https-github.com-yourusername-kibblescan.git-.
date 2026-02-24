/**
 * MODULE: Logic Kernel v2.4 (Backend)
 * Responsibility: Determine final audit outcome with strict safety enforcement.
 *
 * INGREDIENT STATUS TIERS (displayed in UI):
 *   TYPICAL        ✅  UNRESTRICTED — common, well-characterised ingredient
 *   NEEDS_REVIEW   🟡  NON-SPECIFIC, UNRESOLVED, or OCR confidence < 90%
 *   EVIDENCE_FLAG  🔴  VIOLATION with a rationale string + ≥1 citation URL
 *
 * Each ingredient in output now also carries:
 *   rawToken           — the original OCR token before normalization
 *   matchedName        — the normalized registry key
 *   ingredientConfidence — 0–100, Levenshtein similarity (raw vs normalized)
 *
 * RULES & PRECEDENCE:
 * 1. UNCERTAINTY OVERRIDES OPTIMISM.
 * 2. PRECEDENCE IS STRICTLY SEQUENTIAL.
 */

const { classifyIngredient, getEvidenceFlagData } = require('./registry');
const { computeIngredientConfidence } = require('./normalize');
const { getIngredientKnowledge } = require('./ingredient_knowledge');

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Map a single classification + per-ingredient OCR confidence into UI tier.
 * @param {string} name               Normalised ingredient name
 * @param {string} classification     UNRESTRICTED | NON-SPECIFIC | VIOLATION | UNRESOLVED
 * @param {number} ingredientConfidence 0–100 per-ingredient OCR match score
 * @returns {{ status, rationale, citations }}
 */
function resolveDisplayStatus(name, classification, ingredientConfidence) {
    // ── 🔴 Evidence Flag ────────────────────────────────────────────────────
    if (classification === 'VIOLATION') {
        const evidence = getEvidenceFlagData(name);
        return {
            status: 'EVIDENCE_FLAG',
            rationale: evidence
                ? evidence.rationale
                : 'A specific concern rule was triggered for this ingredient.',
            citations: evidence ? evidence.citations : []
        };
    }

    // ── 🟡 Needs Review — non-specific declaration ───────────────────────────
    if (classification === 'NON-SPECIFIC') {
        return {
            status: 'NEEDS_REVIEW',
            rationale: 'Non-specific ingredient declaration — source and quality cannot be verified from name alone.',
            citations: []
        };
    }

    // ── 🟡 Needs Review — not in registry ───────────────────────────────────
    if (classification === 'UNRESOLVED') {
        return {
            status: 'NEEDS_REVIEW',
            rationale: 'Ingredient not found in the registry — identity, source, and safety cannot be assessed from the name alone.',
            citations: []
        };
    }

    // ── UNRESTRICTED: downgrade if per-ingredient OCR confidence is low ──────
    if (ingredientConfidence < 90) {
        return {
            status: 'NEEDS_REVIEW',
            rationale: 'OCR match uncertain. Please verify this ingredient on the label.',
            citations: []
        };
    }

    // ── ✅ Identified / Typical ──────────────────────────────────────────────
    return {
        status: 'TYPICAL',
        rationale: null,
        citations: []
    };
}


// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

function classifyFormulation(ingredientsInfo, confidence = 0.98) {
    // ---------------------------------------------------------
    // 1. DATA INTEGRITY GATES (Fail-Closed)
    // ---------------------------------------------------------

    // GATE 1: Empty Data -> UNKNOWN_FORMULATION
    if (!ingredientsInfo || ingredientsInfo.length === 0) {
        return {
            outcome: 'UNKNOWN_FORMULATION',
            reason: 'No ingredients detected.',
            ingredients: [],
            confidence: confidence
        };
    }

    // GATE 2: Low Confidence -> UNKNOWN_FORMULATION
    if (confidence < 0.70) {
        return {
            outcome: 'UNKNOWN_FORMULATION',
            reason: `Confidence too low (${(confidence * 100).toFixed(0)}%). Scan rejected.`,
            ingredients: [],
            confidence: confidence
        };
    }

    // ---------------------------------------------------------
    // 2. CLASSIFICATION ENGINE
    // ---------------------------------------------------------

    const analyzedIngredients = ingredientsInfo.map(entry => {
        // Accept both { raw, normalized } objects (new path) and plain strings (backward compat)
        const isObject = entry && typeof entry === 'object';
        const rawToken = isObject ? (entry.raw || entry.normalized) : String(entry);
        const name = isObject ? entry.normalized : String(entry);

        const ingConf = computeIngredientConfidence(rawToken, name); // 0–100
        const classification = classifyIngredient(name);
        const display = resolveDisplayStatus(name, classification, ingConf);
        const knowledge = getIngredientKnowledge(name);

        return {
            name,                        // normalized name (used by UI as display label)
            rawToken,                    // raw OCR token
            matchedName: name,           // explicit alias for transparency panel
            ingredientConfidence: ingConf, // 0–100
            classification,              // raw backend value (used for logic gates)
            status: display.status,      // UI tier
            rationale: display.rationale,
            citations: display.citations,
            // ── Clinic-safe knowledge fields ──
            whatItIs: knowledge.whatItIs,
            whyUsed: knowledge.whyUsed,
            clinicalNotes: knowledge.clinicalNotes,
            hasClinicalEvidence: knowledge.hasClinicalEvidence
        };
    });

    let hasRed = false;
    let hasYellow = false;
    let hasUnresolved = false;
    let allGreen = true;

    analyzedIngredients.forEach(ing => {
        if (ing.classification === 'VIOLATION') hasRed = true;
        if (ing.classification === 'NON-SPECIFIC') hasYellow = true;
        if (ing.classification === 'UNRESOLVED') hasUnresolved = true;
        if (ing.classification !== 'UNRESTRICTED') allGreen = false;
    });

    let finalOutcome = 'UNKNOWN_FORMULATION';
    let reason = '';

    // ---------------------------------------------------------
    // 3. LOGIC KERNEL (Strict Precedence)
    // ---------------------------------------------------------

    if (hasRed) {
        finalOutcome = 'NON-COMPLIANT';
        reason = 'Restricted Agents Detected.';
    } else if (hasUnresolved) {
        finalOutcome = 'AMBIGUOUS';
        reason = 'Unrecognized ingredients detected. Treating as potentially unsafe.';
    } else if (hasYellow) {
        finalOutcome = 'AMBIGUOUS';
        reason = 'Non-specific declarations detected.';
    } else if (allGreen) {
        finalOutcome = 'VERIFIED';
        reason = 'All ingredients passed toxicological review.';
    } else {
        finalOutcome = 'UNKNOWN_FORMULATION';
        reason = 'Classification incomplete (Logical Fallback).';
    }

    // ---------------------------------------------------------
    // 4. RUNTIME SAFETY GUARD (Sanity Check)
    // ---------------------------------------------------------
    if (finalOutcome === 'VERIFIED') {
        const unsafe = analyzedIngredients.some(i =>
            i.classification === 'UNRESOLVED' ||
            i.classification === 'NON-SPECIFIC' ||
            i.classification === 'VIOLATION'
        );
        if (unsafe) {
            console.error(`[CRITICAL LOGIC FAILURE] System attempted to Verify unsafe formulation:`, analyzedIngredients);
            throw new Error("SAFETY VIOLATION: Verified verdict reached despite unresolved/restricted ingredients.");
        }
    }

    return {
        outcome: finalOutcome,
        reason: reason,
        ingredients: analyzedIngredients,
        confidence: confidence
    };
}

module.exports = { classifyFormulation };

