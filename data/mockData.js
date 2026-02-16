export const PRICING_DATABASE = {
    '78701': { // Austin, TX
        'exam_fee': { min: 65, max: 95, name: "Office Visit / Exam" },
        'dental_cleaning': { min: 350, max: 550, name: "Dental Cleaning (Grade 1)" },
        'dental_xray': { min: 150, max: 250, name: "Dental Radiographs" },
        'nail_trim': { min: 20, max: 35, name: "Nail Trim" },
        'cytopoint_injection': { min: 90, max: 140, name: "Cytopoint Injection" },
        'bloodwork_panel': { min: 180, max: 280, name: "Senor Blood Panel" },
        'vaccine_rabies': { min: 25, max: 45, name: "Rabies Vaccine (3 Year)" }
    },
    '10001': { // NYC
        'exam_fee': { min: 95, max: 150, name: "Office Visit / Exam" },
        'dental_cleaning': { min: 600, max: 1100, name: "Dental Cleaning (Grade 1)" }
    }
};


// Simulated OCR Results (What Google Vision 'sees')
// We will pick one of these randomly or based on filename in the future.
export const MOCK_RECEIPT_RESULTS = [
    {
        merchant: "Austin Urban Vet Center",
        date: "2024-02-14",
        items: [
            { description: "Wellness Exam", price: 85.00, code: "exam_fee" },
            { description: "Dental Prophylaxis Gr 1", price: 412.00, code: "dental_cleaning" },
            { description: "Nail Trim", price: 200.00, code: "nail_trim" }, // INTENTIONAL OUTLIER
            { description: "Medical Waste Disposal", price: 12.00, code: "misc_fee" }
        ]
    }
];
