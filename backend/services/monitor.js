const db = require('../db');
const { saveVersion, buildFingerprint } = require('./formulation_history');
const { sendChangeNotification } = require('./email');
const { generateDossier } = require('./ai_researcher'); // Or whatever actual logic fetches new data
const logger = require('../utils/logger');

/**
 * Placeholder function for fetching the latest ingredient list for a product.
 * In a real scenario, this would scrape a website or use an API based on the product_name/link.
 * For this exercise, we simulate it by just returning the most recently known ingredients
 * so the diff logic can run (and return 'no change' by default unless mocked).
 */
async function fetchLatestIngredientsForProduct(productId, productName) {
    // Simulated fetch: Just get the latest we have in DB
    const res = await db.query(
        `SELECT ingredient_list FROM formulation_versions WHERE product_id = $1 ORDER BY version_number DESC LIMIT 1`,
        [productId]
    );
    if (res.rows.length > 0) {
        return res.rows[0].ingredient_list;
    }
    return '';
}

/**
 * Main cron job function that runs daily.
 * Finds all monitored products, checks for updates, saves versions, and alerts users.
 */
async function checkMonitoredProducts() {
    logger.info('[Monitor] Starting daily monitoring job...');
    try {
        // 1. Find all distinct products currently being monitored by active Pro users
        const monitoredProductsRes = await db.query(`
            SELECT DISTINCT um.product_id, fp.product_name, fp.fingerprint as latest_known_fingerprint
            FROM user_monitoring um
            JOIN users u ON u.id = um.user_id
            JOIN formulation_products fp ON fp.id = um.product_id
            WHERE u.is_monitoring_active = true
        `);

        const productsToMonitor = monitoredProductsRes.rows;
        logger.info(`[Monitor] Found ${productsToMonitor.length} unique products monitored by active users.`);

        for (const product of productsToMonitor) {
            try {
                // 2. Fetch "latest" data
                const rawIngredientsText = await fetchLatestIngredientsForProduct(product.product_id, product.product_name);
                if (!rawIngredientsText) continue;

                // 3. For a real diff, we'd need to classify this raw text again.
                // Assuming we have a lightweight way to get structured ingredients from raw string for fingerprinting
                // For this minimal implementation, we will use the raw comma-separated string 
                // to build the fingerprint directly, as `buildFingerprint` handles strings.
                const newFingerprint = buildFingerprint(rawIngredientsText);

                // 4. Compare fingerprints
                if (newFingerprint !== product.latest_known_fingerprint) {
                    logger.info(`[Monitor] CHANGE DETECTED for product: ${product.product_name}`);

                    // We would typically classify the new ingredients here using `registry` or `ai_researcher`
                    // to get the full classification result. For minimal implementation, we pass the parsed data.
                    const structuredIngredients = rawIngredientsText.split(',').map(s => s.trim());

                    // Save new version
                    const saveRes = await saveVersion({
                        ingredients: structuredIngredients,
                        classificationResult: { note: "Auto-detected by monitor", raw: rawIngredientsText },
                        productName: product.product_name,
                        scanSource: 'Monitor Cron Task'
                    });

                    if (saveRes && saveRes.versionId) {
                        // 5. Notify all users tracking this product
                        const usersTrackingRes = await db.query(`
                            SELECT u.email 
                            FROM user_monitoring um
                            JOIN users u ON u.id = um.user_id
                            WHERE um.product_id = $1 AND u.is_monitoring_active = true
                        `, [product.product_id]);

                        for (const user of usersTrackingRes.rows) {
                            await sendChangeNotification(user.email, product.product_name);
                        }
                    }
                }

                // 6. Update last_checked_at timestamp regardless of change
                await db.query(`
                    UPDATE user_monitoring 
                    SET last_checked_at = NOW() 
                    WHERE product_id = $1
                `, [product.product_id]);

            } catch (err) {
                logger.error(`[Monitor] Error processing product ${product.product_id}:`, { error: err.message });
            }
        }

        logger.info('[Monitor] Daily monitoring job complete.');
    } catch (err) {
        logger.error('[Monitor] Fatal error in monitoring job:', { error: err.message });
    }
}

/**
 * Monthly cron job function.
 * Aggregates the 30-day status for all monitored products of active users
 * and sends a calm, structured digest email.
 */
async function generateMonthlyDigest() {
    logger.info('[Monitor] Starting monthly digest generation...');
    const { sendMonthlyDigest } = require('./email');

    try {
        // 1. Get all active Pro users
        const activeUsersRes = await db.query(`SELECT id, email FROM users WHERE is_monitoring_active = true`);
        const users = activeUsersRes.rows;

        for (const user of users) {
            // 2. Fetch all products monitored by this user
            const monitoredProductsRes = await db.query(`
                SELECT fp.id as product_id, fp.product_name
                FROM user_monitoring um
                JOIN formulation_products fp ON fp.id = um.product_id
                WHERE um.user_id = $1
             `, [user.id]);

            const products = monitoredProductsRes.rows;
            if (products.length === 0) continue;

            const digestItems = [];

            // 3. Determine 30-day status for each product
            for (const product of products) {
                // Check if there are any formulation versions for this product 
                // created within the last 30 days that are NOT 'First Record'
                // Technically, any new version row (except maybe first scan) implies a change.
                // We look for change_status = 'Updated – Ingredient Change Detected' in last 30 days.
                const recentChangesRes = await db.query(`
                    SELECT 1 FROM formulation_versions 
                    WHERE product_id = $1 
                    AND created_at >= NOW() - INTERVAL '30 days'
                    AND change_status = 'Updated – Ingredient Change Detected'
                    LIMIT 1
                 `, [product.product_id]);

                const hasChanged = recentChangesRes.rows.length > 0;

                digestItems.push({
                    productName: product.product_name,
                    status: hasChanged ? 'Ingredient list updated' : 'No changes detected'
                });
            }

            // 4. Send the structured email
            await sendMonthlyDigest(user.email, digestItems);
        }

        logger.info('[Monitor] Monthly digest generation complete.');
    } catch (err) {
        logger.error('[Monitor] Fatal error generating monthly digest:', { error: err.message });
    }
}

module.exports = { checkMonitoredProducts, generateMonthlyDigest };
