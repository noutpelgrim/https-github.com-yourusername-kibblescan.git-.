const fs = require('fs');
const path = require('path');

async function testUpload() {
    console.log("Testing Upload to http://localhost:3000/api/analyze...");

    // Create a dummy image file if it doesn't exist
    const testFile = path.join(__dirname, 'backend', 'test_receipt.txt');
    if (!fs.existsSync(testFile)) {
        fs.writeFileSync(testFile, "DUMMY IMAGE CONTENT FOR TEST");
    }

    const formData = new FormData();
    // We need to read it as a blob/file to append correctly in Node 18+ syntax or use a custom boundary
    // Simplest in Node without external libs is tricky for multipart.
    // Actually, let's use a simpler check: GET / for status first.

    try {
        const rootRes = await fetch('http://localhost:3000/');
        const rootJson = await rootRes.json();
        console.log("Root Status:", rootJson);
    } catch (e) {
        console.error("Root Status Failed:", e.message);
        return;
    }

    // Now try upload (we'll just send text as a 'file' simulated via non-multipart just to see if it reaches the route logic, 
    // BUT multer expects multipart.
    // We can construct a simple multipart body manually.

    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body = `
--${boundary}
Content-Disposition: form-data; name="receipt"; filename="test.txt"
Content-Type: text/plain

DUMMY RECEIPT CONTENT
--${boundary}--
`;

    try {
        const res = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: body
        });

        console.log("Upload Response Status:", res.status);
        const txt = await res.text();
        console.log("Upload Response Body:", txt);

    } catch (e) {
        console.error("Upload Request Failed:", e.message);
    }
}

testUpload();
