# Module Federation for React Components

This setup allows components in `src/business-apps` to be built as separate, versioned chunks that can be:
1. Deployed individually to any storage system (like AWS S3, Azure Blob Storage, etc.)
2. Consumed by other applications, such as a NextJS app
3. Incrementally built (only changed components are rebuilt)

## How It Works

### The Vite App (Host)

The Vite configuration has been enhanced with:

1. **Change Detection**: The build process analyzes which components have changed since the last build by:
   - Extracting components from the `src/business-apps` directory
   - Calculating a hash for each component's directory
   - Comparing with previous build hashes stored in `component-hashes.json`

2. **Module Federation**: Using the `@originjs/vite-plugin-federation` plugin to:
   - Expose each component as a separate module
   - Share common dependencies like React, React DOM, and Ant Design
   - Version each chunk using a timestamp

3. **Optimized Builds**: The configuration:
   - Only rebuilds components that have changed
   - Creates separate chunks for each component
   - Adds version information to chunk filenames

### Building the Components

To build the components:

```bash
npm run build
```

This will:
- Identify which components have changed
- Only rebuild those components (or all if it's the first build)
- Generate versioned chunks in the `dist` directory

### Deploying to Storage

After building, you can deploy the `dist` directory to your preferred storage solution:

#### AWS S3 Example:

```bash
aws s3 sync dist/ s3://your-bucket-name/business-apps/ --acl public-read
```

#### Azure Blob Storage Example:

```bash
az storage blob upload-batch -d your-container-name/business-apps --account-name your-storage-account -s dist/
```

### The NextJS Consumer App

The NextJS app can consume these components using the example in `examples/next-consumer-example.tsx`:

1. **Dynamic Loading**: The consumer dynamically loads components from your storage URL
2. **Version Control**: You can specify which version of a component to load
3. **Caching**: Components are cached client-side for better performance

## Implementation Notes

1. **CORS Configuration**: Ensure your storage provider has CORS configured to allow your NextJS app domain

2. **Shared Dependencies**: The module federation setup shares React, React DOM, and Ant Design. Make sure your consumer app uses compatible versions.

3. **SSR Considerations**: The example in `next-consumer-example.tsx` uses the 'use client' directive for client-side rendering. For server-side rendering, additional configuration is needed.

4. **Storage URL**: Update the `REMOTE_URL` constant in your consumer app to point to your actual storage location.

5. **Versioning Strategy**: The current setup uses timestamps for versioning. You can modify this to use semantic versioning or other strategies.

## Troubleshooting

1. **Module Loading Errors**: If components fail to load, check that:
   - CORS is properly configured
   - The storage URL is correct
   - The component names match exactly

2. **Component Updates Not Appearing**: Clear browser cache or use version parameters to force loading new versions.

3. **Build Performance**: If builds are slow, check that the change detection is working properly by examining console output.
