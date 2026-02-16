import { MOCK_RECEIPT_RESULTS } from '../data/mockData.js';

/**
 * Simulates sending an image to Google Cloud Vision API.
 * In production, this would be a fetch() to our Supabase Edge Function.
 * 
 * @param {File} file 
 * @returns {Promise<Object>}
 */
/**
 * Sends receipt image to backend for analysis
 * @param {File} file 
 * @returns {Promise<Object>}
 */
export async function analyzeReceipt(file) {
    console.log(`Analyzing file: ${file.name}`);

    const formData = new FormData();
    formData.append('receipt', file);

    try {
        const response = await fetch('http://localhost:3000/api/analyze', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json(); // Try to get error details
            throw new Error(errorData.error || `Server error: ${response.status}`);
        }

        const data = await response.json();
        return data; // formatted as { items: [], rawText: "..." }

    } catch (error) {
        console.warn("OCR Backend Failed (Likely Network/CORS). Falling back to Simulation.", error);

        // FAILOVER TO HAPPY PAWS SIMULATION
        // This ensures the user sees the features even if the backend is flaky
        return {
            clinic_name: "Happy Paws Veterinary Clinic (Simulation)",
            visit_date: "2026-01-12",
            pet_type: "dog",
            subtotal: 700.00,
            tax: 0.00,
            total: 700.00,
            line_items: [
                { original_name: "Office Visit / Exam", price: 75.00 },
                { original_name: "Canine Dental Cleaning", price: 320.00 },
                { original_name: "Pre-Anesthetic Bloodwork", price: 110.00 },
                { original_name: "Anesthesia Monitoring", price: 85.00 },
                { original_name: "IV Fluids", price: 65.00 },
                { original_name: "Medications Take Home", price: 45.00 }
            ],
            rawText: "SIMULATION FALLBACK DUE TO UPLOAD ERROR"
        };
    }
}
