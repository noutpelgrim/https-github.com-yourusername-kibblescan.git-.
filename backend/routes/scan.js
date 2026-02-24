const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cleanText, extractIngredientsWithRaw } = require('../normalize');
const { classifyFormulation } = require('../classifier');
const { detectLabelMetadata } = require('../label_parser');
const fs = require('fs');
const os = require('os');
const db = require('../db');
const fh = require('../services/formulation_history');


// Setup Disk Storage (Spill to Disk to prevent RAM exhaustion)
const upload = multer({
    dest: os.tmpdir(), // Use system temp directory
    limits: {
        fileSize: 15 * 1024 * 1024, // 15MB Limit (High-res iPad/iPhone photos)
        files: 1
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('INVALID_FILE_TYPE'), false);
        }
    }
});

// Google Vision Client
const vision = require('@google-cloud/vision');

const visionConfig = {};
if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
        visionConfig.credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    } catch (e) {
        console.error("Failed to parse GOOGLE_CREDENTIALS_JSON", e);
    }
}

const client = new vision.ImageAnnotatorClient(visionConfig);

router.post('/analyze', upload.single('receipt'), async (req, res) => {
    // Define cleanup routine
    const cleanup = () => {
        if (req.file && req.file.path) {
            fs.unlink(req.file.path, (err) => {
                if (err) console.error(`[Cleanup Error] Failed to delete ${req.file.path}:`, err);
            });
        }
    };

    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        // 1. OCR Execution
        let rawText = null;
        let confidence = 0.0;
        let mockDataUsed = false;

        try {
            // A. Dev Environment Bypass
            const NODE_ENV = process.env.NODE_ENV || 'development';

            if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && NODE_ENV === 'development') {
                console.log("[SCAN] No Google Creds + Dev Mode. Using MOCK OCR.");

                // QA Testing Hook
                if (req.headers['x-mock-ocr-text']) {
                    rawText = req.headers['x-mock-ocr-text'];
                    console.log(`[QA] Using injected mock text: "${rawText.substring(0, 20)}..."`);
                } else {
                    rawText = "Ingredients: Corn Gluten Meal, Chicken By-Product Meal, Animal Digest, BHA, Red 40, Wheat, Powdered Cellulose, Chicken, Sweet Potato.";
                }

                confidence = req.headers['x-mock-confidence'] ? parseFloat(req.headers['x-mock-confidence']) : 0.95;
                mockDataUsed = true;
            }
            // B. Production Vision API Call (Read from Disk)
            else {
                const [result] = await client.textDetection(req.file.path);
                const detections = result.textAnnotations;

                if (detections && detections.length > 0) {
                    rawText = detections[0].description;
                    confidence = 0.95;
                } else {
                    console.warn("[SCAN] Vision API returned no text.");
                }
            }
        } catch (visionError) {
            console.warn("[SCAN] Vision API failed:", visionError.message);

            // C. Fallback allowed ONLY in Dev
            const NODE_ENV = process.env.NODE_ENV || 'development';
            if (NODE_ENV === 'development') {
                console.warn("[SCAN] Using Dev Fallback due to API error.");
                rawText = "Ingredients: Corn Gluten Meal, Chicken By-Product Meal, Animal Digest, BHA, Red 40, Wheat, Powdered Cellulose, Chicken, Sweet Potato.";
                confidence = 0.95;
                mockDataUsed = true;
            }
        }

        // 2. Production Safety Check
        if (!rawText || rawText.trim().length === 0) {
            console.error("[SCAN] Critical: No text detected in production scan.");
            return res.json({
                message: 'Audit Complete (No Data)',
                data: {
                    outcome: 'UNKNOWN_FORMULATION',
                    reason: 'OCR_FAILURE',
                    ingredients: [],
                    confidence: 0.0
                },
                rawText: ''
            });
        }

        // 3. Normalization — extract {raw, normalized} pairs for OCR transparency
        const ingredientsList = extractIngredientsWithRaw(rawText);

        // 4. Classification
        const NODE_ENV = process.env.NODE_ENV || 'development';
        if (req.file.originalname.includes('fail') && NODE_ENV === 'development') {
            confidence = 0.50;
        }

        const result = classifyFormulation(ingredientsList, confidence);

        // 5. Label Metadata (product type, life stage, AAFCO, GA)
        const scanSummary = detectLabelMetadata(rawText, result.ingredients);

        // 5. Formulation versioning — save every scan as a version (no auth required)
        let formulationHistory = { versions: [], productId: null, versionNumber: null, changeStatus: null };
        try {
            const productName = (scanSummary && scanSummary.productName) ? scanSummary.productName : 'Unknown Product';
            const saved = await fh.saveVersion({
                ingredients: result.ingredients,
                classificationResult: result,
                productName,
                scanSource: 'OCR'
            });
            if (saved) {
                formulationHistory.productId = saved.productId;
                formulationHistory.versionNumber = saved.versionNumber;
                formulationHistory.changeStatus = saved.changeStatus;
                formulationHistory.versions = await fh.getHistory(saved.productId);
            }
        } catch (fhErr) {
            console.error('[SCAN] Formulation history save failed (non-fatal):', fhErr.message);
        }

        res.json({
            message: 'Audit Complete',
            data: result,
            scanSummary,
            rawText: rawText,
            formulationHistory
        });

    } catch (error) {
        console.error('[SCAN] Error:', error);
        res.status(500).json({ error: 'Internal processing error' });
    } finally {
        // ALWAYS Cleanup Temp File
        cleanup();
    }
});

// POST /analyze-text — manual ingredient paste (skips OCR, same pipeline)
router.post('/analyze-text', async (req, res) => {
    const rawText = (req.body && req.body.text) ? String(req.body.text).trim() : '';

    if (!rawText || rawText.length < 3) {
        return res.status(400).json({ error: 'No ingredient text provided.' });
    }
    if (rawText.length > 20000) {
        return res.status(400).json({ error: 'Text too long (max 20,000 characters).' });
    }

    try {
        console.log('[SCAN-TEXT] Manual paste received, length:', rawText.length);

        // 1. Normalization — identical to image path
        const ingredientsList = extractIngredientsWithRaw(rawText);

        if (!ingredientsList || ingredientsList.length === 0) {
            return res.json({
                message: 'Audit Complete',
                data: { outcome: 'UNKNOWN_FORMULATION', reason: 'No ingredients detected in pasted text.', ingredients: [], confidence: 1.0 },
                scanSummary: { overallOCRMatch: 100, productType: 'Unknown', lifeStage: 'Unknown', guaranteedAnalysisPresent: false, aafcoStatement: null, scanSource: 'Manual' },
                rawText
            });
        }

        // 2. Classification (confidence = 1.0 — no OCR uncertainty on manual input)
        const result = classifyFormulation(ingredientsList, 1.0);

        // 3. Label metadata + mark source as Manual
        const scanSummary = {
            ...detectLabelMetadata(rawText, result.ingredients),
            scanSource: 'Manual'
        };

        // 4. Formulation versioning (non-blocking, no auth required)
        let formulationHistory = { versions: [], productId: null, versionNumber: null, changeStatus: null };
        try {
            const productName = (scanSummary && scanSummary.productName) ? scanSummary.productName : 'Unknown Product';
            const saved = await fh.saveVersion({
                ingredients: result.ingredients,
                classificationResult: result,
                productName,
                scanSource: 'Manual'
            });
            if (saved) {
                formulationHistory.productId = saved.productId;
                formulationHistory.versionNumber = saved.versionNumber;
                formulationHistory.changeStatus = saved.changeStatus;
                formulationHistory.versions = await fh.getHistory(saved.productId);
            }
        } catch (fhErr) {
            console.error('[SCAN-TEXT] Formulation history save failed (non-fatal):', fhErr.message);
        }

        res.json({ message: 'Audit Complete', data: result, scanSummary, rawText, formulationHistory });

    } catch (error) {
        console.error('[SCAN-TEXT] Error:', error);
        res.status(500).json({ error: 'Internal processing error' });
    }
});

// GET /recent - Fetch last 20 scans (Global for now)
router.get('/recent', async (req, res) => {
    try {
        const result = await db.query(`
            SELECT id, verdict, created_at, 
                   raw_text, ingredients_found 
            FROM scans 
            ORDER BY created_at DESC 
            LIMIT 20
        `);
        res.json(result.rows);
    } catch (err) {
        console.error("[HISTORY] Failed to fetch recent scans:", err);
        res.status(500).json({ error: "Failed to fetch history" });
    }
});

// GET /history/:productId - Formulation version history for a product
// Free: returns all version rows (date, version number, change status)
// Pro: same data — diff view is rendered client-side using ingredient_list
router.get('/history/:productId', async (req, res) => {
    try {
        const versions = await fh.getHistory(req.params.productId);
        res.json({ productId: req.params.productId, versions });
    } catch (err) {
        console.error('[HISTORY] fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// GET /versions/recent - Debug / dashboard: most recent versions across all products
router.get('/versions/recent', async (req, res) => {
    try {
        const versions = await fh.getRecentVersions(50);
        res.json({ versions });
    } catch (err) {
        console.error('[VERSIONS] recent fetch failed:', err.message);
        res.status(500).json({ error: 'Failed to fetch recent versions' });
    }
});

module.exports = router;
