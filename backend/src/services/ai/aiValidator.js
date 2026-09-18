const fs = require("fs");
const path = require("path");

let cachedTaxonomy = null;
let cachedExpertiseSet = null;

function loadTaxonomy() {
    if (cachedTaxonomy) return cachedTaxonomy;

    try {
        const taxonomyPath = path.resolve(__dirname, "../../../../ai/app/knowledge/taxonomy.json");
        const data = fs.readFileSync(taxonomyPath, "utf-8");
        cachedTaxonomy = JSON.parse(data);
        
        // Build flat set of valid expertise capabilities
        cachedExpertiseSet = new Set();
        if (cachedTaxonomy.domains) {
            for (const domainKey in cachedTaxonomy.domains) {
                const domain = cachedTaxonomy.domains[domainKey];
                if (domain.subdomains) {
                    for (const subKey in domain.subdomains) {
                        const sub = domain.subdomains[subKey];
                        if (sub.capabilities && Array.isArray(sub.capabilities)) {
                            sub.capabilities.forEach(cap => cachedExpertiseSet.add(cap.trim().toLowerCase()));
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error("[AI Validator] Failed to load taxonomy.json:", error.message);
        // Fallback or empty if not found
        cachedTaxonomy = { domains: {} };
        cachedExpertiseSet = new Set();
    }
    return cachedTaxonomy;
}

function getValidExpertiseNames() {
    if (!cachedExpertiseSet) loadTaxonomy();
    
    // We can extract original capitalization by iterating the original object again,
    // but for validation, we'll return a flat map or array if requested.
    const all = [];
    if (cachedTaxonomy.domains) {
        for (const domainKey in cachedTaxonomy.domains) {
            const domain = cachedTaxonomy.domains[domainKey];
            if (domain.subdomains) {
                for (const subKey in domain.subdomains) {
                    const sub = domain.subdomains[subKey];
                    if (sub.capabilities && Array.isArray(sub.capabilities)) {
                        sub.capabilities.forEach(cap => {
                            if (!all.includes(cap)) all.push(cap);
                        });
                    }
                }
            }
        }
    }
    return all;
}

function validateAndMapExpertise(expertiseArray) {
    if (!cachedExpertiseSet) loadTaxonomy();

    const validAll = getValidExpertiseNames();
    const result = [];

    for (const exp of expertiseArray) {
        const lowerExp = exp.trim().toLowerCase();
        
        if (cachedExpertiseSet.has(lowerExp)) {
            // Find proper capitalization
            const proper = validAll.find(v => v.toLowerCase() === lowerExp);
            if (proper && !result.includes(proper)) {
                result.push(proper);
            }
        }
    }

    return result;
}

module.exports = {
    loadTaxonomy,
    validateAndMapExpertise,
    getValidExpertiseNames
};
