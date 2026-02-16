const express = require('express');
const router = express.Router();

// Handle Clinical Access Request
router.post('/request', (req, res) => {
    const { name, clinic, email } = req.body;

    if (!name || !clinic || !email) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    // 1. Log Request
    console.log(`[CLINICAL] Access Request: Dr. ${name} from ${clinic} (${email})`);

    // 2. Mock Email Notification
    console.log(`[EMAIL] Sending 'Access Received' template to ${email}... SENT.`);
    console.log(`[EMAIL] Sending 'Admin Alert' to internal@kibblescan.com... SENT.`);

    // 3. Respond
    res.json({
        status: 'received',
        message: 'Request under review. You will receive credentials shortly.'
    });
});

module.exports = router;
