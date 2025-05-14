"use client";

import React, { Suspense, useState, useEffect } from "react";

// Storage URL where the federated modules are hosted
const REMOTE_URL = "https://your-storage-url.com/business-apps";

// Cache for loaded components
const componentCache = new Map();

// Function to dynamically load a federated component
const loadComponent = async (
  componentId: string,
  componentName: string,
  version?: string
) => {
  // Create a unique cache key that includes the component ID and version
  const cacheKey = `${componentId}${version ? `-${version}` : ""}`;

  // Check if component is already in cache
  if (componentCache.has(cacheKey)) {
    return componentCache.get(cacheKey);
  }

  try {
    // Load the remote entry point
    const remoteEntryUrl = `${REMOTE_URL}/remoteEntry.js`;

    // Initialize the federated container
    // @ts-ignore - federated module typing
    const container = window["business-apps"] || {};

    // If not initialized, load the script
    if (!container.init) {
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement("script");
        script.src = remoteEntryUrl;
        script.type = "text/javascript";
        script.async = true;

        script.onload = () => {
          // Initialize the container when loaded
          // @ts-ignore - federated module typing
          window["business-apps"].init(__webpack_share_scopes__.default);
          resolve();
        };

        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    // Get the factory for the requested component using its unique ID
    // @ts-ignore - federated module typing
    const factory = await window["business-apps"].get(`./${componentId}`);

    // Create the component
    const Component = factory();

    // Cache the component
    componentCache.set(cacheKey, Component);

    return Component;
  } catch (error) {
    console.error(`Failed to load component: ${componentName}`, error);
    throw error;
  }
};

// Create a wrapper component for lazy loading
const FederatedComponent = ({
  componentId,
  componentName,
  version,
  fallback = <div>Loading...</div>,
  ...props
}: {
  componentId: string;
  componentName: string;
  version?: string;
  fallback?: React.ReactNode;
  [key: string]: any;
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(
    null
  );
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadFederatedComponent = async () => {
      try {
        const remoteComponent = await loadComponent(
          componentId,
          componentName,
          version
        );
        if (isMounted) {
          setComponent(() => remoteComponent);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      }
    };

    loadFederatedComponent();

    return () => {
      isMounted = false;
    };
  }, [componentId, componentName, version]);

  if (error) {
    return <div>Error loading component: {error.message}</div>;
  }

  if (!Component) {
    return <>{fallback}</>;
  }

  return <Component {...props} />;
};

// Example usage in a NextJS page
export default function FederatedComponentsPage() {
  // Example list of components with versions
  const components = [
    {
      id: "LeadDetail-irm-detail-screens-LeadDetail-LeadDetail",
      name: "LeadDetail",
      version: "1684432567123",
    },
    {
      id: "LeadOverview-irm-overview-screens-LeadOverview-LeadOverview",
      name: "LeadOverview",
      version: "1684432567123",
    },
    {
      id: "OpportunityOverview-crm-overview-screens-OpportunityOverview-OpportunityOverview",
      name: "OpportunityOverview",
      version: "latest",
    },
  ];

  const [selectedComponent, setSelectedComponent] = useState(components[0]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Federated Components Demo</h1>

      <div className="mb-6">
        <label className="block mb-2 font-semibold">Select Component:</label>
        <select
          className="border rounded p-2 w-full md:w-1/3"
          value={`${selectedComponent.id}-${selectedComponent.version}`}
          onChange={(e) => {
            // Parse the id and version from the selection
            const parts = e.target.value.split("-");
            const version = parts.pop()!; // Extract version from the end
            const id = parts.join("-"); // Rejoin the remaining parts for the ID

            // Find the matching component in our list
            const component = components.find((c) => c.id === id);
            if (component) {
              setSelectedComponent({ ...component, version });
            }
          }}
        >
          {components.map((comp) => (
            <option
              key={`${comp.id}-${comp.version}`}
              value={`${comp.id}-${comp.version}`}
            >
              {comp.name} (v{comp.version})
            </option>
          ))}
        </select>
      </div>

      <div className="border rounded-lg p-4 bg-gray-50">
        <h2 className="text-xl font-semibold mb-2">
          Component: {selectedComponent.name} (v{selectedComponent.version})
        </h2>

        <Suspense fallback={<div>Loading component...</div>}>
          <FederatedComponent
            componentId={selectedComponent.id}
            componentName={selectedComponent.name}
            version={selectedComponent.version}
            // Pass any props needed by the component
            data={{ id: "12345", title: "Example Data" }}
          />
        </Suspense>
      </div>
    </div>
  );
}
