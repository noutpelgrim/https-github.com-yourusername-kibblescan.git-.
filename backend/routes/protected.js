const express = require('express');
const router = express.Router();
const { requireSubscription, requireClinical } = require('../middleware/access');

// ==========================================
// TIER 2: MONITORING ACCESS (Standard)
// ==========================================

// Enable Monitoring for a Product
router.post('/monitor/enable', requireSubscription, (req, res) => {
    res.json({
        status: 'active',
        message: 'Surveillance node allocated for SKU.',
        driftCheckInterval: '7 days'
    });
});

// Save Scan to History
router.post('/history/save', requireSubscription, (req, res) => {
    // In real impl, save to DB
    res.json({
        status: 'saved',
        id: 'record_' + Date.now()
    });
});

// ==========================================
// TIER 3: CLINICAL ACCESS (Veterinary)
// ==========================================

// Batch Formulation Lookup
router.post('/clinical/lookup', [requireSubscription, requireClinical], (req, res) => {
    res.json({
        results: [
            { sku: 'Diet A', status: 'Compliant' },
            { sku: 'Diet B', status: 'Drift Detected' }
        ]
    });
});

// PDF Export
router.post('/clinical/export', [requireSubscription, requireClinical], (req, res) => {
    res.json({
        url: '/downloads/report-patient-xanadu.pdf',
        generatedAt: new Date().toISOString()
    });
});

module.exports = router;
