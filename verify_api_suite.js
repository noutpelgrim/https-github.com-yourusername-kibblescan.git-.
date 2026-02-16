const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const TEST_PORT = 3005;

console.log("=== KIBBLESCAN API VERIFICATION SUITE ===");

// Create dummy files for testing
fs.writeFileSync('test_invalid.txt', 'This is not an image');
fs.writeFileSync('test_scan.jpg', 'dummy image content'); // Won't work with real Vision API but triggers flow

// Start Server in PRODUCTION mode
const serverProcess = spawn('node', ['backend/server.js'], {
    env: {
        ...process.env,
        PORT: TEST_PORT,
        NODE_ENV: 'production', // CRITICAL: Enforce Production
        GOOGLE_APPLICATION_CREDENTIALS: '' // Ensure no access
    },
    cwd: process.cwd(),
    stdio: 'pipe'
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
    const log = data.toString().trim();
    // console.log(`[SERVER] ${log}`);
    if (log.includes('KibbleScan Server running') && !serverReady) {
        serverReady = true;
        runTests();
    }
});

serverProcess.stderr.on('data', (data) => {
    // console.error(`[SERVER ERR] ${data.toString().trim()}`);
});

async function runTests() {
    try {
        console.log("\n--- TEST 1: EMPTY BODY ---");
        await runCurlTest(
            `curl -s -X POST http://localhost:${TEST_PORT}/api/analyze`,
            (json, stdout) => {
                if (json.error === 'No file uploaded') return 'PASS';
                return `FAIL: Expected 'No file uploaded', got ${JSON.stringify(json)}`;
            }
        );

        console.log("\n--- TEST 2: INVALID FILE (Text) ---");
        await runCurlTest(
            `curl -s -X POST -F "receipt=@test_invalid.txt" http://localhost:${TEST_PORT}/api/analyze`,
            (json) => {
                if (json.data && json.data.outcome === 'UNKNOWN_FORMULATION' && json.data.reason === 'OCR_FAILURE') {
                    return 'PASS';
                }
                return `FAIL: Expected UNKNOWN_FORMULATION/OCR_FAILURE, got ${json.data?.outcome}/${json.data?.reason}`;
            }
        );

        console.log("\n--- TEST 3: VALID IMAGE (No Creds / Prod Mode) ---");
        // Should NOT return mock data. Should return OCR_FAILURE.
        await runCurlTest(
            `curl -s -X POST -F "receipt=@test_scan.jpg" http://localhost:${TEST_PORT}/api/analyze`,
            (json) => {
                if (json.data && json.data.outcome === 'UNKNOWN_FORMULATION' && json.data.reason === 'OCR_FAILURE') {
                    return 'PASS';
                }
                if (json.data?.ingredients?.length > 0) {
                    return `FAIL: SECURITY LEAK! Returned ingredients in Production without Creds.`;
                }
                return `FAIL: Unexpected state: ${JSON.stringify(json)}`;
            }
        );

        console.log("\n=== SUITE COMPLETE ===");
        cleanup(0);

    } catch (e) {
        console.error("Test Suite Failed:", e);
        cleanup(1);
    }
}

function runCurlTest(command, validateFn) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`[EXEC ERROR] ${error.message}`);
                resolve(); // Continue suite despite error
                return;
            }
            try {
                const json = JSON.parse(stdout);
                const result = validateFn(json, stdout);
                console.log(`Result: ${result}`);
            } catch (e) {
                console.log(`[JSON PARSE FAIL] output: ${stdout.substring(0, 100)}...`);
            }
            resolve();
        });
    });
}

function cleanup(code) {
    serverProcess.kill();
    try {
        fs.unlinkSync('test_invalid.txt');
        fs.unlinkSync('test_scan.jpg');
    } catch (e) { }
    process.exit(code);
}
