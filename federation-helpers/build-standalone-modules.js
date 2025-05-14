#!/usr/bin/env node

/**
 * Build Standalone Modules Script
 * 
 * This script processes all federated modules in the dist/assets directory
 * and creates standalone versions that can be used in Next.js without
 * requiring the federation infrastructure.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __dirname = dirname(fileURLToPath(import.meta.url));

// Source and destination paths
const sourceDir = resolve(__dirname, '../dist/assets');
const outputDir = resolve(__dirname, '../standalone-modules');

// Make sure the output directory exists
if (!existsSync(outputDir)) {
  mkdirSync(outputDir, { recursive: true });
}

// Process a single module file
function processModuleFile(sourceFilePath, targetFilePath) {
  try {
    console.log(`Processing ${sourceFilePath}...`);
    
    // Read the original module content
    const moduleContent = readFileSync(sourceFilePath, 'utf8');
    
    // Create a wrapper that initializes the shared dependencies
    const wrappedContent = `
// Standalone wrapper for federated module - works in Next.js without federation infrastructure
(function() {
  // Initialize federation shared object if not exists
  globalThis.__federation_shared__ = globalThis.__federation_shared__ || {};
  globalThis.__federation_shared__.default = globalThis.__federation_shared__.default || {};
  
  // Setup shared modules with React, React DOM, and Ant Design
  const setupSharedDependencies = async () => {
    // Only setup once
    if (globalThis.__nextjs_federation_setup_complete) return;

    try {
      // Import the shared dependencies
      const [React, ReactDOM, Antd] = await Promise.all([
        import('react'),
        import('react-dom'),
        import('antd')
      ]);
      
      // Get the versions from the modules
      const reactVersion = React.version || '19.1.0';
      const reactDomVersion = ReactDOM.version || '19.1.0';
      const antdVersion = Antd.version || '5.25.1';
      
      // Create the correct module getter function for the federation system
      // This matches the expected behavior from the Vite federation code
      const createModuleGetter = (module) => {
        return async () => {
          // Federation code calls: n = await (await s[c].get())() 
          // So we need to return a function that returns the module
          return () => module;
        };
      };
      
      // Set up the shared dependencies with proper version keys
      globalThis.__federation_shared__.default['react'] = {};
      globalThis.__federation_shared__.default['react'][reactVersion] = {
        get: createModuleGetter(React),
        loaded: 1
      };
      
      globalThis.__federation_shared__.default['react-dom'] = {};
      globalThis.__federation_shared__.default['react-dom'][reactDomVersion] = {
        get: createModuleGetter(ReactDOM),
        loaded: 1
      };
      
      globalThis.__federation_shared__.default['antd'] = {};
      globalThis.__federation_shared__.default['antd'][antdVersion] = {
        get: createModuleGetter(Antd),
        loaded: 1
      };
      
      globalThis.__nextjs_federation_setup_complete = true;
      console.log('Federation shared dependencies initialized');
    } catch (error) {
      console.error('Failed to initialize federation shared dependencies:', error);
    }
  };
  
  // Setup immediately
  setupSharedDependencies();
  
  // Original module code
  ${moduleContent}
})();`;
    
    // Write the wrapped module
    writeFileSync(targetFilePath, wrappedContent, 'utf8');
    console.log(`Created standalone module at: ${targetFilePath}`);
    return true;
  } catch (error) {
    console.error(`Failed to process module ${sourceFilePath}:`, error);
    return false;
  }
}

// Process all federated modules
function processAllModules() {
  try {
    // Get all files in the source directory
    const files = readdirSync(sourceDir);
    
    // Filter out federation expose files
    const federatedModules = files.filter(file => file.startsWith('__federation_expose_'));
    
    console.log(`Found ${federatedModules.length} federated modules to process`);
    
    let successCount = 0;
    
    // Process each module
    for (const moduleFile of federatedModules) {
      const sourcePath = join(sourceDir, moduleFile);
      const targetPath = join(outputDir, moduleFile.replace('__federation_expose_', 'standalone-'));
      
      if (processModuleFile(sourcePath, targetPath)) {
        successCount++;
      }
    }
    
    console.log(`Successfully processed ${successCount} out of ${federatedModules.length} modules`);
    
    // Also copy the index.html and modify it to use the standalone modules
    createIndexFile(federatedModules);
    
    return { total: federatedModules.length, success: successCount };
  } catch (error) {
    console.error('Failed to process federated modules:', error);
    return { total: 0, success: 0, error };
  }
}

// Create a sample index.html file to demonstrate usage
function createIndexFile(moduleFiles) {
  const indexPath = join(outputDir, 'index.html');
  
  const moduleLinks = moduleFiles
    .map(file => file.replace('__federation_expose_', '').replace('.js', ''))
    .map(name => `<li><a href="javascript:void(0)" onclick="loadComponent('${name}')">${name}</a></li>`)
    .join('\n      ');
  
  const indexContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Standalone Federated Modules</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .component-container { border: 1px solid #e1e1e1; padding: 20px; margin-top: 20px; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Standalone Federated Components</h1>
  <p>These components work without requiring the federation infrastructure.</p>
  
  <h2>Available Components:</h2>
  <ul>
      ${moduleLinks}
  </ul>
  
  <div id="component-container" class="component-container">
    <p>Select a component from the list above to load it.</p>
  </div>
  
  <script>
    // Function to load a component
    async function loadComponent(name) {
      const container = document.getElementById('component-container');
      container.innerHTML = '<p>Loading component...</p>';
      
      try {
        // Dynamically import the component module
        const module = await import('./standalone-' + name + '.js');
        
        // Create element for the component
        const componentContainer = document.createElement('div');
        container.innerHTML = '';
        container.appendChild(componentContainer);
        
        // If you're using React, you would render the component here
        // For this example, we'll just display component information
        componentContainer.innerHTML = '<h3>' + name + ' Component</h3><p>Component loaded successfully!</p>';
      } catch (error) {
        container.innerHTML = '<p style="color: red;">Error loading component: ' + error.message + '</p>';
      }
    }
  </script>
</body>
</html>`;
  
  writeFileSync(indexPath, indexContent, 'utf8');
  console.log(`Created sample index.html at: ${indexPath}`);
}

// Run the processing
console.log('Starting to process federated modules...');
const result = processAllModules();

if (result.success > 0) {
  console.log(`✅ Process complete! Created ${result.success} standalone modules in ${outputDir}`);
  console.log('These modules can now be used directly in Next.js without the federation infrastructure.');
} else {
  console.log('❌ No modules were processed successfully.');
}
