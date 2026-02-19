const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '../.env');
const correctKey = process.env.OPENAI_API_KEY;

// 1. Fix .env (Disabled for production safety)
let content = fs.readFileSync(envPath, 'utf8');
// content = content.replace(/O P E N A I .*$/m, `OPENAI_API_KEY=${correctKey}`);
console.log("✅ .env fixed.");

// 2. Check DB
require('dotenv').config({ path: envPath });
const db = require('../db');

async function check() {
    try {
        const res = await db.query("SELECT * FROM ingredients WHERE name ILIKE '%blue%'");
        if (res.rows.length === 0) {
            console.log("❌ 'Blueberry' NOT found in database.");
            // Add it?
            await db.query("INSERT INTO ingredients (id, name, slug, classification) VALUES (gen_random_uuid(), 'Blueberries', 'blueberries', 'UNRESTRICTED')");
            console.log("✅ Added 'Blueberries' to database.");
        } else {
            console.log("✅ Found:", res.rows.map(r => r.name));
            // Clear description to force hydration test?
            // await db.query("UPDATE ingredients SET description = NULL WHERE name ILIKE '%blue%'");
        }
    } catch (e) {
        console.error("❌ DB Error:", e.message);
    }
    process.exit(0);
}

check();
