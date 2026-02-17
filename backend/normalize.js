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
    // 2. Stop at common end-of-section markers

    // 2. Stop at common end-of-section markers
    // 2. Stop at common end-of-section markers
    const stopPhrases = [
        'guaranteed analysis',
        'daily feeding guide',
        'calorie content',
        'distributed by',
        'manufactured by',
        'trademarks',
        'nutritional levels',
        'netutional levels', // Common OCR typo for nutritional
        'aafco',
        'find cassic', // Specific to this label noise
        'formula with'
    ];
    for (const phrase of stopPhrases) {
        if (content.toLowerCase().includes(phrase)) {
            content = content.split(new RegExp(phrase, 'i'))[0];
        }
    }

    // 2.5 Heuristic Start Finding (if "Ingredients:" missing)
    if (!text.toLowerCase().includes('ingredients:')) {
        // Look for common first ingredients or cut off common pre-text
        const commonStarts = ['chicken', 'beef', 'water', 'meat', 'broth', 'turkey', 'lamb', 'duck'];
        const lines = content.split('\n');
        let startIndex = 0;

        // If we see "Moisture" or "Crude", likely the stuff AFTER is the list
        for (let i = 0; i < lines.length; i++) {
            const lower = lines[i].toLowerCase();
            if (lower.includes('moisture') || lower.includes('crude protein') || lower.includes('crude fat')) {
                startIndex = i + 1; // Start AFTER this line
            }
        }

        if (startIndex > 0 && startIndex < lines.length) {
            content = lines.slice(startIndex).join('\n');
        }
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
        .filter(item => {
            if (!item || item.length < 2) return false;
            // Filter noise words
            const noise = ['crude', 'protein', 'fat', 'fiber', 'moisture', 'min', 'max', 'ash', 'guaranteed', 'analysis', 'supplement', 'vitamin', 'mineral', 'vitamins', 'minerals'];
            if (noise.includes(item)) return false;

            // Filter out manufacturer info
            if (item.includes('purina') || item.includes('petcare') || item.includes('usa') || item.includes('mo 63164') || item.includes('louis')) return false;

            return true;
        })
        .map(item => {
            // Fix common OCR typos
            if (item === 'mamin b-3') return 'vitamin b-3';
            if (item === 'choline t') return 'choline chloride';
            if (item === 'sum iodide') return 'potassium iodide';
            if (item === 'fes') return 'ferrous sulfate';
            if (item === 'focad') return ''; // trash
            if (item.startsWith('dden ')) return 'chicken ' + item.split(' ')[1]; // Heuristic fix for cut off first word
            if (item.startsWith('- ')) return item.substring(2); // Remove bullet point
            if (item === 'vitamin') return ''; // trash
            if (item === 'supplement') return ''; // trash
            if (item === '- supplement') return ''; // trash
            return item;
        })
        .filter(item => item.length > 2);

    return cleanList;
}

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
