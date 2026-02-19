const path = require('path');
const fs = require('fs');

// Robust .env loading
const envPath = path.resolve(__dirname, '../.env');
console.log(`Loading .env from: ${envPath}`);

if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
} else {
    console.error("CRITICAL: .env file not found at " + envPath);
    process.exit(1);
}

if (!process.env.DATABASE_URL) {
    console.error("CRITICAL: DATABASE_URL is missing from process.env");
    process.exit(1);
}

const db = require('../db');
const logger = require('../utils/logger');

// AI-Generated Clinical Dossiers (Batch 1)
const dossiers = {
    "chicken": {
        "description": "A primary source of high-quality animal protein, rich in essential amino acids, particularly lysine and methionine, which are vital for muscle development and immune function in carnivores. Generally considered highly digestible and biologically appropriate for both felines and canines, though it serves as a common allergen in sensitized individuals.",
        "classification": "UNRESTRICTED"
    },
    "chicken meal": {
        "description": "A concentrated protein source obtained by rendering chicken flesh and skin, removing water and fat. It provides a significantly higher protein content by weight compared to fresh chicken. Quality varies depending on the raw material source (skeletal muscle vs. connective tissue/bone ratio) and Ash content.",
        "classification": "UNRESTRICTED"
    },
    "salmon": {
        "description": "An excellent source of high-quality protein and long-chain Omega-3 fatty acids (EPA and DHA), which support dermatological health, cognitive function, and inflammatory modulation. Wild-caught varieties typically offer superior fatty acid profiles compared to farmed alternatives.",
        "classification": "UNRESTRICTED"
    },
    "salmon meal": {
        "description": "The rendered concentrate of salmon tissues. Highly dense in protein and essential fatty acids. It is a critical component in hypoallergenic diets due to its novel protein status for many pets. Sourcing is key to avoid ethoxyquin preservation.",
        "classification": "UNRESTRICTED"
    },
    "bha": {
        "description": "Butylated Hydroxyanisole is a synthetic antioxidant used to preserve fats and oils in pet food. It is classified as a 'reasonably anticipated human carcinogen' by the National Toxicology Program. While permitted in small quantities by the FDA, chronic exposure is controversial due to potential tumorigenic effects in laboratory animals.",
        "classification": "VIOLATION"
    },
    "bha (butylated hydroxyanisole)": {
        "description": "Butylated Hydroxyanisole is a synthetic antioxidant used to preserve fats and oils in pet food. It is classified as a 'reasonably anticipated human carcinogen' by the National Toxicology Program. While permitted in small quantities by the FDA, chronic exposure is controversial due to potential tumorigenic effects in laboratory animals.",
        "classification": "VIOLATION"
    },
    "bht": {
        "description": "Butylated Hydroxytoluene is a synthetic phenolic antioxidant chemically related to BHA. It has been linked to liver toxicity and tumor promotion in certain animal studies. BHT is banned or restricted in human foods in parts of the EU and Japan but remains legal in US pet food.",
        "classification": "VIOLATION"
    },
    "bht (butylated hydroxytoluene)": {
        "description": "Butylated Hydroxytoluene is a synthetic phenolic antioxidant chemically related to BHA. It has been linked to liver toxicity and tumor promotion in certain animal studies. BHT is banned or restricted in human foods in parts of the EU and Japan but remains legal in US pet food.",
        "classification": "VIOLATION"
    },
    "corn gluten meal": {
        "description": "A byproduct of corn processing used as a high-protein filler to boost crude protein analysis on the label. It lacks the balanced amino acid profile of animal proteins (low in lysine) and has lower biological value. Often synonymous with lower-quality formulations.",
        "classification": "NON-SPECIFIC"
    },
    "meat by-products": {
        "description": "Non-rendered, clean parts, other than meat, derived from slaughtered mammals. It includes, but is not limited to, lungs, spleen, kidneys, brain, livers, blood, bone, and stomachs. The generic labeling 'Meat' obscuring the specific species (beef, pork, etc.) makes it impossible to identify allergens or nutritional consistency.",
        "classification": "VIOLATION"
    },
    "meat and bone meal": {
        "description": "The rendered product from mammal tissues, including bone, exclusive of any added blood, hair, hoof, horn, hide trimmings, manure, stomach and rumen contents. It is a generic, low-cost protein source with high ash content and variable digestibility. The lack of species identification is a critical transparency failure.",
        "classification": "VIOLATION"
    },
    "animal fat": {
        "description": "A generic term for fat rendered from animal tissues in commercial processes. Unlike 'Chicken Fat' or 'Beef Fat', the species source is unidentified, meaning it could originate from any rendered mammal. This variability poses risks for pets with specific allergies or sensitivities.",
        "classification": "VIOLATION"
    },
    "animal digest": {
        "description": "A liquid or powder resulting from the chemical or enzymatic hydrolysis of clean and undecomposed animal tissue. It is primarily a palatability enhancer (flavoring) sprayed onto kibble. The generic 'Animal' source prevents verification of quality or origin.",
        "classification": "VIOLATION"
    },
    "natural flavor": {
        "description": "A verified vague labeling term. In pet food, this typically refers to hydrolyzed animal tissues (digest), essential oils, or vegetable extracts used solely for flavoring. It provides no nutritional value and obscures the actual ingredients used.",
        "classification": "NON-SPECIFIC"
    },
    "artificial color": {
        "description": "Synthetic dyes added solely for aesthetic appeal to the human owner, as pets do not select food based on color. Many artificial colors (Red 40, Yellow 5, Blue 2) have been linked to hypersensitivity and behavioral issues in studies. They serve no nutritional purpose.",
        "classification": "VIOLATION"
    },
    "cellulose": {
        "description": "Fibrous material derived from plant cell walls, often sourced from wood pulp or corn cobs in industrial applications. While it adds bulk and fiber, it is a non-nutritive filler used to dilute calories without providing fermentable prebiotic benefits.",
        "classification": "NON-SPECIFIC"
    },
    "powdered cellulose": {
        "description": "Purified, mechanically disintegrated cellulose prepared by processing alpha cellulose obtained as a pulp from fibrous plant materials. Often used as an anti-caking agent or cheap fiber source. It is essentially sawdust-grade filler.",
        "classification": "NON-SPECIFIC"
    },
    "xylitol": {
        "description": "A sugar alcohol used as a sweetener. It is EXTREMELY TOXIC to dogs, causing a rapid release of insulin leading to profound hypoglycemia, seizures, and liver failure. Even small amounts can be fatal. Its presence in any pet product is a critical safety hazard.",
        "classification": "VIOLATION"
    },
    "propylene glycol": {
        "description": "A synthetic liquid substance that absorbs water. It is generally recognized as safe for dogs but is TOXIC to cats, causing Heinz body anemia. Its use in semi-moist dog foods is controversial due to its artificial nature and close chemical relation to ethylene glycol (antifreeze).",
        "classification": "VIOLATION"
    },
    "menadione": {
        "description": "Also known as Vitamin K3, this is a synthetic version of Vitamin K. It has been linked to liver toxicity, hemolysis, and allergic reactions in studies. Superior, safer natural sources of Vitamin K exist (phylloquinone), making K3 unnecessary and potentially risky.",
        "classification": "VIOLATION"
    },
    "menadione sodium bisulfite complex": {
        "description": "A synthetic source of Vitamin K activity. The usage of synthetic Vitamin K3 is controversial due to potential toxicity and the availability of stable, natural alternatives. It is often found in lower-quality formulations.",
        "classification": "VIOLATION"
    },
    "carrageenan": {
        "description": "Extracted from red seaweed and used as a thickener or gelling agent in wet foods. Degraded carrageenan (poligeenan) is a known carcinogen and inflammatory agent. Food-grade carrageenan has also been linked to gut inflammation and potential ulceration in animal models.",
        "classification": "VIOLATION"
    },
    "titanium dioxide": {
        "description": "A white pigment used to brighten the appearance of pet food (making 'chicken' chunks look whiter/meatier) or sauces. The European Food Safety Authority (EFSA) no longer considers it safe as a feed additive due to potential genotoxicity risks. It serves purely cosmetic purposes.",
        "classification": "VIOLATION"
    },
    "whole corn": {
        "description": "A common carbohydrate source providing energy. While digestible when properly processed, it is often used as a primary filler in place of more nutrient-dense ingredients. It has a high glycemic index compared to ancestral grains.",
        "classification": "UNRESTRICTED"
    },
    "wheat gluten": {
        "description": "A high-protein concentrate derived from wheat. It is often used to bind chunks in wet food (creating 'fake meat' texture) or boost protein levels in kibble without adding meat. It is a common allergen and offers lower biological value than animal protein.",
        "classification": "NON-SPECIFIC"
    },
    "soybean meal": {
        "description": "The material remaining after solvent extraction of oil from soybeans. It is a cheap, abundant source of plant protein often used to balance amino acid profiles in cost-constrained diets. It contains phytoestrogens which may impact endocrine function.",
        "classification": "NON-SPECIFIC"
    },
    "brewers rice": {
        "description": "The small milled fragments of rice kernels that have been separated from the larger kernels of milled rice. It is a processing byproduct with lower nutritional integrity than whole grain rice, functioning primarily as a caloric filler.",
        "classification": "NON-SPECIFIC"
    },
    "folic acid": {
        "description": "A synthetic form of Vitamin B9 (Folate). Essential for DNA synthesis and red blood cell formation. Generally considered safe and necessary in balanced diets.",
        "classification": "UNRESTRICTED"
    },
    "biotin": {
        "description": "A B-complex vitamin (Vitamin B7) essential for fatty acid metabolism and skin/coat health. Deficiencies can lead to dry, scaly skin and poor coat quality.",
        "classification": "UNRESTRICTED"
    },
    "guar gum": {
        "description": "A galactomannan polysaccharide extracted from guar beans. Used as a thickening and stabilizing agent in wet foods. In high amounts, it can reduce protein digestibility and cause loose stools.",
        "classification": "UNRESTRICTED"
    },
    "calcium pantothenate": {
        "description": "A stable form of Vitamin B5 (Pantothenic Acid). Critical for the metabolism of proteins, carbohydrates, and fats. Essential for energy production.",
        "classification": "UNRESTRICTED"
    },
    "potassium chloride": {
        "description": "A potassium salt used as a supplement to prevent hypokalemia. It is a standard mineral additive in balanced pet foods.",
        "classification": "UNRESTRICTED"
    },
    "sodium selenite": {
        "description": "A standard source of Selenium, a trace mineral and antioxidant. While essential in trace amounts, there is ongoing debate preferring Selenium Yeast (organic) over Sodium Selenite (inorganic) due to bioavailability and toxicity margins.",
        "classification": "UNRESTRICTED"
    },
    "yellow 5": { "description": "Synthetic dye (Tartrazine). Linked to hyperactivity and hypersensitivity. Banned in Norway and Austria. Serves no nutritional purpose.", "classification": "VIOLATION" },
    "yellow 6": { "description": "Synthetic dye (Sunset Yellow). Linked to adrenal tumors in animal studies. Serves no nutritional purpose.", "classification": "VIOLATION" },
    "blue 2": { "description": "Synthetic dye (Indigo Carmine). Associated with brain tumors in male rats. Serves no nutritional purpose.", "classification": "VIOLATION" },
    "red 40": { "description": "Synthetic dye (Allura Red). The most common artificial dye. Linked to immune system tumors in mice. Serves no nutritional purpose.", "classification": "VIOLATION" },
    "glycerin": { "description": "A humectant used to keep semi-moist foods soft. While generally safe, some glycerin is a byproduct of biodiesel production, raising concerns about purity (methanol contamination).", "classification": "NON-SPECIFIC" },
    "sweet potato": { "description": "A nutritious, gluten-free carbohydrate source rich in beta-carotene, fiber, and vitamins. Often used in grain-free diets as a primary binder.", "classification": "UNRESTRICTED" },
    "peas": { "description": "A legume used as a carbohydrate and protein source. Recent FDA investigations have linked high inclusion rates of peas/legumes in grain-free diets to DCM (Dilated Cardiomyopathy) in dogs, though causation is not definitively proven.", "classification": "WARNING" },
    "l-carnitine": { "description": "An amino acid derivative that helps the body turn fat into energy. Often added to weight management or heart-health diets to support mitochondrial function.", "classification": "UNRESTRICTED" },
    "taurine": { "description": "An essential amino acid for cats (and conditionally for dogs) critical for heart muscle function, vision, and reproduction. Its supplementation is vital in grain-free or plant-heavy diets.", "classification": "UNRESTRICTED" },
    "dl-methionine": { "description": "A synthetic essential amino acid used to acidify urine (preventing stones) and balance the protein profile of plant-based ingredients.", "classification": "UNRESTRICTED" }
};

// Function to Hydrate
async function run() {
    console.log("💉 Starting Clinical Dossier Hydration...");

    let count = 0;

    for (const [name, data] of Object.entries(dossiers)) {
        try {
            // Update if description is empty or force update if needed (here we only do empty)
            const res = await db.query(
                `UPDATE ingredients 
                 SET description = $1, last_updated = NOW() 
                 WHERE name ILIKE $2`,
                [data.description, name]
            );

            if (res.rowCount > 0) {
                console.log(`   ✅ Hydrated: ${name}`);
                count++;
            } else {
                console.log(`   ⚠️ Skipped (Not Found): ${name}`);
            }
        } catch (err) {
            console.error(`   ❌ Failed: ${name}`, err.message);
        }
    }

    console.log(`\n🎉 Hydration Complete. Updated ${count} records.`);
    process.exit(0);
}

run();
