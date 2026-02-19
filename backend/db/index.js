const { Pool } = require("pg");

// Ensure DATABASE_URL is present
if (!process.env.DATABASE_URL) {
    console.warn("WARNING: DATABASE_URL not set. Database features will fail.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false // Required for many hosted Postgres services (e.g. Supabase, Heroku)
    }
});

const logger = require('../utils/logger');

// Test Connection
pool.on('error', (err, client) => {
    // logger.error('Unexpected error on idle database client', { error: err.message });
    console.error('Unexpected error on idle database client', err.message);
    // process.exit(-1); // Do not crash the server on DB glitch
});

async function healthCheck() {
    try {
        const start = Date.now();
        await pool.query('SELECT 1');
        return { status: 'healthy', latency: Date.now() - start };
    } catch (e) {
        logger.error('Database health check failed', { error: e.message });
        return { status: 'unhealthy', error: e.message };
    }
}

module.exports = {
    query: (text, params) => pool.query(text, params),
    pool, // Export pool if raw access needed
    healthCheck
};
