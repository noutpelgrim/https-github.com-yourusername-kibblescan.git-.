const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const TEST_PORT = 3001; // Use different port than default 3000
process.env.PORT = TEST_PORT;
process.env.NODE_ENV = 'production'; // FORCE PRODUCTION MODE
process.env.GOOGLE_APPLICATION_CREDENTIALS = ''; // Ensure no creds to force failure

console.log("=== KIBBLESCAN PRODUCTION SMOKE TEST ===");
console.log("[SETUP] Environment: PRODUCTION");
console.log("[SETUP] Google Creds: UNSET (Expect OCR Failure)");

// 1. Start Server
console.log("[ACTION] Starting Server...");
const serverProcess = spawn('node', ['backend/server.js'], {
    env: { ...process.env },
    cwd: process.cwd()
});

let serverRunning = false;

serverProcess.stdout.on('data', (data) => {
    console.log(`[SERVER STDOUT] ${data.toString().trim()}`);
    if (data.toString().includes('KibbleScan Server running')) {
        serverRunning = true;
        runApiTest();
    }
});

serverProcess.stderr.on('data', (data) => {
    console.error(`[SERVER STDERR] ${data.toString().trim()}`);
});

// 2. Test API
async function runApiTest() {
    console.log("[ACTION] Testing POST /api/analyze...");

    // Create a dummy multipart request manually since we don't have form-data package installed in this scratch environment easily available without npm install, 
    // actually we might have standard deps. Let's try to use native fetch if node version supports it (Node 18+) or http request.
    // Given the environment, let's use a simple http request constructing multipart body.

    const boundary = '--------------------------735323031399963166993862';
    const data = `
--${boundary}
Content-Disposition: form-data; name="receipt"; filename="test_scan.jpg"
Content-Type: image/jpeg

(binary data equivalent)
--${boundary}--
`;

    const options = {
        hostname: 'localhost',
        port: TEST_PORT,
        path: '/api/analyze',
        method: 'POST',
        headers: {
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`[API RESPONSE] Status: ${res.statusCode}`);
            console.log(`[API RESPONSE] Body: ${body}`);

            try {
                const json = JSON.parse(body);
                validateResponse(json);
            } catch (e) {
                console.error("[FAIL] Invalid JSON response");
                cleanup(1);
            }
        });
    });

    req.on('error', (e) => {
        console.error(`[FAIL] Request error: ${e.message}`);
        cleanup(1);
    });

    req.write(data);
    req.end();
}

function validateResponse(json) {
    // Expecting UNKNOWN_FORMULATION because:
    // 1. Production Mode
    // 2. OCR Failed (No creds)
    // 3. No Mock Data Allowed

    if (json.data && json.data.outcome === 'UNKNOWN_FORMULATION' && json.data.reason === 'OCR_FAILURE') {
        console.log("[PASS] Correctly blocked mock data and returned safe error state.");
        cleanup(0);
    } else {
        console.error("[FAIL] Unexpected response state. Did it use mock data?");
        cleanup(1);
    }
}

function cleanup(code) {
    console.log("[TEARDOWN] Killing server...");
    serverProcess.kill();
    process.exit(code);
}

// Timeout
setTimeout(() => {
    console.error("[FAIL] Test Timed Out");
    cleanup(1);
}, 10000);
