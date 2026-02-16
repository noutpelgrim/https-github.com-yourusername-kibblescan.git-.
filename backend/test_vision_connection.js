require('dotenv').config();
const vision = require('@google-cloud/vision');

async function testConnection() {
    console.log("Testing Google Vision API Connection...");
    console.log("Key File:", process.env.GOOGLE_APPLICATION_CREDENTIALS);

    try {
        const client = new vision.ImageAnnotatorClient();

        // Create a simple image buffer (1x1 transparent pixel png)
        const buffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

        console.log("Sending request...");
        const [result] = await client.textDetection(buffer);
        console.log("Response Received!");
        console.log("Detections:", result.textAnnotations ? result.textAnnotations.length : 0);
        console.log("SUCCESS: API is reachable and credentials are valid.");

    } catch (error) {
        console.error("FAILURE: API Connection Failed");
        console.error(error);
    }
}

testConnection();
