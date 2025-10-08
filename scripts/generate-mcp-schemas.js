#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const schemasDir = join(projectRoot, 'schemas');

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
    if (prop.defaultValue !== undefined) {
      try {
        // Try to parse as JSON for proper type
        propSchema.default = JSON.parse(prop.defaultValue);
      } catch {
        // If not valid JSON, use as string
        propSchema.default = prop.defaultValue;
      }
    }

    properties[prop.name] = propSchema;

    if (prop.required) {
      required.push(prop.name);
    }
  });

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    type: 'object',
    title: `${metadata.name} Props`,
    description: metadata.description || `Props for the ${metadata.name} component`,
    properties,
    ...(required.length > 0 && { required }),
    additionalProperties: false
  };
}

// Generate MCP-optimized schemas
function generateMCPSchemas() {
  console.log('🚀 Generating MCP-optimized schemas...');
  
  // Read component metadata
  const metadataPath = join(projectRoot, 'component-metadata.json');
  if (!existsSync(metadataPath)) {
    console.error('❌ component-metadata.json not found!');
    process.exit(1);
  }

  const metadata = JSON.parse(readFileSync(metadataPath, 'utf8'));
  console.log(`📖 Found ${Object.keys(metadata).length} components in metadata`);

  // Create schemas directory
  if (!existsSync(schemasDir)) {
    mkdirSync(schemasDir, { recursive: true });
  }

  const schemas = {};
  const componentList = [];
  const metadataIndex = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    totalComponents: 0,
    components: []
  };

  let processedCount = 0;

  // Process each component
  Object.entries(metadata).forEach(([componentName, componentData]) => {
    // Skip Props interfaces to avoid duplicates
    if (componentName.endsWith('Props')) {
      return;
    }

    try {
      // Convert to JSON Schema
      const jsonSchema = convertMetadataToJsonSchema(componentData);
      schemas[componentName] = jsonSchema;

      // Extract metadata
      const propsCount = (componentData.props || []).length;
      const requiredProps = (componentData.props || []).filter(p => p.required).map(p => p.name);
      const hasVariants = (componentData.props || []).some(p => p.type?.includes(' | '));

      // Component list entry
      componentList.push({
        name: componentName,
        description: componentData.description || '',
        propsCount,
        requiredProps,
        requiredPropsCount: requiredProps.length,
        hasRequiredProps: requiredProps.length > 0,
        hasVariants,
        isComplex: propsCount > 15
      });

      // Metadata index entry
      metadataIndex.components.push({
        name: componentName,
        description: componentData.description || '',
        propsCount,
        requiredProps,
        hasRequiredProps: requiredProps.length > 0,
        hasVariants,
        isComplex: propsCount > 15
      });

      metadataIndex.totalComponents++;
      processedCount++;

      if (processedCount % 50 === 0) {
        console.log(`✅ Processed ${processedCount} components...`);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to process ${componentName}:`, error.message);
    }
  });

  // Write consolidated files
  console.log('📝 Writing schemas/index.json...');
  writeFileSync(
    join(schemasDir, 'index.json'),
    JSON.stringify(schemas, null, 2)
  );

  console.log('📝 Writing schemas/metadata.json...');
  writeFileSync(
    join(schemasDir, 'metadata.json'),
    JSON.stringify(metadataIndex, null, 2)
  );

  console.log('📝 Writing schemas/components.json...');
  writeFileSync(
    join(schemasDir, 'components.json'),
    JSON.stringify(componentList, null, 2)
  );

  // Generate MCP-optimized index
  console.log('📝 Writing index.mcp.js...');
  const mcpIndexContent = `// PatternFly Component Schemas - MCP Optimized
// Generated on: ${new Date().toISOString()}

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
    throw new Error(\`Component '\${name}' not found\`);
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
`;

  writeFileSync(join(projectRoot, 'index.mcp.js'), mcpIndexContent);

  console.log(`\n🎉 Successfully generated MCP schemas!`);
  console.log(`📁 Schemas directory: ${schemasDir}`);
  console.log(`📄 schemas/index.json: ${Object.keys(schemas).length} schemas`);
  console.log(`📄 schemas/metadata.json: ${metadataIndex.totalComponents} components`);
  console.log(`📄 schemas/components.json: ${componentList.length} components`);
  console.log(`📄 index.mcp.js: MCP-optimized entry point`);

  // Show summary
  const complexComponents = componentList.filter(c => c.isComplex).length;
  const componentsWithRequired = componentList.filter(c => c.hasRequiredProps).length;
  const componentsWithVariants = componentList.filter(c => c.hasVariants).length;

  console.log('\n📊 Summary:');
  console.log(`  • Total components: ${componentList.length}`);
  console.log(`  • Complex components (>15 props): ${complexComponents}`);
  console.log(`  • Components with required props: ${componentsWithRequired}`);
  console.log(`  • Components with variants: ${componentsWithVariants}`);
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    generateMCPSchemas();
  } catch (error) {
    console.error('❌ MCP schema generation failed:', error.message);
    process.exit(1);
  }
}

export { generateMCPSchemas };
