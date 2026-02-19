const { spawn } = require('child_process');
const path = require('path');

console.log("🔹 Simulating Render Startup...");
console.log(`🔹 CWD: ${process.cwd()}`);
console.log(`🔹 Command: node backend/server.js`);

// Set env vars that Render provides
const env = {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '3000',
    // Mock other required vars if missing locally for partial test
    DATABASE_URL: process.env.DATABASE_URL || 'postgresql://mock:mock@localhost:5432/mock',
    PADDLE_WEBHOOK_SECRET: 'mock_secret'
};

const server = spawn('node', ['backend/server.js'], {
    env,
    stdio: 'inherit',
    cwd: process.cwd()
});

server.on('close', (code) => {
    console.log(`❌ Server process exited with code ${code}`);
});

setTimeout(() => {
    console.log("✅ Server ran for 5 seconds. Killing test.");
    server.kill();
}, 5000);
