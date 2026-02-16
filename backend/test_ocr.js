
const noiseKeywords = ['weight', 'date', 'invoice', 'page', 'patient', 'client', 'species', 'sex', 'id:', 'total', 'subtotal', 'dvm', 'hospital', 'clinic'];

const findPrices = (text) => {
    // Regex from server.js
    const globalRegex = /(\(?\s*-?\$?\s*\d{1,3}(?:,?\d{3})*\.\d{2}\s*\)?)/g;
    const matches = [...text.matchAll(globalRegex)];
    if (matches.length === 0) return null;

    let bestMatch = matches[matches.length - 1];
    const dollarMatch = matches.find(m => m[0].includes('$'));
    if (dollarMatch) bestMatch = dollarMatch;

    let rawStr = bestMatch[0];
    let val = parseFloat(rawStr.replace(/[^0-9.]/g, ''));
    if (rawStr.includes('-') || rawStr.includes('(')) {
        val = -val;
    }

    if (val === 1.00 && !rawStr.includes('$')) {
        val = 0.00;
    }

    return {
        str: rawStr,
        val: val,
        index: bestMatch.index,
        hasDollar: rawStr.includes('$')
    };
};

const lines = [
    "Propofol Anesthetic Induction 11.00",
    "Rimadyl / Carprofen Injection 1.20",
    "Rescue Group Discount 1.00 (30.00)",
    "Rescue Group Discount (30.00)",
    "Rescue Group Discount 1.00",
    "(30.00)"
];

console.log("--- Testing findPrices ---");
lines.forEach(line => {
    const res = findPrices(line);
    console.log(`Line: "${line}" =>`, res ? `${res.val} (raw: ${res.str})` : "NULL");
});
