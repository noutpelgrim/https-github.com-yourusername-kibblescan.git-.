/**
 * MODULE: Normalization Engine
 * Responsibility: Clean raw OCR text into comparable strings.
 */

/**
 * Standardizes a single ingredient string.
 * - Lowercases.
 * - Removes noise (percentages, common fluff).
 * - Preserves: [a-z], [0-9], space, hyphen.
 */
function normalizeText(rawString) {
    if (typeof rawString !== 'string') return '';
    if (!rawString || rawString.trim().length === 0) return '';

    return rawString
        .toLowerCase()
        // 1. Remove percentages (e.g. 12%, 0.5%)
        .replace(/\d+(\.\d+)?%/g, '')
        // 2. Remove common fluff words (optional but helpful)
        .replace(/\bpreserved with\b/g, '')
        .replace(/\b(added|source of)\b/g, '')
        // 3. Remove all except alpha-numeric, space, hyphen
        .replace(/[^a-z0-9 -]/g, '')
        // 4. Collapse multiple spaces
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Parses raw block text into an array of clean ingredient strings.
 * - Handles "Ingredients:" prefix.
 * - Handles "Guaranteed Analysis" suffix.
 * - Extracts parenthetical additives as separate items.
 */
function extractIngredients(text) {
    if (typeof text !== 'string') return [];
    if (!text || text.trim().length === 0) return [];

    let content = text;

    // 1. Scope to Ingredients section
    if (content.toLowerCase().includes('ingredients:')) {
        content = content.split(/ingredients:/i)[1];
    }
    // 2. Stop at Guaranteed Analysis
    if (content.toLowerCase().includes('guaranteed analysis')) {
        content = content.split(/guaranteed analysis/i)[0];
    }

    // 3. Pre-process separators
    // Replace parens with commas to treat embedded additives as separate list items.
    // e.g. "Chicken Fat (preserved with BHA)" -> "Chicken Fat , preserved with BHA ,"
    content = content.replace(/[()]/g, ',');

    // 4. Split by delimiters
    // Comma, Semicolon, Newline, Period
    const rawList = content.split(/[,;\n\.]/);

    // 5. Normalize and Filter
    const cleanList = rawList
        .map(item => normalizeText(item))
        .filter(item => item && item.length > 2); // Filter out empty or tiny noise strings

    return cleanList;
}

// Alias for backward compatibility if routes import 'cleanText'
// Alias for backward compatibility if routes import 'cleanText'
const cleanText = extractIngredients;

/**
 * Normalizes email addresses.
 * - Lowercases.
 * - Trims whitespace.
 * - Collapses multiple spaces.
 */
function normalizeEmail(email) {
    if (typeof email !== 'string') return '';
    return email
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ');
}

module.exports = {
    normalizeText,
    extractIngredients,
    cleanText,
    normalizeEmail
};
