const express = require('express');
const router = express.Router();
const db = require('../db');
const logger = require('../utils/logger');

/**
 * GET /api/ingredients/search
 * Search ingredients by name or description.
 * Query Param: q (string)
 */
router.get('/search', async (req, res) => {
    try {
        const query = req.query.q;

        if (!query || query.length < 2) {
            return res.json([]); // Return empty if query is too short
        }

        // Sanitize for ILIKE query
        const searchPattern = `%${query}%`;

        // Classification Mapping for Frontend Colors
        // VIOLATION -> danger
        // NON-SPECIFIC -> warning
        // UNRESTRICTED -> safe

        const sql = `
            SELECT id, name, classification, description 
            FROM ingredients 
            WHERE name ILIKE $1 
            OR description ILIKE $1 
            ORDER BY 
                CASE 
                    WHEN name ILIKE $2 THEN 1  -- Exact start match priority
                    ELSE 2 
                END,
                name ASC 
            LIMIT 50
        `;

        // Pass BOTH parameters: $1 (searchPattern) and $2 (startsWithPattern)
        const startsWithPattern = `${query}%`;
        const result = await db.query(sql, [searchPattern, startsWithPattern]);

        const mappedResults = result.rows.map(row => {
            let status = 'UNKNOWN';
            let color = 'gray';

            if (row.classification === 'VIOLATION') {
                status = 'RESTRICTED';
                color = 'red';
            } else if (row.classification === 'NON-SPECIFIC') {
                status = 'WARNING';
                color = 'orange';
            } else if (row.classification === 'UNRESTRICTED') {
                status = 'SAFE';
                color = 'green';
            }

            return {
                id: row.id,
                name: row.name,
                description: row.description,
                original_classification: row.classification,
                status_label: status,
                color_code: color
            };
        });

        res.json(mappedResults);

    } catch (err) {
        logger.error("[API] Ingredient Search Failed", { error: err.message });
        res.status(500).json({ error: "Search failed" });
    }
});

/**
 * GET /api/ingredients/:id
 * Fetch single ingredient details.
 */
// ... imports
const aiResearcher = require('../services/ai_researcher');

router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        let result = await db.query('SELECT * FROM ingredients WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Ingredient not found" });
        }

        let row = result.rows[0];

        // --- AI HYDRATION LOGIC ---
        // If description is missing or empty, generate it on the fly.
        if (!row.description || row.description.trim().length === 0) {

            // Only attempt if API Key is present to avoid errors
            if (process.env.OPENAI_API_KEY) {
                const dossier = await aiResearcher.generateDossier(row.name);

                if (dossier) {
                    // Update Database
                    await db.query(
                        `UPDATE ingredients 
                         SET description = $1, classification = $2 
                         WHERE id = $3`,
                        [dossier.description, dossier.classification, id]
                    );

                    // Update local object to return fresh data
                    row.description = dossier.description;
                    row.classification = dossier.classification;

                    logger.info(`[Hydration] AI updated ingredient: ${row.name}`);
                }
            }
        }
        // --------------------------

        // Map status
        let status = 'UNKNOWN';
        if (row.classification === 'VIOLATION') status = 'RESTRICTED';
        else if (row.classification === 'NON-SPECIFIC') status = 'WARNING';
        else if (row.classification === 'UNRESTRICTED') status = 'SAFE';

        res.json({
            id: row.id,
            name: row.name,
            description: row.description,
            classification: row.classification, // Original
            status_label: status,
            slug: row.slug
        });

    } catch (err) {
        logger.error("[API] Get Ingredient Failed", { id: req.params.id, error: err.message });
        res.status(500).json({ error: "Server error" });
    }
});

module.exports = router;
