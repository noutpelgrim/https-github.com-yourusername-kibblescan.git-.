const { normalizeEmail } = require('../normalize');

const access = {
    // 1. Base Subscription Check (Renamed/Aliased to requireMonitoring as requested)
    requireMonitoring: async (req, res, next) => {
        // In real app: verify token from req.headers['authorization']
        // For demo: we assume the 'demo' user context
        const userEmail = normalizeEmail('demo@kibblescan.io');

        try {
            const user = await store.getUserByEmail(userEmail);

            if (!user) {
                return res.status(401).json({ error: 'Unauthorized' });
            }

            // STATUS CHECK
            if (!user.isMonitoringActive) {
                return res.status(402).json({
                    error: 'Payment Required',
                    message: 'This feature requires an active monitoring subscription.'
                });
            }

            req.user = user;
            next();
        } catch (err) {
            console.error('[Access] Database Error:', err);
            return res.status(500).json({ error: 'Internal Server Error' });
        }
    },

    // Legacy/Alias if needed by other files (though we should update protected.js)
    requireSubscription: (req, res, next) => {
        // ... delegating to new logic ...
        return access.requireMonitoring(req, res, next);
    },

    // 2. Clinical Tier Check
    requireClinical: (req, res, next) => {
        if (!req.user || req.user.role !== 'clinical') {
            return res.status(403).json({
                error: 'Forbidden',
                message: 'Restricted to Veterinary Professionals.'
            });
        }
        next();
    }
};

module.exports = access;
