# KibbleScan API Verification Commands

**Endpoint**: `POST http://localhost:3000/api/analyze`
**Environment**: `development` or `production` (Specific outcomes noted)

## 1. Valid Image Upload (Standard Case)
**Scenario**: Simulates a standard user uploading a receipt/label image.

```bash
curl -X POST \
  -F "receipt=@./test_scan.jpg" \
  http://localhost:3000/api/analyze
```

**Expected Output (200 OK):**
```json
{
  "message": "Audit Complete",
  "data": {
    "outcome": "NON-COMPLIANT",  // Or VERIFIED/AMBIGUOUS based on content
    "reason": "Restricted Agents Detected.",
    "ingredients": [...],
    "confidence": 0.95
  },
  "rawText": "..."
}
```

---

## 2. Empty Body / Missing File
**Scenario**: User submits form without attaching a file.

```bash
curl -X POST http://localhost:3000/api/analyze
```

**Expected Output (400 Bad Request):**
```json
{
  "error": "No file uploaded"
}
```

---

## 3. Invalid File Type / Corrupted Image
**Scenario**: Uploading a text file instead of an image.  
The Vision API will fail to decode image data.

```bash
curl -X POST \
  -F "receipt=@./invalid_file.txt" \
  http://localhost:3000/api/analyze
```

**Expected Output (200 OK - Safe Failure):**
```json
{
  "message": "Audit Complete (No Data)",
  "data": {
    "outcome": "UNKNOWN_FORMULATION",
    "reason": "OCR_FAILURE",
    "ingredients": [],
    "confidence": 0
  },
  "rawText": ""
}
```

---

## 4. Low Confidence / OCR Failure (Simulation)
**Scenario**: Use a file named with "fail" to trigger dev-mode confidence drop.
**Requires**: `NODE_ENV=development`

```bash
curl -X POST \
  -F "receipt=@./fail_scan.jpg" \
  http://localhost:3000/api/analyze
```

**Expected Output (200 OK - Rejected):**
```json
{
  "message": "Audit Complete",
  "data": {
    "outcome": "UNKNOWN_FORMULATION",
    "reason": "Confidence too low (50%). Scan rejected.",
    "ingredients": [],
    "confidence": 0.50
  },
  "rawText": "..."
}
```

---

## 5. Blank Image / No Text Detected
**Scenario**: Uploading a valid image file that contains no readable text.

```bash
curl -X POST \
  -F "receipt=@./blank_image.jpg" \
  http://localhost:3000/api/analyze
```

**Expected Output (200 OK - Safe Failure):**
```json
{
  "message": "Audit Complete (No Data)",
  "data": {
    "outcome": "UNKNOWN_FORMULATION",
    "reason": "OCR_FAILURE",
    "ingredients": [],
    "confidence": 0
  },
  "rawText": ""
}
```
