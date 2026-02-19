const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
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

        // Load Mass Ingredients Phase 1
        const massIngPath = require('path').join(__dirname, '../data/mass_ingredients.json');
        let massIngredients = [];
        try {
            massIngredients = require(massIngPath);
            console.log(`📄 Loaded ${massIngredients.length} ingredients from Phase 1 (mass_ingredients.json)`);
        } catch (e) {
            console.warn("⚠️  Could not load Phase 1 data:", e.message);
        }

        // Load Mass Ingredients Phase 2
        const massIngPath2 = require('path').join(__dirname, '../data/mass_ingredients_phase2.json');
        let massIngredients2 = [];
        try {
            massIngredients2 = require(massIngPath2);
            console.log(`📄 Loaded ${massIngredients2.length} ingredients from Phase 2 (mass_ingredients_phase2.json)`);
        } catch (e) {
            console.warn("⚠️  Could not load Phase 2 data:", e.message);
        }

        // Load Mass Ingredients Phase 3
        const massIngPath3 = require('path').join(__dirname, '../data/mass_ingredients_phase3.json');
        let massIngredients3 = [];
        try {
            massIngredients3 = require(massIngPath3);
            console.log(`📄 Loaded ${massIngredients3.length} ingredients from Phase 3 (mass_ingredients_phase3.json)`);
        } catch (e) {
            console.warn("⚠️  Could not load Phase 3 data:", e.message);
        }

        const allIngredients = [
            ...VIOLATIONS.map(name => ({ name, classification: 'VIOLATION' })),
            ...NON_SPECIFIC.map(name => ({ name, classification: 'NON-SPECIFIC' })),
            ...UNRESTRICTED.map(name => ({ name, classification: 'UNRESTRICTED' })),
            ...massIngredients,
            ...massIngredients2,
            ...massIngredients3
        ];

        console.log(`📦 Found ${allIngredients.length} total raw ingredients.`);

        // DEDUPLICATE by SLUG
        const uniqueIngredients = new Map();
        allIngredients.forEach(ing => {
            const slug = ing.name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            // If duplicate exists, we keep the LAST one (or first, doesn't matter much if consistent)
            // Actually, we want to prioritize our manual lists over mass import if they overlap?
            // The array order is: Violations... Unrestricted... Mass... Mass2.
            // Let's just overwrite.
            uniqueIngredients.set(slug, { ...ing, slug });
        });

        const finalBatch = Array.from(uniqueIngredients.values());
        console.log(`✨ Deduped to ${finalBatch.length} unique ingredients.`);

        // --- BATCH INSERTION (Faster & Safer) ---
        const BATCH_SIZE = 50;
        for (let i = 0; i < finalBatch.length; i += BATCH_SIZE) {
            const batch = finalBatch.slice(i, i + BATCH_SIZE);

            // Generate value placeholders: ($1, $2, $3), ($4, $5, $6), ...
            const placeholders = batch.map((_, idx) => `($${idx * 3 + 1}, $${idx * 3 + 2}, $${idx * 3 + 3})`).join(',');
            const values = [];

            batch.forEach(ing => {
                values.push(ing.slug, ing.name, ing.classification);
            });

            // DO NOTHING on conflict to preserve existing descriptions/AI data
            await client.query(`
                INSERT INTO ingredients (slug, name, classification)
                VALUES ${placeholders}
                ON CONFLICT (slug) DO UPDATE 
                SET classification = EXCLUDED.classification
                WHERE ingredients.description IS NULL; -- Only update classification if we haven't enriched it yet
            `, values);

            process.stdout.write('.');
        }
        console.log("\n✅ Batch Migration Complete!");
        client.release();
    } catch (err) {
        console.error("\n❌ Migration Failed:", err);
        // Do not exit process here, let server handle it
        throw err;
    } finally {
        // Do not close pool here if imported, but since it uses its own pool instance...
        // Actually, if we import this, we should probably share the pool or close this specific one.
        await pool.end();
    }
}

module.exports = { migrate };

if (require.main === module) {
    migrate().catch(() => process.exit(1));
}
