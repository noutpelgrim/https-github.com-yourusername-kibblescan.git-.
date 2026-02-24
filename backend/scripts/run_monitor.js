const cron = require('node-cron');
const monitorService = require('../services/monitor');
const logger = require('../utils/logger');

// Run every day at 02:00 AM server time
console.log('🔹 Initializing Background Monitor Cron Job...');
cron.schedule('0 2 * * *', async () => {
    logger.info('⏰ Cron triggered: Running daily product monitor');
    await monitorService.checkMonitoredProducts();
}, {
    scheduled: true,
    timezone: "UTC" // Set timezone as appropriate 
});

console.log('✅ Cron scheduler active.');
