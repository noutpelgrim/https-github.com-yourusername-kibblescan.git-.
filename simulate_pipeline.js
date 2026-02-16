
// SIMULATION OF PETCARE AI PIPELINE
// Steps: Extract -> Structure -> Normalize -> Compare -> Explain

console.log("---------------------------------------------------------");
console.log("PETCARE AI - PIPELINE SIMULATION");
console.log("---------------------------------------------------------");

// ==========================================
// 1. INPUT DATA (Simulating OCR)
// ==========================================
const RAW_OCR_TEXT = `
Happy Paws Veterinary Clinic
123 Main St, Austin TX
Date: 01/12/2026

Office Visit / Exam .......... $75.00
Canine Dental Cleaning ........ $320.00
Pre-Anesthetic Bloodwork ...... $110.00
Anesthesia Monitoring ......... $85.00
IV Fluids .................... $65.00
Medications Take Home ......... $45.00

Subtotal: $700.00
Tax: $0.00
Total: $700.00
`;

console.log("\n1. RECEIVED INPUT (OCR TEXT)");
console.log(RAW_OCR_TEXT);

// ==========================================
// 2. PARSING & STRUCTURING (From server.js)
// ==========================================

function parseOCR(text) {
    const lines = text.split('\n');
    const structured = {
        clinic: "Happy Paws Veterinary Clinic",
        date: "01/12/2026",
        items: []
    };

    // Updated Regex for "Item ....... $Price" format
    // Matches: (Description) (Dots) ($Price)
    const itemRegex = /(.+?)\.+\s*\$(\d+\.?\d*)/;

    lines.forEach(line => {
        const match = line.match(itemRegex);
        if (match && !line.toLowerCase().includes('total') && !line.toLowerCase().includes('tax') && !line.toLowerCase().includes('subtotal')) {
            structured.items.push({
                original_name: match[1].trim(),
                price: parseFloat(match[2])
            });
        }
    });
    return structured;
}

const parsedData = parseOCR(RAW_OCR_TEXT);
console.log("\n2. STRUCTURED DATA");
console.log(JSON.stringify(parsedData, null, 2));

// ==========================================
// 3. NORMALIZATION (From server.js)
// ==========================================

function standardizeItem(description) {
    const lower = description.toLowerCase();
    let category = "Other";
    let inclusion = "medically situational";
    let confidence = "low";

    if (lower.match(/exam|visit|consult/)) {
        category = "Exam"; inclusion = "commonly included"; confidence = "high";
    } else if (lower.match(/dental|cleaning|tooth/)) {
        category = "Dental"; inclusion = "medically situational"; confidence = "high";
    } else if (lower.match(/bloodwork|panel|cbc/)) {
        category = "Lab Test"; inclusion = "premium_safety"; confidence = "high";
    } else if (lower.match(/anesthesia|monitoring/)) {
        category = "Anesthesia"; inclusion = "commonly included"; confidence = "high";
    } else if (lower.match(/fluids|iv/)) {
        category = "Supplies"; inclusion = "premium_safety"; confidence = "medium";
    } else if (lower.match(/medications|take home|rx/)) {
        category = "Medication"; inclusion = "medically situational"; confidence = "medium";
    }

    return {
        original_name: description,
        normalized_category: category,
        inclusion_type: inclusion,
        confidence: confidence
    };
}

const standardizedItems = parsedData.items.map(item => standardizeItem(item.original_name));
console.log("\n3. NORMALIZED ITEMS");
console.log(JSON.stringify(standardizedItems, null, 2));


// ==========================================
// 4. COMPARISON DATA (Mock Regional DB)
// ==========================================
// User provided: Average dental visit total $520-$610
// We break this down into component costs that sum up to roughly that range for 'Typical' items
const REGIONAL_DATA_78701 = {
    "Exam": { min: 60, max: 80, name: "Office Visit" },              // Typ: 70
    "Dental": { min: 250, max: 350, name: "Dental Prophylaxis" },    // Typ: 300
    "Lab Test": { min: 80, max: 120, name: "Pre-Anesthetic Panel" }, // Typ: 100
    "Anesthesia": { min: 60, max: 90, name: "Monitoring" },          // Typ: 75
    "Supplies": { min: 40, max: 60, name: "IV Fluids/Cath" },        // Typ: 50
    "Medication": { min: 20, max: 40, name: "Post-Op Pain Meds" },   // Typ: 30
    "Other": { min: 0, max: 0, name: "Misc" }
};
// Total "Typical" Min ~ 510, Max ~ 740. 
// User said Total Avg is 520-610. The sum of components usually is slightly wider.
// Our individual ranges simulate the variability.

// ==========================================
// 5. EVALUATION LOGIC (From pricingEngine.js)
// ==========================================

function evaluate(items, standardized, regionData) {
    let totalUser = 0;
    let totalMin = 0;
    let totalMax = 0;
    let matchedCount = 0;
    const evaluatedItems = [];

    items.forEach((item, index) => {
        const std = standardized[index];
        const baseline = regionData[std.normalized_category];

        let verdict = "Within Range";
        if (item.price === 0) verdict = "Included";
        else if (baseline && item.price > baseline.max) verdict = "Above Avg";
        else if (baseline && item.price < baseline.min) verdict = "Below Avg";

        if (baseline && item.price > 0) {
            totalUser += item.price;
            totalMin += baseline.min;
            totalMax += baseline.max;
            matchedCount++;
        }

        evaluatedItems.push({
            name: item.original_name,
            category: std.normalized_category,
            price: item.price,
            range: baseline ? `$${baseline.min}-${baseline.max}` : "N/A",
            verdict: verdict
        });
    });

    // Summary Logic
    let comparison = "within typical range";
    let diffPercent = 0;

    // Calculate mid-point sum for percentage diff
    const totalMid = (totalMin + totalMax) / 2;
    if (totalMid > 0) {
        diffPercent = ((totalUser - totalMid) / totalMid) * 100;
    }

    if (totalUser > totalMax * 1.05) comparison = "above local average";
    else if (totalUser < totalMin * 0.95) comparison = "below local average";

    // Explanations
    const optional = standardized.filter(i => i.inclusion_type === "optional add-on").map(i => i.original_name);
    const premium = standardized.filter(i => i.inclusion_type === "premium_safety").map(i => i.original_name);
    const drivers = items.filter((item, index) => {
        const std = standardized[index];
        const baseline = regionData[std.normalized_category];
        return baseline && item.price > baseline.max;
    }).map(i => i.original_name);

    // Confidence
    const matchRate = items.length > 0 ? matchedCount / items.length : 0;
    let confidenceLevel = "Low";
    if (matchRate > 0.8) confidenceLevel = "High";
    else if (matchRate > 0.5) confidenceLevel = "Medium";

    return {
        items: evaluatedItems,
        summary: comparison,
        diff_percent: diffPercent,
        drivers: drivers,
        optional_items: optional,
        premium_items: premium,
        confidence: confidenceLevel,
        match_count: matchedCount,
        total_items: items.length
    };
}

const finalAnalysis = evaluate(parsedData.items, standardizedItems, REGIONAL_DATA_78701);

// ==========================================
// 6. GENERATE FINAL OUTPUT REPORT
// ==========================================

console.log("\nSTRUCTURED BILL (JSON):");
console.log(JSON.stringify(parsedData, null, 2));

console.log("\nNORMALIZED ITEMS:");
console.log(JSON.stringify(standardizedItems, null, 2));

console.log("\nPRICE COMPARISON SUMMARY:");
console.log(`- Result: ${finalAnalysis.summary}`);
console.log(`- Percentage difference: ${finalAnalysis.diff_percent > 0 ? '+' : ''}${finalAnalysis.diff_percent.toFixed(1)}%`);

console.log("\nEXPLANATION:");
console.log(`- Key cost drivers: ${finalAnalysis.drivers.length > 0 ? finalAnalysis.drivers.join(", ") : "None identified (all within standard range)"}`);
console.log(`- Optional vs commonly included items: ${finalAnalysis.optional_items.length > 0 ? finalAnalysis.optional_items.join(", ") : "No purely optional items detected"}`);

if (finalAnalysis.premium_items.length > 0) {
    console.log(`- Premium Safety Measures: ${finalAnalysis.premium_items.join(", ")} (These increase cost but significantly improve safety)`);
}

console.log(`- Why prices may vary: ${finalAnalysis.premium_items.length > 0
    ? "Prices vary significantly based on safety protocols. This bill includes high-standard safety measures (Bloodwork, IV Fluids) that aren't in every basic quote."
    : "Prices often vary based on procedure complexity, anesthesia time, and monitoring equipment levels."}`);

console.log("\nCONFIDENCE LEVEL:");
console.log(`- ${finalAnalysis.confidence}`);
console.log(`- Reason: We successfully matched ${finalAnalysis.match_count} out of ${finalAnalysis.total_items} items to verified regional pricing data.`);

console.log("\nUSER-FACING MESSAGE:");
// Dynamic generation logic mimicking pricingEngine.js tone
let message = "";
if (finalAnalysis.summary === "within typical range") {
    message = `It can be stressful to see a total like this, but based on local data for Austin, your bill is actually quite standard for a dental procedure of this quality. You aren't being overcharged; you're paying fair market rate for comprehensive care.`;
} else if (finalAnalysis.summary.includes("above") || finalAnalysis.diff_percent > 5) {
    if (finalAnalysis.premium_items.length > 0) {
        message = `This bill is slightly higher (${finalAnalysis.diff_percent.toFixed(0)}%) than the local average, but that directly reflects a **Higher Standard of Care**. \n\nThe inclusion of **${finalAnalysis.premium_items.join(" and ")}** ensures the highest safety for your pet during anesthesia. Many cheaper quotes skip these crucial safety steps. You are paying for peace of mind, not inflated fees.`;
    } else {
        message = `This bill is higher than the local average. We recommend asking the vet about the specific cost drivers identified above to understand if lower-cost alternatives exist.`;
    }
} else {
    message = `You've received a very competitive rate! This bill is below what we typically see for similar procedures in the area.`;
}

if (finalAnalysis.optional_items.length > 0) {
    message += ` Note that items like ${finalAnalysis.optional_items[0]} are commonly optional, which contributed to the final total but provided extra value.`;
}

message += `\n\nIf you have questions for next time, asking for a written estimate beforehand is a great way to prepare. Most clinics are happy to walk you through the costs so you know exactly what to expect.`;

console.log(message);
console.log("---------------------------------------------------------");
