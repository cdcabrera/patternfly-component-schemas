// PatternFly Component Schemas - MCP Optimized
// Generated on: 2025-10-08T01:18:44.021Z

// Load schemas using import attributes (clean, modern syntax)
const { default: schemas } = await import('./schemas/index.json', { with: { type: 'json' } });
const { default: metadata } = await import('./schemas/metadata.json', { with: { type: 'json' } });
const { default: components } = await import('./schemas/components.json', { with: { type: 'json' } });

// Export schemas
export { schemas, metadata, components };
export const componentNames = Object.keys(schemas);
export const componentCount = componentNames.length;
export const schemaVersion = metadata.version;

// Component access
export function getComponentSchema(name) {
  if (!schemas[name]) {
    throw new Error(`Component '${name}' not found`);
  }
  return schemas[name];
}

// Search and filter
export function searchComponents(query) {
  const lowerQuery = query.toLowerCase();
  return components.filter(c => 
    c.name.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery)
  );
}

export function getComponentsWithRequiredProps() {
  return components.filter(c => c.hasRequiredProps);
}

export function getComplexComponents() {
  return components.filter(c => c.isComplex);
}

// Statistics
export function getComponentStats() {
  const totalProps = components.reduce((sum, c) => sum + c.propsCount, 0);
  return {
    totalComponents: componentCount,
    totalProps,
    averagePropsPerComponent: Math.round(totalProps / componentCount),
    componentsWithRequiredProps: components.filter(c => c.hasRequiredProps).length,
    complexComponents: components.filter(c => c.isComplex).length
  };
}

// Default export
export default schemas;
