/**
 * Generates a preparation guide for a veterinary visit.
 * @param {string} petType - 'dog' or 'cat'
 * @param {string} visitReason - 'wellness', 'illness', 'emergency', 'dental'
 * @param {string} zipCode - Location context
 */
export function generateVisitPrep(petType, visitReason, zipCode) {
    const guides = {
        'wellness': {
            title: "Annual Wellness Exam",
            typical_cost_range: "$150 - $300",
            includes: ["Physical Exam", "Core Vaccines (Rabies, DHPP)", "Heartworm Test", "Fecal Test"],
            optional: ["Non-core vaccines (Leptospirosis, Bordetella)", "Bloodwork (Senior panel)"],
            questions: [
                "Is my pet at a healthy weight?",
                "Do they need a dental cleaning soon?",
                "Are there any parasite preventatives you recommend?"
            ],
            tip: "Bring a fresh stool sample to save time and avoid a sample collection fee."
        },
        'illness': {
            title: "Sick Visit / Consultation",
            typical_cost_range: "$200 - $600+",
            includes: ["Consultation Fee", "Physical Exam"],
            optional: ["Bloodwork ($150+)", "X-Rays ($200+)", "Medications"],
            questions: [
                "What are the possible diagnoses?",
                "Can we start with conservative treatment?",
                "How much will the diagnostic tests cost?"
            ],
            tip: "Write down a timeline of symptoms (when it started, if it improved/worsened) to help the vet."
        },
        'emergency': {
            title: "Emergency / Urgent Care",
            typical_cost_range: "$500 - $2,000+",
            includes: ["Emergency Exam Fee ($100-$200)"],
            optional: ["Hospitalization", "IV Fluids", "Emergency Surgery", "Advanced Imaging"],
            questions: [
                "Is my pet stable right now?",
                "What is the critical intervention needed immediately?",
                "Can you provide a high/low estimate for stabilization?"
            ],
            tip: "Be prepared for a deposit (often 50% of the high estimate) upon arrival."
        },
        'dental': {
            title: "Dental Cleaning",
            typical_cost_range: "$400 - $1,200",
            includes: ["Anesthesia", "Monitoring", "Scaling & Polishing"],
            optional: ["Tooth Extractions ($50-$200 per tooth)", "Dental X-Rays", "Pre-anesthetic bloodwork"],
            questions: [
                "Does this estimate include x-rays?",
                "What is the plan if you find loose teeth?",
                "Is pain medication included in this price?"
            ],
            tip: "Withhold food after midnight the night before anesthesia (verify with your vet)."
        },
        'puppy': {
            title: "Puppy/Kitten Series",
            typical_cost_range: "$75 - $150 per visit",
            includes: ["Physical Exam", "Core Vaccines (Distemper/Parvo)", "Deworming"],
            optional: ["Microchip ($50)", "Flea/Heartworm Prevention ($20/mo)"],
            questions: [
                "Which socialization classes do you recommend?",
                "When should we discuss spaying/neutering?",
                "Are there breed-specific health risks I should know?"
            ],
            tip: "Bring a toy or treats to create a positive association with the vet early on."
        },
        'senior': {
            title: "Senior Pet Wellness",
            typical_cost_range: "$250 - $500",
            includes: ["Comprehensive Physical Exam", "Senior Blood Panel (CBC/Chem/Thyroid)", "Urinalysis"],
            optional: ["Blood Pressure Check", "Glaucoma Check", "X-Rays for Arthritis"],
            questions: [
                "Are these mobility changes normal aging or arthritis?",
                "Should we consider a joint supplement?",
                "What are the signs of cognitive decline?"
            ],
            tip: "Video any odd behaviors (coughing, limping) at home to show the vet."
        },
        'skin': {
            title: "Dermatology / Skin Issue",
            typical_cost_range: "$150 - $400",
            includes: ["Exam", "Skin Cytology (looking at cells under microscope)", "Skin Scraping"],
            optional: ["Allergy Injection (Cytopoint $100+)", "Antibiotics", "Medicated Shampoo"],
            questions: [
                "Is this likely environmental or food-related?",
                "How long until the itching should stop?",
                "Do I need to wash their bedding?"
            ],
            tip: "Don't bathe your pet for 48 hours before the appointment so the vet can see the skin's natural state."
        }
    };

    const guide = guides[visitReason] || guides['wellness'];

    return {
        ...guide,
        pet_context: `For a ${petType}`,
        location_context: `Estimates based on typical pricing in ${zipCode}`
    };
}
