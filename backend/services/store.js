const db = require('../db');
const fs = require('fs');
const path = require('path');

const { normalizeEmail } = require('../normalize');
const logger = require('../utils/logger');

const store = {
    // Initialize DB (Create Table if missing & Seed Dev User)
    init: async () => {
        try {
            const schemaPath = path.join(__dirname, '../db/schema.sql');
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');

            // Execute Schema
            await db.query(schemaSql);
            logger.info("Database initialized & seeded successfully (UUID Schema).");
        } catch (err) {
            logger.error("Failed to initialize database", { error: err.message });
            // Don't kill process, maybe DB is down, but we want to log it.
        }
    },

    // Get User by ID
    getUser: async (id) => {
        try {
            const res = await db.query('SELECT * FROM users WHERE id = $1', [id]);
            if (res.rows.length > 0) {
                const user = res.rows[0];
                return {
                    id: user.id,
                    email: user.email,
                    isMonitoringActive: user.is_monitoring_active, // Map snake_case to camelCase
                    role: user.role
                };
            }
            return null;
        } catch (err) {
            logger.error(`Error fetching user`, { userId: id, error: err.message });
            return null;
        }
    },

    // Get User by Email
    getUserByEmail: async (email) => {
        try {
            const cleanEmail = normalizeEmail(email);
            const res = await db.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
            if (res.rows.length > 0) {
                const user = res.rows[0];
                return {
                    id: user.id,
                    email: user.email,
                    isMonitoringActive: user.is_monitoring_active,
                    role: user.role || 'standard'
                };
            }
            return null;
        } catch (err) {
            logger.error(`Error fetching user by email`, { email: email, error: err.message });
            return null;
        }
    },

    // Set Monitoring Status
    setMonitoring: async (id, status) => {
        try {
            await db.query(
                'UPDATE users SET is_monitoring_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
                [status, id]
            );
            logger.info(`User monitoring status updated`, { userId: id, status: status });
        } catch (err) {
            logger.error(`Error updating user status`, { userId: id, error: err.message });
        }
    }
};

module.exports = store;
