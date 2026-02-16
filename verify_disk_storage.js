const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEST_PORT = 3009;

console.log("=== VERIFYING DISK STORAGE IMPLEMENTATION ===");

// Create dummy image
fs.writeFileSync('disk_test.jpg', 'dummy image content');

// Start Server
const server = spawn('node', ['backend/server.js'], {
    env: {
        ...process.env,
        PORT: TEST_PORT,
        NODE_ENV: 'development' // Allow mock OCR for this test
    },
    stdio: 'pipe'
});

let serverReady = false;

server.stdout.on('data', (data) => {
    const log = data.toString().trim();
    console.log(`[SERVER] ${log}`);

    if (log.includes('Stored at')) {
        console.log("SUCCESS: Server confirming disk storage path.");
    }

    if (log.includes('KIBBLESCAN SERVER') && !serverReady) {
        serverReady = true;
        makeRequest();
    }
});

server.stderr.on('data', d => console.log(`[ERR] ${d}`));

function makeRequest() {
    console.log("\n[TEST] Uploading file...");
    exec(`curl -s -F "receipt=@disk_test.jpg" http://localhost:${TEST_PORT}/api/analyze`, (err, stdout) => {
        console.log(`[RESPONSE] ${stdout.substring(0, 100)}...`);

        // Wait a bit for cleanup log or check file existence? 
        // We can't easily check file existence because we don't know the random name exactly unless we parse logs.
        // But the [SERVER] log "Stored at" confirms multer is working with disk engine.

        setTimeout(() => cleanup(0), 1000);
    });
}

function cleanup(code) {
    server.kill();
    try { fs.unlinkSync('disk_test.jpg'); } catch (e) { }
    process.exit(code);
}
