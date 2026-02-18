const express = require('express');
const router = express.Router();
const multer = require('multer');
const { cleanText } = require('../normalize');
const { classifyFormulation } = require('../classifier');
const fs = require('fs');
const os = require('os');
const db = require('../db');

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

        // 3. Normalization
        const ingredientsList = cleanText(rawText);

        // 4. Classification
        const NODE_ENV = process.env.NODE_ENV || 'development';
        if (req.file.originalname.includes('fail') && NODE_ENV === 'development') {
            confidence = 0.50;
        }

        const result = classifyFormulation(ingredientsList, confidence);

        // 5. Persist Scan Result
        try {
            // If user is authenticated, we might have req.user from middleware
            // But this route is currently public/rate-limited. 
            // We'll store NULL for user_id for now (or a session ID if available)
            const userId = req.user ? req.user.id : null;

            await db.query(`
                INSERT INTO scans (verdict, raw_text, ingredients_found, user_id)
                VALUES ($1, $2, $3, $4)
            `, [
                result.outcome,             // Verdict
                rawText,                    // Raw OCR Text
                JSON.stringify(result),     // Full Result JSON
                userId                      // Optional User ID
            ]);
            console.log("[SCAN] Result saved to database.");
        } catch (dbErr) {
            console.error("[SCAN] Failed to save scan to DB:", dbErr.message);
            // Don't fail the request, just log it.
        }

        res.json({
            message: 'Audit Complete',
            data: result,
            rawText: rawText
        });

    } catch (error) {
        console.error('[SCAN] Error:', error);
        res.status(500).json({ error: 'Internal processing error' });
    } finally {
        // ALWAYS Cleanup Temp File
        cleanup();
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

module.exports = router;
