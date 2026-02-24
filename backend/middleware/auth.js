const { verifyToken } = require('../utils/jwt');

function requireAuth(req, res, next) {
    const token = req.cookies?.session;

    if (!token) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    const payload = verifyToken(token);
    if (!payload) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    req.user = payload;
    next();
}

module.exports = { requireAuth };
