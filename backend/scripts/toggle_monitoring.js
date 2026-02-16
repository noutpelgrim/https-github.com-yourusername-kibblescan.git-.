require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const store = require('../services/store');

const email = 'demo@kibblescan.io';
const status = process.argv[2] === 'true';

async function run() {
    console.log(`[TOGGLE] Setting monitoring for ${email} to ${status}...`);
    const user = await store.getUserByEmail(email);
    if (!user) {
        console.error("User not found!");
        process.exit(1);
    }

    await store.setMonitoring(user.id, status);
    console.log("Done.");
    process.exit(0);
}

run();
