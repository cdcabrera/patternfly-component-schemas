// PatternFly Component Schemas - MCP Optimized
// Generated on: 2025-10-08T01:18:44.021Z

// Load lightweight metadata and monolithic schemas
const { default: index } = await import('./schemas/index.json', { with: { type: 'json' } });
const { default: schemas } = await import('./schemas/schemas.json', { with: { type: 'json' } });

// Export lightweight data
export { index, schemas };
export const componentNames = Object.keys(index.components);
export const componentCount = index.totalComponents;
export const schemaVersion = index.version;

// Direct schema access (no lazy loading needed - all schemas in memory)
export function getComponentSchema(name) {
  if (!schemas[name]) {
    throw new Error(`Component '${name}' not found`);
  }
  return schemas[name];
}

// Fast operations using in-memory data
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

export function searchComponents(query) {
  const lowerQuery = query.toLowerCase();
  return Object.values(index.components).filter(c =>
    c.name.toLowerCase().includes(lowerQuery) ||
    c.description.toLowerCase().includes(lowerQuery)
  );
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

// Get all schemas as a single object (for backward compatibility)
export function getAllSchemas() {
  return schemas;
}

// Default export
export default index;
