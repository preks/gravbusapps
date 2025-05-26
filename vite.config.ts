import { resolve } from 'path';
import { defineConfig, loadEnv, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindCSS from '@tailwindcss/vite';
import fs from 'fs'; // For synchronous file system operations
import { readFile, rename as fsRename } from 'fs/promises'; // For asynchronous file system operations in the plugin
import crypto from 'crypto';
import path from 'path';
import dotenv from 'dotenv';

// Function to get dynamic entries for Vite build using synchronous fs methods
function getDynamicEntries(projectRootDir: string): Record<string, string> {
  const businessAppsDir = path.join(projectRootDir, 'src', 'business-apps');
  const entries: Record<string, string> = {};

  if (!fs.existsSync(businessAppsDir)) {
    return entries;
  }

  // Get all products (top-level directories) that don't start with '.' and aren't 'node_modules'
  const products = fs.readdirSync(businessAppsDir).filter(product =>
    fs.statSync(path.join(businessAppsDir, product)).isDirectory() && 
    !product.startsWith('.') && 
    product !== 'node_modules'
  );

  // Function to recursively find index.ts files in a directory
  function findIndexFiles(dir: string, product: string, pathParts: string[] = []) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        // Continue recursion for directories
        findIndexFiles(itemPath, product, [...pathParts, item]);
      } else if (item === 'index.ts' && stats.isFile()) {
        // Found an index.ts file
        // The screen name is the directory containing the index.ts file
        const screenName = path.basename(dir);
        // Remove the screenName from pathParts as it will be added separately
        const intermediatePath = pathParts.slice(0, -1).join('/');
        // Create the entry key with the pattern product/intermediate-path/screenName
        const entryKey = intermediatePath ? `${product}/${intermediatePath}/${screenName}` : `${product}/${screenName}`;
        entries[entryKey] = itemPath;
      }
    }
  }

  // Process each product directory
  products.forEach(product => {
    const productPath = path.join(businessAppsDir, product);
    findIndexFiles(productPath, product);
  });
  
  return entries;
}

// Helper function for SHA256
function getSha256(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16); // 16-char hash
}

// Custom plugin for SHA256 content hashing
function sha256ContentHashPlugin(shouldApply: boolean) {
  if (!shouldApply) {
    return null;
  }
  return {
    name: 'sha256-content-hash',
    async writeBundle(options: any, bundle: any) {
      console.log('[sha256-plugin] Processing bundle for SHA256 content hashing...');
      const outputDir = options.dir;
      if (!outputDir) {
        console.error('[sha256-plugin] Output directory not found in options.');
        return;
      }

      const newBundleEntries: Record<string, any> = {};
      const oldKeys: string[] = [];

      for (const originalChunkFileName in bundle) {
        const chunk = bundle[originalChunkFileName];
        if (chunk.type === 'chunk' && chunk.isEntry && chunk.facadeModuleId && chunk.fileName.endsWith('.js')) {
          const originalFilePath = path.join(outputDir, chunk.fileName);
          try {
            const fileContent = await readFile(originalFilePath); // Using readFile from 'fs/promises'
            const hash = getSha256(fileContent);
            const dirName = path.dirname(chunk.fileName);
            const baseName = path.basename(chunk.fileName, '.js');
            const newChunkFileName = `${dirName}/${baseName}-${hash}.js`;
            const newFilePath = path.join(outputDir, newChunkFileName);

            if (originalFilePath !== newFilePath) {
              await fsRename(originalFilePath, newFilePath); // Using fsRename from 'fs/promises'
              console.log(`[sha256-plugin] Renamed: ${chunk.fileName} -> ${newChunkFileName}`);
              chunk.fileName = newChunkFileName;
              newBundleEntries[newChunkFileName] = chunk;
              oldKeys.push(originalChunkFileName);
            } else {
              newBundleEntries[originalChunkFileName] = chunk;
            }
          } catch (error) {
            console.error(`[sha256-plugin] Error processing file ${originalFilePath}:`, error);
            newBundleEntries[originalChunkFileName] = chunk;
          }
        } else {
          newBundleEntries[originalChunkFileName] = chunk;
        }
      }
      oldKeys.forEach(key => delete bundle[key]);
      Object.assign(bundle, newBundleEntries);
    },
  };
}

// Changed to a function to access the mode (e.g., 'production', 'development')
export default defineConfig(({ command, mode }) => {
  // Determine projectRootDir based on the command
  const projectRootDirFromEnv = process.env.PROJECT_ROOT_DIR;
  let projectRootDir;

  if (command === 'build') {
    if (!projectRootDirFromEnv) {
      console.error('[vite.config.ts] FATAL ERROR: PROJECT_ROOT_DIR environment variable must be set by the calling script for "build" commands.');
      process.exit(1);
    }
    projectRootDir = projectRootDirFromEnv;
  } else {
    // For 'serve' or other commands, default to process.cwd() if PROJECT_ROOT_DIR is not set.
    projectRootDir = projectRootDirFromEnv || process.cwd();
  }
  console.log(`[vite.config.ts] Running in mode: "${mode}", command: "${command}"`);
  console.log(`[vite.config.ts] Using project root directory: ${projectRootDir}`);

  // Load environment variables using the determined projectRootDir
  const env = loadEnv(mode, projectRootDir, '');
  
  // --- Original logic for TARGET_ENTRY_KEY and TARGET_ENTRY_FILE ---
  const targetEntryKey = env.TARGET_ENTRY_KEY; // e.g., 'irm/detail-screens/LeadDetail'
  const targetEntryFile = env.TARGET_ENTRY_FILE; // e.g., 'src/business-apps/irm/detail-screens/LeadDetail/index.ts'
  // --- End of original logic ---

  let dynamicEntries = {};
  const isProduction = mode === 'production';
  const shouldHashFilesForDeployment = isProduction && env.VITE_BUILD_FOR_DEPLOYMENT === 'true';
  const isBuildCommand = command === 'build';
  const isSingleBuild = targetEntryKey && targetEntryFile;

  if (isBuildCommand && isSingleBuild) {
    console.log(`[vite.config.ts] Single build detected for: ${targetEntryKey}`);
  }

  // Define content for the __APP_BUILD_INFO__ banner
  const gitUserForBanner = env.VITE_GIT_USER || 'N/A';
  const publishTimeForBanner = env.VITE_PUBLISH_TIME || new Date().toISOString();
  const appBuildInfoObject = { gitUser: gitUserForBanner, publishTime: publishTimeForBanner };
  const appBuildInfoStringForBanner = JSON.stringify(appBuildInfoObject);

  // This is the banner string structure you want, with the problematic console.log commented out
  const injectedBannerString = `/* --- Injected Banner Start --- */
globalThis.__APP_BUILD_INFO__ = ${appBuildInfoStringForBanner};
if (globalThis.__APP_BUILD_INFO__) {
  const buildInfo = globalThis.__APP_BUILD_INFO__;
  const publishDate = new Date(buildInfo.publishTime);

  // Date formatting logic for DD.MM.YYYY HH:MM TIMEZONE
  const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false, // Ensures 24-hour format for HH
    timeZoneName: 'short' // For timezone abbreviation like CET, PST, etc.
  });
 
  // Extract parts and assemble the string
  const parts = dateTimeFormatter.formatToParts(publishDate).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  // Construct the desired format, ensuring timezone is handled gracefully
  const formattedBuildTime = \`\${parts.day}.\${parts.month}.\${parts.year} \${parts.hour}:\${parts.minute} \${parts.timeZoneName || ''}\`.trim();

  console.log(\`---------------------------------------
       Screen Build Information
---------------------------------------
  Built by:    \${buildInfo.gitUser}
  Build time:  \${formattedBuildTime}
---------------------------------------\`);
} else {
  console.log('Screen Build Info: Not available');
}
/* --- Injected Banner End --- */
`;

  // Updated banner plugin to use the injectedBannerString
  const prependBuildInfoBannerPlugin = {
    name: 'prepend-custom-build-info-banner',
    renderChunk(code: string, chunk: any) {
      // isProduction is from the outer closure
      if (!shouldHashFilesForDeployment && isProduction && chunk.isEntry && chunk.facadeModuleId?.endsWith('index.ts') && chunk.name !== 'index' && chunk.exports.length > 0) {
        console.log(`[vite.config.ts prependBannerPlugin] Prepending build info banner to: ${chunk.name}`);
        return injectedBannerString + code;
      }
      return null;
    },
  };

  // Get all possible entries using our flexible pattern finder
  const allPossibleEntries = getDynamicEntries(projectRootDir);
  
  if (isBuildCommand && isSingleBuild) {
    // Single build mode - use only the specified entry
    dynamicEntries[targetEntryKey] = resolve(projectRootDir, targetEntryFile);
    console.log(`[vite.config.ts] Single build: Targeting entry: ${targetEntryKey}`);
  } else if (command === 'serve') {
    // Development server mode
    if (targetEntryKey && targetEntryFile) {
      // If a specific entry is requested, use only that one
      dynamicEntries[targetEntryKey] = resolve(projectRootDir, targetEntryFile);
      console.log(`[vite.config.ts] Dev server targeting specific entry: ${targetEntryKey}`);
    } else {
      // Otherwise, use all discovered entries for development
      dynamicEntries = allPossibleEntries;
      console.log('[vite.config.ts] Dev server using all discovered entries:');
      console.log(dynamicEntries);
    }
  } else {
    // Multi-build mode (default build) - use all discovered entries
    dynamicEntries = allPossibleEntries;
    console.log('[vite.config.ts] Multi-build: Generating all entries.');
    console.log('[vite.config.ts] Generated entries for multi-build:', dynamicEntries);
  }

  const extraPlugins: PluginOption[] = [
    // Add dotenv plugin only for development mode
    ...(mode === 'development' ? [{
      name: 'dotenv',
      config() {
        dotenv.config({ path: '.env' });
        return {
          define: {
            'process.env': {
              ...dotenv.config({ path: '.env' }).parsed
            }
          }
        };
      }
    }] : [])
  ];

  return {
    plugins: [
      react(),
      tailwindCSS(),
      prependBuildInfoBannerPlugin, // Use the updated banner plugin
      sha256ContentHashPlugin(shouldHashFilesForDeployment),
      ...extraPlugins,
    ].filter(Boolean),
    define: {
      // This replaces process.env.NODE_ENV with the current mode in the build output
      'process.env.NODE_ENV': JSON.stringify(mode),
      // globalThis.__APP_BUILD_INFO__ is handled by the prependBannerPlugin, so no need to define it here.
    },
    resolve: {
      alias: {
        '@': resolve(projectRootDir, 'src'),
      },
    },
    build: {
      outDir: resolve(projectRootDir, 'dist'),
      // emptyOutDir behavior: 
      // true for 'npm run build' (multi-screen, full clean)
      // false for 'npm run publish:screen' (single-screen, script handles specific sub-dir deletion)
      emptyOutDir: isBuildCommand && !isSingleBuild,
      lib: {
        entry: dynamicEntries,
        name: 'GravityBusinessApps', // Name for UMD global, less critical for CJS
        formats: ['cjs'],
        // fileName is handled by rollupOptions.output.entryFileNames
      },
      minify: isProduction ? 'esbuild' : false, // Ensure minification for production
      rollupOptions: {
        external: ['react', 'react-dom', 'antd', 'react/jsx-runtime'],
        output: {
          globals: {
            'react': 'React',
            'react-dom': 'ReactDOM',
            'antd': 'antd',
          },
          // entryFileNames will now always output a predictable name;
          // the sha256ContentHashPlugin will handle renaming for deployment builds.
          entryFileNames: (chunkInfo) => `${chunkInfo.name}/index.js`,
          // For non-entry chunks and assets, use Vite's hashing only for deployment builds.
          chunkFileNames: shouldHashFilesForDeployment ? `_chunks/[name]-[hash].js` : `_chunks/[name].js`,
          assetFileNames: shouldHashFilesForDeployment ? `assets/[name]-[hash][extname]` : `assets/[name][extname]`, // Corrected assetFileNames
          exports: 'named', // Address mixed export warnings
        },
      },
    },
    base: './'
  };
});
