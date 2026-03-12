"use strict";
/**
 * AI bundle generation prompts. Used by AIBundlesService to build the LLM prompt.
 * Kept out of the service for maintainability and to avoid bloating the service file.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgetConstraint = getBudgetConstraint;
exports.getProductCountRule = getProductCountRule;
exports.getTaskInstruction = getTaskInstruction;
exports.buildBundleGenerationPrompt = buildBundleGenerationPrompt;
const BUNDLE_SYSTEM_INTRO = `You are a grocery shopping expert creating curated product bundles for Ghanaian shoppers. All prices are in GHS (Ghana Cedis).`;
const OUTPUT_FORMAT_BLOCK = `
**Output Format (JSON array only, no other text):**
[{
  "title": "Short descriptive bundle name (e.g. Student Essentials, Family Dinner Pack, Healthy Breakfast Set)",
  "description": "Short description",
  "category": "Category name",
  "targetAudience": "who it's for",
  "badge": "Optional badge",
  "productIds": ["<actual-uuid-from-list>", "<actual-uuid-from-list>", ...],
  "discountPercentage": 0
}]

Give each bundle a clear, memorable title that describes its contents or audience. discountPercentage 0 means bundle price = sum of items. Return ONLY the JSON array.`;
function getBudgetConstraint(budgetMin, budgetMax) {
    if (budgetMin != null && budgetMax != null) {
        return `**CRITICAL - Budget:** Each bundle's total (sum of selected product prices) MUST be between ${budgetMin} and ${budgetMax} GHS. Choose productIds so that the sum of their prices falls in this range.`;
    }
    return 'Each bundle should have a sensible total price (sum of product prices).';
}
function getProductCountRule(productsPerBundleCap) {
    if (productsPerBundleCap != null) {
        return `Each bundle must have exactly ${productsPerBundleCap} products.`;
    }
    return 'Each bundle must have between 2 and 20 products (you decide how many).';
}
function getTaskInstruction(options) {
    const { isPromptOnlyMode, customPrompt, count, productCountRule } = options;
    if (isPromptOnlyMode) {
        return `**User has described the bundles they want. Parse their message and create one bundle per described bundle.** For each bundle they describe (with name, budget, and item list), select product IDs from the Available Products list that best match those items (e.g. "1kg Rice" → pick a rice product, "Spaghetti" → pick spaghetti, "Sardine" → pick sardines). Use the exact product "id" values from the catalog. Output the same JSON array format. Ignore count/budget form fields; only use the user's description.`;
    }
    if (customPrompt?.trim()) {
        return `**Admin instructions:** ${customPrompt.trim()}\n\nCreate ${count} bundles that match the above. ${productCountRule}`;
    }
    return `Create ${count} diverse product bundles. ${productCountRule} Consider: Student Essentials, Family Dinner, Healthy Breakfast, Quick Lunch, Vegetarian, Protein Pack, Baking Essentials, Comfort Food, Spice Collection.`;
}
function buildBundleGenerationPrompt(options) {
    const { productCatalogJson, taskInstruction, productCountRule, budgetConstraint, userDescription, isPromptOnlyMode, } = options;
    const taskBlock = isPromptOnlyMode && userDescription
        ? `**User's bundle description (match products to these):**\n${userDescription}\n\n**Task:** ${taskInstruction}`
        : `**Task:** ${taskInstruction}`;
    return `${BUNDLE_SYSTEM_INTRO}

**Available Products (use ONLY these id and price values):**
${productCatalogJson}

${taskBlock}

**Requirements:**
1. ${productCountRule} Use ONLY product "id" values from the Available Products list above.
2. Products should complement each other (make sense together).
3. ${budgetConstraint}
4. Include products from different categories for balance.
${OUTPUT_FORMAT_BLOCK}`;
}
