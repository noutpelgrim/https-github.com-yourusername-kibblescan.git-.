/**
 * MODULE: Registry Database
 * Responsibility: Map normalized strings to Safety Classifications.
 * 
 * CLASSIFICATIONS:
 * - VIOLATION (Red): Known toxic/restricted agents.
 * - NON-SPECIFIC (Yellow): Vague terms masking source.
 * - UNRESTRICTED (Green): Safe, whole foods.
 */

const VIOLATIONS = [
    "bha", "bht", "ethoxyquin", "red 40", "yellow 5", "blue 2",
    "menadione", "propylene glycol", "titanium dioxide"
];

const NON_SPECIFIC = [
    "meat by-product", "meat meal", "animal fat", "animal digest",
    "poultry by-product meal", "natural flavor", "corn gluten meal",
    "wheat gluten", "soybean meal"
];

const UNRESTRICTED = [
    "chicken", "beef", "lamb", "turkey", "salmon", "duck",
    "chicken meal", "beef meal", "brown rice", "sweet potato",
    "peas", "whole corn", "wheat", "oats", "flaxseed",
    "vitamin", "mineral", "rice"
];

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

module.exports = { classifyIngredient };
