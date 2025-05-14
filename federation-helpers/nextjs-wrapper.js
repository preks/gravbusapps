/**
 * Federation helpers for Next.js
 * 
 * This file provides utilities to make federated modules work in Next.js
 * without requiring the entire federation infrastructure.
 */

// Initialize the federation shared object with React, React DOM, and Ant Design
export function initFederationSharing() {
  // Setup the federation shared container if it doesn't exist
  globalThis.__federation_shared__ = globalThis.__federation_shared__ || {};
  
  // Create the default scope if it doesn't exist
  globalThis.__federation_shared__.default = globalThis.__federation_shared__.default || {};
  
  // Use dynamic imports to get the actual module instances
  return Promise.all([
    import('react'),
    import('react-dom'),
    import('antd')
  ]).then(([React, ReactDOM, Antd]) => {
    // Get the versions from the imported modules
    const reactVersion = React.version || '19.1.0'; // Fallback to expected version
    const reactDomVersion = ReactDOM.version || '19.1.0'; // Fallback to expected version
    const antdVersion = Antd.version || '5.25.1'; // Fallback to expected version
    
    console.log(`Setting up federation with React ${reactVersion}, ReactDOM ${reactDomVersion}, Antd ${antdVersion}`);
    
    // Create the module getter function that matches the federation expectations
    // It must return a function that returns the module when invoked
    const createModuleGetter = (module) => {
      return async () => {
        // This is critical - return a function that returns the module
        // The federation code does: n = await (await s[c].get())() 
        return () => module;
      };
    };
    
    // Set up the React shared module with the version as the key
    globalThis.__federation_shared__.default.react = globalThis.__federation_shared__.default.react || {};
    globalThis.__federation_shared__.default.react[reactVersion] = {
      get: createModuleGetter(React),
      loaded: 1, // Note: using 1 instead of true
    };
    
    // Set up React DOM
    globalThis.__federation_shared__.default['react-dom'] = globalThis.__federation_shared__.default['react-dom'] || {};
    globalThis.__federation_shared__.default['react-dom'][reactDomVersion] = {
      get: createModuleGetter(ReactDOM),
      loaded: 1,
    };
    
    // Set up Ant Design
    globalThis.__federation_shared__.default.antd = globalThis.__federation_shared__.default.antd || {};
    globalThis.__federation_shared__.default.antd[antdVersion] = {
      get: createModuleGetter(Antd),
      loaded: 1,
    };
    
    console.log('Federation sharing initialized with correct structure');
    console.log(JSON.stringify(globalThis.__federation_shared__, (key, value) => typeof value === 'function' ? '[Function]' : value, 2));
    
    return true;
  });
}

// Load a federated component with proper initialization
export async function loadFederatedComponent(url) {
  // Initialize sharing before attempting to load the component
  await initFederationSharing();
  
  // Dynamically import the component
  return import(/* @vite-ignore */ url);
}

// React component wrapper for federated components
export function createFederatedComponent(componentUrl) {
  // Return a dynamic React component
  return (props) => {
    const React = require('react');
    const { Suspense, lazy, useState, useEffect } = React;
    
    // Create a lazy-loaded component
    const FederatedComponent = lazy(() => {
      // Initialize the sharing system and load the component
      return loadFederatedComponent(componentUrl)
        .then(module => {
          // Return either the default export or the entire module
          return { default: module.default || module };
        })
        .catch(error => {
          console.error(`Error loading federated component from ${componentUrl}:`, error);
          return { default: () => React.createElement('div', null, `Error loading component: ${error.message}`) };
        });
    });
    
    // Render with suspense
    return React.createElement(
      Suspense, 
      { fallback: React.createElement('div', null, 'Loading component...') },
      React.createElement(FederatedComponent, props)
    );
  };
}
