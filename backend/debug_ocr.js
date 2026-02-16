const strictNoiseKeywords = ['weight', 'date', 'invoice', 'page', 'patient', 'client', 'species', 'sex', 'id:', 'dvm', 'dv', 'ms', 'hospital', 'clinic', 'payment', 'check', 'visa', 'master', 'amex', 'discover', 'due'];
const softNoiseKeywords = ['total', 'subtotal', 'price', 'amount', 'balance', 'change', 'less'];

const sampleText = `
BluePearl Vet Partners-Gainesville
Client ID: 288973
Invoice #: 274147
Date: 9/15/2019
Species: Feline
Weight: 6.00 kilograms
Sex: Spayed Female
Staff Name Quantity Total
Elizabeth R. Luria, MS, DV 1.00 $116.00
1.00 $192.20
onvenia)80mg/ml Inj(per ml)B 0.60 $66.95
ne 0.6 mg/ml Inj. (per ml) CP 2.25 $25.43
se Only 1.00 $0.00
Patient Subtotal: $400.58
Invoice Total: $400.58
Total: $400.58
Less Discount Rescue Discount: ($80.12)
Balance Due: $320.46
Previous Balance: ($208.94)
Balance Due: $111.52
Master Card: ($111.52)
Less Payment: ($111.52)
Balance Due: $0.00
`;

console.log("--- START DEBUG ---");
const lines = sampleText.split('\n');

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = line.trim();
    if (cleanLine.length < 2) continue;

    const lowerLine = cleanLine.toLowerCase();

    // REPLICATE SERVER LOGIC EXACTLY
    const isStrictNoise = strictNoiseKeywords.some(keyword => {
        if (keyword.length <= 3) {
            const regex = new RegExp(`\\b${keyword}\\b`);
            const match = regex.test(lowerLine);
            if (match) console.log(`   [REJECT] Line: "${cleanLine}" matched strict keyword "${keyword}" (Regex)`);
            return match;
        }
        const match = lowerLine.includes(keyword);
        if (match) console.log(`   [REJECT] Line: "${cleanLine}" matched strict keyword "${keyword}"`);
        return match;
    });

    if (!isStrictNoise) {
        console.log(`   [KEEP]   Line: "${cleanLine}"`);
    }
}
console.log("--- END DEBUG ---");
