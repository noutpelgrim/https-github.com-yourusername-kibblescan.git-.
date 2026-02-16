require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./services/store');

// --- ENVIRONMENT GUARDS ---
const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = process.env.PORT || 3000;

// Production Safety Check
if (NODE_ENV === 'production') {
    const missingVars = [];
    if (!process.env.DATABASE_URL) missingVars.push('DATABASE_URL');
    if (!process.env.PADDLE_WEBHOOK_SECRET) missingVars.push('PADDLE_WEBHOOK_SECRET');

    // Check for either File Path or JSON content for Google
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !process.env.GOOGLE_CREDENTIALS_JSON) {
        missingVars.push('GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CREDENTIALS_JSON');
    }

    if (missingVars.length > 0) {
        console.error("FATAL ERROR: Missing required production environment variables:");
        missingVars.forEach(v => console.error(` - ${v}`));
        process.exit(1);
    }
}

const app = express();
const scanRoutes = require('./routes/scan');
const paddleWebhookRoutes = require('./routes/paddleWebhook');
const clinicalRequestRoutes = require('./routes/clinical_request');

// Middleware
app.use(cors());

// Webhooks
// Mount Paddle webhook at /api/webhook/paddle
// IMPORTANT: Paddle verification requires RAW BODY.
app.use('/api/webhook/paddle', express.raw({ type: 'application/json' }));
app.use('/api/webhook/paddle', paddleWebhookRoutes);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upgrade Flows
app.use('/api/clinical', clinicalRequestRoutes);

// --- RATE LIMITING (Memory-Based) ---
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 Minute
const RATE_LIMIT_MAX = 20;           // 20 Requests per IP per Window

const rateLimiter = (req, res, next) => {
    // Basic IP extraction
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }

    const now = Date.now();
    const windowStart = now - RATE_LIMIT_WINDOW;

    // Filter out old requests
    let timestamps = requestCounts.get(ip);
    timestamps = timestamps.filter(time => time > windowStart);

    if (timestamps.length >= RATE_LIMIT_MAX) {
        // Update map with cleaned list to prevent memory leak
        requestCounts.set(ip, timestamps);
        logger.warn(`Rate limit blocked request`, { ip });
        return res.status(429).json({
            error: 'Too many requests. Please try again later.'
        });
    }

    timestamps.push(now);
    requestCounts.set(ip, timestamps);

    if (requestCounts.size > 1000) {
        requestCounts.clear();
    }

    next();
};

// Static Files
app.use(express.static(path.join(__dirname, '../')));

const logger = require('./utils/logger');
const db = require('./db');

// ...

// Health Check
app.get('/health', async (req, res) => {
    const dbHealth = await db.healthCheck();

    const healthStatus = {
        status: dbHealth.status === 'healthy' ? 'ok' : 'degraded',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        database: dbHealth
    };

    const code = healthStatus.status === 'ok' ? 200 : 503;
    res.status(code).json(healthStatus);
});

const protectedRoutes = require('./routes/protected');

// API Routes
// 1. PUBLIC: Scanning & Registry (Rate Limited only)
app.use('/api', rateLimiter, scanRoutes);

// 2. PROTECTED: Monitoring & Clinical (Auth Required)
app.use('/api', rateLimiter, protectedRoutes);

// Page Routes
app.get('/clinical', (req, res) => {
    res.sendFile(path.join(__dirname, '../clinical.html'));
});

// Fallback for API (404)
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API Endpoint Not Found' });
});

// SPA Fallback / Default Route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../index.html'));
});

// CENTRAL ERROR HANDLER
app.use((err, req, res, next) => {
    logger.error(`Server Error`, { error: err.message, stack: err.stack });

    const isDev = NODE_ENV === 'development';

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'File too large. Max 5MB.' });
    }
    if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ error: 'Invalid file type. Images only.' });
    }

    const statusCode = err.statusCode || 500;

    res.status(statusCode).json({
        error: isDev ? err.message : 'Internal Server Error',
        ...(isDev && { stack: err.stack })
    });
});

app.listen(PORT, () => {
    logger.info(`Server active`, { port: PORT, env: NODE_ENV });
    store.init();
});
