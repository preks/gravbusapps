import React from 'react'
import * as ReactDOM from 'react-dom'
import * as antd from 'antd'
import * as antDesignIcons from '@ant-design/icons'
import * as DNDKitCore from '@dnd-kit/core'
import * as DNDKitUtilities from '@dnd-kit/utilities'
import * as DNDKitSortable from '@dnd-kit/sortable'
import * as ReactJSXRuntime from 'react/jsx-runtime'
import * as ReactJSXDevRuntime from 'react/jsx-dev-runtime'
import * as zustand from 'zustand'
import clsx from 'clsx'
import * as tailwindMerge from 'tailwind-merge'
import * as reactI18Next from 'react-i18next'
import * as reactIcons from 'react-icons'
import * as GravityUICatalog from '@newwork/gravity-ui-catalog'
import * as remixIconReact from '@remixicon/react'
import * as reactIconsPi from 'react-icons/pi'

// Other UI libraries
import * as classVarianceAuthority from 'class-variance-authority'
import * as lucideReact from 'lucide-react'
import { injectImportProxy } from './remoteComponentProxy'
import { RemoteWindowExtensions, RemoteComponentLoaderOptions, ExposedLibrary } from './remoteComponentTypes'

// Process utilities
import { dispatchProcessContinueEvent } from '@/common/utils/processEventUtils'

// Default libraries to expose to remote components
const DEFAULT_EXPOSED_LIBRARIES: ExposedLibrary[] = [
  {
    name: 'react',
    lib: React
  },
  {
    name: 'react-dom',
    lib: ReactDOM
  },
  {
    name: 'antd',
    lib: antd,
    submodules: [
      {
        pattern: 'antd/',
        resolver: (fullPath: string) => {
          const parts = fullPath.split('/')
          const componentName = parts[parts.length - 1]

          // Convert kebab-case to PascalCase for component names
          const pascalCaseName =
            componentName.charAt(0).toUpperCase() +
            componentName.slice(1).replaceAll(/-([a-z])/g, (_match, g) => g.toUpperCase())

          // Use type assertion to avoid TypeScript indexing error
          return (antd as Record<string, any>)[pascalCaseName] ?? antd
        }
      }
    ]
  },
  {
    name: '@ant-design/icons',
    lib: antDesignIcons
  },
  {
    name: 'react/jsx-runtime',
    lib: ReactJSXRuntime
  },
  {
    name: 'react/jsx-dev-runtime',
    lib: ReactJSXDevRuntime
  },
  {
    name: '@dnd-kit/core',
    lib: DNDKitCore
  },
  {
    name: '@dnd-kit/utilities',
    lib: DNDKitUtilities
  },
  {
    name: '@dnd-kit/sortable',
    lib: DNDKitSortable
  },
  {
    name: 'zustand',
    lib: zustand
  },
  {
    name: 'tailwind-merge',
    lib: tailwindMerge
  },
  {
    name: 'clsx',
    // Create a wrapper function instead of modifying clsx directly to avoid getter/setter conflicts
    lib: (() => {
      const clsxWrapper = Object.assign(
        function (...args: any[]) {
          return clsx(...args)
        },
        { clsx: clsx, default: clsx }
      )
      return clsxWrapper
    })()
  },
  {
    name: 'react-icons',
    lib: reactIcons
  },
  {
    name: 'react-icons/pi',
    lib: reactIconsPi
  },
  {
    name: 'react-i18next',
    lib: reactI18Next
  },
  {
    name: '@newwork/gravity-ui-catalog',
    lib: GravityUICatalog
  },
  {
    name: '@remixicon/react',
    lib: remixIconReact
  },

  // Other UI libraries
  {
    name: 'class-variance-authority',
    lib: classVarianceAuthority
  },
  {
    name: 'lucide-react',
    lib: lucideReact
  },

  // Process utilities
  {
    name: '@/common/utils/processEventUtils',
    lib: { dispatchProcessContinueEvent }
  }
]

/**
 * Creates a require function that resolves libraries exposed to the remote component
 * @param exposedLibraries Array of libraries exposed to the remote component
 * @returns A require function that can be attached to window
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const createRequireFunction = (exposedLibraries: ExposedLibrary[]) => {
  return function (moduleName: string) {
    // First look for exact matches
    for (const lib of exposedLibraries) {
      if (lib.name === moduleName) {
        return lib.lib
      }

      // Check for submodule patterns
      if (lib.submodules) {
        for (const submodule of lib.submodules) {
          if (moduleName.startsWith(submodule.pattern)) {
            return submodule.resolver(moduleName)
          }
        }
      }
    }

    // Return empty object for unhandled modules with a warning
    console.warn('Unhandled require:', moduleName)
    return {}
  }
}

/**
 * Constructs a component URL from a path and base URL
 * @param path Component path
 * @param baseUrl Base URL for the CDN
 * @param version Optional version string for versioned components
 * @returns Full URL to the component
 */
export const constructComponentUrl = (
  path: string,
  baseUrl: string = 'https://nwcdnprodfiles.blob.core.windows.net/screens',
  version?: string
): string => {
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.substring(1) : path
  // Ensure baseUrl doesn't have trailing slash
  const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.substring(0, baseUrl.length - 1) : baseUrl
  const timestamp = Date.now()

  // If version is provided, use versioned file pattern
  if (version) {
    return `${cleanBaseUrl}/${cleanPath}/index-${version}.js?t=${timestamp}`
  }

  // Otherwise use standard index.js
  return `${cleanBaseUrl}/${cleanPath}/index.js?t=${timestamp}`
}

/**
 * A centralized registry for remote components
 */
interface ComponentRegistry {
  /** Track loading state of components */
  loadingComponents: Record<string, boolean>
  /** Track registration state of components */
  registeredComponents: Record<string, boolean>
  /** Track error state of components */
  componentErrors: Record<string, string | null>
}

// Create global component registry if it doesn't exist
const initRegistry = (): ComponentRegistry => {
  if (typeof globalThis === 'undefined') {
    return {
      loadingComponents: {},
      registeredComponents: {},
      componentErrors: {}
    }
  }
  ;(globalThis as any).__componentRegistry = (globalThis as any).__componentRegistry ?? {
    loadingComponents: {},
    registeredComponents: {},
    componentErrors: {}
  }

  return (globalThis as any).__componentRegistry
}

/**
 * Helper function to wait for component registration with polling
 * @param windowExtended The extended window object
 * @param componentKey The key to check for component registration
 * @param timeout Maximum time to wait in milliseconds
 * @param startTime The timestamp when waiting started
 * @returns Promise that resolves when component is registered or rejects on timeout
 */
function waitForComponentRegistration(
  windowExtended: RemoteWindowExtensions,
  componentKey: string,
  timeout: number,
  startTime: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const check = () => {
      if (windowExtended[componentKey]) {
        console.log(`Component '${componentKey}' already registered`)
        resolve()
        return
      }
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Timeout waiting for existing component '${componentKey}'`))
        return
      }
      setTimeout(check, 50)
    }
    check()
  })
}

/**
 * Load a remote component
 * @param options RemoteComponentLoaderOptions Configuration for loading the component
 * @returns Promise resolving when component is loaded
 */
export function loadRemoteComponent(options: RemoteComponentLoaderOptions): Promise<void> {
  // Initialize the component registry
  const registry = initRegistry()

  const {
    componentPath,
    componentUrl: directUrl,
    componentCdnBase,
    componentName,
    version,
    exposedLibraries = [],
    timeout = 5000,
    cacheKey
  } = options

  // Use cacheKey if provided, otherwise fall back to componentName
  const componentKey = cacheKey || componentName

  // Determine the component URL from either direct URL or path
  const componentUrl =
    directUrl ?? (componentPath ? constructComponentUrl(componentPath, componentCdnBase, version) : '')

  // Validate that we have a URL to load from
  if (!componentUrl) {
    return Promise.reject(new Error('Either componentUrl or componentPath must be provided'))
  }

  // Combine default and custom libraries to expose to the component
  const allExposedLibraries = [...DEFAULT_EXPOSED_LIBRARIES, ...exposedLibraries]

  return new Promise((resolve, reject) => {
    try {
      // Initialize the component registry
      const registry = initRegistry()

      // Set up the proxy system first
      injectImportProxy()

      // Cast to unknown first to avoid TypeScript error
      const windowExtended = globalThis as unknown as RemoteWindowExtensions

      // Reset component loading state in the registry (use componentKey for isolation)
      registry.loadingComponents[componentKey] = true
      registry.registeredComponents[componentKey] = false
      registry.componentErrors[componentKey] = null

      // First, ensure React and antd are available globally
      if (!windowExtended.React || !windowExtended.antd) {
        exposeRequiredDependencies()
      }

      // Setup the injection for component loading and registration
      const initScript = document.createElement('script')
      initScript.textContent = `
        // Initialize essential window properties
        window.__componentLoaded = false;
        window.__componentError = null;
        window.__currentComponentName = "${componentName}";
        window.__currentComponentKey = "${componentKey}";
        window.__EXPOSED_LIBRARIES = [];
        
        // Setup module.exports to catch ES module exports
        window.module = { exports: {} };
        window.exports = window.module.exports;
        
        // Define an empty require function immediately to prevent 'require is not defined' errors
        // This will be replaced with the full implementation soon
        window.require = window.require || function(moduleName) { 
          console.warn('Early require call for:', moduleName); 
          return {}; 
        };
        
        // Create a streamlined module.exports handler
        Object.defineProperty(window.module, 'exports', {
          get: function() { return window.__moduleExports || {}; },
          set: function(val) {
            window.__moduleExports = val;
            console.log('Module exports detected, type:', typeof val);
            
            // Handle different export patterns in priority order
            let component = null;
            
            // 1. Direct function export (module.exports = MyComponent)
            if (typeof val === 'function') {
              component = val;
              console.log('Component found: direct function export');
            }
            // 2. Named export matching component name (module.exports.ComponentName)
            else if (val && typeof val === 'object' && val["${componentName}"] && typeof val["${componentName}"] === 'function') {
              component = val["${componentName}"];
              console.log('Component found: named export matching component name');
            }
            // 3. Default export (module.exports.default)
            else if (val && typeof val === 'object' && val.default && typeof val.default === 'function') {
              component = val.default;
              console.log('Component found: default export');
            }
            
            // Register the component if found (use componentKey for isolation)
            if (component) {
              window["${componentKey}"] = component;
              window.__componentLoaded = true;
            }
          }
        });
        
        // Attach custom require function to handle dependencies
        // Avoid using JSON.stringify which causes circular reference errors
        // Instead, build the library collection manually
        if (!window.__libNamesInitialized) {
          window.__libNamesInitialized = true;
          window.__libNames = ${JSON.stringify(allExposedLibraries.map(lib => lib.name))};
        }
        for (let i = 0; i < window.__libNames.length; i++) {
          // For each library in our exposed list, create a reference to the actual instance
          // This prevents circular reference issues when JSON.stringify is used
          let libObject = null;
          const libName = window.__libNames[i];
          
          if (libName === 'react') {
            libObject = { name: 'react', lib: window.React };
          } else if (libName === 'antd') {
            libObject = { name: 'antd', lib: window.antd };
          } else if (libName === '@ant-design/icons') {
            libObject = { 
              name: '@ant-design/icons', 
              lib: antDesignIcons
            };
          } else if (libName === 'react/jsx-runtime') {
            libObject = { 
              name: 'react/jsx-runtime', 
              lib: ReactJSXRuntime
            };
          } else if (libName === 'react/jsx-dev-runtime') {
            libObject = { 
              name: 'react/jsx-runtime', 
              lib: ReactJSXDevRuntime
            };
          } else if (libName === 'react-dom') {
            libObject = { 
              name: 'react-dom', 
              lib: ReactDOM
            };
          } else if (libName === '@dnd-kit/core') {
            libObject = { 
              name: '@dnd-kit/core', 
              lib: DNDKitCore
            };
          } else if (libName === '@dnd-kit/utilities') {
            libObject = { 
              name: '@dnd-kit/utilities', 
              lib: DNDKitUtilities
            };
          } else if (libName === '@dnd-kit/sortable') {
            libObject = { 
              name: '@dnd-kit/sortable', 
              lib: DNDKitSortable
            };
          } else if (libName === 'zustand') {
            libObject = { 
              name: 'zustand', 
              lib: zustand
            };
          } else if (libName === 'tailwind-merge') {
            libObject = { 
              name: 'tailwind-merge', 
              lib: tailwindMerge
            };
          } else if (libName === 'clsx') {
            libObject = { 
              name: 'clsx', 
              lib: clsx
            };
          } else if (libName === 'react-icons') {
            libObject = { 
              name: 'react-icons', 
              lib: reactIcons
            };
          } else if (libName === 'react-icons/pi') {
            libObject = { 
              name: 'react-icons/pi', 
              lib: reactIconsPi
            };
          } else if (libName === 'react-i18next') {
            libObject = { 
              name: 'react-i18next', 
              lib: reactI18Next
            };
          } else if (libName === '@newwork/gravity-ui-catalog') {
            libObject = { 
              name: '@newwork/gravity-ui-catalog', 
              lib: GravityUICatalog
            };
          } else if (libName === '@remixicon/react') {
            libObject = { 
              name: '@remixicon/react', 
              lib: remixIconReact
            };
          } else if (libName === 'class-variance-authority') {
            libObject = { 
              name: 'class-variance-authority', 
              lib: classVarianceAuthority
            };
          } else if (libName === 'lucide-react') {
            libObject = { 
              name: 'lucide-react', 
              lib: lucideReact
            };
          } else if (libName === 'react-hook-form') {
            libObject = { 
              name: 'react-hook-form', 
              lib: reactHookForm
            };
          }
          
          // Add submodule handlers for special cases
          if (libName === 'antd') {
            libObject.submodules = [{
              pattern: 'antd/',
              resolver: function(fullPath) {
                const parts = fullPath.split('/');
                const componentName = parts[parts.length - 1];
                const pascalCaseName = componentName.charAt(0).toUpperCase() + 
                  componentName.slice(1).replace(/-([a-z])/g, function(match, g) { return g.toUpperCase(); });
                
                return window.antd[pascalCaseName] || window.antd;
              }
            }];
          }
          
          if (libObject) {
            window.__EXPOSED_LIBRARIES.push(libObject);
          }
        }
        
        // Create the require function with our manually constructed libraries
        window.require = function(moduleName) {
          console.log('Remote component requiring:', moduleName);
          
          // First look for exact matches
          for (let i = 0; i < window.__EXPOSED_LIBRARIES.length; i++) {
            const lib = window.__EXPOSED_LIBRARIES[i];
            if (lib.name === moduleName) {
              return lib.lib;
            }
            
            // Check for submodule patterns
            if (lib.submodules) {
              for (let j = 0; j < lib.submodules.length; j++) {
                const submodule = lib.submodules[j];
                if (moduleName.startsWith(submodule.pattern)) {
                  return submodule.resolver(moduleName);
                }
              }
            }
          }
          
          // Return empty object for unhandled modules with a warning
          console.warn('Unhandled require:', moduleName);
          return {};
        };
      `
      document.head.appendChild(initScript)

      console.log(`Loading remote component '${componentName}' (key: ${componentKey}) from: ${componentUrl}`)

      // Check if script for this component key already exists - wait for it instead of reloading
      const existingScript = document.querySelector(`script[data-component-key="${componentKey}"]`)
      if (existingScript) {
        console.log(`Script for component key '${componentKey}' already exists, waiting for registration...`)
        // Wait for component to be ready
        const startTime = Date.now()
        const waitForExisting = waitForComponentRegistration(windowExtended, componentKey, timeout, startTime)
        return waitForExisting
      }

      // Load the component script
      const scriptTag = document.createElement('script')
      scriptTag.src = componentUrl
      scriptTag.async = false // Use synchronous loading to ensure order

      // Add identifying attributes for cleanup (use componentKey for isolation)
      scriptTag.dataset.componentKey = componentKey
      scriptTag.dataset.componentName = componentName
      scriptTag.dataset.componentVersion = version || 'latest'
      if (componentPath) {
        scriptTag.dataset.componentPath = componentPath
      }
      scriptTag.id = `remote-component-js-${componentKey.replaceAll('/', '-')}-${version || 'latest'}`

      // Handle script loading errors
      scriptTag.onerror = event => {
        console.error(`Error loading component '${componentKey}'`, event)
        registry.componentErrors[componentKey] = 'Failed to load script'
        registry.loadingComponents[componentKey] = false
        reject(new Error(`Failed to load component '${componentKey}' script`))
      }

      // After script loads, add a post-processor to check registration
      scriptTag.onload = () => {
        console.log(`Component '${componentKey}' script loaded, checking registration...`)

        // Create a simple post-processor script to handle fallback registration
        const postProcessor = document.createElement('script')
        postProcessor.textContent = `
          // Get the component name and key from global variables
          var componentName = window.__currentComponentName;
          var componentKey = window.__currentComponentKey;
          
          // Skip if already registered
          if (!window.__componentLoaded) {
            console.log('Component not registered via standard exports pattern, checking fallbacks...');
            
            // Simple fallback steps in priority order
            let component = null;
            
            // 1. Check window.exports (some bundlers put exports here)
            if (!component && window.exports) {
              if (typeof window.exports === 'function') {
                component = window.exports;
                console.log('Component found in window.exports (function)');
              } 
              else if (window.exports[componentName] && typeof window.exports[componentName] === 'function') {
                component = window.exports[componentName];
                console.log('Component found in window.exports.' + componentName);
              } 
              else if (window.exports.default && typeof window.exports.default === 'function') {
                component = window.exports.default;
                console.log('Component found in window.exports.default');
              }
            }
            
            // 2. Look for an exact match in window object (by componentName - how exports work)
            if (!component && window[componentName] && typeof window[componentName] === 'function') {
              component = window[componentName];
              console.log('Component found as global variable');
            }
            
            // Register the component if found through fallbacks (use componentKey for isolation)
            if (component) {
              window[componentKey] = component;
              window.__componentLoaded = true;
              console.log('Component registered via fallback process under key: ' + componentKey);
            } else {
              console.error('Failed to find a suitable component to register');
              window.__componentError = 'Component not found';
            }
          }
        `
        document.head.appendChild(postProcessor)

        // Use a single checkRegistration function with clear timeout handling
        let checkTimeoutId: NodeJS.Timeout
        const checkInterval = 100 // ms between checks

        const checkRegistration = () => {
          // Clear any existing timeout to prevent leaks
          if (checkTimeoutId) clearTimeout(checkTimeoutId)

          // Check component registration status (use componentKey for isolation)
          if (windowExtended.__componentLoaded && windowExtended[componentKey]) {
            console.log(`Component '${componentKey}' successfully registered`)
            registry.registeredComponents[componentKey] = true
            registry.loadingComponents[componentKey] = false
            resolve()
            return
          }

          if (windowExtended.__componentError) {
            const errorMsg = windowExtended.__componentError ?? 'Unknown registration error'
            console.error(`Component '${componentKey}' registration failed:`, errorMsg)
            registry.componentErrors[componentKey] = errorMsg
            registry.loadingComponents[componentKey] = false
            reject(new Error(errorMsg))
            return
          }

          // Still waiting, schedule another check if within timeout
          const elapsed = Date.now() - startTime
          if (elapsed < timeout) {
            checkTimeoutId = setTimeout(checkRegistration, checkInterval)
          } else {
            // Timeout reached
            const timeoutMsg = `Timeout (${timeout}ms) waiting for component '${componentKey}' registration`
            console.error(timeoutMsg)
            registry.componentErrors[componentKey] = 'Registration timeout'
            registry.loadingComponents[componentKey] = false
            reject(new Error(timeoutMsg))
          }
        }

        // Record start time for timeout calculation
        const startTime = Date.now()
        checkTimeoutId = setTimeout(checkRegistration, checkInterval)
      }

      // Add the script to the page
      document.head.appendChild(scriptTag)
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      // Use the initialized registry (use componentKey for isolation)
      registry.componentErrors[componentKey] = errorMsg
      registry.loadingComponents[componentKey] = false
      reject(new Error(`Error loading component '${componentKey}': ${errorMsg}`))
    }
  })
}

/**
 * Cleanup all resources (scripts and CSS) for a specific component
 * @param componentPath The component path (optional)
 * @param componentName The component name (optional)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function cleanupComponentResources(componentPath?: string, componentName?: string): void {
  if (typeof globalThis === 'undefined') return

  // Clean up script tags
  const scriptSelectors = []
  if (componentPath) {
    scriptSelectors.push(`script[data-component-path="${componentPath}"]`)
  }
  if (componentName) {
    scriptSelectors.push(`script[data-component-name="${componentName}"]`)
  }

  scriptSelectors.forEach(selector => {
    const scripts = document.querySelectorAll(selector)
    scripts.forEach(script => {
      console.log(`Cleaning up script for component: ${componentName || componentPath}`)
      script.remove()
    })
  })

  // Clean up CSS link tags
  if (componentPath) {
    const cssLinks = document.querySelectorAll(`link[data-component-path="${componentPath}"]`)
    cssLinks.forEach(link => {
      console.log(`Cleaning up CSS for component: ${componentPath}`)
      link.remove()
    })
  }

  // Clean up from global registry
  if (componentName) {
    const globalExtended = globalThis as any
    delete globalExtended[componentName]

    // Clean up from component registry if it exists
    if (globalExtended.__componentRegistry) {
      delete globalExtended.__componentRegistry.loadingComponents[componentName]
      delete globalExtended.__componentRegistry.registeredComponents[componentName]
      delete globalExtended.__componentRegistry.componentErrors[componentName]
    }
  }
}

/**
 * Exposes React and antd to the window for remote component usage
 */
export function exposeRequiredDependencies(): void {
  if (typeof globalThis === 'undefined') return

  // Cast to unknown first to avoid TypeScript error
  const windowExtended = globalThis as unknown as RemoteWindowExtensions

  // Expose base libraries to window - use imported modules directly instead of require()
  windowExtended.React = windowExtended.React ?? React
  windowExtended.ReactDOM = windowExtended.ReactDOM ?? ReactDOM
  windowExtended.ReactJSXRuntime = windowExtended.ReactJSXRuntime ?? ReactJSXRuntime
  windowExtended.ReactJSXDevRuntime = windowExtended.ReactJSXDevRuntime ?? ReactJSXDevRuntime
  windowExtended.antd = windowExtended.antd ?? antd
  windowExtended.antDesignIcons = windowExtended.antDesignIcons ?? antDesignIcons
  windowExtended.DNDKitCore = windowExtended.DNDKitCore ?? DNDKitCore
  windowExtended.DNDKitUtilities = windowExtended.DNDKitUtilities ?? DNDKitUtilities
  windowExtended.DNDKitSortable = windowExtended.DNDKitSortable ?? DNDKitSortable
  windowExtended.zustand = windowExtended.zustand ?? zustand
  // clsx: expose as function with clsx and default properties for rn.clsx() pattern
  // Check if clsx already exists and has only a getter to avoid "Cannot set property" error
  if (!windowExtended.clsx) {
    try {
      // Create a new function wrapper instead of modifying clsx directly
      const clsxWrapper = Object.assign(
        function (...args: any[]) {
          return clsx(...args)
        },
        { clsx: clsx, default: clsx }
      )
      windowExtended.clsx = clsxWrapper
    } catch {
      // Fallback: just assign clsx directly if Object.assign fails
      windowExtended.clsx = clsx
    }
  }
  windowExtended.tailwindMerge = windowExtended.tailwindMerge ?? tailwindMerge
  windowExtended.reactIcons = windowExtended.reactIcons ?? reactIcons
  windowExtended.reactIconsPi = windowExtended.reactIconsPi ?? reactIconsPi
  windowExtended.reactI18Next = windowExtended.reactI18Next ?? reactI18Next
  windowExtended.GravityUICatalog = windowExtended.GravityUICatalog ?? GravityUICatalog
  windowExtended.remixIconReact = windowExtended.remixIconReact ?? remixIconReact
  windowExtended.classVarianceAuthority = windowExtended.classVarianceAuthority ?? classVarianceAuthority
  windowExtended.lucideReact = windowExtended.lucideReact ?? lucideReact

  // Expose process utilities
  windowExtended.dispatchProcessContinueEvent =
    windowExtended.dispatchProcessContinueEvent ?? dispatchProcessContinueEvent
}
