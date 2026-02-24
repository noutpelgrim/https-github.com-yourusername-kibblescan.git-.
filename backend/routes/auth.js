const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { signToken } = require('../utils/jwt');
const { sendMagicLink } = require('../services/email');
const logger = require('../utils/logger');

// POST /api/auth/request-link
router.post('/request-link', async (req, res) => {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }

    try {
        // 1. Get or create user
        let userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        let user = userResult.rows[0];

        if (!user) {
            // Auto-create minimal user profile
            const insertRes = await db.query(
                'INSERT INTO users (email) VALUES ($1) RETURNING *',
                [email]
            );
            user = insertRes.rows[0];
        }

        // 2. Generate secure token
        const token = crypto.randomBytes(32).toString('hex');

        // 3. Save to magic_links table (expires in 15 mins)
        await db.query(`
            INSERT INTO magic_links (user_id, token, expires_at)
            VALUES ($1, $2, NOW() + INTERVAL '15 minutes')
        `, [user.id, token]);

        // 4. Send email
        const magicLink = `http://localhost:8085/api/auth/verify?token=${token}`;
        await sendMagicLink(email, magicLink);

        res.json({ message: 'Magic link sent. Check your email.', debug_link: magicLink });
    } catch (err) {
        logger.error('Error requesting magic link', { error: err.message });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/verify?token=XYZ
router.get('/verify', async (req, res) => {
    const { token } = req.query;
    if (!token) {
        return res.status(400).send('Missing token');
    }

    try {
        // 1. Validate token
        const linkRes = await db.query(`
            SELECT ml.*, u.email, u.is_monitoring_active 
            FROM magic_links ml 
            JOIN users u ON u.id = ml.user_id 
            WHERE ml.token = $1 AND ml.used = false AND ml.expires_at > NOW()
        `, [token]);

        const link = linkRes.rows[0];
        if (!link) {
            return res.status(401).send('Invalid or expired magic link. Please request a new one.');
        }

        // 2. Mark as used
        await db.query('UPDATE magic_links SET used = true WHERE id = $1', [link.id]);

        // 3. Generate JWT
        const userPayload = {
            id: link.user_id,
            email: link.email,
            is_monitoring_active: link.is_monitoring_active
        };
        const jwtToken = signToken(userPayload);

        // 4. Set HttpOnly Cookie (secure for PROD)
        const isProd = process.env.NODE_ENV === 'production';
        res.cookie('session', jwtToken, {
            httpOnly: true,
            secure: isProd,
            sameSite: 'lax',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // 5. Redirect to Dashboard
        res.redirect('/dashboard.html');
    } catch (err) {
        logger.error('Error verifying magic link', { error: err.message });
        res.status(500).send('Internal server error');
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    res.clearCookie('session');
    res.json({ message: 'Logged out successfully' });
});

module.exports = router;
