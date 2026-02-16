const crypto = require('crypto');
const http = require('http');
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const SECRET = process.env.PADDLE_WEBHOOK_SECRET;

function createSignature(ts, payload) {
    if (!SECRET || SECRET.startsWith('TODO')) return 'TS=' + ts + ';H1=mock-signature';

    // Paddle Signature Construction (Simplified for simulation if secret known)
    // Actually, Paddle SDK implementation expects specific format.
    // For dev mode in our webhook handler, if secret is TODO, it skips validation.
    // Let's rely on that for now if secret is TODO.

    const hmac = crypto.createHmac('sha256', SECRET);
    hmac.update(`${ts}:${payload}`);
    return `TS=${ts};H1=${hmac.digest('hex')}`;
}

const eventType = process.argv[2] || 'subscription.canceled';
const email = 'demo@kibblescan.io';

const payloadObj = {
    eventType: eventType,
    data: {
        id: "sub_" + Date.now(),
        customer_id: "ctm_" + Date.now(),
        custom_data: {
            userId: "some-uuid" // In real flow. Our backend hardcodes demo email lookup.
        }
    }
};

const payload = JSON.stringify(payloadObj);
const ts = Math.floor(Date.now() / 1000);
const signature = createSignature(ts, payload);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/webhook/paddle',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Paddle-Signature': signature
    }
};

const req = http.request(options, (res) => {
    console.log(`STATUS: ${res.statusCode}`);
    res.setEncoding('utf8');
    res.on('data', (chunk) => {
        console.log(`BODY: ${chunk}`);
    });
});

req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
});

// Write data to request body
req.write(payload);
req.end();
