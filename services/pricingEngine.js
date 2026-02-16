// Imported constants removed, data now injected via params

/**
 * Fetches pricing data from backend
 * @param {string} zipCode 
 * @returns {Promise<Object>}
 */
export async function fetchPricingData(zipCode) {
    try {
        const response = await fetch(`http://localhost:3000/api/pricing?zip=${zipCode}`);
        if (!response.ok) {
            throw new Error(`Pricing API Error: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error("Pricing Engine Error:", error);
        return {}; // Return empty object on failure to avoid crash
    }
}

export function evaluateReceipt(receiptData, zipCode, pricingData) {
    // pricingData structure expected: { '78701': { 'code': { min, max, name } } }
    let regionData = pricingData[zipCode];

    // Fallback to 78701 if zip not found OR if zip has no data
    if (!regionData || Object.keys(regionData).length === 0) {
        regionData = pricingData['78701'] || {};
    }

    let totalScore = 100;
    let outlierCount = 0;

    const evaluatedItems = receiptData.items.map(item => {
        // Find matching baseline
        const baseline = regionData[item.code];

        if (!baseline) {
            return {
                ...item,
                name: item.description,
                verdictText: "Unknown",
                verdictClass: "verdict-neutral",
                avgMin: "?",
                avgMax: "?"
            };
        }

        // Logic
        // Logic
        let verdictText = "Within Range";
        let verdictClass = "verdict-fair";

        if (item.price === 0) {
            verdictText = "Included";
            verdictClass = "verdict-good"; // Green
        } else if (item.price < 0) {
            verdictText = "Discount";
            verdictClass = "verdict-good";
        } else if (item.price > baseline.max) {
            verdictText = "Above Avg";
            verdictClass = "verdict-high";
            totalScore -= 20; // Deduct trust score
            outlierCount++;
        } else if (item.price < baseline.min) {
            verdictText = "Below Avg"; // Neutral factual statement
            verdictClass = "verdict-low";
        }

        // Generate Explanations
        const PROCEDURE_KNOWLEDGE = {
            "Exam": {
                included: "Physical checkup (eyes, ears, heart, lungs), weight check, consultation",
                extras: "Vaccines, lab tests, medications",
                factors: "Emergency vs. scheduled, specialist vs. general practice",
                questions: "Is this a comprehensive exam or a specific issue consult?"
            },
            "Vaccination": {
                included: "The vaccine injection, waste disposal",
                extras: "Exam fee (often charged separately), tag fee (rabies)",
                factors: "Lifestyle of pet (indoor/outdoor), county regulations",
                questions: "Does this vaccine require a booster shot in 3-4 weeks?"
            },
            "Surgery": {
                included: "Anesthesia, monitoring, surgery time, absorbable sutures",
                extras: "Pre-anesthetic bloodwork, pain meds to go home, e-collar (cone)",
                factors: "Patient weight (heavier = more drug), age, pre-existing conditions",
                questions: "Is bloodwork mandatory or optional? Is pain medication included?"
            },
            "Dental": {
                included: "Scaling, polishing, full mouth probing",
                extras: "Tooth extractions (can double cost), dental X-rays, antibiotics",
                factors: "Grade of dental disease (1-4), time under anesthesia",
                questions: "Does this estimate include potential extractions?"
            },
            "Lab Test": {
                included: "Sample collection, running the test, doctor interpretation",
                extras: "Sedation (if pet is fearful), specialist review",
                factors: "In-house (faster) vs. reference lab (cheaper/more comprehensive)",
                questions: "When will we get the results?"
            },
            "Imaging": {
                included: "Taking the images, initial review",
                extras: "Sedation/Anesthesia, Radiologist consult fee",
                factors: "Number of views taken, size of pet",
                questions: "Will these images be reviewed by a radiologist?"
            }
        };

        // Determine Category from name/code or default
        // We can reuse the standardizeItem logic if available, or just heuristic
        let category = "Other";
        const lowerName = (baseline.name || item.description).toLowerCase();

        if (lowerName.includes('exam')) category = "Exam";
        else if (lowerName.includes('vaccin')) category = "Vaccination";
        else if (lowerName.includes('neuter') || lowerName.includes('spay') || lowerName.includes('surg')) category = "Surgery";
        else if (lowerName.includes('dental')) category = "Dental";
        else if (lowerName.includes('blood') || lowerName.includes('test') || lowerName.includes('fecal')) category = "Lab Test";
        else if (lowerName.includes('x-ray') || lowerName.includes('radio')) category = "Imaging";

        const knowledge = PROCEDURE_KNOWLEDGE[category];
        let explanationObject = null;

        if (knowledge && baseline.min > 0) {
            explanationObject = {
                range: `$${baseline.min} - $${baseline.max}`,
                included: knowledge.included,
                extras: knowledge.extras,
                factors: knowledge.factors,
                questions: knowledge.questions
            };
        }

        return {
            name: baseline.name || item.description,
            price: item.price,
            avgMin: baseline.min,
            avgMax: baseline.max,
            verdictText,
            verdictClass,
            explanation: explanationObject // Attach structure
        };
    });

    // -----------------------------------------
    // COMPARATIVE ANALYSIS LOGIC
    // -----------------------------------------

    let totalUserCost = 0;
    let totalRegionMin = 0;
    let totalRegionMax = 0;
    let itemsMatched = 0;
    let totalItems = receiptData.items.length;

    // We need to loop again or track totals during the map.
    // Let's use the evaluatedItems since they already found the baseline.
    evaluatedItems.forEach(item => {
        if (item.price > 0 && item.verdictText !== "Discount") {
            totalUserCost += item.price;
        }

        // Only sum regional avg if we actually found a baseline match
        if (item.avgMin !== "?" && item.price > 0 && item.verdictText !== "Discount") {
            totalRegionMin += item.avgMin;
            totalRegionMax += item.avgMax;
            itemsMatched++;
        }
    });

    // 1. Summary
    const avgMid = (totalRegionMin + totalRegionMax) / 2;
    let diffPercent = 0;
    let comparisonResult = "within typical range";

    if (itemsMatched > 0 && avgMid > 0) {
        diffPercent = ((totalUserCost - avgMid) / avgMid) * 100;

        if (totalUserCost > totalRegionMax * 1.05) { // 5% buffer
            comparisonResult = "above local average";
        } else if (totalUserCost < totalRegionMin * 0.95) {
            comparisonResult = "below local average";
        }
    }

    const analysisSummary = {
        result: comparisonResult,
        diff_percent: itemsMatched > 0 ? `${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}%` : "N/A"
    };

    // 2. Explanation
    // Identify drivers: items > avgMax
    // Identify drivers: items > avgMax
    const drivers = evaluatedItems.filter(i => i.price > i.avgMax && i.avgMax !== "?");
    // Identify optional items (using standardizations if available)
    const standardized = receiptData.standardized_items || [];
    const optionalItems = standardized.filter(i => i.inclusion_type === "optional add-on").map(i => i.original_name);
    const premiumItems = standardized.filter(i => i.inclusion_type === "premium_safety").map(i => i.original_name);

    let explanationText = `Your total is ${comparisonResult} for this region. `;

    if (drivers.length > 0) {
        explanationText += `The primary cost drivers appear to be ${drivers.map(d => d.name).join(", ")}. `;
    } else {
        explanationText += "Most items fall within standard pricing considerations. ";
    }

    if (premiumItems.length > 0) {
        explanationText += `This bill includes **Premium Safety Measures**: ${premiumItems.join(", ")}. These increase the cost but significantly improve patient safety. `;
    } else if (optionalItems.length > 0) {
        explanationText += `This bill includes optional services like: ${optionalItems.join(", ")}.`;
    }

    // 3. Confidence & Uncertainty
    // Heuristic: % of items matched to database
    let confidenceLevel = "Low";
    let limitations = [];

    if (totalItems > 0) {
        const matchRate = itemsMatched / totalItems;
        if (matchRate > 0.8) confidenceLevel = "High";
        else if (matchRate > 0.5) confidenceLevel = "Medium";

        if (matchRate < 1.0) {
            limitations.push(`We couldn't find exact regional matches for ${totalItems - itemsMatched} items.`);
        }
    } else {
        limitations.push("We extracted no readable line items to analyze.");
    }

    // Check for "Generic" region fallback
    if (Object.keys(regionData).length === 0 || zipCode !== '78701') {
        limitations.push(`Data for ${zipCode} is limited; we used broader state-level averages.`);
    }

    const DisclaimerText = "Market rates fluctuate. This analysis is an estimate based on crowdsourced data, not a guaranteed appraisal.";

    const analysisConfidence = {
        level: confidenceLevel,
        reason: `We validated ${itemsMatched} out of ${totalItems} items against our database.`,
        limitations: limitations.length > 0 ? limitations.join(" ") : "No major data gaps detected.",
        disclaimer: DisclaimerText
    };

    // 4. Reassurance Message (Calm, Supportive, Non-Judgmental)
    let reassurance = "";
    const suggestions = [
        "Ask about a written estimate before procedures next time.",
        "Check if your clinic accepts CareCredit for unexpected expenses.",
        "Ask if there are generic alternatives for prescribed medications.",
        "Inquire if any bundled packages are available for these services."
    ];
    const suggestion = suggestions[Math.floor(Math.random() * suggestions.length)];

    if (comparisonResult === "within typical range") {
        reassurance = `It's completely normal to worry about unexpected vet bills. Based on our data, this total is **typical** for a visit like this in your area. You paid a standard rate for the primary services.`;
    } else if (comparisonResult === "below local average") {
        reassurance = `That's great news! It looks like you managed to stay **under budget** compared to the regional average. This clinic appears to urge competitive pricing for these services.`;
    } else {
        // High price logic
        if (premiumItems.length > 0) {
            reassurance = `This bill is slightly higher than the local average, but that directly reflects a **Higher Standard of Care**. \n\nThe inclusion of **${premiumItems.join(" and ")}** ensures the highest safety for your pet. Many cheaper quotes skip these critical safety steps. You are paying for peace of mind, not inflated fees.`;
        } else {
            reassurance = `Veterinary costs can vary, and this bill is slightly **higher than the typical average**. This often happens due to specific medical needs or advanced care levels. It doesn't necessarily mean you were overcharged.`;
        }
    }

    if (comparisonResult === "within typical range" && premiumItems.length > 0) {
        reassurance += ` The inclusion of **${premiumItems[0]}** indicates a high quality of care.`;
    } else if (optionalItems.length > 0 && !reassurance.includes("Higher Standard")) {
        reassurance += ` Note that items like ${optionalItems[0]} are often considered optional add-ons.`;
    }

    reassurance += `\n\n**Helpful Tip:** Next time, you could ${suggestion.toLowerCase()}`;

    return {
        items: evaluatedItems,
        scoreLabel,
        scoreClass,
        summary, // Legacy
        comparativeAnalysis: {
            summary: analysisSummary,
            explanation: explanationText, // Technical explanation
            reassurance_message: reassurance, // User-facing supportive text
            confidence: analysisConfidence
        }
    };
}
