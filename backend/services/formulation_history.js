/**
 * formulation_history.js
 * ──────────────────────
 * Service layer for formulation versioning.
 *
 * Rules enforced here:
 *   - Every scan creates a version entry (no monitoring required).
 *   - First scan for a fingerprint → change_status = 'First Record'
 *   - Subsequent scan, same fingerprint → 'No Change Detected'
 *   - Subsequent scan, different fingerprint on same product → 'Updated – Ingredient Change Detected'
 *   - Manual rescans are always free (no auth check).
 *   - Background monitoring remains a Pro feature (not handled here).
 */

'use strict';

const db = require('../db');
const logger = require('../utils/logger');

/**
 * Build a stable, normalised fingerprint from an ingredient list.
 * Lowercased, stripped of punctuation, sorted alphabetically, joined.
 *
 * @param {Array<{name: string}> | string} ingredients
 * @returns {string}
 */
function buildFingerprint(ingredients) {
    let names;
    if (typeof ingredients === 'string') {
        names = ingredients.split(',').map(s => s.trim());
    } else if (Array.isArray(ingredients)) {
        names = ingredients.map(i => (i.name || i.normalized || i).toString().trim());
    } else {
        names = [];
    }

    return names
        .map(n => n.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim())
        .filter(Boolean)
        .sort()
        .join('|');
}

/**
 * Build a human-readable ingredient list string for storage.
 *
 * @param {Array<{name: string}> | string} ingredients
 * @returns {string}
 */
function buildIngredientList(ingredients) {
    if (typeof ingredients === 'string') return ingredients.trim();
    if (Array.isArray(ingredients)) {
        return ingredients.map(i => (i.name || i.normalized || i).toString().trim()).join(', ');
    }
    return '';
}

/**
 * Save a scan as a formulation version entry.
 *
 * Looks up an existing product by fingerprint. If found, creates a new
 * version row comparing the current fingerprint to the previous version.
 * If not found, creates both a product row and the first version.
 *
 * @param {object} opts
 * @param {Array}  opts.ingredients        Classified ingredient array from classifyFormulation
 * @param {object} opts.classificationResult  Full result from classifyFormulation
 * @param {string} [opts.productName]      Optional product name (extracted from label or 'Unknown Product')
 * @param {string} [opts.scanSource]       'OCR' | 'Manual'
 *
 * @returns {Promise<{ versionId: string, versionNumber: number, changeStatus: string, productId: string }>}
 */
async function saveVersion({ ingredients, classificationResult, productName = 'Unknown Product', scanSource = 'Manual' }) {
    const fingerprint = buildFingerprint(ingredients);
    const ingredientList = buildIngredientList(ingredients);

    if (!fingerprint) {
        logger.warn('[FH] Empty fingerprint — skipping version save.');
        return null;
    }

    try {
        // ── 1. Upsert the product row ─────────────────────────────────
        // If a product with this fingerprint already exists, return it.
        // Note: a different fingerprint = a different product (or a changed recipe).
        // We use the fingerprint as the product identity key so that any
        // change automatically creates a new version under the same product
        // IF the product was previously seen with a close fingerprint —
        // but since we cannot do fuzzy matching cheaply at insert time,
        // we use the approach: product identity = first fingerprint seen.
        //
        // Step A: look for an existing product whose LATEST version has the
        //         same BASE product name (from label_parser) if provided,
        //         OR fall back to fingerprint equality.
        //
        // Simplified approach for v1: fingerprint acts as the product key.
        // If it changes, we first check if there's a product with the same
        // name — if yes, add a new version to that product. Otherwise create.

        let productId;
        let previousFingerprint = null;
        let previousVersionNumber = 0;

        // Try to find an existing product by name (if name provided and not 'Unknown Product')
        if (productName && productName !== 'Unknown Product') {
            const existing = await db.query(
                `SELECT id FROM formulation_products WHERE LOWER(product_name) = LOWER($1) LIMIT 1`,
                [productName]
            );
            if (existing.rows.length > 0) {
                productId = existing.rows[0].id;
            }
        }

        // Fall back: find by exact fingerprint (first scan match)
        if (!productId) {
            const existing = await db.query(
                `SELECT id FROM formulation_products WHERE fingerprint = $1 LIMIT 1`,
                [fingerprint]
            );
            if (existing.rows.length > 0) {
                productId = existing.rows[0].id;
            }
        }

        // If still no product, create one
        if (!productId) {
            const created = await db.query(
                `INSERT INTO formulation_products (fingerprint, product_name, scan_source)
                 VALUES ($1, $2, $3)
                 RETURNING id`,
                [fingerprint, productName, scanSource]
            );
            productId = created.rows[0].id;
            logger.info(`[FH] New product created: ${productId} (${productName})`);
        } else {
            // Update product fingerprint + timestamp if the recipe has changed
            await db.query(
                `UPDATE formulation_products SET fingerprint = $1, updated_at = NOW() WHERE id = $2`,
                [fingerprint, productId]
            );
        }

        // ── 2. Get latest version for this product ────────────────────
        const latestVersion = await db.query(
            `SELECT version_number, fingerprint FROM formulation_versions
             WHERE product_id = $1
             ORDER BY version_number DESC
             LIMIT 1`,
            [productId]
        );

        if (latestVersion.rows.length > 0) {
            previousFingerprint = latestVersion.rows[0].fingerprint;
            previousVersionNumber = latestVersion.rows[0].version_number;
        }

        // ── 3. Determine change status ────────────────────────────────
        let changeStatus;
        if (previousVersionNumber === 0) {
            changeStatus = 'First Record';
        } else if (previousFingerprint === fingerprint) {
            changeStatus = 'No Change Detected';
        } else {
            changeStatus = 'Updated – Ingredient Change Detected';
        }

        const newVersionNumber = previousVersionNumber + 1;

        // ── 4. Insert version row ─────────────────────────────────────
        const versionRow = await db.query(
            `INSERT INTO formulation_versions
               (product_id, version_number, ingredient_list, fingerprint, change_status, classification_result, scan_source)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id`,
            [
                productId,
                newVersionNumber,
                ingredientList,
                fingerprint,
                changeStatus,
                JSON.stringify(classificationResult),
                scanSource
            ]
        );

        const versionId = versionRow.rows[0].id;
        logger.info(`[FH] Version ${newVersionNumber} saved (${changeStatus}) for product ${productId}`);

        return { versionId, versionNumber: newVersionNumber, changeStatus, productId };

    } catch (err) {
        logger.error('[FH] Failed to save formulation version', { error: err.message });
        return null;
    }
}

/**
 * Fetch the version history for a product, ordered newest-first.
 *
 * @param {string} productId  UUID of the product
 * @param {number} [limit=20]
 * @returns {Promise<Array>}
 */
async function getHistory(productId, limit = 20) {
    try {
        const result = await db.query(
            `SELECT
                fv.id,
                fv.version_number,
                fv.ingredient_list,
                fv.change_status,
                fv.scan_source,
                fv.created_at,
                fp.product_name
             FROM formulation_versions fv
             JOIN formulation_products fp ON fp.id = fv.product_id
             WHERE fv.product_id = $1
             ORDER BY fv.version_number DESC
             LIMIT $2`,
            [productId, limit]
        );
        return result.rows;
    } catch (err) {
        logger.error('[FH] Failed to fetch history', { productId, error: err.message });
        return [];
    }
}

/**
 * Fetch recent scan versions across all products (for debug/dashboard use).
 *
 * @param {number} [limit=50]
 * @returns {Promise<Array>}
 */
async function getRecentVersions(limit = 50) {
    try {
        const result = await db.query(
            `SELECT
                fv.id,
                fv.version_number,
                fv.change_status,
                fv.scan_source,
                fv.created_at,
                fp.id          AS product_id,
                fp.product_name,
                fp.fingerprint
             FROM formulation_versions fv
             JOIN formulation_products fp ON fp.id = fv.product_id
             ORDER BY fv.created_at DESC
             LIMIT $1`,
            [limit]
        );
        return result.rows;
    } catch (err) {
        logger.error('[FH] Failed to fetch recent versions', { error: err.message });
        return [];
    }
}

module.exports = { saveVersion, getHistory, getRecentVersions, buildFingerprint };
