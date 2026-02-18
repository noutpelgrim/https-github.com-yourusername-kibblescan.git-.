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

let lastError = null;

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
                // ...
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

// ...

function getStats() {
    return {
        violations: VIOLATIONS.length,
        non_specific: NON_SPECIFIC.length,
        unrestricted: UNRESTRICTED.length,
        source: (VIOLATIONS.length > 20) ? 'LIKELY_DB_OR_MASS_IMPORT' : 'FALLBACK_OR_EMPTY',
        last_error: lastError
    };
}

module.exports = { classifyIngredient, init, getStats };
