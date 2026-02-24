const cron = require('node-cron');
const monitorService = require('../services/monitor');
const logger = require('../utils/logger');

// Run on the 1st of every month at 08:00 AM server time
console.log('🔹 Initializing Background Monthly Digest Cron Job...');
cron.schedule('0 8 1 * *', async () => {
    logger.info('⏰ Cron triggered: Running monthly digest');
    await monitorService.generateMonthlyDigest();
}, {
    scheduled: true,
    timezone: "UTC"
});

console.log('✅ Digest scheduler active.');
