/**
 * MODULE: Ingredient Knowledge Base
 * Responsibility: Provide clinic-safe plain-language descriptors for each ingredient.
 *
 * Fields per entry:
 *   whatItIs         — short plain-language definition (1 sentence, no value judgements)
 *   whyUsed          — functional role in pet food formulation
 *   clinicalNotes    — patient-dependent considerations only; never "safe/unsafe/certified"
 *   hasClinicalEvidence — true when the clinical note references specific published evidence
 *                         (triggers Sources section alongside the existing citations array)
 *
 * Lookup uses substring matching identical to registry.js — the first matching key wins.
 */

const INGREDIENT_KNOWLEDGE = {

    // ──────────────────────────────────────────────────────────
    // ANIMAL PROTEINS
    // ──────────────────────────────────────────────────────────

    "chicken meal": {
        whatItIs: "Rendered, dried chicken product with moisture and fat removed — more concentrated in protein than fresh chicken.",
        whyUsed: "High-protein ingredient; provides a dense, stable amino acid profile suitable for dry kibble manufacturing.",
        clinicalNotes: "Generally well-tolerated. Relevant if the patient has a documented poultry hypersensitivity; confirm whether chicken-naïve status is required for elimination diet.",
        hasClinicalEvidence: false
    },
    "beef meal": {
        whatItIs: "Rendered, dried beef product with moisture and fat removed.",
        whyUsed: "Concentrated protein and fat source; common in dry formulas.",
        clinicalNotes: "Beef is among the more common dietary allergens reported in companion animals. Relevant to confirm in patients with protein-responsive dermatitis or GI signs.",
        hasClinicalEvidence: false
    },
    "chicken": {
        whatItIs: "Deboned chicken muscle meat before rendering.",
        whyUsed: "Primary animal protein source; palatability driver and essential amino acid contributor.",
        clinicalNotes: "Generally well-tolerated. May be relevant as a novel vs. common protein in patients undergoing dietary elimination trials. Confirm previous dietary exposure.",
        hasClinicalEvidence: false
    },
    "beef": {
        whatItIs: "Deboned beef muscle meat.",
        whyUsed: "Animal protein and fat source; provides haem iron and B-vitamins.",
        clinicalNotes: "Reported allergen in dogs and cats. Relevant for patients with protein-responsive dermatitis or inflammatory bowel disease; verify dietary history.",
        hasClinicalEvidence: false
    },
    "lamb": {
        whatItIs: "Deboned lamb muscle meat.",
        whyUsed: "Animal protein source; historically used as a novel protein in limited-ingredient diets.",
        clinicalNotes: "Novel protein status is diet-history dependent — confirm the patient has not been previously exposed. Cross-reactivity with other ruminant proteins is possible.",
        hasClinicalEvidence: false
    },
    "turkey": {
        whatItIs: "Deboned turkey muscle meat.",
        whyUsed: "Lean animal protein source; lower fat than chicken, used in weight-management and sensitive-stomach formulas.",
        clinicalNotes: "Generally well-tolerated. May cross-react with chicken antigenically. Confirm prior exposure history before using as a novel protein.",
        hasClinicalEvidence: false
    },
    "salmon": {
        whatItIs: "Deboned salmon fish muscle.",
        whyUsed: "Animal protein and omega-3 fatty acid (EPA/DHA) source; supports coat and skin health.",
        clinicalNotes: "A recognised source of dietary omega-3s. Relevant for patients with atopic dermatitis or inflammatory conditions. Fish allergies are uncommon but documented.",
        hasClinicalEvidence: false
    },
    "duck": {
        whatItIs: "Deboned duck muscle meat.",
        whyUsed: "Alternative animal protein; often used in novel-protein limited-ingredient diets.",
        clinicalNotes: "Relatively uncommon in commercial diets; may serve as a novel protein. Confirm exposure history before use in elimination trials.",
        hasClinicalEvidence: false
    },
    "pork lungs": {
        whatItIs: "Processed porcine lung tissue.",
        whyUsed: "Animal protein source; occasionally used as a palatability ingredient.",
        clinicalNotes: "Pork is a less common allergen; novel protein potential depends on patient's diet history. Organ meats may have variable protein digestibility.",
        hasClinicalEvidence: false
    },
    "liver": {
        whatItIs: "Mammalian or avian liver tissue.",
        whyUsed: "Palatability enhancer; natural source of B-vitamins, iron, and fat-soluble vitamins.",
        clinicalNotes: "High in vitamin A; relevant in patients with confirmed hypervitaminosis A or hepatic disease. Species source determines allergen relevance.",
        hasClinicalEvidence: false
    },
    "broth": {
        whatItIs: "Cooked liquid derived from simmering meat or bones.",
        whyUsed: "Palatability and moisture enhancer; adds flavour and hydration to wet formulas.",
        clinicalNotes: "Sodium content may be relevant for patients on sodium-restricted diets (cardiac disease). Species source should be considered in allergen-sensitive patients.",
        hasClinicalEvidence: false
    },

    // ──────────────────────────────────────────────────────────
    // GRAINS & CARBOHYDRATES
    // ──────────────────────────────────────────────────────────

    "brown rice": {
        whatItIs: "Whole grain rice with the bran layer retained.",
        whyUsed: "Digestible carbohydrate and fibre source; lower glycaemic index than white rice.",
        clinicalNotes: "Generally well-tolerated and highly digestible. May be appropriate for patients with sensitive GI tracts. Rice is rarely implicated in food allergies.",
        hasClinicalEvidence: false
    },
    "rice": {
        whatItIs: "Processed rice grain (white or brown).",
        whyUsed: "Highly digestible carbohydrate source; commonly used in GI-sensitive formulas.",
        clinicalNotes: "One of the most digestible grain carbohydrates; used in GI recovery diets. Rarely allergenic.",
        hasClinicalEvidence: false
    },
    "white rice": {
        whatItIs: "Milled rice with bran removed.",
        whyUsed: "Rapid-digestion carbohydrate; standard in bland or convalescent diets.",
        clinicalNotes: "Suitable for short-term GI management. Long-term sole reliance lacks fibre and micronutrients; ensure diet remains balanced.",
        hasClinicalEvidence: false
    },
    "whole corn": {
        whatItIs: "Whole maize kernel including germ and bran.",
        whyUsed: "Energy-dense carbohydrate and fibre source; contributes linoleic acid.",
        clinicalNotes: "Corn is not a common allergen in dogs; implicated less frequently than proteins. Relevant in cases with suspected maize sensitivity or grain-restricted diets.",
        hasClinicalEvidence: false
    },
    "wheat": {
        whatItIs: "Whole or milled wheat grain.",
        whyUsed: "Carbohydrate and gluten-protein source; contributes to kibble texture and binding.",
        clinicalNotes: "Wheat gluten sensitivity is occasionally reported in companion animals, most notably Irish Setters (gluten-sensitive enteropathy). Relevant in grain-sensitive patients or elimination trials.",
        hasClinicalEvidence: false
    },
    "oats": {
        whatItIs: "Rolled or milled oat grain.",
        whyUsed: "Carbohydrate and soluble fibre (beta-glucan) source; used in sensitive-stomach and skin-support formulas.",
        clinicalNotes: "High in soluble fibre; may support GI transit time. Generally well-tolerated. Verify oat source in patients on strict grain-free or gluten-sensitive protocols.",
        hasClinicalEvidence: false
    },
    "sweet potato": {
        whatItIs: "Cooked or dried sweet potato flesh.",
        whyUsed: "Digestible carbohydrate, fibre, and beta-carotene source; popular in grain-free formulas.",
        clinicalNotes: "Implicated as a carbohydrate source in DCM-linked (dilated cardiomyopathy) grain-free diet investigations. Review current FDA/veterinary cardiology guidance when selecting grain-free diets with legumes or sweet potato.",
        hasClinicalEvidence: true
    },
    "peas": {
        whatItIs: "Dried or fresh green peas.",
        whyUsed: "Plant protein, starch, and fibre source; prominent in grain-free formulas.",
        clinicalNotes: "Elevated legume inclusion in grain-free diets is under active investigation in relation to diet-associated DCM in dogs. Consult current cardiological guidance for at-risk breeds or patients.",
        hasClinicalEvidence: true
    },
    "flaxseed": {
        whatItIs: "Ground or whole flax (linseed) seed.",
        whyUsed: "Plant-based omega-3 fatty acid (ALA) source; adds dietary fibre.",
        clinicalNotes: "ALA conversion to EPA/DHA is limited in dogs and very limited in cats. Not a substitute for marine omega-3s in patients requiring EPA/DHA for inflammatory conditions.",
        hasClinicalEvidence: false
    },
    "linseed": {
        whatItIs: "Alternative name for flaxseed (ground or whole).",
        whyUsed: "Plant omega-3 (ALA) and fibre source.",
        clinicalNotes: "ALA-to-EPA/DHA conversion is limited in companion animals. Not equivalent to fish-derived omega-3s for anti-inflammatory purposes.",
        hasClinicalEvidence: false
    },

    // ──────────────────────────────────────────────────────────
    // MINERALS & ELECTROLYTES
    // ──────────────────────────────────────────────────────────

    "potassium chloride": {
        whatItIs: "Inorganic potassium and chloride salt.",
        whyUsed: "Electrolyte supplement; corrects potassium levels in complete diet formulation.",
        clinicalNotes: "Relevant in patients with hyperkalaemia (renal disease, Addison's) or hypokalaemia (chronic renal failure, alkalosis). Verify dietary potassium relative to clinical target.",
        hasClinicalEvidence: false
    },
    "zinc sulfate": {
        whatItIs: "Inorganic zinc supplement salt.",
        whyUsed: "Provides dietary zinc; essential for immune function, wound healing, and skin integrity.",
        clinicalNotes: "Zinc toxicity is dose-dependent. Nordic breeds (Huskies, Malamutes) may have higher dietary zinc requirements. Monitor in patients with zinc-responsive dermatosis.",
        hasClinicalEvidence: false
    },
    "sodium selenite": {
        whatItIs: "Inorganic selenium supplement.",
        whyUsed: "Trace mineral source; supports antioxidant enzyme (glutathione peroxidase) function.",
        clinicalNotes: "Selenium has a narrow therapeutic margin. Chronic oversupplementation can cause selenosis. Verify total dietary selenium in multi-supplement protocols.",
        hasClinicalEvidence: false
    },
    "ferrous sulfate": {
        whatItIs: "Inorganic iron supplement salt.",
        whyUsed: "Dietary iron source; essential for haemoglobin synthesis and oxygen transport.",
        clinicalNotes: "Relevant in patients with iron-deficiency anaemia or GI blood loss. Iron overload is possible in patients with haemochromatosis or receiving concurrent iron therapy.",
        hasClinicalEvidence: false
    },
    "potassium iodide": {
        whatItIs: "Inorganic iodine supplement.",
        whyUsed: "Provides dietary iodine; essential for thyroid hormone synthesis.",
        clinicalNotes: "Relevant in patients with thyroid disease. Both iodine deficiency and excess can affect thyroid function. Verify total iodine across all dietary sources in hyperthyroid cats or hypothyroid dogs.",
        hasClinicalEvidence: false
    },
    "copper sulfate": {
        whatItIs: "Inorganic copper supplement.",
        whyUsed: "Trace mineral source; supports connective tissue synthesis and iron metabolism.",
        clinicalNotes: "Certain breeds (Bedlington Terriers, Dalmatians, Labrador Retrievers) have genetic predisposition to copper-associated hepatopathy. Recommend copper-restricted diets in confirmed cases.",
        hasClinicalEvidence: true
    },
    "manganese sulfate": {
        whatItIs: "Inorganic manganese supplement.",
        whyUsed: "Trace mineral for bone development, carbohydrate metabolism, and antioxidant function.",
        clinicalNotes: "No evidence-based flags triggered from the ingredient name. Review patient context (allergies, GI sensitivity, therapeutic goals).",
        hasClinicalEvidence: false
    },
    "calcium iodate": {
        whatItIs: "Inorganic iodine supplement in calcium salt form.",
        whyUsed: "Stable iodine source for complete diet formulation.",
        clinicalNotes: "See potassium iodide notes — iodine content is relevant in thyroid disease management and should be considered as part of total dietary iodine.",
        hasClinicalEvidence: false
    },
    "salt": {
        whatItIs: "Sodium chloride.",
        whyUsed: "Electrolyte supplement and palatability agent; maintains fluid balance.",
        clinicalNotes: "Relevant in patients with hypertension, congestive heart failure, or chronic kidney disease where sodium restriction is indicated. Verify total dietary sodium.",
        hasClinicalEvidence: false
    },

    // ──────────────────────────────────────────────────────────
    // VITAMINS
    // ──────────────────────────────────────────────────────────

    "choline chloride": {
        whatItIs: "Water-soluble quaternary ammonium compound; a B-vitamin-like nutrient.",
        whyUsed: "Essential for cell membrane integrity, neurotransmitter synthesis, and hepatic lipid metabolism.",
        clinicalNotes: "Choline is particularly important in patients with hepatic lipidosis (cats) or hepatic disease where fat mobilisation is impaired. Generally supplemented at AAFCO-compliant levels.",
        hasClinicalEvidence: false
    },
    "thiamine mononitrate": {
        whatItIs: "Stable salt form of thiamine (Vitamin B1).",
        whyUsed: "Thiamine supplement; essential for carbohydrate metabolism and neurological function.",
        clinicalNotes: "Thiamine deficiency causes neurological signs (opisthotonus, ataxia) particularly in cats fed high-fish diets with thiaminase. Relevant in cats on raw fish or certain canned diets.",
        hasClinicalEvidence: false
    },
    "calcium pantothenate": {
        whatItIs: "Calcium salt of pantothenic acid (Vitamin B5).",
        whyUsed: "Vitamin B5 supplement; involved in coenzyme A synthesis and energy metabolism.",
        clinicalNotes: "No evidence-based flags triggered from the ingredient name. Review patient context (allergies, GI sensitivity, therapeutic goals).",
        hasClinicalEvidence: false
    },
    "riboflavin supplement": {
        whatItIs: "Supplemental riboflavin (Vitamin B2).",
        whyUsed: "Essential for energy metabolism; cofactor for flavoenzymes.",
        clinicalNotes: "No evidence-based flags triggered from the ingredient name. Review patient context (allergies, GI sensitivity, therapeutic goals).",
        hasClinicalEvidence: false
    },
    "biotin": {
        whatItIs: "Vitamin B7 (formerly Vitamin H).",
        whyUsed: "Coenzyme for fatty acid synthesis and gluconeogenesis; supports skin and coat.",
        clinicalNotes: "Raw egg white contains avidin, which inhibits biotin absorption. Relevant if the patient is fed raw egg. No evidence-based flags triggered otherwise.",
        hasClinicalEvidence: false
    },
    "folic acid": {
        whatItIs: "Synthetic form of folate (Vitamin B9).",
        whyUsed: "One-carbon metabolism; nucleotide synthesis and amino acid conversion.",
        clinicalNotes: "Relevant in pregnant or lactating patients where folate requirements increase. No evidence-based flags triggered for standard adult maintenance.",
        hasClinicalEvidence: false
    },

    // ──────────────────────────────────────────────────────────
    // GUMS, THICKENERS & FUNCTIONAL ADDITIVES
    // ──────────────────────────────────────────────────────────

    "carrageenan": {
        whatItIs: "Sulphated polysaccharide extracted from red seaweed.",
        whyUsed: "Gelling and stabilising agent; maintains texture in wet/canned formulas.",
        clinicalNotes: "The safety of food-grade carrageenan in companion animals has been debated; animal studies using degraded (poligeenan) forms raise GI inflammation concerns. Peer-reviewed evidence in intact pet food is limited. Review in patients with known GI inflammation.",
        hasClinicalEvidence: true
    },
    "guar gum": {
        whatItIs: "Galactomannan polysaccharide derived from guar bean endosperm.",
        whyUsed: "Viscosity agent and soluble fibre source; helps stabilise wet formulas.",
        clinicalNotes: "High inclusions of guar gum may cause loose stools in sensitive patients. Generally well-tolerated at typical pet food inclusion levels.",
        hasClinicalEvidence: false
    },
    "locust bean gum": {
        whatItIs: "Galactomannan gum from carob seeds.",
        whyUsed: "Texture and viscosity agent in wet formulas.",
        clinicalNotes: "No evidence-based flags triggered from the ingredient name. Review patient context (allergies, GI sensitivity, therapeutic goals).",
        hasClinicalEvidence: false
    },

    // ──────────────────────────────────────────────────────────
    // NON-SPECIFIC / AMBIGUOUS INGREDIENTS
    // ──────────────────────────────────────────────────────────

    "corn gluten meal": {
        whatItIs: "Protein-rich co-product of corn wet-milling after starch and germ removal.",
        whyUsed: "Plant protein concentrate and amino acid source (high in methionine); contributes to colour in some formulas.",
        clinicalNotes: "Non-species-specific protein source; lower biological value than animal proteins for carnivores. Methionine contribution may be relevant in urinary health formulas. In patients requiring identified protein sources, confirm species relevance.",
        hasClinicalEvidence: false
    },
    "wheat gluten": {
        whatItIs: "Insoluble wheat protein fraction remaining after starch is washed out.",
        whyUsed: "Plant protein concentrate and textural binder in wet/dry formulas.",
        clinicalNotes: "Relevant in patients with wheat or gluten sensitivity. Associated with gluten-sensitive enteropathy in Irish Setter dogs. Confirm prior gluten exposure in elimination diet protocols.",
        hasClinicalEvidence: true
    },
    "soybean meal": {
        whatItIs: "De-fatted soybean solids after oil extraction.",
        whyUsed: "Plant protein source; provides all essential amino acids at relatively low cost.",
        clinicalNotes: "Soy is a recognised dietary allergen in companion animals. Phytoestrogen content (isoflavones) may be relevant in patients with endocrine conditions. Consider in allergen identification workups.",
        hasClinicalEvidence: false
    },
    "meat by-product": {
        whatItIs: "Non-rendered clean parts from slaughtered mammals, excluding muscle meat — may include organ tissue, blood, bone.",
        whyUsed: "Protein and nutrient source at lower cost than whole meat; can include nutrient-dense organ tissues.",
        clinicalNotes: "Species, organ composition, and quality grade are unspecified from name alone. Relevant for patients requiring identified protein sources for allergen management or therapeutic diets — the species cannot be confirmed without further label investigation.",
        hasClinicalEvidence: false
    },
    "meat meal": {
        whatItIs: "Rendered, dried product from mammalian tissue — species unspecified.",
        whyUsed: "Concentrated protein source in dry kibble; provides amino acids and minerals.",
        clinicalNotes: "Species source is unidentified; cannot confirm allergen profile or regulatory-category protein content from name alone. Relevant when patient requires confirmed single-protein or identified-protein diet.",
        hasClinicalEvidence: false
    },
    "animal fat": {
        whatItIs: "Rendered fat from unspecified animal species.",
        whyUsed: "Energy-dense ingredient; palatability enhancer and fat-soluble vitamin carrier.",
        clinicalNotes: "Species source and fatty acid profile are unspecified. Relevant for patients on fat-restricted diets (pancreatitis, hyperlipidaemia) where source and fat percentage need to be verified.",
        hasClinicalEvidence: false
    },
    "animal digest": {
        whatItIs: "Unspecified animal tissue treated with enzymes or acid to produce a hydrolysed liquid or powder.",
        whyUsed: "Palatability coating applied outside kibble; highly effective appetite stimulant.",
        clinicalNotes: "Species and tissue source are unidentified; cannot confirm allergen profile. Not a significant protein source nutritionally — primarily functional for palatability. Relevant in allergen-sensitive patients or those on strict novel/identified protein protocols.",
        hasClinicalEvidence: false
    },
    "poultry by-product meal": {
        whatItIs: "Rendered, dried product from unspecified poultry parts — may include heads, feet, viscera, excluding feathers.",
        whyUsed: "Concentrated protein source for dry formulas; provides organ-derived nutrients.",
        clinicalNotes: "Poultry species is unspecified; cannot confirm allergen status relative to a specific species (chicken vs. turkey vs. duck). Relevant in elimination trials requiring confirmed single-species diets.",
        hasClinicalEvidence: false
    },
    "natural flavor": {
        whatItIs: "Flavouring substance derived from plant or animal sources — composition and species unspecified.",
        whyUsed: "Palatability agent; improves voluntary food intake.",
        clinicalNotes: "Source species and composition are not disclosed on labels. Relevant for patients on strict allergen-exclusion diets where the flavour source could constitute an undisclosed antigen.",
        hasClinicalEvidence: false
    },

    // ──────────────────────────────────────────────────────────
    // VIOLATION / EVIDENCE FLAG INGREDIENTS
    // ──────────────────────────────────────────────────────────

    "bha": {
        whatItIs: "Butylated Hydroxyanisole — synthetic phenolic antioxidant.",
        whyUsed: "Fat oxidation inhibitor; preserves shelf life of fat-containing ingredients.",
        clinicalNotes: "Classified as a possible carcinogen (IARC Group 2B). Cumulative exposure is the relevant concern; effect at pet food inclusion levels is not established. Relevant to note in patients on long-term management or those with cancer history.",
        hasClinicalEvidence: true
    },
    "bht": {
        whatItIs: "Butylated Hydroxytoluene — synthetic phenolic antioxidant.",
        whyUsed: "Prevents oxidative rancidity in fat-containing pet food ingredients.",
        clinicalNotes: "Some animal studies report liver enzyme induction and endocrine effects at high doses. Clinical significance at pet food levels is uncertain. Note in patients on chronic management protocols.",
        hasClinicalEvidence: true
    },
    "ethoxyquin": {
        whatItIs: "Synthetic antioxidant and preservative originally developed as a pesticide and rubber stabiliser.",
        whyUsed: "Prevents oxidative rancidity, particularly in fish meal and rendered fats.",
        clinicalNotes: "Restricted in the EU since 2020 pending toxicological re-evaluation. Long-term effects in companion animals are insufficiently characterised. Relevant in patients with hepatic disease or when minimising synthetic preservative exposure is a treatment goal.",
        hasClinicalEvidence: true
    },
    "menadione": {
        whatItIs: "Synthetic Vitamin K3 (menadione sodium bisulfite complex or similar).",
        whyUsed: "Vitamin K activity supplement; involved in clotting factor synthesis.",
        clinicalNotes: "Associated with hepatotoxicity and haemolytic anaemia at elevated doses in animal studies. Natural forms of vitamin K (K1: phylloquinone) are generally preferred. Relevant in patients with hepatic disease, haemolytic conditions, or prolonged dietary exposure.",
        hasClinicalEvidence: true
    },
    "propylene glycol": {
        whatItIs: "Synthetic alcohol used as a humectant and solvent.",
        whyUsed: "Maintains moisture in semi-moist pet food formulas; prevents drying.",
        clinicalNotes: "FDA-prohibited in cat food due to documented Heinz body anaemia in felines. Use in dog food is still permitted; however, some veterinary nutritionists advise caution. Strictly contraindicated in cats — confirm species before recommending this product.",
        hasClinicalEvidence: true
    },
    "red 40": {
        whatItIs: "Allura Red AC — synthetic azo dye.",
        whyUsed: "Artifical colorant; provides visual appeal for owners, not pets.",
        clinicalNotes: "No nutritional value. Some studies note possible associations with hypersensitivity reactions. Animals do not perceive red hues as humans do; cosmetic-only additive. Relevant when minimising additive load in sensitive patients.",
        hasClinicalEvidence: true
    },
    "yellow 5": {
        whatItIs: "Tartrazine — synthetic azo dye.",
        whyUsed: "Artificial colorant with no nutritional function.",
        clinicalNotes: "Hypersensitivity reactions reported in some mammals. No nutritional benefit. Relevant when managing atopic or hypersensitive patients where additive minimisation is a clinical goal.",
        hasClinicalEvidence: true
    },
    "blue 2": {
        whatItIs: "Indigo Carmine — synthetic food dye.",
        whyUsed: "Artificial colorant; no nutritional function.",
        clinicalNotes: "Elevated brain tumour incidence in some high-dose rodent studies. No nutritional benefit; cosmetic only. Relevant when additive minimisation is a treatment goal.",
        hasClinicalEvidence: true
    },
    "titanium dioxide": {
        whatItIs: "Inorganic mineral pigment.",
        whyUsed: "Whitening and opacifying agent; aesthetic function only.",
        clinicalNotes: "Classified as a possible carcinogen (IARC Group 2B); EU banned its use as a food additive in 2022. No nutritional value. Relevant when minimising exposure to non-nutritive additives or in patients with cancer history.",
        hasClinicalEvidence: true
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// Default when no specific knowledge entry is found
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_KNOWLEDGE = {
    whatItIs: null,   // UI will omit the bullet
    whyUsed: null,    // UI will omit the bullet
    clinicalNotes: "No evidence-based flags triggered from the ingredient name. Review patient context (allergies, GI sensitivity, therapeutic goals).",
    hasClinicalEvidence: false
};

// ─────────────────────────────────────────────────────────────────────────────
// Lookup — substring match, first match wins (mirrors registry.js pattern)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @param {string} normalizedName  Lowercase normalized ingredient name
 * @returns {{ whatItIs, whyUsed, clinicalNotes, hasClinicalEvidence }}
 */
function getIngredientKnowledge(normalizedName) {
    if (!normalizedName) return DEFAULT_KNOWLEDGE;
    for (const key of Object.keys(INGREDIENT_KNOWLEDGE)) {
        if (normalizedName.includes(key)) return INGREDIENT_KNOWLEDGE[key];
    }
    return DEFAULT_KNOWLEDGE;
}

module.exports = { getIngredientKnowledge };
