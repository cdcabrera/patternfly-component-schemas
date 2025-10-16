#!/usr/bin/env node

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import { convertMetadataToJsonSchema } from './generate-schemas.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const schemasDir = join(projectRoot, 'schemas');

// Generate lightweight JSON schemas
function generateJsonSchemas(inputFile) {
  console.log('📖 Reading metadata file...');

  if (!existsSync(inputFile)) {
    console.error(`❌ Input file not found: ${inputFile}`);
    console.log('💡 Please provide a JSON file with component metadata');
    console.log('💡 Expected format: { "ComponentName": { "name": "ComponentName", "props": [...] } }');
    process.exit(1);
  }

  const metadata = JSON.parse(readFileSync(inputFile, 'utf8'));

  console.log(`🔍 Found ${Object.keys(metadata).length} components`);

  // Ensure schemas directory exists
  if (!existsSync(schemasDir)) {
    mkdirSync(schemasDir, { recursive: true });
  }

  // Create schemas file
  const schemas = {};
  const components = {};
  let convertedCount = 0;

  // Process each component
  Object.entries(metadata).forEach(([componentName, metadata]) => {
    // Skip Props interfaces to avoid duplicates
    if (componentName.endsWith('Props')) {
      return;
    }

    // Convert to JSON Schema
    const schema = convertMetadataToJsonSchema(metadata);
    schemas[componentName] = schema;

    // Create component metadata
    components[componentName] = {
      name: componentName,
      description: metadata.description || '',
      propsCount: metadata.props?.length || 0,
      requiredProps: (metadata.props || []).filter(prop => prop.required).map(prop => prop.name),
      requiredPropsCount: (metadata.props || []).filter(prop => prop.required).length,
      hasRequiredProps: (metadata.props || []).some(prop => prop.required),
      hasVariants: (metadata.props || []).some(prop => prop.type.includes(' | ')),
      isComplex: (metadata.props?.length || 0) > 10 || (metadata.props || []).some(prop => prop.type.includes('=>'))
    };

    convertedCount++;

    if (convertedCount % 10 === 0) {
      console.log(`✅  Converted ${convertedCount} components...`);
    }
  });

  // Calculate stats
  const totalProps = Object.values(components).reduce((sum, c) => sum + c.propsCount, 0);
  const componentsWithRequiredProps = Object.values(components).filter(c => c.hasRequiredProps).length;
  const complexComponents = Object.values(components).filter(c => c.isComplex).length;

  // Create metadata structure
  const lightweightIndex = {
    version: '1.0.0',
    generated: new Date().toISOString(),
    totalComponents: Object.keys(components).length,
    totalProps,
    averagePropsPerComponent: Math.round(totalProps / Object.keys(components).length),
    componentsWithRequiredProps,
    complexComponents,
    components
  };

  // Write schemas
  const schemasPath = join(schemasDir, 'schemas.json');
  writeFileSync(schemasPath, JSON.stringify(schemas, null, 2) + os.EOL);

  // Write metadata
  const indexPath = join(schemasDir, 'index.json');
  writeFileSync(indexPath, JSON.stringify(lightweightIndex, null, 2) + os.EOL);

  console.log(`\n🎉 Successfully converted ${convertedCount} components!`);

  // Create index.json.js
  const jsonCode = `// PatternFly Component Schemas - JSON Optimized
// Generated on: ${new Date().toISOString()}

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
    throw new Error(\`Component '\${name}' not found\`);
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

// Default export
export default index;
`;

  const jsonPath = join(projectRoot, 'index.json.js');
  writeFileSync(jsonPath, jsonCode);
}

// Only run CLI logic when executed directly (not when imported)
// Check if this file is being run directly by comparing import.meta.url with the resolved process.argv[1]
if (import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const inputFile = process.argv[2];
  generateJsonSchemas(inputFile);
}
