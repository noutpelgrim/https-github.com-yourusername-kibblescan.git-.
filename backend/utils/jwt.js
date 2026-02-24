const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'kibblescan-dev-secret-key-123456';
const JWT_EXPIRES_IN = '7d';

/**
 * Sign a JWT token for a user
 * @param {Object} user 
 * @returns {string} 
 */
function signToken(user) {
    return jwt.sign(
        {
            userId: user.id,
            email: user.email,
            isPro: user.is_monitoring_active
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
    );
}

/**
 * Verify a JWT token
 * @param {string} token 
 * @returns {Object|null} Decoded payload or null if invalid
 */
function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null; // Invalid or expired
    }
}

module.exports = { signToken, verifyToken };
