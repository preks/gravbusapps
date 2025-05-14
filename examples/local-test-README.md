# Testing Federated Components Locally

This guide will help you test your federated components locally using the provided examples.

## Quick Start

Follow these steps to test your federated components locally:

1. **Build the components**:
   ```bash
   # In the root project directory
   npm run build
   ```

2. **Start the local component server**:
   ```bash
   # In the root project directory
   node examples/local-server.js
   ```
   This starts a server at http://localhost:3001 that serves your built components.

3. **Start the consumer app**:
   ```bash
   # In another terminal, navigate to the local consumer app
   cd examples/local-consumer
   npm install
   npm run dev
   ```
   This starts a development server at http://localhost:3000 that consumes your federated components.

4. **Open the consumer app** in your browser:
   http://localhost:3000

## How It Works

### Component Server

The component server (examples/local-server.js) is a simple Express server that:
- Serves the built components from your `dist` directory
- Provides CORS support so the consumer app can load the components
- Provides a simple API to list available components

### Consumer App

The consumer app (examples/local-consumer) is a simple Vite React app that:
- Connects to the local component server
- Dynamically loads the components at runtime
- Allows you to select and view different components

## Making Changes

1. **Modify a component** in the `src/business-apps` directory
2. **Rebuild** the components with `npm run build`
3. **Refresh** the consumer app - it will load the new version of the component

This workflow simulates how your components would be consumed by a real application when deployed to a storage service like Azure Blob Storage or AWS S3.

## Troubleshooting

- **Component fails to load**: Make sure the component server is running and serving the correct files
- **CORS errors**: The component server has CORS enabled, but you may need to check browser console for specific errors
- **Component not found**: Check that the component ID in the consumer app matches the one exposed by the federation plugin

## Next Steps

Once you've tested locally, you can:

1. Deploy the built components to Azure Blob Storage or similar
2. Update your consumer app to point to the deployed URL
3. Implement versioning strategies for production use
