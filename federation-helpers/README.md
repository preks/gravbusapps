# Federation Helpers for Next.js Applications

This package provides utilities to make Vite federated modules work in Next.js without requiring the entire federation infrastructure.

## Problem

Vite's federated modules expect a `globalThis.__federation_shared__` object to be present for shared dependencies like React, React DOM, and Ant Design. When using these modules directly in a Next.js application, this global object isn't available, causing the modules to fail.

## Solution

These helper utilities provide:

1. A way to initialize the federation shared object with the correct dependencies
2. A simple React component to load and render federated modules 
3. A utility function for loading federated modules programmatically

## Usage in Next.js

### Basic Component Usage

```jsx
import { NextFederatedComponent } from '../path/to/federation-helpers';

export default function MyPage() {
  return (
    <div>
      <h1>My Federated Component</h1>
      <NextFederatedComponent
        componentName="LeadDetail"
        remoteUrl="http://your-remote-url.com" 
        props={{
          // Props to pass to the component
          title: 'Example',
          data: { /* ... */ }
        }}
      />
    </div>
  );
}
```

### Advanced Usage with Custom Setup

```jsx
import { initFederationSharing, loadFederatedComponent } from '../path/to/federation-helpers/nextjs-wrapper';
import { useEffect, useState } from 'react';

function MyCustomComponent() {
  const [Component, setComponent] = useState(null);
  
  useEffect(() => {
    async function loadMyComponent() {
      // Initialize sharing first
      await initFederationSharing();
      
      // Then load your component
      const module = await loadFederatedComponent('http://your-url.com/assets/__federation_expose_YourComponent.js');
      
      setComponent(() => module.default);
    }
    
    loadMyComponent();
  }, []);
  
  if (!Component) return <div>Loading...</div>;
  
  return <Component prop1="value1" prop2="value2" />;
}
```

## How It Works

1. **initialization**: Sets up the `globalThis.__federation_shared__` object with React, React DOM, and Ant Design.
2. **dynamic loading**: Handles the loading of federated modules after the shared dependencies are initialized.
3. **error handling**: Provides robust error handling for missing or broken modules.

## Requirements

- Your Next.js app must have React, React DOM, and Ant Design installed as dependencies.
- The federated modules must be served from a publicly accessible URL that your Next.js app can reach.
