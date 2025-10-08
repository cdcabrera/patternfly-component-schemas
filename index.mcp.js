// PatternFly Component Schemas - MCP Optimized
// Generated on: 2025-10-08T08:44:39.141Z

import { distance } from 'fastest-levenshtein';

// Load metadata
const { default: index } = await import('./schemas/index.json', { with: { type: 'json' } });

// Cache for loaded schemas
let schemas = null;

// Export lightweight data
export { index };
export const componentNames = Object.keys(index.components);
export const componentCount = index.totalComponents;
export const schemaVersion = index.version;

// Get all schemas on-demand
export async function getAllSchemas() {
  if (!schemas) {
    const { default: loadedSchemas } = await import('./schemas/schemas.json', { with: { type: 'json' } });
    schemas = loadedSchemas;
  }
  return schemas;
}

// Lazy-loaded schema access
export async function getComponentSchema(name) {
  if (!index.components[name]) {
    throw new Error(`Component '${name}' not found`);
  }
  
  const schemas = await getAllSchemas();
  return schemas[name];
}

// Fast operations using in-memory metadata
export function getComponentNames(filter = 'all') {
  const allComponents = Object.keys(index.components);

  switch (filter) {
    case 'complex':
      return allComponents.filter(name => index.components[name].isComplex);
    case 'withRequiredProps':
      return allComponents.filter(name => index.components[name].hasRequiredProps);
    default:
      return allComponents;
  }
}

export function searchComponents(query, options = {}) {
  const {
    maxDistance = 3,        // Maximum edit distance for fuzzy matching
    maxResults = 10,        // Maximum number of results to return
    includeExact = true,    // Include exact matches
    includePartial = true,  // Include partial matches
    includeFuzzy = true     // Include fuzzy matches
  } = options;
  
  const lowerQuery = query.toLowerCase().trim();
  const results = [];
  
  // Get all component names for fuzzy matching
  const componentNames = Object.keys(index.components);
  
  Object.values(index.components).forEach(component => {
    const componentName = component.name;
    const lowerComponentName = componentName.toLowerCase();
    const lowerDescription = component.description.toLowerCase();
    
    let matchType = null;
    let score = 0;
    
    // 1. Exact match (highest priority)
    if (includeExact && lowerComponentName === lowerQuery) {
      matchType = 'exact';
      score = 100;
    }
    // 2. Starts with query (high priority)
    else if (includePartial && lowerComponentName.startsWith(lowerQuery)) {
      matchType = 'starts-with';
      score = 90;
    }
    // 3. Contains query (medium priority)
    else if (includePartial && (lowerComponentName.includes(lowerQuery) || lowerDescription.includes(lowerQuery))) {
      matchType = 'contains';
      score = 80;
    }
    // 4. Fuzzy match using Levenshtein distance
    else if (includeFuzzy) {
      const editDistance = distance(lowerQuery, lowerComponentName);
      const maxLength = Math.max(lowerQuery.length, lowerComponentName.length);
      const similarity = 1 - (editDistance / maxLength);
      
      if (editDistance <= maxDistance && similarity > 0.3) {
        matchType = 'fuzzy';
        score = Math.round(similarity * 70); // Fuzzy matches get 0-70 points
      }
    }
    
    // Add to results if we found a match
    if (matchType) {
      results.push({
        ...component,
        matchType,
        score,
        editDistance: matchType === 'fuzzy' ? distance(lowerQuery, lowerComponentName) : 0
      });
    }
  });
  
  // Sort by score (highest first), then by name
  results.sort((a, b) => {
    if (a.score !== b.score) {
      return b.score - a.score;
    }
    return a.name.localeCompare(b.name);
  });
  
  // Return top results
  return results.slice(0, maxResults);
}

export function getComponentsWithRequiredProps() {
  return Object.values(index.components).filter(c => c.hasRequiredProps);
}

export function getComplexComponents() {
  return Object.values(index.components).filter(c => c.isComplex);
}

export function getComponentStats() {
  return {
    totalComponents: index.totalComponents,
    totalProps: index.totalProps,
    averagePropsPerComponent: index.averagePropsPerComponent,
    componentsWithRequiredProps: index.componentsWithRequiredProps,
    complexComponents: index.complexComponents
  };
}

// Default export
export default index;
