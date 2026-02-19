require('dotenv').config({ path: '../.env' });
const db = require('../db');

async function run() {
    console.log("--- DEBUG START ---");

    // 1. Check OpenAI Module
    try {
        require('openai');
        console.log("✅ OpenAI module found.");
    } catch (e) {
        console.error("❌ OpenAI module NOT found.");
    }

    // 2. Check Database for Blueberry
    try {
        const res = await db.query("SELECT * FROM ingredients WHERE name ILIKE '%blue%'");
        if (res.rows.length === 0) {
            console.log("❌ 'Blueberry' NOT found in database.");
        } else {
            console.log("✅ found: ", res.rows.map(r => r.name));
        }
    } catch (e) {
        console.error("❌ Database query failed:", e.message);
    }

    process.exit(0);
}

run();
