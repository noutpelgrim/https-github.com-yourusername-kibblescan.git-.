require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const db = require('../db');
const { generateMonthlyDigest } = require('../services/monitor');

async function runTest() {
    console.log("🚀 Starting Monthly Digest Test...");

    // We already have a demo user and a product from the previous test.
    // Let's ensure there's a recent "Updated" version to trigger the "Ingredient list updated" flag.

    let productRes = await db.query(`SELECT id FROM formulation_products LIMIT 1`);
    if (productRes.rows.length === 0) {
        console.error("❌ No products found. Run monitor test first.");
        process.exit(1);
    }
    const productId = productRes.rows[0].id;

    // Insert a fake change record from 2 days ago
    console.log("⚙️ Inserting simulated recent change record...");
    await db.query(`
        INSERT INTO formulation_versions (product_id, version_number, ingredient_list, fingerprint, change_status, created_at) 
        VALUES ($1, 999, 'Chicken, Rice, New Thing', 'chicken|newthing|rice', 'Updated – Ingredient Change Detected', NOW() - INTERVAL '2 days')
    `, [productId]);

    // Run Digest
    console.log("\n--- Triggering Digest ---");
    await generateMonthlyDigest();

    // Clean up our fake record so we don't pollute the dev DB permanently
    console.log("\n🧹 Cleaning up test data...");
    await db.query(`DELETE FROM formulation_versions WHERE version_number = 999 AND product_id = $1`, [productId]);

    console.log("✅ Digest execution successful.");
    process.exit(0);
}

runTest();
