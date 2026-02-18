/**
 * MODULE: Registry Database
 * Responsibility: Map normalized strings to Safety Classifications.
 * 
 * CLASSIFICATIONS:
 * - VIOLATION (Red): Known toxic/restricted agents.
 * - NON-SPECIFIC (Yellow): Vague terms masking source.
 * - UNRESTRICTED (Green): Safe, whole foods.
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
    "wheat gluten", "soybean meal"
];

let UNRESTRICTED = [
    "chicken", "beef", "lamb", "turkey", "salmon", "duck",
    "chicken meal", "beef meal", "brown rice", "sweet potato",
    "peas", "whole corn", "wheat", "oats", "flaxseed",
    "vitamin", "mineral", "rice", "broth", "pork lungs", "liver",
    "potassium chloride", "zinc sulfate", "sodium selenite",
    "carrageenan", "guar gum", "locust bean gum", "choline chloride",
    "thiamine mononitrate", "calcium pantothenate", "riboflavin supplement",
    "salt", "ferrous sulfate", "potassium iodide", "copper sulfate",
    "manganese sulfate", "calcium iodate", "biotin", "folic acid"
];

// Initialize Registry from Database
async function init() {
    try {
        const res = await db.query('SELECT name, classification FROM ingredients');
        if (res.rows.length > 0) {
            // Clear defaults if DB has data (or merge? replacing is safer to avoid dupes if DB serves as truth)
            // Actually, let's just REPLACE with DB content to ensure DB is the source of truth.
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
        } else {
            logger.warn("[REGISTRY] Database empty. Using hardcoded fallback.");
        }
    } catch (err) {
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
        source: (VIOLATIONS.length > 20) ? 'LIKELY_DB_OR_MASS_IMPORT' : 'FALLBACK_OR_EMPTY'
    };
}

module.exports = { classifyIngredient, init, getStats };
