const logger = require('../utils/logger');

/**
 * Stub Email Service for sending Magic Links
 * In production, this would use Resend, SendGrid, or AWS SES
 * @param {string} email 
 * @param {string} magicLink 
 */
async function sendMagicLink(email, magicLink) {
    // For local development, we just log it aggressively so the dev can click it
    console.log('\n======================================================');
    console.log(`🔐 MAGIC LINK REQUESTED:`);
    console.log(`📧 To: ${email}`);
    console.log(`🔗 Link: ${magicLink}`);
    console.log('======================================================\n');

    logger.info('Magic link generated', { email, magicLink });
    // TODO: Integrate actual email provider here when scaling
}

/**
 * Stub Email Service for sending Monitoring Change Notifications
 * @param {string} email 
 * @param {string} productName 
 */
async function sendChangeNotification(email, productName) {
    console.log('\n======================================================');
    console.log(`🚨 KIBBLESCAN ALERT: FORMULATION CHANGE DETECTED`);
    console.log(`📧 To: ${email}`);
    console.log(`📦 Product: ${productName}`);
    console.log(`📝 Log in to your dashboard to review the changes.`);
    console.log('======================================================\n');

    logger.info('Monitoring alert sent', { email, productName });
}

/**
 * Stub Email Service for sending Monthly Digests
 * @param {string} email 
 * @param {Array<{productName: string, status: string}>} products 
 */
async function sendMonthlyDigest(email, products) {
    console.log('\n======================================================');
    console.log(`📅 KIBBLESCAN MONTHLY DIGEST`);
    console.log(`📧 To: ${email}`);
    console.log(`\nHere is the 30-day status report for your monitored products:\n`);

    products.forEach(p => {
        console.log(`- ${p.productName}`);
        console.log(`  Status: ${p.status}\n`);
    });

    console.log(`Log in to your dashboard for full details.`);
    console.log('======================================================\n');

    logger.info('Monthly digest sent', { email, productCount: products.length });
}

module.exports = { sendMagicLink, sendChangeNotification, sendMonthlyDigest };
