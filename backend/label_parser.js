/**
 * MODULE: Label Parser
 * Responsibility: Extract structured metadata from raw OCR text.
 * Fields returned: productType, lifeStage, aafcoStatement, guaranteedAnalysisPresent
 *
 * Rules:
 * - Never infer nutrition claims; only detect what is stated on label.
 * - All detection is text-search only — return "Unknown" when not found.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Product Type Detection
// ─────────────────────────────────────────────────────────────────────────────

const TREAT_SIGNALS = ['treat', 'treats', 'snack', 'snacks', 'chew', 'chews', 'reward', 'rewards', 'biscuit', 'jerky', 'dental chew'];
const SUPPLEMENTAL_SIGNALS = ['supplemental', 'supplement', 'intermittent', 'not intended as a sole source'];
const COMPLETE_SIGNALS = ['complete and balanced', 'complete & balanced', 'complete&balanced'];

/**
 * @param {string} lower  Lowercased raw OCR text
 * @returns {'Treat' | 'Complete & Balanced' | 'Supplemental' | 'Unknown'}
 */
function detectProductType(lower) {
    if (TREAT_SIGNALS.some(s => lower.includes(s))) return 'Treat';
    if (SUPPLEMENTAL_SIGNALS.some(s => lower.includes(s))) return 'Supplemental';
    if (COMPLETE_SIGNALS.some(s => lower.includes(s))) return 'Complete & Balanced';
    return 'Unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// AAFCO Statement Detection
// ─────────────────────────────────────────────────────────────────────────────

// Patterns that typically bracket an AAFCO nutritional adequacy statement
const AAFCO_TRIGGERS = [
    /formulated to meet.*?(?:\.|$)/i,
    /animal feeding tests.*?(?:\.|$)/i,
    /provides complete.*?nutrition.*?(?:\.|$)/i,
    /meets.*?aafco.*?(?:\.|$)/i,
    /aafco.*?nutrient profiles?.*?(?:\.|$)/i,
    /nutritional adequacy.*?(?:\.|$)/i,
];

/**
 * Attempt to extract the AAFCO nutritional adequacy statement from raw text.
 * Returns the matched sentence or null.
 * @param {string} rawText
 * @returns {string|null}
 */
function detectAafcoStatement(rawText) {
    for (const pattern of AAFCO_TRIGGERS) {
        const match = rawText.match(pattern);
        if (match) {
            return match[0].trim().replace(/\s+/g, ' ');
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Life Stage Detection (from AAFCO statement or surrounding context)
// ─────────────────────────────────────────────────────────────────────────────

const LIFE_STAGE_RULES = [
    { signals: ['all life stages', 'all lifestages', 'all stages'], result: 'All Life Stages' },
    { signals: ['growth and reproduction', 'gestation', 'lactation'], result: 'Growth / Reproduction' },
    { signals: ['growth', 'puppy', 'kitten', 'junior', 'large breed puppy'], result: 'Growth' },
    { signals: ['adult', 'maintenance', 'senior'], result: 'Adult Maintenance' },
];

/**
 * @param {string} lower  Lowercased raw OCR text
 * @returns {string}
 */
function detectLifeStage(lower) {
    for (const rule of LIFE_STAGE_RULES) {
        if (rule.signals.some(s => lower.includes(s))) return rule.result;
    }
    return 'Unknown';
}

// ─────────────────────────────────────────────────────────────────────────────
// Guaranteed Analysis Detection
// ─────────────────────────────────────────────────────────────────────────────

const GA_SIGNALS = ['guaranteed analysis', 'analytical constituents', 'nutritional information', 'crude protein', 'crude fat', 'crude fiber'];

/**
 * @param {string} lower  Lowercased raw OCR text
 * @returns {boolean}
 */
function detectGuaranteedAnalysis(lower) {
    return GA_SIGNALS.some(s => lower.includes(s));
}

// ─────────────────────────────────────────────────────────────────────────────
// Overall OCR Match (average ingredient confidence)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {Array<{ingredientConfidence: number}>} ingredients
 * @returns {number} 0–100 integer
 */
function computeOverallOCRMatch(ingredients) {
    if (!ingredients || ingredients.length === 0) return 0;
    const vals = ingredients.map(i => typeof i.ingredientConfidence === 'number' ? i.ingredientConfidence : 100);
    return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main export
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract all scan-summary metadata from raw OCR text and classified ingredients.
 * @param {string} rawText           Full raw OCR text from Vision API
 * @param {Array}  ingredients       Classified ingredient array (with ingredientConfidence)
 * @returns {{
 *   overallOCRMatch: number,
 *   productType: string,
 *   lifeStage: string,
 *   guaranteedAnalysisPresent: boolean,
 *   aafcoStatement: string|null
 * }}
 */
function detectLabelMetadata(rawText, ingredients) {
    const lower = (rawText || '').toLowerCase();
    const aafcoStatement = detectAafcoStatement(rawText);

    // Detect product type — also check AAFCO statement text as fallback
    let productType = detectProductType(lower);
    if (productType === 'Unknown' && aafcoStatement &&
        (aafcoStatement.toLowerCase().includes('complete and balanced') ||
            aafcoStatement.toLowerCase().includes('complete & balanced'))) {
        productType = 'Complete & Balanced';
    }

    return {
        overallOCRMatch: computeOverallOCRMatch(ingredients),
        productType,
        lifeStage: detectLifeStage(lower),
        guaranteedAnalysisPresent: detectGuaranteedAnalysis(lower),
        aafcoStatement
    };
}

module.exports = { detectLabelMetadata };
