/**
 * Injects proxy for React, require, and module.exports
 * This utility creates the necessary global proxy systems for remote component loading
 */
export function injectImportProxy(): void {
  if (typeof globalThis === 'undefined') return

  // Check if the proxy has already been injected
  if ((globalThis as any).__REACT_IMPORT_PROXY_INJECTED) {
    console.log('Import proxy already injected, skipping')
    return
  }

  // Mark as injected to prevent multiple injections
  ;(globalThis as any).__REACT_IMPORT_PROXY_INJECTED = true

  // Create a script element to add our proxy code
  const proxyScript = document.createElement('script')

  // Build the script content
  const scriptContent = `
    // Mark that the script has been executed
    window.__REACT_IMPORT_PROXY_INJECTED = true;
   
    // Initialize modules cache and exports
    window.__modules = window.__modules || {};
    window.module = { exports: {} };
    window.exports = {};
   
    // Only set up createElement proxying if not already done
    if (!window.__originalCreateElement) {
      // Store original createElement globally to avoid redeclaration
      window.__originalCreateElement = window.React.createElement;
     
      // Create safeCreateElement to handle undefined components
      window.__safeCreateElement = function(type, props) {
        // If type is undefined, it could be a missing import
        if (type === undefined || type === null) {
          return window.__originalCreateElement('div', {
            style: {
              border: '1px solid #ff4d4f',
              padding: '8px',
              margin: '8px 0',
              background: '#fff2f0',
              borderRadius: '2px',
              color: '#ff4d4f',
            },
            children: 'Missing component: Import could not be resolved'
          });
        }
       
        // Otherwise, pass through to original React.createElement
        return window.__originalCreateElement.apply(null, arguments);
      };
     
      // Override React.createElement with safeCreateElement
      window.React.createElement = function() {
        return window.__safeCreateElement.apply(null, arguments);
      };
     
      // Also set up a component registration helper if not already done
      window.registerComponent = window.registerComponent || function(name, component) {
        console.log('Registering component:', name);
        window[name] = component;
        window.__componentLoaded = true;
      };
     
      console.log('React createElement proxy installed');
    }
  `

  // Set the script content
  proxyScript.textContent = scriptContent

  // Add the proxy script to the page
  document.head.appendChild(proxyScript)
}
