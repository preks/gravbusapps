#!/usr/bin/env node

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Get the equivalent of __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the built modules
const distPath = path.resolve(__dirname, '../dist');

// Port for the http-server
const PORT = process.env.PORT || 3001;

// Function to list available component modules in the dist folder
function listAvailableModules() {
  try {
    // In our simplified approach, we're exposing components with clean names
    // These match what's defined in the remote app's vite.config.ts Federation plugin
    const exposedComponents = [
      'LeadDetail',
      'LeadOverview',
      'OpportunityOverview'
    ];
    
    console.log('\nAvailable federated components:');
    exposedComponents.forEach(id => {
      console.log(`- ${id}`);
    });
    console.log('');
    
    return exposedComponents;
  } catch (err) {
    console.error('Error listing components:', err);
    return [];
  }
}

// Start http-server
console.log(`Starting http-server for federated modules...`);
console.log(`Serving from: ${distPath}`);

// Configure command-line options for http-server
const httpServerArgs = [
  distPath,               // Path to serve
  '-p', PORT.toString(), // Port
  '-c-1',                // Disable caching
  '--cors',              // Enable CORS
  '-o', 'false',         // Don't open browser
  '-d', 'false'          // Don't show directory listings
];

// Start http-server as a child process
const serverProcess = spawn('npx', ['http-server', ...httpServerArgs], {
  stdio: 'inherit',
  shell: true
});

// List available modules
const availableModules = listAvailableModules();

// Handle server process exit
serverProcess.on('close', (code) => {
  console.log(`http-server exited with code ${code}`);
});

// Print server URL and connection information
console.log(`Local federated module server running at http://localhost:${PORT}`);
console.log('Module federation entry point:');
console.log(`http://localhost:${PORT}/assets/remoteEntry.js`);
console.log('\nThe consumer app will automatically load components from this remote.');

// Handle process termination signals
process.on('SIGINT', () => {
  console.log('Shutting down server...');
  serverProcess.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down server...');
  serverProcess.kill();
  process.exit(0);
});
