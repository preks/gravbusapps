/**
 * Example Next.js Component for using federated modules
 */
import React, { useEffect, useState } from 'react';
import { initFederationSharing } from './nextjs-wrapper';

// This component dynamically loads a federated module and renders it
export default function NextFederatedComponent({ 
  componentName, 
  remoteUrl = 'http://localhost:3001',
  fallback = <div>Loading component...</div>,
  props = {}
}) {
  const [Component, setComponent] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    
    async function loadComponent() {
      try {
        setLoading(true);
        setError(null);
        
        // Step 1: Initialize federation sharing to set up the global object
        await initFederationSharing();
        
        // Step 2: Generate the URL for the federated component
        const moduleUrl = `${remoteUrl}/assets/__federation_expose_${componentName}.js`;
        
        // Step 3: Dynamically import the component
        const module = await import(/* @vite-ignore */ moduleUrl);
        
        // Make sure we don't update state if the component unmounted
        if (!isMounted) return;
        
        if (!module || !module.default) {
          throw new Error(`Component '${componentName}' was loaded but no default export was found`);
        }
        
        setComponent(() => module.default);
        setLoading(false);
      } catch (err) {
        console.error(`Error loading federated component (${componentName}):`, err);
        
        // Make sure we don't update state if the component unmounted
        if (!isMounted) return;
        
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      }
    }
    
    loadComponent();
    
    return () => {
      isMounted = false;
    };
  }, [componentName, remoteUrl]);
  
  if (loading) {
    return <>{fallback}</>;
  }
  
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
        <p style={{ margin: '0' }}>{error}</p>
      </div>
    );
  }
  
  if (!Component) {
    return <div>Component not found</div>;
  }
  
  return <Component {...props} />;
}
