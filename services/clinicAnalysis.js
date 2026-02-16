/**
 * Analyzes a collection of bills from a single clinic for fairness, consistency, and transparency.
 * @param {Array} bills - Array of bill objects { date, items: [{ description, price, code }] }
 * @param {Object} regionalData - Regional pricing norms
 */
export function evaluateClinicFairness(bills, regionalData) {
    if (!bills || bills.length === 0) return { error: "No data provided" };

    let totalFairnessPoints = 0;
    let consistencyPoints = 0;
    let transparencyPoints = 0;
    let totalItems = 0;

    // 1. Consistency Check
    // Group items by normalized description/code
    const itemGroups = {};
    bills.forEach(bill => {
        bill.items.forEach(item => {
            const key = item.code || item.description;
            if (!itemGroups[key]) itemGroups[key] = [];
            itemGroups[key].push(item.price);
            totalItems++;
        });
    });

    // Calculate Variance for commonly repeated items
    let consistentItems = 0;
    let variedItems = 0;

    for (const [key, prices] of Object.entries(itemGroups)) {
        if (prices.length > 1) {
            const mean = prices.reduce((a, b) => a + b) / prices.length;
            const variance = prices.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / prices.length;
            const stdDev = Math.sqrt(variance);
            const cv = stdDev / mean; // Coefficient of Variation

            if (cv < 0.1) consistentItems++; // Less than 10% variation
            else variedItems++;
        }
    }

    let consistencyScore = "Medium";
    if (consistentItems > variedItems * 2) consistencyScore = "High";
    if (variedItems > consistentItems) consistencyScore = "Low";

    // 2. Fairness (vs Regional)
    let aboveAvgCount = 0;
    let belowAvgCount = 0;

    bills.forEach(bill => {
        bill.items.forEach(item => {
            // Safety check: ensure regionalData has the zip or fallback
            let bucket = null;
            if (regionalData[item.code]) {
                bucket = regionalData[item.code];
            } else if (regionalData['78701'] && regionalData['78701'][item.code]) {
                bucket = regionalData['78701'][item.code];
            }

            if (bucket) {
                if (item.price > bucket.max) aboveAvgCount++;
                else if (item.price < bucket.min) belowAvgCount++;
            }
        });
    });

    let fairnessScore = 3;
    if (belowAvgCount > aboveAvgCount) fairnessScore = 4;
    if (belowAvgCount > aboveAvgCount * 2) fairnessScore = 5;
    if (aboveAvgCount > belowAvgCount) fairnessScore = 2;
    if (aboveAvgCount > belowAvgCount * 2) fairnessScore = 1;

    // 3. Transparency (Heuristic: Description Length/Specificity)
    // Short generic names like "Exam", "Misc" vs "Comprehensive Physical Exam"
    // Also itemized vs bundled (hard to tell from simple list, but simplified here)
    let vagueItems = 0;
    bills.forEach(bill => {
        bill.items.forEach(item => {
            if (item.description.length < 10 || item.description.toLowerCase().includes('misc')) {
                vagueItems++;
            }
        });
    });

    const transparencyRatio = 1 - (vagueItems / totalItems);
    let transparencyLevel = "High";
    if (transparencyRatio < 0.8) transparencyLevel = "Medium";
    if (transparencyRatio < 0.5) transparencyLevel = "Low";

    // Summary Generation
    let summary = "";
    if (consistencyScore === "High") {
        summary += "This clinic shows strong pricing consistency across patients. ";
    } else {
        summary += "Pricing appears variable for similar services. ";
    }

    if (fairnessScore >= 4) {
        summary += "Overall charges are competitive for the region. ";
    } else if (fairnessScore <= 2) {
        summary += "Costs trend higher than the local median. ";
    } else {
        summary += "Pricing is standard for the area. ";
    }

    return {
        fairness_score: fairnessScore,
        pricing_consistency: consistencyScore,
        transparency_level: transparencyLevel,
        summary_explanation: summary,
        metrics: {
            bills_analyzed: bills.length,
            items_analyzed: totalItems,
            consistent_services: consistentItems,
            varied_services: variedItems
        }
    };
}
