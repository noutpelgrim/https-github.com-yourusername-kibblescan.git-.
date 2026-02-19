const https = require('https');

console.log("🔹 Verifying PWA assets...");

// 1. Check Manifest
const reqManifest = https.get('https://www.kibblescan.com/manifest.json', (res) => {
    console.log(`🔹 [Manifest] Status: ${res.statusCode}`);
    if (res.statusCode === 200) console.log("✅ Manifest is publicly accessible");
    else console.log("❌ Manifest invalid status");
});
reqManifest.on('error', (e) => console.error(`❌ Manifest Request Error: ${e.message}`));

// 2. Check Icon
const reqIcon = https.get('https://www.kibblescan.com/icons/icon-192.png', (res) => {
    console.log(`🔹 [Icon 192] Status: ${res.statusCode}`);
    if (res.statusCode === 200) console.log("✅ Icon is publicly accessible");
    else console.log("❌ Icon invalid status");
});
reqIcon.on('error', (e) => console.error(`❌ Icon Request Error: ${e.message}`));
