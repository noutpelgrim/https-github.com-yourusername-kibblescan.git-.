/**
 * VERIFICATION SUITE: KIBBLESCAN BACKEND
 * Focus: Full Logic Kernel (Normalization + Classification)
 * Principle: Uncertainty Overrides Optimism
 */

const { classifyFormulation } = require('./classifier');
const { cleanText } = require('./normalize');

// Test Runner
function runTest(testName, input, confidence, expectedOutcome) {
    console.log(`[TEST] ${testName}`);

    // 1. Simulate OCR Text Block (Join array inputs)
    const rawText = Array.isArray(input) ? input.join('\n') : input;

    // 2. Normalize (Simulate route logic)
    const ingredientsList = cleanText(rawText);

    console.log(`       Input: "${rawText.replace(/\n/g, ', ')}"`);
    console.log(`       Parsed: [${ingredientsList.join(', ')}] (Conf: ${confidence})`);

    // 3. Classify
    const result = classifyFormulation(ingredientsList, confidence);

    const pass = result.outcome === expectedOutcome;

    console.log(`       Expected: ${expectedOutcome}`);
    console.log(`       Actual:   ${result.outcome}`);
    console.log(`       Status:   ${pass ? 'PASS' : 'FAIL'}`);
    console.log('---------------------------------------------------');

    return pass;
}

console.log("=== STARTING LOGIC KERNEL AUDIT ===\n");

let failures = 0;

// 1. VIOLATION CASE
if (!runTest(
    "Violation Priority",
    ["Chicken", "BHA"],
    0.99,
    "NON-COMPLIANT"
)) failures++;

// 2. AMBIGUOUS CASE
if (!runTest(
    "Ambiguity Check",
    ["Natural Flavors"],
    0.99,
    "AMBIGUOUS"
)) failures++;

// 3. EMBEDDED PRESERVATIVE CASE (Hidden Violation)
// Requires normalization to extract 'BHA' from inside parens
if (!runTest(
    "Embedded Preservative",
    ["Chicken Fat (preserved with BHA)"],
    0.99,
    "NON-COMPLIANT"
)) failures++;

// 4. VERIFIED CASE
if (!runTest(
    "Verified Clean",
    ["Chicken", "Rice"],
    0.99,
    "VERIFIED"
)) failures++;

// 5. UNKNOWN INGREDIENT CASE
if (!runTest(
    "Unknown Entity",
    ["UnknownIngredientX"],
    0.99,
    "AMBIGUOUS"
)) failures++;

// 6. EMPTY INPUT CASE
if (!runTest(
    "Empty Input",
    [],
    0.99,
    "UNKNOWN_FORMULATION"
)) failures++;

// 7. LOW CONFIDENCE CASE
if (!runTest(
    "Low Confidence Safety",
    ["Chicken", "Rice"],
    0.50,
    "UNKNOWN_FORMULATION"
)) failures++;


console.log("\n=== AUDIT COMPLETE ===");
if (failures === 0) {
    console.log("RESULT: ALL TESTS PASSED");
    process.exit(0);
} else {
    console.error(`RESULT: SYSTEM FAILURE (${failures} Checks Failed)`);
    process.exit(1);
}
