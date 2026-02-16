const { spawn, exec } = require('child_process');
const path = require('path');

const TEST_PORT = 3002;
// Check if curl is available, if not we might have issues, but Windows usually has it now.

console.log("=== KIBBLESCAN PRODUCTION CURL TEST ===");

// 1. Start Server
const serverProcess = spawn('node', ['backend/server.js'], {
    env: {
        ...process.env,
        PORT: TEST_PORT,
        NODE_ENV: 'production',
        GOOGLE_APPLICATION_CREDENTIALS: '' // Force failure
    },
    cwd: process.cwd(),
    stdio: 'pipe' // Capture output
});

let serverReady = false;

serverProcess.stdout.on('data', (data) => {
    console.log(`[SERVER] ${data.toString().trim()}`);
    if (data.toString().includes('KibbleScan Server running') && !serverReady) {
        serverReady = true;
        runCurl();
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER ERR] ${data.toString().trim()}`);
});

function runCurl() {
    console.log("[ACTION] Sending request via cURL...");

    // Create a dummy file if needed, or use existing
    // We saw test_receipt.txt in backend/
    const filePath = path.join('backend', 'test_receipt.txt');

    const curlCmd = `curl -v -X POST -H "Expect:" -F "receipt=@${filePath}" http://localhost:${TEST_PORT}/api/analyze`;

    exec(curlCmd, (error, stdout, stderr) => {
        if (error && !stderr.includes('Created')) { // Curl outputs to stderr sometimes for verbose
            console.error(`[CURL FAIL] ${error.message}`);
        }

        console.log(`[CURL OUTPUT] ${stdout}`);

        // Parse JSON
        try {
            const json = JSON.parse(stdout);
            if (json.data && json.data.outcome === 'UNKNOWN_FORMULATION' && json.data.reason === 'OCR_FAILURE') {
                console.log("[PASS] Correctly returned safe error state.");
                cleanup(0);
            } else {
                console.error("[FAIL] Unexpected JSON response.");
                console.log(JSON.stringify(json, null, 2));
                cleanup(1);
            }
        } catch (e) {
            console.error("[FAIL] Non-JSON response received.");
            console.error(stdout);
            cleanup(1);
        }
    });
}

function cleanup(code) {
    if (!serverProcess.killed) {
        console.log("[TEARDOWN] Killing server...");
        serverProcess.kill();
    }
    process.exit(code);
}

// Watchdog
setTimeout(() => {
    console.error("[FAIL] Timeout");
    cleanup(1);
}, 10000);
