const OpenAI = require('openai');
const logger = require('../utils/logger');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Generates a clinical dossier for a given ingredient.
 * @param {string} ingredientName 
 * @returns {Promise<{description: string, classification: string, risks: string[]}>}
 */
async function generateDossier(ingredientName) {
    try {
        logger.info(`[AI Researcher] Generating dossier for: ${ingredientName}`);

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Cost-effective, fast model
            messages: [
                {
                    role: "system",
                    content: `You are a ruthlessly objective Veterinary Toxicologist and Pet Nutritionist. 
                    Your job is to provide a brief, clinical assessment of a pet food ingredient.
                    
                    Output MUST be valid JSON with the following schema:
                    {
                        "description": "2-3 sentences explaining what it is and its biological function or risk. Scientific, neutral tone.",
                        "classification": "UNRESTRICTED" | "WARNING" | "VIOLATION" | "NON-SPECIFIC",
                        "risks": ["Risk 1", "Risk 2"] (Optional, empty if safe)
                    }

                    Classification Rules:
                    - VIOLATION: Known toxins (Xylitol), carcinogens (BHA/BHT), or non-specific "Meat/Fat" generic terms.
                    - WARNING: Controversial items (Carrageenan, heavy Legumes/Peas) or high-glycemic fillers (Corn Syrup).
                    - NON-SPECIFIC: Generic plant fillers (Cellulose, Gluten).
                    - UNRESTRICTED: Safe, standard ingredients (Chicken, Sweet Potato, Vitamins).

                    Keep the description under 60 words. Focus on bioavailability, toxicity, and nutritional value.`
                },
                {
                    role: "user",
                    content: `Analyze this ingredient: "${ingredientName}"`
                }
            ],
            response_format: { type: "json_object" },
            temperature: 0.3, // Low temperature for factual consistency
        });

        const content = response.choices[0].message.content;
        const data = JSON.parse(content);

        return data;

    } catch (error) {
        logger.error("[AI Researcher] Generation Failed", { error: error.message });
        return null; // Fail gracefully
    }
}

module.exports = { generateDossier };
