/**
 * Normalizes an ingredient string for comparison.
 * Lowercases, trims, and removes everything except alphanumeric characters and spaces.
 * 
 * @param {string} ingredient 
 * @returns {string}
 */
function normalizeIngredient(ingredient) {
    if (!ingredient) return '';
    return ingredient
        .toString()
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .trim();
}

/**
 * Compares two arrays of ingredients and returns the added and removed items.
 * Normalizes all strings before comparison to avoid false positives (e.g. "Chicken," vs "Chicken").
 * 
 * @param {string[]} previousIngredients - The older ingredient list.
 * @param {string[]} currentIngredients - The newer ingredient list.
 * @returns {{ added: string[], removed: string[] }}
 */
function diffIngredients(previousIngredients = [], currentIngredients = []) {
    // 1. Create maps of normalized -> original for both arrays
    // This allows us to return the original string format (or at least a clean version of it) 
    // rather than the strictly normalized internal version.
    const prevMap = new Map();
    previousIngredients.forEach(item => {
        const norm = normalizeIngredient(item);
        if (norm) prevMap.set(norm, item.trim());
    });

    const currMap = new Map();
    currentIngredients.forEach(item => {
        const norm = normalizeIngredient(item);
        if (norm) currMap.set(norm, item.trim());
    });

    const added = [];
    const removed = [];

    // 2. Find Removed items: items in prevMap that DO NOT exist in currMap
    for (const [normPrev, originalPrev] of prevMap.entries()) {
        if (!currMap.has(normPrev)) {
            removed.push(originalPrev);
        }
    }

    // 3. Find Added items: items in currMap that DO NOT exist in prevMap
    for (const [normCurr, originalCurr] of currMap.entries()) {
        if (!prevMap.has(normCurr)) {
            added.push(originalCurr);
        }
    }

    return { added, removed };
}

module.exports = { diffIngredients, normalizeIngredient };
