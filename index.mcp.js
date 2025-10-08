// PatternFly Component Schemas - Optimized MCP Version
// Generated on: 2025-10-08T03:15:43.409Z

// Load lightweight pointer file and metadata
const { default: index } = await import('./schemas/index.json', { with: { type: 'json' } });
const { default: components } = await import('./schemas/components.json', { with: { type: 'json' } });
const { default: metadata } = await import('./schemas/metadata.json', { with: { type: 'json' } });

// Cache for loaded schemas
const schemaCache = new Map();

// Export lightweight data
export { index, components, metadata };
export const componentNames = Object.keys(index.components);
export const componentCount = index.componentCount;
export const schemaVersion = metadata.version;

// Lazy-loaded schema access
export async function getComponentSchema(name) {
  if (!index.components[name]) {
    throw new Error(`Component '${name}' not found`);
  }
  
  // Check cache first
  if (schemaCache.has(name)) {
    return schemaCache.get(name);
  }
  
  // Load individual schema file from components directory
  const componentInfo = index.components[name];
  const schema = await import(`./${componentInfo.schemaFile}`, { with: { type: 'json' } });
  
  // Cache for future use
  schemaCache.set(name, schema.default);
  return schema.default;
}

// Fast operations using pointer file
export function getComponentNames(filter = 'all') {
  const allComponents = Object.keys(index.components);
  
  switch (filter) {
    case 'complex':
      return allComponents.filter(name => index.components[name].isComplex);
    case 'withRequiredProps':
      return allComponents.filter(name => index.components[name].hasRequiredProps);
    case 'simple':
      return allComponents.filter(name => !index.components[name].isComplex);
    default:
      return allComponents;
  }
}

export function searchComponents(query) {
  const lowerQuery = query.toLowerCase();
  return components.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery)
  );
}

export function getComponentStats() {
  const totalProps = Object.values(index.components)
    .reduce((sum, comp) => sum + comp.propsCount, 0);
    
  return {
    totalComponents: componentCount,
    totalProps,
    averagePropsPerComponent: Math.round(totalProps / componentCount),
    componentsWithRequiredProps: Object.values(index.components)
      .filter(comp => comp.hasRequiredProps).length,
    complexComponents: Object.values(index.components)
      .filter(comp => comp.isComplex).length
  };
}

// Default export
export default index;
