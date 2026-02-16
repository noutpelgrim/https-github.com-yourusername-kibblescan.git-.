const express = require('express');
const router = express.Router();
const { Paddle, Environment } = require('@paddle/paddle-node-sdk');
const store = require('../services/store');
const { normalizeEmail } = require('../normalize');
const logger = require('../utils/logger');

// Initialize Paddle for Verification
const paddle = new Paddle(process.env.PADDLE_API_KEY || 'placeholder', {
    environment: Environment.sandbox
});

// POST /api/webhook/paddle
router.post('/', (req, res) => {
    const signature = req.headers['paddle-signature'];
    const secret = process.env.PADDLE_WEBHOOK_SECRET;

    // STRICT PRODUCTION ENFORCEMENT
    // 1. Validate existence of signature and secret
    if (!signature || !secret || secret.startsWith('TODO')) {
        logger.error('Webhook rejected: Missing Signature or Secret Configuration');
        return res.status(401).json({ error: 'Invalid Signature Configuration' });
    }

    try {
        // 2. Strict Unmarshal & Verify
        // req.body is a Buffer due to express.raw() in server.js
        const eventData = paddle.webhooks.unmarshal(req.body, secret, signature);
        logger.info(`Webhook verified`, { eventType: eventData.eventType });

        // 3. Process Verified Event
        handleEvent(eventData);
        return res.status(200).send('Webhook processed');

    } catch (e) {
        logger.error('Webhook signature verification failed', { error: e.message });
        // 4. Immediate Rejection on Failure
        return res.status(400).json({ error: 'Invalid Signature' });
    }
});

async function handleEvent(event) {
    if (event && (event.eventType || event.event_type)) { // SDK uses eventType, raw JSON uses event_type
        const type = event.eventType || event.event_type;
        const data = event.data;

        // 4. Handle specific events (Connect to Store)
        // In a real app, we'd use data.custom_data.userId or data.customer_id
        // For demo, we explicitly target the demo user.
        const targetEmail = normalizeEmail('demo@kibblescan.io');
        const user = await store.getUserByEmail(targetEmail);

        if (!user) {
            console.error(`[Paddle] Target user ${targetEmail} not found. Skipping update.`);
            return;
        }

        const targetUserId = user.id;

        switch (type) {
            case 'subscription.activated':
            case 'subscription.resumed':
                console.log(`[Paddle] ACTIVATED: Monitoring enabled for ${targetUserId}. (SubID: ${data?.id})`);
                await store.setMonitoring(targetUserId, true);
                break;

            case 'subscription.canceled':
            case 'subscription.paused':
            case 'subscription.past_due':
            case 'subscription.payment_failed':
                console.log(`[Paddle] DEACTIVATED: Monitoring disabled for ${targetUserId}. (Reason: ${type}, SubID: ${data?.id})`);
                await store.setMonitoring(targetUserId, false);
                break;

            case 'subscription.created':
                console.log(`[Paddle] CREATED: Subscription created for ${targetUserId}. Waiting for activation. (SubID: ${data?.id})`);
                break;

            default:
                console.log(`[Paddle] INFO: Unhandled event type ${type}.`);
        }
    }
}

module.exports = router;
