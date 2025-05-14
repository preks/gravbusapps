import React, { useState, useEffect, Suspense, lazy } from 'react';

import {
  __federation_method_getRemote,
  __federation_method_setRemote,
  // @ts-ignore
} from "__federation__";

// Define the props interface for the FederatedComponentLoader
interface FederatedComponentLoaderProps {
  componentName: string; // Name of the component to load (e.g., 'LeadDetail')
  remoteApp?: string;    // Optional remote app name, defaults to 'remote-app'
  fallback?: React.ReactNode; // Optional custom fallback component
  props?: Record<string, any>; // Props to pass to the loaded component
}

// Define a wrapper that handles loading the remote component
const DynamicRemoteComponent = ({ 
  componentName, 
  remoteApp = 'business-apps',
  fallback = <div>Loading component...</div>,
  props = {}
}: FederatedComponentLoaderProps) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reset state when component name changes
    setLoading(true);
    setError(null);
    setComponent(null);

    // Define an async function to load the remote component
    const loadComponent = async () => {
      try {
        const RemoteComponent = lazy(() => {
          // values like { 'http://localhost:9000/assets/remoteEntry.js', 'remoteA', './RemoteARoot' }
          // const {url, name, module } = UseFeatureFlagsOrSomethingCoolToGetRemote();
        
          __federation_method_setRemote(remoteApp, {
            url: () => Promise.resolve("http://localhost:3001/assets/remoteEntry.js"),
            format: "esm",
            from: "vite",
          });
        
          return __federation_method_getRemote(remoteApp, `./${componentName}`);
        });
        
        if (!RemoteComponent) {
          throw new Error(`No default export found in ${componentName}`);
        }
        
        setComponent(RemoteComponent);
        setLoading(false);
      } catch (err: any) {
        console.error(`Error loading ${componentName}:`, err);
        setError(err);
        setLoading(false);
      }
    };

    loadComponent();
  }, [componentName, remoteApp]);

  if (error) {
    return (
      <div style={{ 
        padding: '12px', 
        border: '1px solid #f56565', 
        borderRadius: '4px', 
        backgroundColor: '#fff5f5',
        color: '#c53030'
      }}>
        <h4 style={{ margin: '0 0 8px 0' }}>Failed to load {componentName}</h4>
        <p style={{ margin: '0' }}>{error.message}</p>
      </div>
    );
  }

  if (loading || !Component) {
    return <>{fallback}</>;
  }

  return (
    <Suspense fallback={fallback}>
      <Component {...props} />
    </Suspense>
  );
};

/**
 * FederatedComponentLoader - A simplified wrapper for loading federated components
 */
export function FederatedComponentLoader(props: FederatedComponentLoaderProps) {
  return <DynamicRemoteComponent {...props} />;
}
