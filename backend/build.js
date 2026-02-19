const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log("🔹 Starting Setup Script (Node.js)");
console.log(`🔹 Node Version: ${process.version}`);

const rootDir = __dirname;
console.log(`🔹 Working Directory: ${rootDir}`);

// Helper to run commands
function run(cmd) {
    console.log(`> ${cmd}`);
    try {
        execSync(cmd, { stdio: 'inherit', cwd: rootDir });
    } catch (e) {
        console.error(`❌ Command failed: ${cmd}`);
        console.error(`Exit Code: ${e.status}`);
        process.exit(1);
    }
}

// 1. Clean Install
console.log("🔹 Cleaning environment...");
const nodeModules = path.join(rootDir, 'node_modules');
const lockFile = path.join(rootDir, 'package-lock.json');

if (fs.existsSync(nodeModules)) {
    console.log("   Removing node_modules...");
    fs.rmSync(nodeModules, { recursive: true, force: true });
}
if (fs.existsSync(lockFile)) {
    console.log("   Removing package-lock.json...");
    fs.rmSync(lockFile, { force: true });
}

// 2. Install
console.log("🔹 Installing dependencies...");
run('npm install');

// 3. Verify OpenAI
console.log("🔹 Verifying OpenAI module...");
try {
    require('openai');
    console.log("✅ OpenAI successfully loaded");
} catch (e) {
    console.error("❌ OpenAI module NOT found after install");
    console.error(e);
    process.exit(1);
}

console.log("✅ Build Complete");
