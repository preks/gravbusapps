import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindCSS from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";
import { resolve } from "path";
import fs from "fs";
import crypto from "crypto";

// Function to determine which components have changed since last build
function getChangedComponents() {
  // Path to the business-apps directory
  const businessAppsDir = resolve(__dirname, "src/business-apps");

  // Path to the manifest file that stores component hashes
  const manifestPath = resolve(__dirname, "component-hashes.json");

  // Load previous hashes if they exist
  let previousHashes = {};
  if (fs.existsSync(manifestPath)) {
    previousHashes = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  }

  // Get list of components from index.ts
  const indexContent = fs.readFileSync(
    resolve(businessAppsDir, "index.ts"),
    "utf-8"
  );

  // Extract component names and paths using regex
  const componentRegex = /export\s+{\s+(\w+)\s+}\s+from\s+['"]([^'"]+)['"];?/g;
  const components = [];
  let match;

  while ((match = componentRegex.exec(indexContent)) !== null) {
    const componentName = match[1];
    const componentPath = match[2];

    // Create a unique ID for the component that includes path information
    // Convert path to a sanitized ID-friendly format
    const pathId = componentPath
      .replace(/\.\//, "") // Remove leading ./
      .replace(/\//g, "-") // Replace / with -
      .replace(/\./g, "-"); // Replace . with -

    // Generate a unique ID that combines name and path
    const componentId = `${componentName}-${pathId}`;

    // Store component information
    components.push({
      name: componentName,
      path: componentPath,
      id: componentId,
    });
  }

  // Calculate current hashes and determine which components changed
  const changedComponents = [];
  const currentHashes = {};

  for (const component of components) {
    try {
      // Normalize the component path to work with the platform-specific path separators
      const normalizedPath = component.path
        .replace(/\//g, "\\")
        .replace(/\.\\/, "");

      // Extract just the directory part without the file reference
      // Example: "./irm/detail-screens/LeadDetail/LeadDetail" -> "irm\detail-screens\LeadDetail"
      const pathParts = normalizedPath.split("\\");
      const componentName = pathParts[pathParts.length - 1];
      const dirPath = resolve(
        businessAppsDir,
        pathParts.slice(0, -1).join("\\")
      );

      // Safety check if directory exists
      if (!fs.existsSync(dirPath)) {
        console.warn(
          `Directory not found: ${dirPath}, skipping hash calculation for ${component.name}`
        );
        continue;
      }

      // Get all files in the component directory
      const componentFiles = getAllFiles(dirPath);

      // Calculate a combined hash for all component files
      const hash = calculateDirectoryHash(componentFiles);

      // Store the current hash using the unique component ID
      currentHashes[component.id] = hash;

      // Check if hash changed or component is new
      if (
        !previousHashes[component.id] ||
        previousHashes[component.id] !== hash
      ) {
        changedComponents.push(component.id);
      }
    } catch (error) {
      console.error(
        `Error processing component ${component.name} (${component.id}):`,
        error
      );
      // Still add the component to changed components to ensure it gets built
      if (!changedComponents.includes(component.id)) {
        changedComponents.push(component.id);
      }
    }
  }

  // Save current hashes for next build
  fs.writeFileSync(manifestPath, JSON.stringify(currentHashes, null, 2));

  return { changedComponents, components };
}

// Helper to get all files in a directory recursively
function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const filePath = resolve(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      arrayOfFiles = getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(filePath);
    }
  });

  return arrayOfFiles;
}

// Helper to calculate a hash for all files in a directory
function calculateDirectoryHash(files) {
  const hashes = files.map((file) => {
    const content = fs.readFileSync(file, "utf-8");
    return crypto.createHash("md5").update(content).digest("hex");
  });

  // Combine all hashes into one
  return crypto.createHash("md5").update(hashes.join("")).digest("hex");
}

// Get information about changed components
const { changedComponents, components } = getChangedComponents();
console.log("Changed components:", changedComponents);

// Version tag for the build (use timestamp or other versioning strategy)
const version = Date.now().toString();

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@/components': resolve(__dirname, 'src/components'),
      '@/business-apps': resolve(__dirname, 'src/business-apps'),
      '@/assets': resolve(__dirname, 'src/assets'),
      '@/hooks': resolve(__dirname, 'src/hooks')
    }
  },
  plugins: [
    react(),
    tailwindCSS(),
    federation({
      name: "business-apps",
      filename: "remoteEntry.js",
      remoteType: "window", // Using 'window' for global registration
      remotes: {},
      exposes: {
        // Simplified exposures with clear, simple paths
        './LeadDetail': './src/business-apps/irm/detail-screens/LeadDetail/LeadDetail.tsx',
        './LeadOverview': './src/business-apps/irm/overview-screens/LeadOverview/LeadOverview.tsx',
        './OpportunityOverview': './src/business-apps/crm/overview-screens/OpportunityOverview/OpportunityOverview.tsx',
      },
      shared: ["react", "react-dom", "antd"],
    }),
  ],
  build: {
    modulePreload: false,
    target: "es2022", // Changed to es2022 to support top-level await
    minify: "terser",
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        // Use ES format for compatibility with dynamic imports
        format: "es",
        // Ensure consistent file names without content hashes
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        // Create a unique chunk for each component
        manualChunks: (id) => {
          // Check if the file is from one of our business apps components
          for (const comp of components) {
            // Extract folder path without the final component reference
            const folderPath = comp.path.substring(
              0,
              comp.path.lastIndexOf("/")
            );
            // Format path for string comparison (depends on OS path format in bundler)
            const comparePath = `/business-apps${folderPath.replace(".", "")}`;

            if (id.includes(comparePath)) {
              // Use the component's unique ID in the chunk name
              return `business-apps/${comp.id}-${version}`;
            }
          }
        },
      },
    },
  },
});
