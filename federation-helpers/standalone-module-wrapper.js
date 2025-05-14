/**
 * Standalone Module Wrapper
 * 
 * This utility creates standalone versions of federated modules
 * that can be used without the federation infrastructure.
 */

// Import necessary build utils
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Creates a wrapper for a federated module that makes it standalone
 * by injecting shared dependencies setup
 */
export function createStandaloneModule(sourceModulePath, outputPath) {
  try {
    // Read the original module content
    const moduleContent = readFileSync(sourceModulePath, 'utf8');
    
    // Wrapper template that injects the shared dependencies initialization
    const wrapperTemplate = `
// Standalone wrapper for federated module
(function() {
  // Initialize federation shared object if not exists
  globalThis.__federation_shared__ = globalThis.__federation_shared__ || {};
  globalThis.__federation_shared__.default = globalThis.__federation_shared__.default || {};
  
  // Expected module versions - using the exact versions from your package.json
  const moduleVersions = {
    'react': '19.1.0',
    'react-dom': '19.1.0',
    'antd': '5.25.1'
  };
  
  // Create shared module getter function that matches federation expectations
  const createModuleGetter = (moduleName) => {
    return { 
      get: async () => {
        // Dynamic import of the module when requested
        const module = await import(moduleName);
        // Federation code calls: n = await (await s[c].get())() 
        // So we need to return a function that returns the module
        return () => module;
      },
      loaded: 1 // Use 1 instead of true to match federation expectations
    };
  };
  
  // Setup shared modules with proper version structure
  const setupSharedModule = (name) => {
    // Initialize the container for this module if it doesn't exist
    if (!globalThis.__federation_shared__.default[name]) {
      globalThis.__federation_shared__.default[name] = {};
    }
    
    // Add the module with its version as the key
    const version = moduleVersions[name];
    if (!globalThis.__federation_shared__.default[name][version]) {
      globalThis.__federation_shared__.default[name][version] = createModuleGetter(name);
    }
  };
  
  // Setup required shared modules
  ['react', 'react-dom', 'antd'].forEach(setupSharedModule);
  
  // Original module code starts here
  ${moduleContent}
})();
    `;
    
    // Ensure the output directory exists
    mkdirSync(dirname(outputPath), { recursive: true });
    
    // Write the wrapped module
    writeFileSync(outputPath, wrapperTemplate, 'utf8');
    
    console.log(`Standalone module created at: ${outputPath}`);
    return true;
  } catch (error) {
    console.error('Failed to create standalone module:', error);
    return false;
  }
}

/**
 * Process all federated modules in a directory and create standalone versions
 */
export function processAllFederatedModules(sourceDir, outputDir) {
  const fs = require('fs');
  const path = require('path');
  
  try {
    // Get all federation expose files
    const files = fs.readdirSync(sourceDir);
    const federatedModules = files.filter(file => file.startsWith('__federation_expose_'));
    
    // Create standalone version for each module
    let successCount = 0;
    
    for (const module of federatedModules) {
      const sourcePath = path.join(sourceDir, module);
      const outputPath = path.join(outputDir, `standalone-${module}`);
      
      if (createStandaloneModule(sourcePath, outputPath)) {
        successCount++;
      }
    }
    
    console.log(`Processed ${successCount} out of ${federatedModules.length} modules`);
    return { total: federatedModules.length, success: successCount };
  } catch (error) {
    console.error('Failed to process federated modules:', error);
    return { total: 0, success: 0, error };
  }
}

// CLI handler
if (process.argv[2] === '--process-all') {
  const sourceDir = process.argv[3] || resolve(__dirname, '../dist/assets');
  const outputDir = process.argv[4] || resolve(__dirname, '../standalone-modules');
  
  console.log(`Processing federated modules from: ${sourceDir}`);
  console.log(`Output directory: ${outputDir}`);
  
  const result = processAllFederatedModules(sourceDir, outputDir);
  
  if (result.success > 0) {
    console.log(`✅ Successfully created ${result.success} standalone modules`);
  } else {
    console.log('❌ No modules were processed successfully');
  }
}
