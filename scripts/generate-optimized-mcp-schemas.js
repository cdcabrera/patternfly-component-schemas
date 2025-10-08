#!/usr/bin/env node

/**
 * Generate Optimized MCP Schemas
 * 
 * Creates a pointer-based schema structure for faster loading and lower memory usage.
 * Keeps the existing component structure but optimizes the MCP-specific files.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const schemasDir = join(projectRoot, 'schemas');
const componentsDir = join(projectRoot, 'components');

// Simple converter from metadata format to JSON Schema (same as original)
function convertMetadataToJsonSchema(metadata) {
  const properties = {};
  const required = [];

  (metadata.props || []).forEach((prop) => {
    const propSchema = {
      description: prop.description || ''
    };

    // Convert type string to JSON Schema type
    if (prop.type === 'boolean') {
      propSchema.type = 'boolean';
    } else if (prop.type === 'string') {
      propSchema.type = 'string';
    } else if (prop.type === 'number') {
      propSchema.type = 'number';
    } else if (prop.type.includes('React.ReactNode')) {
      // React nodes - can't really validate, but mark as any
      propSchema.description += ' (React component or element)';
    } else if (prop.type.includes(' | ')) {
      // Handle union types like 'primary' | 'secondary'
      const enumValues = prop.type.match(/'([^']+)'/g)?.map((s) => s.slice(1, -1));
      if (enumValues && enumValues.length > 0) {
        propSchema.enum = enumValues;
      } else {
        // Complex union, just document the type
        propSchema.description += ` (Type: ${prop.type})`;
      }
    } else if (prop.type.includes('[]')) {
      propSchema.type = 'array';
      propSchema.description += ` (Type: ${prop.type})`;
    } else if (prop.type.includes('=>')) {
      // Function type
      propSchema.description += ` (Function: ${prop.type})`;
    } else {
      // Complex type, just document it
      propSchema.description += ` (Type: ${prop.type})`;
    }

    // Add default value if present
    if (prop.default !== undefined) {
      propSchema.default = prop.default;
    }

    properties[prop.name] = propSchema;

    // Add to required if it's required
    if (prop.required) {
      required.push(prop.name);
    }
  });

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    title: `${metadata.name} Props`,
    description: `Props for the ${metadata.name} component`,
    properties,
    required,
    additionalProperties: false
  };
}

// Generate optimized MCP schemas
function generateOptimizedMCPSchemas() {
  console.log('🚀 Generating Optimized MCP Schemas...\n');

  // Ensure schemas directory exists
  if (!existsSync(schemasDir)) {
    mkdirSync(schemasDir, { recursive: true });
  }

  // Read component metadata
  const componentMetadataPath = join(projectRoot, 'component-metadata.json');
  if (!existsSync(componentMetadataPath)) {
    throw new Error('component-metadata.json not found. Run the component generation first.');
  }

  const componentMetadata = JSON.parse(readFileSync(componentMetadataPath, 'utf-8'));
  const componentEntries = Object.entries(componentMetadata);
  console.log(`📊 Processing ${componentEntries.length} components...`);

  // Create pointer-based index
  const pointerIndex = {
    version: '1.0.0',
    componentCount: componentEntries.length,
    components: {}
  };

  // Create components array for search functionality
  const components = [];
  const schemas = {};

  // Process each component
  componentEntries.forEach(([componentName, metadata]) => {
    
    // Convert to JSON Schema
    const schema = convertMetadataToJsonSchema(metadata);
    schemas[componentName] = schema;

    // Create pointer entry
    pointerIndex.components[componentName] = {
      schemaFile: `components/${componentName}/schema.json`,
      propsCount: metadata.props?.length || 0,
      hasRequiredProps: (metadata.props || []).some(prop => prop.required),
      isComplex: (metadata.props?.length || 0) > 10 || (metadata.props || []).some(prop => prop.type.includes('=>')),
      description: metadata.description || ''
    };

    // Add to components array for search
    components.push({
      name: componentName,
      description: metadata.description || '',
      propsCount: metadata.props?.length || 0,
      requiredProps: (metadata.props || []).filter(prop => prop.required).map(prop => prop.name),
      requiredPropsCount: (metadata.props || []).filter(prop => prop.required).length,
      hasRequiredProps: (metadata.props || []).some(prop => prop.required),
      hasVariants: (metadata.props || []).some(prop => prop.type.includes(' | ')),
      isComplex: (metadata.props?.length || 0) > 10 || (metadata.props || []).some(prop => prop.type.includes('=>'))
    });
  });

  // Write pointer index (lightweight file for fast loading)
  const pointerIndexPath = join(schemasDir, 'index.json');
  writeFileSync(pointerIndexPath, JSON.stringify(pointerIndex, null, 2));
  console.log(`✅ Created pointer index: ${(JSON.stringify(pointerIndex).length / 1024).toFixed(1)}KB`);

  // Write components metadata (for search functionality)
  const componentsPath = join(schemasDir, 'components.json');
  writeFileSync(componentsPath, JSON.stringify(components, null, 2));
  console.log(`✅ Created components metadata: ${(JSON.stringify(components).length / 1024).toFixed(1)}KB`);

  // Write package metadata
  const metadata = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    componentCount: componentMetadata.length,
    totalProps: components.reduce((sum, c) => sum + c.propsCount, 0),
    componentsWithRequiredProps: components.filter(c => c.hasRequiredProps).length,
    complexComponents: components.filter(c => c.isComplex).length
  };
  
  const metadataPath = join(schemasDir, 'metadata.json');
  writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  console.log(`✅ Created metadata: ${(JSON.stringify(metadata).length / 1024).toFixed(1)}KB`);

  // Create optimized index.mcp.js
  const mcpCode = `// PatternFly Component Schemas - Optimized MCP Version
// Generated on: ${new Date().toISOString()}

// Load lightweight pointer file and metadata
const { default: index } = await import('./index.json', { with: { type: 'json' } });
const { default: components } = await import('./components.json', { with: { type: 'json' } });
const { default: metadata } = await import('./metadata.json', { with: { type: 'json' } });

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
    throw new Error(\`Component '\${name}' not found\`);
  }
  
  // Check cache first
  if (schemaCache.has(name)) {
    return schemaCache.get(name);
  }
  
  // Load individual schema file from components directory
  const componentInfo = index.components[name];
  const schema = await import(\`../\${componentInfo.schemaFile}\`, { with: { type: 'json' } });
  
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
`;

  const mcpPath = join(projectRoot, 'index.mcp.js');
  writeFileSync(mcpPath, mcpCode);
  console.log(`✅ Created optimized index.mcp.js`);

  // Calculate and display size improvements
  const pointerSize = JSON.stringify(pointerIndex).length;
  const originalMonolithicSize = JSON.stringify(schemas).length;
  const sizeReduction = ((1 - pointerSize / originalMonolithicSize) * 100).toFixed(1);

  console.log('\n📈 Optimization Results:');
  console.log('========================');
  console.log(`Original monolithic size: ${(originalMonolithicSize / 1024).toFixed(1)}KB`);
  console.log(`Pointer index size: ${(pointerSize / 1024).toFixed(1)}KB`);
  console.log(`Size reduction: ${sizeReduction}%`);
  console.log(`Components processed: ${componentEntries.length}`);
  console.log(`Individual schema files: ${componentEntries.length} (in components/ directory)`);

  console.log('\n✅ Optimized MCP schemas generated successfully!');
  console.log('📁 Files created:');
  console.log('  - schemas/index.json (pointer file)');
  console.log('  - schemas/components.json (metadata)');
  console.log('  - schemas/metadata.json (package info)');
  console.log('  - index.mcp.js (optimized entry point)');
  console.log('  - components/*/schema.json (individual schemas - existing)');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateOptimizedMCPSchemas();
  } catch (error) {
    console.error('❌ Error generating optimized MCP schemas:', error);
    process.exit(1);
  }
}

export { generateOptimizedMCPSchemas };
