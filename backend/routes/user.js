const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

// All /api/user routes require authentication
router.use(requireAuth);

// GET /api/user/dashboard
router.get('/dashboard', async (req, res) => {
    try {
        // Fetch user data from DB to get fresh Pro tier status
        const userRes = await db.query('SELECT email, is_monitoring_active FROM users WHERE id = $1', [req.user.userId]);
        const userRow = userRes.rows[0];

        if (!userRow) {
            return res.status(404).json({ error: 'User not found' });
        }

        const isPro = userRow.is_monitoring_active;

        // Fetch monitored products along with their latest version status
        const productsRes = await db.query(`
            SELECT 
                fp.id as product_id,
                fp.product_name,
                (SELECT created_at FROM formulation_versions WHERE product_id = fp.id ORDER BY version_number DESC LIMIT 1) as last_scanned,
                (SELECT change_status FROM formulation_versions WHERE product_id = fp.id ORDER BY version_number DESC LIMIT 1) as status
            FROM user_monitoring um
            JOIN formulation_products fp ON fp.id = um.product_id
            WHERE um.user_id = $1
            ORDER BY um.created_at DESC
        `, [req.user.userId]);

        res.json({
            user: {
                email: userRow.email,
                isPro: isPro
            },
            monitored_products: productsRes.rows
        });
    } catch (err) {
        logger.error('Error fetching dashboard', { error: err.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
