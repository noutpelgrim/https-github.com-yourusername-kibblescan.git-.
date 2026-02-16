const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 3008;
const HOST = 'localhost';

console.log("=== KIBBLESCAN HOSTILE TRAFFIC SIMULATION (ISOLATED) ===");

// 0. CREATE ARTIFACTS
const LARGE_FILE_PATH = 'large_test_file.dat';
const INVALID_FILE_PATH = 'virus.exe';
const VALID_IMAGE_PATH = 'valid.jpg';

const fd = fs.openSync(LARGE_FILE_PATH, 'w');
fs.writeSync(fd, Buffer.alloc(1), 0, 1, 6 * 1024 * 1024);
fs.closeSync(fd);
fs.writeFileSync(INVALID_FILE_PATH, 'This is an executable');
fs.writeFileSync(VALID_IMAGE_PATH, 'fake image data');

async function runSuite() {
    try {
        console.log("\n--- STARTING ISOLATED ATTACK VECTORS ---\n");

        await runTestScenario("Rate Limit Flood", testRateLimit_Flooding);
        await runTestScenario("Large Payload (6MB)", testLargePayload);
        await runTestScenario("Invalid MIME Type", testInvalidFileType);

        console.log("\n--- SIMULATION COMPLETE ---");
        cleanupArtifacts();

    } catch (e) {
        console.error("Test Harness Failed:", e);
        cleanupArtifacts();
        process.exit(1);
    }
}

async function runTestScenario(name, testFn) {
    console.log(`\n>>> SCENARIO: ${name}`);
    const server = await bootServer();
    try {
        await testFn();
    } finally {
        server.kill();
        // Give it a moment to release port
        await new Promise(r => setTimeout(r, 1000));
    }
}

function bootServer() {
    return new Promise((resolve, reject) => {
        const server = spawn('node', ['backend/server.js'], {
            env: {
                ...process.env,
                PORT: TEST_PORT,
                NODE_ENV: 'production',
                GOOGLE_APPLICATION_CREDENTIALS: 'dummy'
            },
            stdio: 'pipe'
        });

        server.stdout.on('data', (d) => {
            if (d.toString().includes('KIBBLESCAN SERVER')) {
                resolve(server);
            }
        });

        server.stderr.on('data', d => process.stderr.write(d)); // Passthrough error logs
    });
}

// SCENARIO 1: RATE LIMITING
async function testRateLimit_Flooding() {
    let blockedCount = 0;
    let passedCount = 0;
    const requests = [];

    // Send 50 requests (Limit is 20)
    for (let i = 0; i < 50; i++) {
        requests.push(makeRequest(VALID_IMAGE_PATH, 'image/jpeg').then(res => {
            if (res.status === 429) blockedCount++;
            else if (res.status === 200 || res.status === 500) passedCount++;
        }));
    }
    await Promise.all(requests);

    console.log(`       Sent: 50 | Passed: ${passedCount} | Blocked: ${blockedCount}`);

    if (passedCount <= 25 && blockedCount >= 25) {
        console.log("       STATUS: 🟢 PASS (Traffic Throttled)");
    } else {
        console.log("       STATUS: 🔴 FAIL (Rate Limit Ineffective)");
    }
}

// SCENARIO 2: 50MB UPLOAD
async function testLargePayload() {
    const res = await makeRequest(LARGE_FILE_PATH, 'image/jpeg');
    console.log(`       Result: ${res.status} ${res.body}`); // Log body for debug

    if (res.status === 400 && res.body.includes('too large')) {
        console.log("       STATUS: 🟢 PASS (Rejected by Multer)");
    } else if (res.status === 413) {
        console.log("       STATUS: 🟢 PASS (Rejected by limit)");
    } else {
        console.log(`       STATUS: 🔴 FAIL (Unexpected: ${res.status})`);
    }
}

// SCENARIO 3: INVALID FILE TYPE
async function testInvalidFileType() {
    const res = await makeRequest(INVALID_FILE_PATH, 'application/x-msdownload');
    console.log(`       Result: ${res.status} ${res.body}`);

    if (res.status === 400 && res.body.includes('Invalid file type')) {
        console.log("       STATUS: 🟢 PASS (Rejected by Filter)");
    } else {
        console.log(`       STATUS: 🔴 FAIL (Unexpected: ${res.status})`);
    }
}

function makeRequest(filePath, mimeType) {
    return new Promise((resolve) => {
        const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
        const fileContent = fs.readFileSync(filePath);

        const postDataStart = Buffer.from(
            `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="receipt"; filename="${path.basename(filePath)}"\r\n` +
            `Content-Type: ${mimeType}\r\n\r\n`
        );
        const postDataEnd = Buffer.from(`\r\n--${boundary}--\r\n`);

        const payload = Buffer.concat([postDataStart, fileContent, postDataEnd]);

        const options = {
            hostname: HOST,
            port: TEST_PORT,
            path: '/api/analyze',
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`,
                'Content-Length': payload.length
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: data }));
        });

        req.on('error', (e) => resolve({ status: 0, body: e.message }));
        req.write(payload);
        req.end();
    });
}

function cleanupArtifacts() {
    try {
        fs.unlinkSync(LARGE_FILE_PATH);
        fs.unlinkSync(INVALID_FILE_PATH);
        fs.unlinkSync(VALID_IMAGE_PATH);
    } catch (e) { }
}

runSuite();
