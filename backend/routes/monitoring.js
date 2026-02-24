const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Protect all /monitoring routes
router.use(requireAuth);

// POST /monitoring/enable
router.post('/enable', async (req, res) => {
    const { product_id } = req.body;

    if (!product_id) {
        return res.status(400).json({ error: 'product_id is required' });
    }

    try {
        // Validate product exists to satisfy strict foreign key requirements
        const productCheck = await db.query('SELECT id FROM formulation_products WHERE id = $1', [product_id]);
        if (productCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Product not found' });
        }

        // Insert or update to active
        const result = await db.query(`
            INSERT INTO monitoring (user_id, product_id, monitoring_active) 
            VALUES ($1, $2, true)
            ON CONFLICT (user_id, product_id) 
            DO UPDATE SET monitoring_active = true, created_at = NOW()
            RETURNING *
        `, [req.user.id, product_id]);

        res.json({ message: 'Monitoring enabled', record: result.rows[0] });
    } catch (err) {
        console.error('Error enabling monitoring:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /monitoring/list
router.get('/list', async (req, res) => {
    try {
        // Fetch monitored products for the user where monitoring_active is true
        // Including basic product data without breaking versioning tables
        const monitoredRes = await db.query(`
            SELECT m.id as monitoring_record_id, 
                   m.product_id, 
                   fp.product_name, 
                   fp.fingerprint,
                   m.created_at as monitored_since
            FROM monitoring m
            JOIN formulation_products fp ON fp.id = m.product_id
            WHERE m.user_id = $1 AND m.monitoring_active = true
            ORDER BY m.created_at DESC
        `, [req.user.id]);

        res.json({ monitored_products: monitoredRes.rows });
    } catch (err) {
        console.error('Error listing monitored products:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
