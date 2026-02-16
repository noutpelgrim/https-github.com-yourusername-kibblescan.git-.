/**
 * MODULE: Logic Kernel v2.2 (Backend)
 * Responsibility: Determine final audit outcome with strict safety enforcement.
 * 
 * RULES & PRECEDENCE:
 * 1. UNCERTAINTY OVERRIDES OPTIMISM.
 * 2. PRECEDENCE IS STRICTLY SEQUENTIAL (1 through 7).
 */

const { classifyIngredient } = require('./registry');

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

    const analyzedIngredients = ingredientsInfo.map(name => {
        return {
            name: name,
            classification: classifyIngredient(name)
        };
    });

    let hasRed = false;        // VIOLATION
    let hasYellow = false;     // NON-SPECIFIC
    let hasUnresolved = false; // UNRESOLVED
    let allGreen = true;       // UNRESTRICTED tracker

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

    // ORDER 3: ANY VIOLATION -> NON-COMPLIANT
    if (hasRed) {
        finalOutcome = 'NON-COMPLIANT';
        reason = 'Restricted Agents Detected.';
    }
    // ORDER 4: ANY UNRESOLVED -> AMBIGUOUS
    else if (hasUnresolved) {
        finalOutcome = 'AMBIGUOUS';
        reason = 'Unrecognized ingredients detected. Treating as potentially unsafe.';
    }
    // ORDER 5: ANY NON-SPECIFIC -> AMBIGUOUS
    else if (hasYellow) {
        finalOutcome = 'AMBIGUOUS';
        reason = 'Non-specific declarations detected.';
    }
    // ORDER 6: ALL UNRESTRICTED -> VERIFIED
    else if (allGreen) {
        finalOutcome = 'VERIFIED';
        reason = 'All ingredients passed toxicological review.';
    }
    // ORDER 7: ELSE -> UNKNOWN_FORMULATION (Fallback)
    else {
        finalOutcome = 'UNKNOWN_FORMULATION';
        reason = 'Classification incomplete (Logical Fallback).';
    }

    // ---------------------------------------------------------
    // 4. RUNTIME SAFETY GUARD (Sanity Check)
    // ---------------------------------------------------------
    if (finalOutcome === 'VERIFIED') {
        const runtimeCheckUnresolved = analyzedIngredients.some(i => i.classification === 'UNRESOLVED');
        const runtimeCheckYellow = analyzedIngredients.some(i => i.classification === 'NON-SPECIFIC');
        const runtimeCheckRed = analyzedIngredients.some(i => i.classification === 'VIOLATION');

        if (runtimeCheckUnresolved || runtimeCheckYellow || runtimeCheckRed) {
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
