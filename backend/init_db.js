require("dotenv").config();
const { Pool } = require("pg");

const { normalizeEmail } = require('./normalize');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});



async function init() {
    try {
        console.log("Connecting to database...");

        await pool.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

        await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        paddle_subscription_id TEXT,
        is_monitoring_active BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

        // Seed Dev User
        const demoEmail = normalizeEmail('demo@kibblescan.io');
        console.log(`Seeding dev user (${demoEmail})...`);
        await pool.query(`
      INSERT INTO users (email, is_monitoring_active)
      VALUES ($1, FALSE)
      ON CONFLICT (email) DO NOTHING;
    `, [demoEmail]);

        console.log("✅ Database initialized successfully.");
    } catch (err) {
        console.error("❌ Database initialization failed:", err);
    } finally {
        await pool.end();
        process.exit();
    }
}

init();
