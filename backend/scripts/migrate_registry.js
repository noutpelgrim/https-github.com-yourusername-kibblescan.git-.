require('dotenv').config({ path: '../.env' });
const { Pool } = require('pg');
const { classifyIngredient } = require('../registry');

// Hardcoded Lists from registry.js (Replicated here for migration source)
const VIOLATIONS = [
    "bha", "bht", "ethoxyquin", "red 40", "yellow 5", "blue 2",
    "menadione", "propylene glycol", "titanium dioxide"
];

const NON_SPECIFIC = [
    "meat by-product", "meat meal", "animal fat", "animal digest",
    "poultry by-product meal", "natural flavor", "corn gluten meal",
    "wheat gluten", "soybean meal"
];

const UNRESTRICTED = [
    "chicken", "beef", "lamb", "turkey", "salmon", "duck",
    "chicken meal", "beef meal", "brown rice", "sweet potato",
    "peas", "whole corn", "wheat", "oats", "flaxseed",
    "vitamin", "mineral", "rice", "broth", "pork lungs", "liver",
    "potassium chloride", "zinc sulfate", "sodium selenite",
    "carrageenan", "guar gum", "locust bean gum", "choline chloride",
    "thiamine mononitrate", "calcium pantothenate", "riboflavin supplement",
    "salt", "ferrous sulfate", "potassium iodide", "copper sulfate",
    "manganese sulfate", "calcium iodate", "biotin", "folic acid"
];

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function migrate() {
    console.log("🚀 Starting Registry Migration...");

    try {
        const client = await pool.connect();

        const allIngredients = [
            ...VIOLATIONS.map(name => ({ name, classification: 'VIOLATION' })),
            ...NON_SPECIFIC.map(name => ({ name, classification: 'NON-SPECIFIC' })),
            ...UNRESTRICTED.map(name => ({ name, classification: 'UNRESTRICTED' }))
        ];

        console.log(`📦 Found ${allIngredients.length} ingredients to migrate.`);

        for (const ing of allIngredients) {
            const slug = ing.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

            // Upsert (Insert or Do Nothing)
            await client.query(`
                INSERT INTO ingredients (slug, name, classification)
                VALUES ($1, $2, $3)
                ON CONFLICT (slug) DO UPDATE 
                SET classification = EXCLUDED.classification;
            `, [slug, ing.name, ing.classification]);

            process.stdout.write('.');
        }

        console.log("\n✅ Migration Complete!");
        client.release();
    } catch (err) {
        console.error("\n❌ Migration Failed:", err);
    } finally {
        pool.end();
    }
}

migrate();
