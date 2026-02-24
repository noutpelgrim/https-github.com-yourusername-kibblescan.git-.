/**
 * MODULE: Registry Database
 * Responsibility: Map normalized strings to Safety Classifications.
 *
 * CLASSIFICATIONS:
 * - VIOLATION      → 🔴 Evidence Flag  (specific hazard rule + citation)
 * - NON-SPECIFIC   → 🟡 Needs Review  (ambiguous/non-specific declaration)
 * - UNRESTRICTED   → ✅ Identified / Typical (common, well-characterised ingredient)
 * - UNRESOLVED     → 🟡 Needs Review  (not in registry; identity uncertain)
 */

const db = require('./db');
const logger = require('./utils/logger');

// Initial Hardcoded Lists (Fallback)
let VIOLATIONS = [
    "bha", "bht", "ethoxyquin", "red 40", "yellow 5", "blue 2",
    "menadione", "propylene glycol", "titanium dioxide"
];

let NON_SPECIFIC = [
    "meat by-product", "meat meal", "animal fat", "animal digest",
    "poultry by-product meal", "natural flavor", "corn gluten meal",
    "wheat gluten", "soybean meal",
    // Inorganic trace minerals — dose-dependent, bioavailability debated
    "sodium selenite", "zinc sulfate", "copper sulfate",
    // Controversial additives — mixed evidence in pet food safety literature
    "carrageenan", "guar gum", "locust bean gum"
];

let UNRESTRICTED = [
    "chicken", "beef", "lamb", "turkey", "salmon", "duck",
    "chicken meal", "beef meal", "brown rice", "sweet potato",
    "peas", "whole corn", "wheat", "oats", "flaxseed",
    "vitamin", "mineral", "rice", "broth", "pork lungs", "liver",
    "potassium chloride", "choline chloride",
    "thiamine mononitrate", "calcium pantothenate", "riboflavin supplement",
    "salt", "ferrous sulfate", "potassium iodide",
    "manganese sulfate", "calcium iodate", "biotin", "folic acid"
];

let lastError = null;

/**
 * Static evidence table for VIOLATION ingredients.
 * Each key must match a string present in the VIOLATIONS array (substring match).
 * rationale : short human-readable concern (1–2 sentences).
 * citations : array of authoritative URLs.
 */
const EVIDENCE_FLAG_DATA = {
    "bha": {
        rationale: "BHA (Butylated Hydroxyanisole) is a synthetic antioxidant classified as a possible carcinogen (Group 2B) by IARC. Its regulatory status in pet food is under active review in several jurisdictions.",
        citations: [
            "https://monographs.iarc.who.int/list-of-classifications",
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3299029/"
        ]
    },
    "bht": {
        rationale: "BHT (Butylated Hydroxytoluene) is a synthetic antioxidant. Some animal studies show endocrine disruption and liver effects at elevated doses; evidence in companion animals remains limited.",
        citations: [
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC6315388/"
        ]
    },
    "ethoxyquin": {
        rationale: "Ethoxyquin is a synthetic preservative originally developed as a rubber stabiliser and pesticide. The EU restricted its use in pet food in 2020 pending toxicological re-evaluation.",
        citations: [
            "https://efsa.onlinelibrary.wiley.com/doi/full/10.2903/j.efsa.2020.6222"
        ]
    },
    "menadione": {
        rationale: "Menadione (synthetic Vitamin K3) has been associated with hepatotoxicity and haemolytic anaemia at high doses in animal models. Natural vitamin K sources are generally preferred.",
        citations: [
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC1360504/"
        ]
    },
    "propylene glycol": {
        rationale: "Propylene glycol is prohibited by the FDA for use in cat food due to documented Heinz body anaemia in felines. Its use in dog food is still permitted but remains controversial.",
        citations: [
            "https://www.fda.gov/animal-veterinary/animal-health-literacy/potentially-harmful-substances"
        ]
    },
    "red 40": {
        rationale: "Red 40 (Allura Red AC) is an artificial dye with no nutritional value. Some studies note possible associations with hypersensitivity responses; no direct harm evidence in companion animals, but regulatory concern persists.",
        citations: [
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3441937/"
        ]
    },
    "yellow 5": {
        rationale: "Yellow 5 (Tartrazine) is an artificial dye associated with hypersensitivity reactions in some mammals and provides no nutritional benefit in pet food.",
        citations: [
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3433712/"
        ]
    },
    "blue 2": {
        rationale: "Blue 2 (Indigo Carmine) is an artificial colorant with no nutritional function. High-dose rodent studies reported elevated brain tumour incidence; relevance to companion animals is uncertain.",
        citations: [
            "https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3441937/"
        ]
    },
    "titanium dioxide": {
        rationale: "Titanium dioxide is classified as a possible carcinogen (Group 2B, IARC). The EU banned its use as a food additive in 2022 following an EFSA safety review.",
        citations: [
            "https://monographs.iarc.who.int/list-of-classifications",
            "https://efsa.onlinelibrary.wiley.com/doi/10.2903/j.efsa.2021.6585"
        ]
    }
};

/**
 * Returns evidence flag data for a normalized ingredient name, or null.
 * @param {string} normalizedName
 * @returns {{ rationale: string, citations: string[] } | null}
 */
function getEvidenceFlagData(normalizedName) {
    for (const key of Object.keys(EVIDENCE_FLAG_DATA)) {
        if (normalizedName.includes(key)) return EVIDENCE_FLAG_DATA[key];
    }
    return null;
}

// Initialize Registry from Database
async function init() {
    try {
        const res = await db.query('SELECT name, classification FROM ingredients');
        if (res.rows.length > 0) {
            // ... (existing logic) ...
            VIOLATIONS = [];
            NON_SPECIFIC = [];
            UNRESTRICTED = [];

            res.rows.forEach(row => {
                const name = row.name.toLowerCase();
                if (row.classification === 'VIOLATION') VIOLATIONS.push(name);
                else if (row.classification === 'NON-SPECIFIC') NON_SPECIFIC.push(name);
                else if (row.classification === 'UNRESTRICTED') UNRESTRICTED.push(name);
            });
            logger.info(`[REGISTRY] Loaded ${res.rows.length} ingredients from Database.`);
            lastError = null;
        } else {
            logger.warn("[REGISTRY] Database empty. Using hardcoded fallback.");
            lastError = "Database returned 0 rows";
        }
    } catch (err) {
        lastError = err.message;
        logger.error("[REGISTRY] Failed to load from DB (Fallback active)", { error: err.message });
    }
}

function classifyIngredient(normalizedName) {
    // 1. Check Violations FIRST (Safety Critical)
    for (const key of VIOLATIONS) {
        if (normalizedName.includes(key)) return "VIOLATION";
    }

    // 2. Check Non-Specific (Warning)
    for (const key of NON_SPECIFIC) {
        if (normalizedName.includes(key)) return "NON-SPECIFIC";
    }

    // 3. Check Unrestricted (Safe)
    for (const key of UNRESTRICTED) {
        if (normalizedName.includes(key)) return "UNRESTRICTED";
    }

    // Default to UNRESOLVED (Treat as Ambiguous per User Rule)
    return "UNRESOLVED";
}

function getStats() {
    return {
        violations: VIOLATIONS.length,
        non_specific: NON_SPECIFIC.length,
        unrestricted: UNRESTRICTED.length,
        source: (VIOLATIONS.length > 20) ? 'LIKELY_DB_OR_MASS_IMPORT' : 'FALLBACK_OR_EMPTY',
        last_error: lastError
    };
}

module.exports = { classifyIngredient, getEvidenceFlagData, init, getStats };
