import { resolve } from 'path'
import { defineConfig, loadEnv, type PluginOption } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindCSS from '@tailwindcss/vite'
import browserEcho from '@browser-echo/vite'
import fs from 'fs' // For synchronous file system operations
import { readFile, rename as fsRename } from 'fs/promises' // For asynchronous file system operations in the plugin
import crypto from 'crypto'
import path from 'path'
import dotenv from '@dotenvx/dotenvx'
import { execSync, spawn } from 'child_process'

// Function to get dynamic entries for Vite build using synchronous fs methods
function getDynamicEntries(projectRootDir: string): Record<string, string> {
  // Check if running in batch mode
  const batchMode = process.env.VITE_BATCH_MODE === 'true'
  const batchEntriesFile = path.join(projectRootDir, '.batch-entries.json')

  if (batchMode && fs.existsSync(batchEntriesFile)) {
    console.log('[vite.config.ts] Batch mode: Loading entries from .batch-entries.json')
    const batchEntries = JSON.parse(fs.readFileSync(batchEntriesFile, 'utf8'))
    console.log(`[vite.config.ts] Batch mode: Building ${Object.keys(batchEntries).length} screens`)
    return batchEntries
  }

  const businessAppsDir = path.join(projectRootDir, 'src', 'business-apps')
  const entries: Record<string, string> = {}

  if (!fs.existsSync(businessAppsDir)) {
    return entries
  }

  // Get all products (top-level directories) that don't start with '.' and aren't 'node_modules'
  const products = fs
    .readdirSync(businessAppsDir)
    .filter(
      product =>
        fs.statSync(path.join(businessAppsDir, product)).isDirectory() &&
        !product.startsWith('.') &&
        product !== 'node_modules'
    )

  // Function to recursively find index.ts files in a directory
  function findIndexFiles(dir: string, product: string, pathParts: string[] = []) {
    const items = fs.readdirSync(dir)

    for (const item of items) {
      const itemPath = path.join(dir, item)
      const stats = fs.statSync(itemPath)

      if (stats.isDirectory()) {
        // Continue recursion for directories
        findIndexFiles(itemPath, product, [...pathParts, item])
      } else if (item === 'index.ts' && stats.isFile()) {
        // Found an index.ts file
        // The screen name is the directory containing the index.ts file
        const screenName = path.basename(dir)
        // Remove the screenName from pathParts as it will be added separately
        const intermediatePath = pathParts.slice(0, -1).join('/')
        // Create the entry key with the pattern product/intermediate-path/screenName
        const entryKey = intermediatePath ? `${product}/${intermediatePath}/${screenName}` : `${product}/${screenName}`
        entries[entryKey] = itemPath
      }
    }
  }

  // Process each product directory
  products.forEach(product => {
    const productPath = path.join(businessAppsDir, product)
    findIndexFiles(productPath, product)
  })

  // Also include example entries from src/common/examples (apps, forms, popups)
  const examplesDir = path.join(projectRootDir, 'src', 'common', 'examples')
  if (fs.existsSync(examplesDir)) {
    const findExampleIndexFiles = (dir: string) => {
      const items = fs.readdirSync(dir)
      for (const item of items) {
        const itemPath = path.join(dir, item)
        const stats = fs.statSync(itemPath)
        if (stats.isDirectory()) {
          findExampleIndexFiles(itemPath)
        } else if (item === 'index.ts' && stats.isFile()) {
          // Compute relative path from examples root to the directory containing index.ts
          const relativeDir = path.relative(examplesDir, path.dirname(itemPath)).replace(/\\/g, '/')
          if (relativeDir) {
            // Screen key pattern: examples/<relativeDir>
            const entryKey = `examples/${relativeDir}`
            entries[entryKey] = itemPath
          }
        }
      }
    }
    findExampleIndexFiles(examplesDir)
  }

  return entries
}

// Helper function for SHA256
function getSha256(data: Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16) // 16-char hash
}

// Custom plugin for SHA256 content hashing
function sha256ContentHashPlugin(shouldApply: boolean) {
  if (!shouldApply) {
    return null
  }
  return {
    name: 'sha256-content-hash',
    async writeBundle(options: any, bundle: any) {
      console.log('[sha256-plugin] Processing bundle for SHA256 content hashing...')
      const outputDir = options.dir
      if (!outputDir) {
        console.error('[sha256-plugin] Output directory not found in options.')
        return
      }

      const newBundleEntries: Record<string, any> = {}
      const oldKeys: string[] = []

      for (const originalChunkFileName in bundle) {
        const chunk = bundle[originalChunkFileName]
        if (chunk.type === 'chunk' && chunk.isEntry && chunk.facadeModuleId && chunk.fileName.endsWith('.js')) {
          const originalFilePath = path.join(outputDir, chunk.fileName)
          try {
            const fileContent = await readFile(originalFilePath) // Using readFile from 'fs/promises'
            const hash = getSha256(fileContent)
            const dirName = path.dirname(chunk.fileName)
            const baseName = path.basename(chunk.fileName, '.js')
            const newChunkFileName = `${dirName}/${baseName}-${hash}.js`
            const newFilePath = path.join(outputDir, newChunkFileName)

            if (originalFilePath !== newFilePath) {
              await fsRename(originalFilePath, newFilePath) // Using fsRename from 'fs/promises'
              console.log(`[sha256-plugin] Renamed: ${chunk.fileName} -> ${newChunkFileName}`)
              chunk.fileName = newChunkFileName
              newBundleEntries[newChunkFileName] = chunk
              oldKeys.push(originalChunkFileName)
            } else {
              newBundleEntries[originalChunkFileName] = chunk
            }
          } catch (error) {
            console.error(`[sha256-plugin] Error processing file ${originalFilePath}:`, error)
            newBundleEntries[originalChunkFileName] = chunk
          }
        } else {
          newBundleEntries[originalChunkFileName] = chunk
        }
      }
      oldKeys.forEach(key => delete bundle[key])
      Object.assign(bundle, newBundleEntries)
    }
  }
}

// Changed to a function to access the mode (e.g., 'production', 'development')
export default defineConfig(({ command, mode }) => {
  // Determine projectRootDir based on the command
  const projectRootDirFromEnv = process.env.PROJECT_ROOT_DIR
  let projectRootDir

  if (command === 'build') {
    if (!projectRootDirFromEnv) {
      console.error(
        '[vite.config.ts] FATAL ERROR: PROJECT_ROOT_DIR environment variable must be set by the calling script for "build" commands.'
      )
      process.exit(1)
    }
    projectRootDir = projectRootDirFromEnv
  } else {
    // For 'serve' or other commands, default to process.cwd() if PROJECT_ROOT_DIR is not set.
    projectRootDir = projectRootDirFromEnv || process.cwd()
  }
  console.log(`[vite.config.ts] Running in mode: "${mode}", command: "${command}"`)
  console.log(`[vite.config.ts] Using project root directory: ${projectRootDir}`)

  // Load environment variables using the determined projectRootDir
  const env = loadEnv(mode, projectRootDir, '')

  // --- Original logic for TARGET_ENTRY_KEY and TARGET_ENTRY_FILE ---
  const targetEntryKey = env.TARGET_ENTRY_KEY // e.g., 'irm/detail-screens/LeadDetail'
  const targetEntryFile = env.TARGET_ENTRY_FILE // e.g., 'src/business-apps/irm/detail-screens/LeadDetail/index.ts'
  // --- End of original logic ---

  let dynamicEntries = {}
  const isUnversionedBuild = env.VITE_BUILD_NUMBER === undefined || env.VITE_BUILD_NUMBER === null
  const isProduction = mode === 'production'
  const shouldHashFilesForDeployment = isProduction && env.VITE_BUILD_FOR_DEPLOYMENT === 'true'
  const isBuildCommand = command === 'build'
  const isSingleBuild = targetEntryKey && targetEntryFile
  const isBatchBuild = process.env.VITE_BATCH_MODE === 'true'

  if (isBuildCommand && isSingleBuild) {
    console.log(`[vite.config.ts] Single build detected for: ${targetEntryKey}`)
  }

  // Define content for the __APP_BUILD_INFO__ banner
  // Helper to check if a name is a pipeline/bot user
  const isPipelineUser = (name: string) => {
    const pipelineNames = ['bitbucket pipeline', 'bitbucket-pipelines', 'bitbucket pipelines', 'update bot']
    return pipelineNames.some(p => name.toLowerCase().includes(p))
  }

  // Try to find a human author (not pipeline/bot)
  let gitUserForBanner = 'N/A'
  const viteGitUser = env.VITE_GIT_USER

  // If VITE_GIT_USER is set and is a real human (not pipeline), use it directly
  if (viteGitUser && !isPipelineUser(viteGitUser)) {
    gitUserForBanner = viteGitUser
  } else {
    // Need to find the actual human author from git history
    try {
      const screenDir = targetEntryFile ? path.dirname(targetEntryFile) : null
      let commitAuthor = ''

      // Try to get author of last non-merge commit that modified this screen
      if (screenDir) {
        // --no-merges skips merge commits which are usually by pipelines
        commitAuthor = execSync(`git log --no-merges -1 --pretty=format:%an -- "${screenDir}"`, {
          encoding: 'utf8'
        }).trim()
      }

      // Fallback: get any recent non-pipeline author
      if (!commitAuthor || isPipelineUser(commitAuthor)) {
        // Get authors of last 10 commits and find first human
        const authors = execSync('git log -10 --pretty=format:%an', { encoding: 'utf8' }).trim().split('\n')
        commitAuthor = authors.find(a => a && !isPipelineUser(a)) || ''
      }

      if (commitAuthor && !isPipelineUser(commitAuthor)) {
        gitUserForBanner = commitAuthor
      }
    } catch {
      // Keep the default 'N/A' value
    }
  }
  const publishTimeForBanner = env.VITE_PUBLISH_TIME || new Date().toISOString()

  // Build Bitbucket PR URL if available
  const bitbucketWorkspace = env.BITBUCKET_WORKSPACE
  const bitbucketRepoSlug = env.BITBUCKET_REPO_SLUG
  const bitbucketBuildNumber = env.BITBUCKET_BUILD_NUMBER

  // First try explicit PR ID (available in PR pipelines)
  let prUrl: string | null = null
  const bitbucketPrId = env.BITBUCKET_PR_ID
  if (bitbucketPrId && bitbucketWorkspace && bitbucketRepoSlug) {
    prUrl = `https://bitbucket.org/${bitbucketWorkspace}/${bitbucketRepoSlug}/pull-requests/${bitbucketPrId}`
  } else if (bitbucketWorkspace && bitbucketRepoSlug) {
    // For merge commits, try to extract PR number from the commit that last modified this screen
    // Bitbucket merge commits have format: "Merged in branch-name (pull request #123)"
    try {
      const screenDir = targetEntryFile ? path.dirname(targetEntryFile) : null
      let commitMsg = ''

      if (screenDir) {
        // Get commit message of the last commit that modified this screen
        commitMsg = execSync(`git log -1 --pretty=format:%s -- "${screenDir}"`, { encoding: 'utf8' }).trim()
      }

      // Fallback to last commit if screen-specific lookup fails
      if (!commitMsg) {
        commitMsg = execSync('git log -1 --pretty=format:%s', { encoding: 'utf8' }).trim()
      }

      const prMatch = commitMsg.match(/\(pull request #(\d+)\)/)
      if (prMatch) {
        prUrl = `https://bitbucket.org/${bitbucketWorkspace}/${bitbucketRepoSlug}/pull-requests/${prMatch[1]}`
      }
    } catch {
      // Couldn't extract PR from commit message
    }
  }

  const pipelineUrl =
    bitbucketBuildNumber && bitbucketWorkspace && bitbucketRepoSlug
      ? `https://bitbucket.org/${bitbucketWorkspace}/${bitbucketRepoSlug}/pipelines/results/${bitbucketBuildNumber}`
      : null

  const appBuildInfoObject = {
    screen: targetEntryKey?.split('/').pop() || 'N/A',
    gitUser: gitUserForBanner,
    publishTime: publishTimeForBanner,
    prUrl: prUrl,
    pipelineUrl: pipelineUrl,
    buildNumber: bitbucketBuildNumber || null
  }
  const appBuildInfoStringForBanner = JSON.stringify(appBuildInfoObject)

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

  const extraLines = [];
  if (buildInfo.buildNumber) extraLines.push('  Build #:     ' + buildInfo.buildNumber);
  if (buildInfo.prUrl) extraLines.push('  PR:          ' + buildInfo.prUrl);
  if (buildInfo.pipelineUrl) extraLines.push('  Pipeline:    ' + buildInfo.pipelineUrl);
  
  console.log('---------------------------------------');
  console.log('       Screen Build Information');
  console.log('---------------------------------------');
  console.log('  Screen:      ' + buildInfo.screen);
  console.log('  Built by:    ' + buildInfo.gitUser);
  console.log('  Build time:  ' + formattedBuildTime);
  if (extraLines.length > 0) {
    extraLines.forEach(function(line) { console.log(line); });
  }
  console.log('---------------------------------------');
} else {
  console.log('Screen Build Info: Not available');
}
/* --- Injected Banner End --- */
`

  // Updated banner plugin to use the injectedBannerString
  const prependBuildInfoBannerPlugin = {
    name: 'prepend-custom-build-info-banner',
    renderChunk(code: string, chunk: any) {
      if (
        !shouldHashFilesForDeployment &&
        isUnversionedBuild &&
        chunk.isEntry &&
        chunk.facadeModuleId?.endsWith('.ts') &&
        chunk.name !== 'index' &&
        chunk.exports.length > 0
      ) {
        console.log(`[vite.config.ts prependBannerPlugin] Prepending build info banner to: ${chunk.name}`)
        return injectedBannerString + code
      }
      return null
    }
  }

  // Get all possible entries using our flexible pattern finder
  const allPossibleEntriesRaw = getDynamicEntries(projectRootDir)

  // Convert absolute paths to relative paths for dynamic imports
  const allPossibleEntries: Record<string, string> = {}
  Object.entries(allPossibleEntriesRaw).forEach(([key, absolutePath]) => {
    const relativePath = path.relative(projectRootDir, absolutePath).replace(/\\/g, '/')
    allPossibleEntries[key] = relativePath
  })

  if (isBuildCommand && isSingleBuild) {
    // Single build mode - use only the specified entry
    dynamicEntries[targetEntryKey] = resolve(projectRootDir, targetEntryFile)
    console.log(`[vite.config.ts] Single build: Targeting entry: ${targetEntryKey}`)
  } else if (command === 'serve') {
    // Development server mode - optimize for speed
    if (targetEntryKey && targetEntryFile) {
      // If a specific entry is requested, use only that one
      dynamicEntries[targetEntryKey] = resolve(projectRootDir, targetEntryFile)
      console.log(`[vite.config.ts] Dev server targeting specific entry: ${targetEntryKey}`)
    } else {
      // For faster dev server startup, only load essential entries
      // Business app screens will be loaded on-demand
      console.log('[vite.config.ts] Dev server using minimal entries for fast startup')
      console.log('[vite.config.ts] Business app screens will be loaded on-demand')

      // Don't load any business app entries initially - they'll be loaded dynamically
      // This significantly improves dev server startup time
      dynamicEntries = {}
    }
  } else {
    // Multi-build mode (default build) - use all discovered entries
    dynamicEntries = allPossibleEntriesRaw
    console.log('[vite.config.ts] Multi-build: Generating all entries.')
    console.log('[vite.config.ts] Generated entries for multi-build:', dynamicEntries)
  }

  const extraPlugins: PluginOption[] = [
    // Add @dotenvx/dotenvx plugin only for development mode
    ...(mode === 'development'
      ? [
          {
            name: '@dotenvx/dotenvx',
            config() {
              dotenv.config({ path: '.env' })
              return {
                define: {
                  'process.env': {
                    ...dotenv.config({ path: '.env' }).parsed
                  }
                }
              }
            }
          },
          // Browser console log forwarding
          browserEcho({
            include: ['log', 'info', 'warn', 'error', 'debug'],
            // Terminal output
            enabled: true,
            // Enable file logging with rotation
            fileLog: {
              enabled: true,
              dir: './logs' // Store in dedicated logs directory
            },
            // Stack trace configuration
            stackMode: 'condensed'
          })
        ]
      : [])
  ]

  // Virtual module plugin for wrapping components
  const virtualModulePlugin = {
    name: 'virtual-module-plugin',
    resolveId(id) {
      if (id === 'virtual:wrapped-entries') {
        return id
      }
      if (id === 'virtual:dynamic-screen-loader') {
        return id
      }
      return null
    },
    load(id) {
      if (id === 'virtual:wrapped-entries') {
        // Generate a module that re-exports all the wrapped components
        let code = `import { wrapWithUiCatalog } from './common/wrapWithUiCatalog';
import { wrapWithLocalizationProvider } from './common/wrapWithLocalizationProvider';
import { wrapWithBlinkProvider } from './common/wrapWithBlinkProvider';
`

        // For each entry in our dynamic entries, create an import and export
        Object.keys(dynamicEntries).forEach(entryKey => {
          const entryPath = dynamicEntries[entryKey]
          const relativePath = path.relative(projectRootDir, entryPath).replace(/\\/g, '/')
          // Use a unique variable name for each import based on entryKey
          const cleanEntryKey = entryKey.replace(/[^a-zA-Z0-9]/g, '_')
          const shouldSkipWrap = entryKey === '.debug/apps/debug-view' || entryKey.includes('/.debug/apps/debug-view')
          code += `import ${cleanEntryKey}Original from './${relativePath}';
`
          if (shouldSkipWrap) {
            code += `export const ${cleanEntryKey} = ${cleanEntryKey}Original;
`
          } else {
            code += `export const ${cleanEntryKey} = wrapWithUiCatalog(wrapWithLocalizationProvider(wrapWithBlinkProvider(${cleanEntryKey}Original)));
`
          }
        })

        console.log('[UiCatalogWrapper] Created virtual module with wrapped components')
        return code
      }

      if (id === 'virtual:dynamic-screen-loader') {
        // Generate a module that can dynamically load any business app screen
        const availableScreensJson = JSON.stringify(allPossibleEntries, null, 2)

        // In dev mode (serve), BusinessAppIDE already provides LocalizationProvider
        // So we only wrap with UiCatalog
        let code = "import { wrapWithUiCatalog } from '@/common/wrapWithUiCatalog';\n\n"
        code += '// Available screen entries for dynamic loading\n'
        code += 'const availableScreens = ' + availableScreensJson + ';\n\n'
        code += '// Cache for loaded screens with metadata\n'
        code += 'const screenCache = new Map();\n'
        code += 'const loadingPromises = new Map();\n\n'
        code += '// Function to dynamically load a screen with optimized caching\n'
        code += 'export async function loadScreen(screenKey) {\n'
        code += '  // Check cache first\n'
        code += '  if (screenCache.has(screenKey)) {\n'
        code += '    const cached = screenCache.get(screenKey);\n'
        code += '    console.log(`[Dynamic Screen Loader] Using cached screen: ${screenKey}`);\n'
        code += '    return cached.component;\n'
        code += '  }\n'
        code += '  \n'
        code += '  // Check if already loading to prevent duplicate requests\n'
        code += '  if (loadingPromises.has(screenKey)) {\n'
        code += '    console.log(`[Dynamic Screen Loader] Waiting for existing load: ${screenKey}`);\n'
        code += '    return loadingPromises.get(screenKey);\n'
        code += '  }\n'
        code += '  \n'
        code += '  const screenPath = availableScreens[screenKey];\n'
        code += '  if (!screenPath) {\n'
        code +=
          '    throw new Error(`Screen "${screenKey}" not found. Available screens: ${Object.keys(availableScreens).join(\', \')}`);\n'
        code += '  }\n'
        code += '  \n'
        code += '  // Create loading promise\n'
        code += '  const loadingPromise = (async () => {\n'
        code += '    try {\n'
        code += '      const startTime = performance.now();\n'
        code += '      \n'
        code += '      // Dynamic import the screen (screenPath is already relative to project root)\n'
        code += "      const importPath = screenPath.startsWith('./') ? screenPath : './' + screenPath;\n"
        code += '      \n'
        code += '      console.log(`[Dynamic Screen Loader] Loading screen: ${screenKey} from ${importPath}`);\n'
        code += '      \n'
        code += '      const module = await import(/* @vite-ignore */ importPath);\n'
        code += '      const component = module.default;\n'
        code += '      \n'
        code += '      if (!component) {\n'
        code += '        throw new Error(`Screen "${screenKey}" does not have a default export`);\n'
        code += '      }\n'
        code += '      \n'
        code += '      // Wrap with UI catalog only (BusinessAppIDE provides LocalizationProvider)\n'
        code += '      const wrappedComponent = wrapWithUiCatalog(component);\n'
        code += '      \n'
        code += '      const loadTime = performance.now() - startTime;\n'
        code += '      \n'
        code += '      // Cache the wrapped component with metadata\n'
        code += '      screenCache.set(screenKey, {\n'
        code += '        component: wrappedComponent,\n'
        code += '        loadTime,\n'
        code += '        loadedAt: Date.now()\n'
        code += '      });\n'
        code += '      \n'
        code +=
          '      console.log(`[Dynamic Screen Loader] Successfully loaded screen: ${screenKey} in ${loadTime.toFixed(2)}ms`);\n'
        code += '      return wrappedComponent;\n'
        code += '    } catch (error) {\n'
        code += '      console.error(`[Dynamic Screen Loader] Failed to load screen "${screenKey}":`, error);\n'
        code += '      throw error;\n'
        code += '    } finally {\n'
        code += '      // Remove from loading promises\n'
        code += '      loadingPromises.delete(screenKey);\n'
        code += '    }\n'
        code += '  })();\n'
        code += '  \n'
        code += '  // Store loading promise\n'
        code += '  loadingPromises.set(screenKey, loadingPromise);\n'
        code += '  \n'
        code += '  return loadingPromise;\n'
        code += '}\n\n'
        code += '// Function to preload a screen (optional)\n'
        code += 'export async function preloadScreen(screenKey) {\n'
        code += '  return loadScreen(screenKey);\n'
        code += '}\n\n'
        code += '// Function to get all available screen keys\n'
        code += 'export function getAvailableScreens() {\n'
        code += '  return Object.keys(availableScreens);\n'
        code += '}\n\n'
        code += '// Function to check if a screen is available\n'
        code += 'export function isScreenAvailable(screenKey) {\n'
        code += '  return screenKey in availableScreens;\n'
        code += '}\n\n'
        code += '// Function to get screen info\n'
        code += 'export function getScreenInfo(screenKey) {\n'
        code += '  return {\n'
        code += '    key: screenKey,\n'
        code += '    path: availableScreens[screenKey],\n'
        code += '    isLoaded: screenCache.has(screenKey)\n'
        code += '  };\n'
        code += '}\n\n'
        code += '// Export the screens map for debugging\n'
        code += 'export { availableScreens };\n'

        console.log('[Dynamic Screen Loader] Created virtual module for on-demand screen loading')
        return code
      }

      return null
    }
  }

  // Plugin to compile and inline AudioWorklet as JavaScript string
  const inlineWorkletPlugin = {
    name: 'inline-worklet',

    async resolveId(id: string) {
      // Intercept ?inline imports
      if (id.includes('rnnoise-processor.ts?inline')) {
        return id // Mark for processing
      }
      return null
    },

    async load(id: string) {
      if (!id.includes('rnnoise-processor.ts?inline')) {
        return null
      }

      console.log('[inline-worklet] Compiling and inlining worklet:', id)

      const filePath = id.split('?')[0]

      // Use esbuild to compile and bundle the worklet into a single JavaScript string
      const esbuild = await import('esbuild')

      try {
        const result = await esbuild.build({
          entryPoints: [filePath],
          bundle: true,
          format: 'iife',
          platform: 'browser',
          target: 'es2020',
          write: false,
          minify: false,
          logLevel: 'warning',
          // Bundle all dependencies including @jitsi/rnnoise-wasm
          external: []
        })

        const compiledCode = result.outputFiles[0].text

        console.log('[inline-worklet] ✅ Worklet compiled and bundled:', {
          originalPath: filePath,
          compiledSize: `${(compiledCode.length / 1024).toFixed(2)} KB`
        })

        // Export the compiled JavaScript as a string
        return {
          code: `export default ${JSON.stringify(compiledCode)}`,
          map: null
        }
      } catch (error) {
        console.error('[inline-worklet] ❌ Failed to compile worklet:', error)
        throw error
      }
    }
  }

  // Custom plugin to wrap each chunk in an IIFE
  const wrapInIIFEPlugin = {
    name: 'wrap-in-iife',
    renderChunk(code: string, chunk: any) {
      // Only transform JavaScript files
      if (!chunk.fileName.endsWith('.js')) return code

      // Skip if already wrapped
      if (code.startsWith('(function()') || code.startsWith('(function(')) {
        return code
      }

      return `(function() {\n${code}\n})();`
    }
  }

  // Rate limiter for expensive operations
  class RateLimiter {
    private lastRequestTime = 0
    private inProgress = false
    private readonly minIntervalMs: number
    private readonly maxConcurrent: number

    constructor(minIntervalMs: number, maxConcurrent = 1) {
      this.minIntervalMs = minIntervalMs
      this.maxConcurrent = maxConcurrent
    }

    tryAcquire(): { allowed: boolean; reason?: string } {
      const now = Date.now()

      if (this.inProgress && this.maxConcurrent <= 1) {
        return { allowed: false, reason: 'A request is already in progress. Please wait for it to complete.' }
      }

      if (now - this.lastRequestTime < this.minIntervalMs) {
        const waitTime = Math.ceil((this.minIntervalMs - (now - this.lastRequestTime)) / 1000)
        return { allowed: false, reason: `Too many requests. Please wait ${waitTime} seconds.` }
      }

      this.lastRequestTime = now
      this.inProgress = true
      return { allowed: true }
    }

    release(): void {
      this.inProgress = false
    }
  }

  // Plugin to expose publish-screen endpoint in dev server
  const publishScreenPlugin = {
    name: 'publish-screen-endpoint',
    configureServer(server: any) {
      // Rate limiter: 5 seconds between requests, max 1 concurrent
      const rateLimiter = new RateLimiter(5000, 1)

      server.middlewares.use('/__publish-screen', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end(JSON.stringify({ error: 'Method not allowed' }))
          return
        }

        // Check rate limit before processing
        const rateCheck = rateLimiter.tryAcquire()
        if (!rateCheck.allowed) {
          res.statusCode = 429
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: rateCheck.reason }))
          return
        }

        // Parse request body
        let body = ''
        for await (const chunk of req) {
          body += chunk.toString()
        }

        let screenPath: string
        try {
          const parsed = JSON.parse(body)
          screenPath = parsed.screenPath
        } catch {
          rateLimiter.release()
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Invalid JSON body' }))
          return
        }

        if (!screenPath) {
          rateLimiter.release()
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'screenPath is required' }))
          return
        }

        if (!fs.existsSync(path.join(projectRootDir, 'src', 'business-apps', screenPath, 'index.ts'))) {
          rateLimiter.release()
          res.statusCode = 400
          res.end(JSON.stringify({ error: 'Screen not found' }))
          return
        }

        // Execute the publish script
        const publishScript = path.join(projectRootDir, 'scripts', 'publish-dev-screen.js')
        if (!fs.existsSync(publishScript)) {
          rateLimiter.release()
          res.statusCode = 500
          res.end(JSON.stringify({ error: 'Publish script not found' }))
          return
        }

        console.log(`[Publish Screen Plugin] Publishing screen: ${screenPath}`)

        // Set CORS headers
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Access-Control-Allow-Origin', '*')

        // Timeout for the publish process (2 minutes max)
        const PUBLISH_TIMEOUT_MS = 2 * 60 * 1000
        // Max output buffer size to prevent OOM (1MB)
        const MAX_OUTPUT_SIZE = 1024 * 1024

        try {
          // Use spawn with memory limit to prevent OOM
          const child = spawn(
            'node',
            ['--max-old-space-size=2048', publishScript, `/${screenPath}`, '--no-interaction'],
            {
              cwd: projectRootDir,
              env: { ...process.env },
              stdio: ['pipe', 'pipe', 'pipe']
            }
          )

          let stdout = ''
          let stderr = ''
          let hasResponded = false

          // Set a timeout to kill the process if it takes too long
          const timeoutId = setTimeout(() => {
            if (!hasResponded) {
              console.error('[Publish Screen Plugin] Publish process timed out, killing...')
              child.kill('SIGTERM')
              // Give it a moment to terminate gracefully, then force kill
              setTimeout(() => {
                if (!child.killed) {
                  child.kill('SIGKILL')
                }
              }, 5000)
            }
          }, PUBLISH_TIMEOUT_MS)

          child.stdout.on('data', (data: Buffer) => {
            const text = data.toString()
            // Only buffer output up to max size to prevent OOM
            if (stdout.length < MAX_OUTPUT_SIZE) {
              stdout += text.slice(0, MAX_OUTPUT_SIZE - stdout.length)
            }
            // Always log to console for real-time feedback
            console.log(text)
          })

          child.stderr.on('data', (data: Buffer) => {
            const text = data.toString()
            // Only buffer output up to max size to prevent OOM
            if (stderr.length < MAX_OUTPUT_SIZE) {
              stderr += text.slice(0, MAX_OUTPUT_SIZE - stderr.length)
            }
            console.error(text)
          })

          child.on('close', (code: number | null, signal: string | null) => {
            clearTimeout(timeoutId)
            rateLimiter.release()

            if (hasResponded) return
            hasResponded = true

            if (signal === 'SIGTERM' || signal === 'SIGKILL') {
              res.statusCode = 500
              res.end(
                JSON.stringify({
                  success: false,
                  error: 'Publish process timed out or was killed',
                  output: stdout.slice(-10000), // Last 10KB of output
                  stderr: stderr.slice(-10000)
                })
              )
            } else if (code === 0) {
              res.statusCode = 200
              res.end(
                JSON.stringify({
                  success: true,
                  message: `Screen ${screenPath} published successfully`,
                  output: stdout.slice(-10000) // Last 10KB of output
                })
              )
            } else {
              res.statusCode = 500
              res.end(
                JSON.stringify({
                  success: false,
                  error: `Publish failed with exit code ${code}`,
                  output: stdout.slice(-10000),
                  stderr: stderr.slice(-10000)
                })
              )
            }
          })

          child.on('error', (err: Error) => {
            clearTimeout(timeoutId)
            rateLimiter.release()

            if (hasResponded) return
            hasResponded = true

            console.error('[Publish Screen Plugin] Failed to start publish process:', err)
            res.statusCode = 500
            res.end(
              JSON.stringify({
                success: false,
                error: `Failed to start publish process: ${err.message}`
              })
            )
          })
        } catch (err: any) {
          rateLimiter.release()
          console.error('[Publish Screen Plugin] Error:', err)
          res.statusCode = 500
          res.end(
            JSON.stringify({
              success: false,
              error: err.message
            })
          )
        }
      })
    }
  }

  // Create wrapped versions of all entries (only for non-development builds)
  const wrappedEntries: Record<string, string> = {}

  if (command !== 'serve' || Object.keys(dynamicEntries).length > 0) {
    Object.keys(dynamicEntries).forEach(entryKey => {
      // Create a virtual entry file that imports the original component, wraps it, and re-exports it
      const wrappedEntryPath = path.join(projectRootDir, `src/wrapped-entries/${entryKey}.ts`)
      // Ensure the directory exists
      const wrappedEntryDir = path.dirname(wrappedEntryPath)
      if (!fs.existsSync(wrappedEntryDir)) {
        fs.mkdirSync(wrappedEntryDir, { recursive: true })
      }

      // Generate the wrapper module content
      const originalEntryPath = dynamicEntries[entryKey]
      const relativeEntryPath = path.relative(path.dirname(wrappedEntryPath), originalEntryPath).replace(/\\/g, '/')

      // Check if this is a types, queries, hooks, tabs, components, utils, views, pages, or services entry (contains any of these keywords in the path)
      // These directories typically export multiple named exports but no single default export
      const isNamedExportsOnlyEntry =
        entryKey.includes('/types') ||
        entryKey.endsWith('/types') ||
        entryKey.includes('/queries') ||
        entryKey.endsWith('/queries') ||
        entryKey.includes('/hooks') ||
        entryKey.endsWith('/hooks') ||
        entryKey.includes('/tabs') ||
        entryKey.endsWith('/tabs') ||
        entryKey.includes('/components') ||
        entryKey.endsWith('/components') ||
        entryKey.includes('/utils') ||
        entryKey.endsWith('/utils') ||
        entryKey.includes('/views') ||
        entryKey.endsWith('/views') ||
        entryKey.includes('/pages') ||
        entryKey.endsWith('/pages') ||
        entryKey.includes('/services') ||
        entryKey.endsWith('/services')

      const isDebugViewEntry = entryKey === '.debug/apps/debug-view' || entryKey.includes('/.debug/apps/debug-view')
      let wrapperContent: string
      if (isNamedExportsOnlyEntry) {
        wrapperContent = `// Auto-generated wrapper file for types/queries/hooks/tabs/components/utils/views/pages/services - re-export all named exports
export * from '${relativeEntryPath.startsWith('.') ? relativeEntryPath : './' + relativeEntryPath}';
`
      } else if (isDebugViewEntry) {
        wrapperContent = `// Auto-generated wrapper file (no UiCatalogProvider for DebugView)
import OriginalComponent from '${relativeEntryPath.startsWith('.') ? relativeEntryPath : './' + relativeEntryPath}';

export default OriginalComponent;
`
      } else {
        wrapperContent = `// Auto-generated wrapper file
import { wrapWithUiCatalog } from '@/common/wrapWithUiCatalog';
import { wrapWithLocalizationProvider } from '@/common/wrapWithLocalizationProvider';
import { wrapWithBlinkProvider } from '@/common/wrapWithBlinkProvider';
import OriginalComponent from '${relativeEntryPath.startsWith('.') ? relativeEntryPath : './' + relativeEntryPath}';

// Re-export wrapped component
export default wrapWithUiCatalog(wrapWithLocalizationProvider(wrapWithBlinkProvider(OriginalComponent)));
`
      }

      // Write the wrapper file
      fs.writeFileSync(wrappedEntryPath, wrapperContent, 'utf8')

      // Replace the original entry with our wrapped version
      wrappedEntries[entryKey] = wrappedEntryPath
    })
  }

  console.log('[vite.config.ts] wrappedEntries:', wrappedEntries)

  return {
    optimizeDeps: {
      include: [
        'antd',
        'recharts',
        '@newwork/nw-design-system',
        'dayjs',
        'react-i18next',
        '@newwork/gravity-ui-catalog',
        '@phosphor-icons/react',
        'lucide-react',
        '@dnd-kit/core',
        '@dnd-kit/sortable',
        '@dnd-kit/utilities',
        'zustand',
        'react',
        'react-icons',
        'react-dom'
      ],
      // Optimize caching strategy
      esbuildOptions: {
        target: 'es2020'
      }
      // Let Vite automatically handle all other dependencies including React, antd, etc.
    },
    plugins: [
      react(),
      tailwindCSS(),
      // Virtual module plugin for the wrapped entries
      virtualModulePlugin,
      // Inline AudioWorklet plugin - compiles and embeds worklet as string
      inlineWorkletPlugin,
      prependBuildInfoBannerPlugin, // Use the updated banner plugin
      wrapInIIFEPlugin,
      // Publish screen endpoint for IDE (only in dev mode)
      ...(command === 'serve' ? [publishScreenPlugin] : []),
      ...(shouldHashFilesForDeployment ? [sha256ContentHashPlugin(shouldHashFilesForDeployment)] : []),
      ...extraPlugins
    ].filter(Boolean),

    define: {
      // This replaces process.env.NODE_ENV with the current mode in the build output
      'process.env.NODE_ENV': JSON.stringify(mode)
      // globalThis.__APP_BUILD_INFO__ is handled by the prependBannerPlugin, so no need to define it here.
    },
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@/components': resolve(__dirname, 'src/components'),
        '@/business-apps': resolve(__dirname, 'src/business-apps'),
        '@/assets': resolve(__dirname, 'src/assets'),
        '@/hooks': resolve(__dirname, 'src/hooks'),
        '@/modules': resolve(__dirname, 'src/modules'),
        '@/common': resolve(__dirname, 'src/common')
      }
    },
    build: {
      outDir: resolve(projectRootDir, 'dist'),
      // emptyOutDir behavior:
      // true for 'npm run build' (multi-screen, full clean)
      // false for 'npm run publish:screen' (single-screen, script handles specific sub-dir deletion)
      // false for batch builds to preserve outputs from previous batches
      emptyOutDir: isBuildCommand && !isSingleBuild && !isBatchBuild,
      lib: {
        entry: wrappedEntries, // Use the wrapped entries instead of the original ones
        name: 'GravityBusinessApps', // Name for UMD global, less critical for CJS
        formats: ['cjs'],
        cssFileName: 'main'
      },
      minify: isProduction ? 'esbuild' : false, // Ensure minification for production
      reportCompressedSize: isUnversionedBuild && isSingleBuild ? true : false,
      // Enable CSS processing
      css: {
        devSourcemap: true
      },
      cssCodeSplit: true,
      rollupOptions: {
        // For single screen builds, use the temporary index.css file created by publish-dev-screen.js
        // Otherwise, use the standard src/index.css file
        input: isSingleBuild
          ? {
              // Use TEMP_INDEX_CSS if provided, otherwise fallback to default index.css
              main:
                env.TEMP_INDEX_CSS && env.SINGLE_SCREEN_CSS === 'true'
                  ? env.TEMP_INDEX_CSS
                  : resolve(projectRootDir, 'src/index.css'),
              ...wrappedEntries
            }
          : {
              main: resolve(projectRootDir, 'src/index.css'),
              ...wrappedEntries
            },

        external: [
          'antd',
          '@ant-design/icons',
          '@dnd-kit/core',
          '@dnd-kit/utilities',
          '@dnd-kit/sortable',
          'zustand',
          'clsx',
          'tailwind-merge',
          'react-i18next',
          'react-icons',
          'react-icons/pi',
          '@phosphor-icons/react',
          '@newwork/gravity-ui-catalog',
          '@remixicon/react',
          'class-variance-authority',
          'lucide-react',
          'react',
          'react-dom',
          'react/jsx-runtime',
          'react-router-dom'
        ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
            antd: 'antd',
            '@ant-design/icons': 'antDesignIcons',
            'react-i18next': 'reactI18next',
            'react-icons': 'reactIcons',
            'react-icons/pi': 'reactIconsPi',
            clsx: 'clsx',
            'tailwind-merge': 'tailwindMerge',
            '@dnd-kit/core': 'DNDKitCore',
            '@dnd-kit/sortable': 'DNDKitSortable',
            '@dnd-kit/utilities': 'DNDKitUtilities',
            zustand: 'zustand',
            '@newwork/gravity-ui-catalog': 'GravityUICatalog',
            '@remixicon/react': 'remixIconReact',
            'class-variance-authority': 'classVarianceAuthority',
            'lucide-react': 'lucideReact',
            'react-router-dom': 'reactRouterDom'
          },
          // entryFileNames will now always output a predictable name;
          // the sha256ContentHashPlugin will handle renaming for deployment builds.
          entryFileNames: chunkInfo => {
            // Handle CSS entry point differently from component entries
            if (chunkInfo.name === 'main') {
              return 'main.js' // This won't actually be used since it's CSS
            }
            return `${chunkInfo.name}/index.js`
          },

          // For non-entry chunks and assets, use Vite's hashing only for deployment builds.
          chunkFileNames: shouldHashFilesForDeployment ? `_chunks/[name]-[hash].js` : `_chunks/[name].js`,
          assetFileNames: shouldHashFilesForDeployment ? `assets/[name]-[hash][extname]` : `assets/[name][extname]`,
          exports: 'named' // Address mixed export warnings
        }
      }
    },
    base: './'
  }
})
