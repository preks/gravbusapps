/**
 * Production screen publishing script
 * - Publishes only changed screens detected by detect-changed-screens.sh
 * - Uses Bitbucket build number as version
 * - Includes screen management registrations with build number versioning
 * - Executed on master merge
 */

import { execSync } from "child_process";
import path, { dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "@dotenvx/dotenvx";
import { BlobServiceClient } from "@azure/storage-blob";
import { glob } from "glob";
import axios from "axios";
import {
  OAuthClient,
  getResourceUrls,
  getResourceUrlByPath,
  addScreenConfigToScreenManagement,
  updateScreenConfigInScreenManagement,
  getScreenByKey,
  addFormAsLandingScreen,
  formatScreenNameFromPath,
  generateScreenKeyFromPath,
  getAllNativeScreens,
  convertScreenKeyToUrl,
  syncResourceUrlWithSameId,
  syncScreenFromDevToProd,
} from "./api-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_PROD;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN_PROD;
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME_PROD;
const BITBUCKET_BUILD_NUMBER = process.env.BITBUCKET_BUILD_NUMBER;
const SCREEN_MANAGEMENT_SERVICE_API_PROD = process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD;
const NAVIGATION_SERVICE_API_PROD = process.env.NAVIGATION_SERVICE_API_PROD;

// Use only the Bitbucket build number as the publish version
const PUBLISH_VERSION = BITBUCKET_BUILD_NUMBER;

console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`);
console.log(`🎯 Publish version: ${PUBLISH_VERSION}`);

// Production OAuth configuration
const OAUTH_CLIENT_ID_PROD = process.env.OAUTH_CLIENT_ID_PROD;
const OAUTH_CLIENT_SECRET_PROD = process.env.OAUTH_CLIENT_SECRET_PROD;
const OAUTH_URL_PROD = process.env.OAUTH_URL_PROD;
const OAUTH_REALM_PROD = process.env.OAUTH_REALM_PROD;

// Validate required environment variables
const requiredEnvVars = [
  { name: 'AZURE_STORAGE_ACCOUNT_PROD', value: AZURE_STORAGE_ACCOUNT_NAME },
  { name: 'AZURE_STORAGE_SAS_TOKEN_PROD', value: AZURE_STORAGE_SAS_TOKEN },
  { name: 'AZURE_BLOB_CONTAINER_NAME_PROD', value: AZURE_CONTAINER_NAME },
  { name: 'BITBUCKET_BUILD_NUMBER', value: BITBUCKET_BUILD_NUMBER },
  { name: 'SCREEN_MANAGEMENT_SERVICE_API_PROD', value: SCREEN_MANAGEMENT_SERVICE_API_PROD },
  { name: 'NAVIGATION_SERVICE_API_PROD', value: NAVIGATION_SERVICE_API_PROD },
  { name: 'OAUTH_CLIENT_ID', value: OAUTH_CLIENT_ID_PROD },
  { name: 'OAUTH_CLIENT_SECRET', value: OAUTH_CLIENT_SECRET_PROD }
];

const missingVars = requiredEnvVars.filter(envVar => !envVar.value);

if (missingVars.length > 0) {
  console.error("❌ Missing required environment variables:");
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar.name}`);
  });
  console.error("\nThis production script requires all environment variables to be set.");
  console.error("Please ensure your Bitbucket pipeline has the necessary environment variables configured.");
  process.exit(1);
}

// Helper function to detect if the screen is a form
function isFormScreen(screenPath) {
  return screenPath.includes("/forms/");
}

// Helper function to convert camelCase to natural language with spaces
function camelCaseToNaturalLanguageWithWhiteSpaces(camelCase) {
  if (!camelCase) return "";

  // Replace camelCase with spaces and capitalize first letter
  const withSpaces = camelCase.replace(/([A-Z])/g, " $1").trim();
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

// Helper function to search for resource URLs with progressive search strategy
async function searchResourceUrlInDev(urlOrPath, devOauthConfig) {
  const devNavigationApi = process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API;
  
  // Normalize the input - handle both full URLs and component paths
  let searchPath = urlOrPath;
  if (urlOrPath.startsWith('/platform/')) {
    searchPath = urlOrPath.replace(/^\/platform\//, '');
  }
  
  // Strategy 1: Search with full URL (if it's a platform URL)
  if (urlOrPath.startsWith('/platform/')) {
    console.log(`   Strategy 1: Searching with full platform URL: ${urlOrPath}`);
    try {
      const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
        search: urlOrPath,
        sort: '-updatedAt'
      });
      if (resourceUrls.length > 0) {
        const foundResource = resourceUrls[0]; // Take the first (most recently updated) result
        console.log(`   ✅ Found with full URL: ${foundResource.url}`);
        return foundResource;
      }
    } catch (error) {
      console.log(`   Strategy 1 failed: ${error.message}`);
    }
  }
  
  // Strategy 2: Search with component path (without /platform/)
  console.log(`   Strategy 2: Searching with component path: ${searchPath}`);
  try {
    const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
      search: searchPath,
      sort: '-updatedAt'
    });
    if (resourceUrls.length > 0) {
      const foundResource = resourceUrls[0]; // Take the first (most recently updated) result
      console.log(`   ✅ Found with component path: ${foundResource.url}`);
      return foundResource;
    }
  } catch (error) {
    console.log(`   Strategy 2 failed: ${error.message}`);
  }
  
  // Strategy 3: Search without "apps" or "forms" terms
  const pathWithoutAppsOrForms = searchPath
    .replace(/\/apps\//g, '/')
    .replace(/^apps\//, '')
    .replace(/\/forms\//g, '/')
    .replace(/^forms\//, '');
  if (pathWithoutAppsOrForms !== searchPath) {
    console.log(`   Strategy 3: Searching without 'apps'/'forms' terms: ${pathWithoutAppsOrForms}`);
    try {
      const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
        search: pathWithoutAppsOrForms,
        sort: '-updatedAt'
      });
      if (resourceUrls.length > 0) {
        const foundResource = resourceUrls[0]; // Take the first (most recently updated) result
        console.log(`   ✅ Found without 'apps'/'forms': ${foundResource.url}`);
        return foundResource;
      }
    } catch (error) {
      console.log(`   Strategy 3 failed: ${error.message}`);
    }
  }
  
  // Strategy 4: Search with only component name (last segment)
  const pathSegments = searchPath.split('/');
  const componentName = pathSegments[pathSegments.length - 1];
  console.log(`   Strategy 4: Searching with component name only: ${componentName}`);
  try {
    const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
      search: componentName,
      sort: '-updatedAt'
    });
    if (resourceUrls.length > 0) {
      const foundResource = resourceUrls[0]; // Take the first (most recently updated) result
      console.log(`   ✅ Found with component name: ${foundResource.url}`);
      return foundResource;
    }
  } catch (error) {
    console.log(`   Strategy 4 failed: ${error.message}`);
  }
  
  console.log("   ❌ No resource URL found with any search strategy");
  return null;
}

// Helper function to generate screen key from URL
function generateScreenKeyFromUrl(url) {
  // Remove /platform or platform prefix and replace / with ~
  let cleanUrl = url.replace(/^\/platform\//, '').replace(/^platform\//, '');
  return `url_${cleanUrl.replace(/\//g, '~')}`;
}

// Helper function to synchronize resource URLs from dev to prod
async function handleResourceUrlSynchronization(screenPath, azureDestinationPath) {
  console.log("🔗 Checking resource URL synchronization from dev to prod...");
  
  // Create OAuth configurations
  const devOauthConfig = {};  // Use dev environment variables (default)
  const prodOauthConfig = {
    clientId: OAUTH_CLIENT_ID_PROD,
    clientSecret: OAUTH_CLIENT_SECRET_PROD,
    oauthUrl: OAUTH_URL_PROD,
    realm: OAUTH_REALM_PROD
  };
  
  try {
    // Search for resource URL in dev using progressive strategy
    const devResourceUrl = await searchResourceUrlInDev(azureDestinationPath, devOauthConfig);
    
    if (!devResourceUrl) {
      console.log("   No resource URL found in dev with any strategy, skipping synchronization");
      return { success: true, operation: 'skip', resourceUrl: null };
    }
    
    console.log(`   Found resource URL in dev: ${devResourceUrl.url} (code: ${devResourceUrl.code})`);
    
    // Check if the same resource URL already exists in prod
    console.log("   Checking if resource URL already exists in prod...");
    const prodResourceUrl = await getResourceUrlByPath(
      devResourceUrl.url,
      NAVIGATION_SERVICE_API_PROD,
      prodOauthConfig
    );
    
    if (prodResourceUrl) {
      console.log(`   ✅ Resource URL already exists in prod (ID: ${prodResourceUrl.id || 'unknown'})`);
      console.log("   ⏩ Skipping resource URL registration - proceeding to screen config");
      return { success: true, operation: 'exists', resourceUrl: devResourceUrl };
    }
    
    // Resource URL doesn't exist in prod, proceed with registration
    console.log("   Resource URL not found in prod, proceeding with registration...");
    
    try {
      const prodNavigationApi = NAVIGATION_SERVICE_API_PROD;
      const oauthClient = new OAuthClient(prodOauthConfig);
      const accessToken = await oauthClient.getAccessToken();
      
      const payload = {
        code: devResourceUrl.code,
        name: devResourceUrl.name,
        url: devResourceUrl.url,
        roles: devResourceUrl.roles || [],
        features: devResourceUrl.features || [],
        name_i18n: devResourceUrl.name_i18n || {},
        description_i18n: devResourceUrl.description_i18n || {},
        isSearchable: devResourceUrl.isSearchable || false,
      };
      
      console.log(`   Registering resource URL: ${devResourceUrl.url}`);
      await axios.post(
        `${prodNavigationApi}/resource-url`,
        payload,
        {
          headers: {
            accept: "application/json",
            authorization: `Bearer ${accessToken}`,
            "content-type": "application/json",
          },
        }
      );
      
      console.log(`   ✅ Resource URL successfully registered in prod: ${devResourceUrl.url}`);
      return { success: true, operation: 'created', resourceUrl: devResourceUrl };
      
    } catch (error) {
      console.error(`   ❌ Failed to register resource URL in prod: ${error.message}`);
      // Even if resource URL registration fails, continue with screen config
      console.log("   ⚠️  Continuing with screen config despite resource URL registration failure");
      return { success: false, operation: 'error', error: error.message, resourceUrl: devResourceUrl };
    }
    
  } catch (error) {
    console.error("❌ Error during resource URL synchronization:", error.message);
    return { success: false, operation: 'error', error: error.message, resourceUrl: null };
  }
}

// Helper function to read resource URL from dev only (no sync to prod)
async function handleResourceUrlSynchronizationReadOnly(screenPath, azureDestinationPath) {
  console.log("🔍 Reading resource URL from dev (no synchronization to prod)...");
  
  // Create OAuth configuration for dev only
  const devOauthConfig = {};  // Use dev environment variables (default)
  
  try {
    // Search for resource URL in dev using progressive strategy
    const devResourceUrl = await searchResourceUrlInDev(azureDestinationPath, devOauthConfig);
    
    if (!devResourceUrl) {
      console.log("   No resource URL found in dev with any strategy");
      return { success: true, operation: 'skip_read_only', resourceUrl: null };
    }
    
    console.log(`   ✅ Found resource URL in dev: ${devResourceUrl.url} (code: ${devResourceUrl.code})`);
    console.log("   📋 Resource URL info will be used for correct screen key generation");
    
    return { success: true, operation: 'read_only', resourceUrl: devResourceUrl };
    
  } catch (error) {
    console.error("❌ Error during resource URL read from dev:", error.message);
    return { success: false, operation: 'error', error: error.message, resourceUrl: null };
  }
}

// Helper function to handle screen management registration for production
async function handleScreenManagement(screenPath, azureDestinationPath, resourceUrlInfo = null) {
  console.log("📋 Registering screen in Screen Management system...");
  
  // Create OAuth configuration for production
  const oauthConfig = {
    clientId: OAUTH_CLIENT_ID_PROD,
    clientSecret: OAUTH_CLIENT_SECRET_PROD,
    oauthUrl: OAUTH_URL_PROD,
    realm: OAUTH_REALM_PROD
  };
  
  try {
    if (isFormScreen(screenPath)) {
      // Handle form screens with resource URL info
      console.log("   Detected form - registering as production form screen");
      
      // Extract process name from path for forms
      const pathParts = screenPath.split("/");
      const formName = pathParts[pathParts.length - 1]; // Get the form name
      const processName = formName.replace(/-form$/, ""); // Remove "-form" suffix if present
      
      // Generate screen name and key
      let screenName, screenKey;
      
      if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
        // Use resource URL info if available
        screenName = resourceUrlInfo.resourceUrl.name;
        screenKey = generateScreenKeyFromUrl(resourceUrlInfo.resourceUrl.url);
        console.log(`   Using resource URL info for form - Name: ${screenName}, Key: ${screenKey}`);
      } else {
        // Fallback to form-specific generation
        screenName = camelCaseToNaturalLanguageWithWhiteSpaces(processName);
        screenKey = `frm_${processName}`;
        console.log(`   Using form-based generation - Name: ${screenName}, Key: ${screenKey}`);
      }
      
      // First, check if the form already exists
      console.log(`🔍 Checking if form exists with key: ${screenKey}`);
      try {
        const existingForm = await getScreenByKey(screenKey, SCREEN_MANAGEMENT_SERVICE_API_PROD, oauthConfig);
        
        if (existingForm && existingForm.id) {
          // Form exists, update it
          console.log(`📝 Form exists with ID: ${existingForm.id}, updating version to ${PUBLISH_VERSION}`);
          
          const updateData = {
            screenKey: screenKey,
            name: screenName,
            type: "SCREEN",
            screenComponents: {
              key: screenKey,
              name: screenName,
              builderType: "NATIVE_SCREEN",
              formDefinition: {
                componentPath: `/${azureDestinationPath}`,
                version: PUBLISH_VERSION,
              },
              release: "true",
            },
          };
          
          const updateSuccess = await updateScreenConfigInScreenManagement(existingForm.id, updateData, SCREEN_MANAGEMENT_SERVICE_API_PROD, oauthConfig);
          if (updateSuccess) {
            console.log(`✅ Form version updated to ${PUBLISH_VERSION}`);
            return { success: true, operation: 'update' };
          } else {
            console.error(`❌ Form version update failed`);
            return { success: false, operation: 'update', error: 'Form version update failed' };
          }
        } else {
          // Form doesn't exist, create it
          console.log(`🆕 Form doesn't exist, creating new form with key: ${screenKey}`);
          
          if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
            // Create form using screen management API directly when we have resource URL info
            // Use the resource URL path without /platform/ prefix as customUrlPath
            const customUrlPath = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '');
            const result = await addScreenConfigToScreenManagement(
              azureDestinationPath,
              customUrlPath,
              PUBLISH_VERSION,
              SCREEN_MANAGEMENT_SERVICE_API_PROD,
              oauthConfig
            );
            
            if (result.success) {
              console.log(`✅ Form screen created successfully with ID: ${result.id}`);
              return { success: true, operation: 'add' };
            } else {
              console.error(`❌ Form screen creation failed`);
              return { success: false, operation: 'add', error: 'Form screen creation failed' };
            }
          } else {
            // Use traditional form creation method when no resource URL info
            const result = await addFormAsLandingScreen(processName, azureDestinationPath, PUBLISH_VERSION, SCREEN_MANAGEMENT_SERVICE_API_PROD, oauthConfig);
            if (result.success) {
              console.log(`✅ Form screen created successfully with ID: ${result.id}`);
              return { success: true, operation: 'add' };
            } else {
              console.error(`❌ Form screen creation failed`);
              return { success: false, operation: 'add', error: 'Form screen creation failed' };
            }
          }
        }
      } catch (error) {
        console.log(`⚠️  Error checking existing form: ${error.message}, attempting to create new form`);
        
        // If lookup fails, try to create the form
        if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
          // Create form using screen management API directly when we have resource URL info
          // Use the resource URL path without /platform/ prefix as customUrlPath
          const customUrlPath = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '');
          const result = await addScreenConfigToScreenManagement(
            azureDestinationPath,
            customUrlPath,
            PUBLISH_VERSION,
            SCREEN_MANAGEMENT_SERVICE_API_PROD,
            oauthConfig
          );
          
          if (result.success) {
            console.log(`✅ Form screen created successfully with ID: ${result.id}`);
            return { success: true, operation: 'add' };
          } else {
            console.error(`❌ Form screen creation failed`);
            return { success: false, operation: 'add', error: 'Form screen creation failed' };
          }
        } else {
          // Use traditional form creation method when no resource URL info
          const result = await addFormAsLandingScreen(processName, azureDestinationPath, PUBLISH_VERSION, SCREEN_MANAGEMENT_SERVICE_API_PROD, oauthConfig);
          if (result.success) {
            console.log(`✅ Form screen created successfully with ID: ${result.id}`);
            return { success: true, operation: 'add' };
          } else {
            console.error(`❌ Form screen creation failed`);
            return { success: false, operation: 'add', error: 'Form screen creation failed' };
          }
        }
      }
    } else {
      // For regular screens, register with build number as version
      console.log("   Detected app screen - registering as production app screen");
      
      // Generate screen name and key
      let screenName, screenKey;
      
      if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
        // Use resource URL info if available
        screenName = resourceUrlInfo.resourceUrl.name;
        screenKey = generateScreenKeyFromUrl(resourceUrlInfo.resourceUrl.url);
        console.log(`   Using resource URL info - Name: ${screenName}, Key: ${screenKey}`);
      } else {
        // Fallback to path-based generation
        const customUrlPath = `apps/${azureDestinationPath}`;
        screenName = formatScreenNameFromPath(customUrlPath);
        screenKey = generateScreenKeyFromPath(customUrlPath);
        console.log(`   Using path-based generation - Name: ${screenName}, Key: ${screenKey}`);
      }
      
      // First, check if the screen already exists
      console.log(`🔍 Checking if screen exists with key: ${screenKey}`);
      try {
        const existingScreen = await getScreenByKey(screenKey, SCREEN_MANAGEMENT_SERVICE_API_PROD, oauthConfig);
        
        if (existingScreen && existingScreen.id) {
          // Screen exists, update it
          console.log(`📝 Screen exists with ID: ${existingScreen.id}, updating version to ${PUBLISH_VERSION}`);
          
          const updateData = {
              screenKey: screenKey,
              name: screenName,
              type: "SCREEN",
              screenComponents: {
                  key: screenKey,
                  name: screenName,
                  builderType: "NATIVE_SCREEN",
                  formDefinition: {
                  componentPath: `/${azureDestinationPath}`,
                  version: PUBLISH_VERSION,
                  },
                  release: "true",
              },
          };
          
          const updateSuccess = await updateScreenConfigInScreenManagement(existingScreen.id, updateData, SCREEN_MANAGEMENT_SERVICE_API_PROD, oauthConfig);
          if (updateSuccess) {
              console.log(`✅ Screen version updated to ${PUBLISH_VERSION}`);
              return { success: true, operation: 'update' };
          } else {
              console.error(`❌ Screen version update failed`);
              return { success: false, operation: 'update', error: 'Screen version update failed' };
          }
        } else {
          // Screen doesn't exist, create it
          console.log(`🆕 Screen doesn't exist, creating new screen with key: ${screenKey}`);
          
          // Generate custom URL path for screen creation
          let customUrlPathForCreation;
          if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
            // Use resource URL path without /platform/ prefix
            customUrlPathForCreation = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '');
          } else {
            // Use traditional apps path
            customUrlPathForCreation = `apps/${azureDestinationPath}`;
          }
          
          const result = await addScreenConfigToScreenManagement(
            azureDestinationPath, 
            customUrlPathForCreation,
            PUBLISH_VERSION,
            SCREEN_MANAGEMENT_SERVICE_API_PROD,
            oauthConfig
          );
          
          if (result.success) {
            console.log(`✅ Screen created successfully with ID: ${result.id}`);
            return { success: true, operation: 'add' };
          } else {
            console.error(`❌ Screen creation failed`);
            return { success: false, operation: 'add', error: 'Screen creation failed' };
          }
        }
      } catch (error) {
        console.log(`⚠️  Error checking existing screen: ${error.message}, attempting to create new screen`);
        
        // If lookup fails, try to create the screen
        // Generate custom URL path for screen creation
        let customUrlPathForCreation;
        if (resourceUrlInfo && resourceUrlInfo.resourceUrl) {
          // Use resource URL path without /platform/ prefix
          customUrlPathForCreation = resourceUrlInfo.resourceUrl.url.replace(/^\/platform\//, '');
        } else {
          // Use traditional apps path
          customUrlPathForCreation = `apps/${azureDestinationPath}`;
        }
        
        const result = await addScreenConfigToScreenManagement(
          azureDestinationPath, 
          customUrlPathForCreation,
          PUBLISH_VERSION,
          SCREEN_MANAGEMENT_SERVICE_API_PROD,
          oauthConfig
        );
        
        if (result.success) {
          console.log(`✅ Screen created successfully with ID: ${result.id}`);
          return { success: true, operation: 'add' };
        } else {
          console.error(`❌ Screen creation failed`);
          return { success: false, operation: 'add', error: 'Screen creation failed' };
        }
      }
    }
  } catch (error) {
    console.error("❌ Error during screen management registration:", error.message);
    return { success: false, operation: 'error', error: error.message };
  }
}

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case ".js":
      return "application/javascript";
    case ".css":
      return "text/css";
    case ".html":
      return "text/html";
    case ".json":
      return "application/json";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".gif":
      return "image/gif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "application/octet-stream";
  }
}

async function uploadDirectory(buildOutputDir, azureDestinationPath) {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
    console.error(
      "Error: AZURE_STORAGE_ACCOUNT_PROD and AZURE_STORAGE_SAS_TOKEN_PROD must be set in .env for production upload."
    );
    process.exit(1);
  }

  const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${AZURE_STORAGE_SAS_TOKEN}`;
  const blobServiceClient = new BlobServiceClient(blobServiceUrl);
  const containerClient =
    blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

  console.log(
    `☁️  Uploading to Azure Storage account: ${AZURE_STORAGE_ACCOUNT_NAME}, container: ${AZURE_CONTAINER_NAME}`
  );
  console.log(`   Source: ${buildOutputDir}`);
  console.log(`   Destination base path: ${azureDestinationPath}`);

  const filesToUpload = await glob("**/*", {
    cwd: buildOutputDir,
    nodir: true,
  });

  if (filesToUpload.length === 0) {
    console.log("No files found in build output directory to upload.");
    return;
  }

  for (const file of filesToUpload) {
    const localFilePath = path.join(buildOutputDir, file);
    const blobName = path.join(azureDestinationPath, file).replace(/\\/g, "/");
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const contentType = getContentType(file);

    try {
      console.log(
        `   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`
      );
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message);
    }
  }
  console.log("✅ All files uploaded successfully.");
}

async function publishScreen(screenPath, options = {}) {
  console.log(`🚀 Publishing screen: ${screenPath} (Version: ${PUBLISH_VERSION})`);

  const projectRootDir = path.resolve(__dirname, "..");
  console.log(`   Project Root Dir: ${projectRootDir}`);

  // Use the full screenPath for paths to maintain the directory structure
  const sourceEntryFile = path.join(
    "src",
    "business-apps",
    screenPath,
    "index.ts"
  );
  const viteEntryKey = screenPath;
  const buildOutputDir = path.join(projectRootDir, "dist", screenPath);
  const azureDestinationPath = screenPath.replace(/\\/g, "/");

  console.log(`   Source Entry File: ${sourceEntryFile}`);
  console.log(`   Vite Entry Key: ${viteEntryKey}`);
  console.log(`   Build Output Dir: ${buildOutputDir}`);
  console.log(
    `   Azure Destination: ${AZURE_CONTAINER_NAME}/${azureDestinationPath}`
  );

  console.log("\n⚙️  Building screen with Vite...");

  if (fs.existsSync(buildOutputDir)) {
    console.log(`🗑️  Deleting existing output directory: ${buildOutputDir}`);
    fs.rmSync(buildOutputDir, { recursive: true, force: true });
    console.log("✅ Directory deleted successfully.");
  } else {
    console.log(
      `ℹ️  Output directory ${buildOutputDir} does not exist, no need to delete.`
    );
  }

  // Create a temporary directory for build files
  const tempDir = path.join(projectRootDir, "temp_build");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const screenPathParts = screenPath.split("/");
  const product = screenPathParts[0];

  console.log("📝 Creating screen-specific Tailwind config...");
  const originalTailwindConfigPath = path.join(
    projectRootDir,
    "tailwind.config.js"
  );
  const tempTailwindConfigPath = path.join(tempDir, "tailwind.config.js");
  const originalIndexCssPath = path.join(projectRootDir, "src", "index.css");
  const tempIndexCssPath = path.join(tempDir, "index.css");

  const tailwindConfigContent = fs.readFileSync(
    originalTailwindConfigPath,
    "utf8"
  );

  // Generate a modified tailwind config with scoped content paths using relative paths
  const modifiedTailwindConfig = tailwindConfigContent.replace(
    /content:\s*\[(.*?)\]/s,
    `content: [
    // Only include the target screen files
    "../src/business-apps/${screenPath}/**/*.{js,ts,jsx,tsx}",
    // Include shared components that might be used by the screen
    "../src/common/**/*.{js,ts,jsx,tsx}",
    "../src/components/**/*.{js,ts,jsx,tsx}",
    // Include business-apps common components
    "../src/business-apps/${product}/**/*.{js,ts,jsx,tsx}"
  ]`
  );

  fs.writeFileSync(tempTailwindConfigPath, modifiedTailwindConfig, "utf8");
  console.log(`   Created: ${tempTailwindConfigPath}`);

  // Create a modified index.css that references the temporary tailwind config
  console.log("📝 Creating screen-specific index.css...");

  const indexCssContent = fs.readFileSync(originalIndexCssPath, "utf8");
  const modifiedIndexCss = indexCssContent
    // Update Tailwind config reference
    .replace(
      /@config\s+"\.\.\/tailwind\.config\.js";/g,
      `@config "./tailwind.config.js";
/* Temp config for screen-specific build */`
    )
    // Process each line
    .split("\n")
    .filter((line) => {
      // Remove @newwork/gravity-ui-catalog import as it will already be loaded in the browser
      if (line.includes('@import "@newwork/gravity-ui-catalog')) {
        return false;
      }
      // Keep all lines except specific CSS imports not relevant to this screen
      if (line.includes('@import "./business-apps/')) {
        // Only keep imports related to this screen's product
        return line.includes(`/business-apps/${product}/`);
      }
      return true;
    })
    // Fix relative import paths by adding ../src prefix
    .map((line) => {
      // Fix business-apps imports
      if (line.includes('@import "./business-apps/')) {
        return line.replace(
          '@import "./business-apps/',
          '@import "../src/business-apps/'
        );
      }
      // Fix common imports
      else if (line.includes('@import "./common/')) {
        return line.replace('@import "./common/', '@import "../src/common/');
      }
      // Fix any other relative imports from src
      else if (
        line.includes('@import "./') &&
        !line.includes('@import "./tailwind.config.js"')
      ) {
        return line.replace('@import "./', '@import "../src/');
      }
      return line;
    })
    .join("\n");

  fs.writeFileSync(tempIndexCssPath, modifiedIndexCss, "utf8");
  console.log(`   Created: ${tempIndexCssPath}`);

  // Build environment with production-specific variables
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER:
      process.env.VITE_GIT_USER ||
      execSync("git config user.name").toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    VITE_BUILD_VERSION: PUBLISH_VERSION,
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, "/"),
    SINGLE_SCREEN_CSS: "true",
    NODE_ENV: "production",
    // Add build number to filename
    VITE_BUILD_NUMBER: BITBUCKET_BUILD_NUMBER,
  };

  const viteBuildCommand = `npx vite build`;

  console.log(`   Executing: ${viteBuildCommand} with production environment`);
  console.log(`   Publish version: ${PUBLISH_VERSION}`);
  console.log(`   Build number: ${BITBUCKET_BUILD_NUMBER}`);
  
  try {
    execSync(viteBuildCommand, {
      stdio: "inherit",
      cwd: projectRootDir,
      env: buildEnv,
    });
    console.log("✅ Screen built successfully.");

    // Clean up temporary directory
    console.log("🧹 Cleaning up temporary build files...");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  } catch (error) {
    console.error("❌ Build failed:", error.message);
    throw error;
  }

  await renameFilesWithBuildNumber(buildOutputDir, PUBLISH_VERSION);
  await uploadDirectory(buildOutputDir, azureDestinationPath);
  console.log("✅ Screen JS published successfully to Azure!");

  // Handle CSS files - check both screen directory and global assets directory
  console.log("🎨 Handling CSS files...");
  
  // Check for CSS in screen directory first
  console.log(`   Checking screen directory: ${buildOutputDir}`);
  const screenCssFiles = await glob("**/*.css", {
    cwd: buildOutputDir,
    nodir: true,
  });
  console.log(`   Found ${screenCssFiles.length} CSS file(s) in screen directory`);
  
  // Check for CSS in global assets directory
  const globalAssetsDir = path.join(projectRootDir, "dist", "assets");
  let globalCssFiles = [];
  if (fs.existsSync(globalAssetsDir)) {
    globalCssFiles = await glob("**/*.css", {
      cwd: globalAssetsDir,
      nodir: true,
    });
    console.log(`   Checking global assets directory: ${globalAssetsDir}`);
    console.log(`   Found ${globalCssFiles.length} CSS file(s) in global assets directory`);
  } else {
    console.log(`   Global assets directory does not exist: ${globalAssetsDir}`);
  }
  
  // Handle screen-specific CSS
  if (screenCssFiles.length > 0) {
    console.log(`   Found ${screenCssFiles.length} CSS file(s) in screen directory:`);
    screenCssFiles.forEach(file => console.log(`     - ${file}`));
    
    await renameCssFilesInDirectory(buildOutputDir, PUBLISH_VERSION);
    console.log("✅ Screen-specific CSS processed!");
  }
  
  // Handle global CSS (main.css) by moving it to screen directory
  if (globalCssFiles.length > 0) {
    console.log(`   Found ${globalCssFiles.length} global CSS file(s):`);
    globalCssFiles.forEach(file => console.log(`     - ${file}`));
    
    // Copy global CSS to screen directory and rename with publish version
    for (const file of globalCssFiles) {
      const globalCssPath = path.join(globalAssetsDir, file);
      const parsedPath = path.parse(file);
      const newName = `${parsedPath.name}-${PUBLISH_VERSION}${parsedPath.ext}`;
      const targetPath = path.join(buildOutputDir, newName);
      
      console.log(`   Moving and renaming: ${file} → ${newName}`);
      fs.copyFileSync(globalCssPath, targetPath);
    }
    
    // Upload the CSS files
    await uploadDirectory(buildOutputDir, azureDestinationPath);
    console.log("✅ Global CSS moved to screen directory and uploaded!");
  }
  
  if (screenCssFiles.length === 0 && globalCssFiles.length === 0) {
    console.log("   No CSS files found");
  }
  
  // Handle both forms and regular screens with resource URL synchronization
  
  // Check if resource URL sync should be skipped
  const skipResourceUrlSync = options.skipResourceUrlSync || process.env.SKIP_RESOURCE_URL_SYNC === 'true';
  const skipScreenRegistration = options.skipScreenRegistration || false;
  
  let resourceUrlResult;
  
  if (!skipResourceUrlSync) {
    console.log(`🔗 Step 3: Handling resource URL synchronization...`);
    resourceUrlResult = await handleResourceUrlSynchronization(screenPath, azureDestinationPath);
  } else {
    console.log(`🔗 Step 3: Skipping resource URL synchronization (handled by comprehensive sync)`);
    resourceUrlResult = { success: true, operation: 'skip_comprehensive_sync', resourceUrl: null };
  }

  if (!resourceUrlResult.success) {
    throw new Error(`Resource URL synchronization failed: ${resourceUrlResult.error}`);
  }

  console.log(`📱 Step 4: Registering screen in Screen Management...`);
  
  if (!skipScreenRegistration) {
    const registrationResult = await handleScreenManagement(screenPath, azureDestinationPath, resourceUrlResult);
    
    if (!registrationResult.success) {
      throw new Error(`Screen Management registration failed: ${registrationResult.error}`);
    }
  } else {
    console.log(`📱 Skipping screen registration (handled by comprehensive sync)`);
  }

  return {
    success: true,
    outputPath: buildOutputDir,
    azureUrl: `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${AZURE_CONTAINER_NAME}/${azureDestinationPath}/index.js`
  };
}

async function renameFilesWithBuildNumber(buildOutputDir, version) {
  console.log(`🔄 Renaming JS files with version: ${version}`);
  const files = await glob("**/*", {
    cwd: buildOutputDir,
    nodir: true,
  });

  for (const file of files) {
    const filePath = path.join(buildOutputDir, file);
    const parsedPath = path.parse(filePath);
    
    // Rename index.js to index-{version}.js
    if (parsedPath.name === 'index' && parsedPath.ext === '.js') {
      const newName = `index-${version}${parsedPath.ext}`;
      const newPath = path.join(parsedPath.dir, newName);
      
      console.log(`   Renaming: ${file} → ${path.relative(buildOutputDir, newPath)}`);
      fs.renameSync(filePath, newPath);
    }
  }
}

async function renameCssFilesInDirectory(targetDir, version) {
  console.log(`🎨 Renaming CSS files in directory with version: ${version}`);
  const files = await glob("**/*.css", {
    cwd: targetDir,
    nodir: true,
  });

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const parsedPath = path.parse(filePath);
    
    // Rename any CSS file (main.css or others) to include version
    const newName = `${parsedPath.name}-${version}${parsedPath.ext}`;
    const newPath = path.join(parsedPath.dir, newName);
    
    console.log(`   Renaming CSS: ${file} → ${path.relative(targetDir, newPath)}`);
    fs.renameSync(filePath, newPath);
  }
}

// Helper function to handle comprehensive screen and resource URL synchronization
async function handleComprehensiveScreenSync(changedScreens) {
  console.log("🔄 Starting comprehensive screen synchronization from dev to prod...");
  console.log(`📋 Changed screens to process: ${changedScreens.length}`);
  
  // Create OAuth configurations
  const devOauthConfig = {};  // Use dev environment variables (default)
  const prodOauthConfig = {
    clientId: OAUTH_CLIENT_ID_PROD,
    clientSecret: OAUTH_CLIENT_SECRET_PROD,
    oauthUrl: OAUTH_URL_PROD,
    realm: OAUTH_REALM_PROD
  };

  try {
    // Step 1: Get all NATIVE_SCREEN screens from dev environment (done once for efficiency)
    console.log("\n📥 Step 1: Fetching all NATIVE_SCREEN screens from dev environment...");
    const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, devOauthConfig);
    
    if (devScreens.length === 0) {
      console.log("   No NATIVE_SCREEN screens found in dev environment");
      return { success: true, processedScreens: 0, syncedResources: 0, syncedScreens: 0 };
    }

    // Step 2: Filter screens that match changed screen paths and separate forms from apps
    console.log("\n🔍 Step 2: Filtering and categorizing matching screens...");
    const matchingScreens = devScreens.filter(screen => {
      if (!screen.screenComponents || !screen.screenComponents.formDefinition || !screen.screenComponents.formDefinition.componentPath) {
        return false;
      }
      
      // Remove leading slash and normalize path
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '');
      
      // Check if this component path is in our changed screens list
      const isMatching = changedScreens.some(changedScreen => {
        return componentPath === changedScreen || componentPath.endsWith(`/${changedScreen}`);
      });
      
      if (isMatching) {
        console.log(`   ✅ Match found: ${screen.screenKey} -> ${componentPath}`);
      }
      
      return isMatching;
    });

    // Separate form screens from app screens
    const formScreens = matchingScreens.filter(screen => {
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '');
      return isFormScreen(componentPath);
    });
    
    const appScreens = matchingScreens.filter(screen => {
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '');
      return !isFormScreen(componentPath);
    });

    console.log(`   Found ${matchingScreens.length} total matching screens:`);
    console.log(`   📝 Form screens: ${formScreens.length}`);
    console.log(`   📱 App screens: ${appScreens.length}`);
    
    if (matchingScreens.length === 0) {
      console.log("   No screens match the changed component paths");
      return { success: true, processedScreens: 0, syncedResources: 0, syncedScreens: 0 };
    }

    let syncedResources = 0;
    let syncedScreens = 0;
    let failedSyncScreens = [];

    // Step 3: Process Form Screens (NO resource URL sync, preserve exact screenKey)
    if (formScreens.length > 0) {
      console.log(`\n📝 Step 3a: Processing ${formScreens.length} form screens (no resource URL sync)...`);
      
      for (const screen of formScreens) {
        console.log(`\n   📌 Processing form screen: ${screen.screenKey}`);
        console.log(`   ℹ️  Form screens skip resource URL sync and preserve exact screenKey from dev`);
        
        // Sync screen to prod with preserved screenKey
        const screenSyncResult = await syncScreenFromDevToProd(
          screen,
          SCREEN_MANAGEMENT_SERVICE_API_PROD,
          prodOauthConfig,
          PUBLISH_VERSION
        );
        
        if (screenSyncResult.success) {
          syncedScreens++;
          console.log(`   ✅ Form screen sync: ${screenSyncResult.operation} (screenKey: ${screen.screenKey})`);
        } else {
          console.log(`   ❌ Form screen sync failed: ${screenSyncResult.error}`);
          failedSyncScreens.push({ 
            screen: screen.screenComponents?.formDefinition?.componentPath?.replace(/^\//, '') || screen.screenKey, 
            error: screenSyncResult.error, 
            stage: 'comprehensive_sync_form' 
          });
        }
      }
    }

    // Step 4: Process App Screens (WITH resource URL sync and URL conversion)
    if (appScreens.length > 0) {
      console.log(`\n📱 Step 3b: Processing ${appScreens.length} app screens (with resource URL sync)...`);
      
      for (const screen of appScreens) {
        console.log(`\n   📌 Processing app screen: ${screen.screenKey}`);
        
        // Convert screen key to URL
        const platformUrl = convertScreenKeyToUrl(screen.screenKey);
        
        if (platformUrl) {
          console.log(`   🔗 Generated URL: ${platformUrl}`);
          
          // Search for resource URL in dev using full platform URL
          const devResourceUrl = await searchResourceUrlInDev(platformUrl, devOauthConfig);
          
          if (devResourceUrl) {
            console.log(`   📍 Found resource URL in dev: ${devResourceUrl.url}`);
            
            // Sync resource URL to prod with same ID
            const resourceSyncResult = await syncResourceUrlWithSameId(
              devResourceUrl, 
              NAVIGATION_SERVICE_API_PROD, 
              prodOauthConfig
            );
            
            if (resourceSyncResult.success) {
              if (resourceSyncResult.operation === 'created') {
                syncedResources++;
              }
              console.log(`   ✅ Resource URL sync: ${resourceSyncResult.operation}`);
            } else {
              console.log(`   ⚠️  Resource URL sync failed: ${resourceSyncResult.error}`);
            }
          } else {
            console.log(`   ℹ️  No resource URL found in dev for: ${platformUrl}`);
          }
        } else {
          console.log(`   ⚠️  Could not convert screen key to URL: ${screen.screenKey}`);
        }
        
        // Sync screen to prod
        const screenSyncResult = await syncScreenFromDevToProd(
          screen,
          SCREEN_MANAGEMENT_SERVICE_API_PROD,
          prodOauthConfig,
          PUBLISH_VERSION
        );
        
        if (screenSyncResult.success) {
          syncedScreens++;
          console.log(`   ✅ App screen sync: ${screenSyncResult.operation}`);
        } else {
          console.log(`   ❌ App screen sync failed: ${screenSyncResult.error}`);
          failedSyncScreens.push({ 
            screen: screen.screenComponents?.formDefinition?.componentPath?.replace(/^\//, '') || screen.screenKey, 
            error: screenSyncResult.error, 
            stage: 'comprehensive_sync_app' 
          });
        }
      }
    }

    // Summary
    console.log(`\n📊 Comprehensive Sync Summary:`);
    console.log(`   📋 Total processed screens: ${matchingScreens.length}`);
    console.log(`   📝 Form screens processed: ${formScreens.length} (no resource URL sync)`);
    console.log(`   📱 App screens processed: ${appScreens.length} (with resource URL sync)`);
    console.log(`   🔗 Resource URLs synced: ${syncedResources}`);
    console.log(`   📱 Total screens synced: ${syncedScreens}`);
    console.log(`   ❌ Failed screen syncs: ${failedSyncScreens.length}`);
    
    // Determine overall success - true only if no failures occurred
    const overallSuccess = failedSyncScreens.length === 0;
    
    return { 
      success: overallSuccess, 
      processedScreens: matchingScreens.length,
      formScreens: formScreens.length,
      appScreens: appScreens.length,
      syncedResources, 
      syncedScreens,
      failedSyncScreens 
    };

  } catch (error) {
    console.error("❌ Error during comprehensive screen synchronization:", error.message);
    return { success: false, error: error.message, processedScreens: 0, syncedResources: 0, syncedScreens: 0, failedSyncScreens: [] };
  }
}

async function main() {
  console.log("🚀 Starting production screen publishing...");
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`);
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`);
  console.log(`🔗 Resource URL sync: ${process.env.SKIP_RESOURCE_URL_SYNC === 'true' ? 'DISABLED' : 'ENABLED'}`);
  
  // Check if manual screen list file is provided as command line argument
  const manualScreensFile = process.argv[2];
  let screensFile;
  
  if (manualScreensFile && fs.existsSync(manualScreensFile)) {
    console.log(`📋 Using manually specified screens from: ${manualScreensFile}`);
    screensFile = manualScreensFile;
  } else {
    console.log("🔍 Using change detection to find screens to publish...");
    
    try {
      execSync("bash scripts/detect-changed-screens.sh", { stdio: "inherit" });
    } catch (error) {
      console.error("❌ Failed to detect changed screens:", error.message);
      process.exit(1);
    }
    
    screensFile = "changed-tsx.txt";
  }

  // Check if any screens were found
  if (!fs.existsSync(screensFile) || !fs.statSync(screensFile).size) {
    console.log("✅ No screens found to publish. Nothing to publish.");
    return;
  }

  // Read the screens to publish
  const changedScreens = fs.readFileSync(screensFile, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^src\/business-apps\//, ""));

  console.log(`📋 Found ${changedScreens.length} screen(s) to publish:`);
  changedScreens.forEach(screen => console.log(`   - ${screen}`));

  // NEW: Comprehensive Screen Synchronization Step
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔄 COMPREHENSIVE SCREEN SYNCHRONIZATION`);
  console.log(`${'='.repeat(80)}`);
  
  const comprehensiveSyncResult = await handleComprehensiveScreenSync(changedScreens);
  
  if (comprehensiveSyncResult.success) {
    console.log(`✅ Comprehensive sync completed successfully!`);
    console.log(`   📋 Processed screens: ${comprehensiveSyncResult.processedScreens}`);
    console.log(`   🔗 Synced resource URLs: ${comprehensiveSyncResult.syncedResources}`);
    console.log(`   📱 Synced screens: ${comprehensiveSyncResult.syncedScreens}`);
  } else {
    console.error(`❌ Comprehensive sync failed: ${comprehensiveSyncResult.error}`);
    console.log("⚠️  Continuing with individual screen publishing as fallback...");
  }

  // STREAMLINED: Individual Screen Building and Azure Upload
  // (Resource URLs and screen registration handled by comprehensive sync above)
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔨 INDIVIDUAL SCREEN BUILDING AND AZURE UPLOAD`);
  console.log(`${'='.repeat(80)}`);

  const buildResults = [];
  let successCount = 0;
  const failedScreens = [];

  // Add comprehensive sync failures to failed screens list
  if (comprehensiveSyncResult.failedSyncScreens && comprehensiveSyncResult.failedSyncScreens.length > 0) {
    failedScreens.push(...comprehensiveSyncResult.failedSyncScreens);
    console.log(`⚠️  ${comprehensiveSyncResult.failedSyncScreens.length} screen(s) failed during comprehensive sync`);
  }

  for (const screen of changedScreens) {
    console.log(`\n📦 Building and uploading screen: ${screen}`);
    
    try {
      // Use existing publishScreen function but skip resource URL and screen registration
      // since those are handled by comprehensive sync above
      const result = await publishScreen(screen, { 
        skipResourceUrlSync: true, 
        skipScreenRegistration: true,
        buildOnly: true 
      });
      
      console.log(`   ✅ Screen built and uploaded successfully`);
      buildResults.push({
        screen,
        success: true,
        result
      });
      successCount++;

    } catch (error) {
      console.error(`   ❌ Error building/uploading ${screen}: ${error.message}`);
      failedScreens.push({ screen, error: error.message, stage: 'build_upload' });
    }
  }

  // Print final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 PRODUCTION PUBLISHING SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`);
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`);
  console.log(`🔗 Resource URL sync: ${process.env.SKIP_RESOURCE_URL_SYNC === 'true' ? 'DISABLED' : 'ENABLED'}`);
  console.log(`📈 Total screens processed: ${changedScreens.length}`);
  
  // Calculate success count considering comprehensive sync failures
  const comprehensiveSyncFailures = comprehensiveSyncResult.failedSyncScreens?.length || 0;
  const buildUploadFailures = failedScreens.filter(f => f.stage === 'build_upload').length;
  const totalFailures = failedScreens.length;
  const actualSuccessCount = changedScreens.length - totalFailures;
  
  console.log(`✅ Successfully published: ${actualSuccessCount}`);
  console.log(`❌ Failed: ${totalFailures}`);
  
  // Add comprehensive sync summary
  console.log(`\n🔄 COMPREHENSIVE SYNC RESULTS:`);
  console.log(`   📋 Total screens processed: ${comprehensiveSyncResult.processedScreens || 0}`);
  console.log(`   📝 Form screens processed: ${comprehensiveSyncResult.formScreens || 0} (no resource URL sync)`);
  console.log(`   📱 App screens processed: ${comprehensiveSyncResult.appScreens || 0} (with resource URL sync)`);
  console.log(`   🔗 Resource URLs synced: ${comprehensiveSyncResult.syncedResources || 0}`);
  console.log(`   📱 Screen configs synced: ${comprehensiveSyncResult.syncedScreens || 0}`);
  console.log(`   ❌ Screen sync failures: ${comprehensiveSyncFailures}`);
  
  // Show comprehensive sync status
  if (comprehensiveSyncResult.success) {
    console.log(`   ✅ Comprehensive sync: SUCCESSFUL`);
  } else {
    console.log(`   ❌ Comprehensive sync: FAILED${comprehensiveSyncResult.error ? ` (${comprehensiveSyncResult.error})` : ''}`);
  }

  if (failedScreens.length > 0) {
    console.log(`\n❌ FAILED SCREENS:`);
    console.log(`${'='.repeat(50)}`);
    
    // Group failures by stage for better readability
    const syncFailures = failedScreens.filter(f => f.stage?.includes('comprehensive_sync'));
    const buildFailures = failedScreens.filter(f => f.stage === 'build_upload');
    
    if (syncFailures.length > 0) {
      console.log(`\n🔄 COMPREHENSIVE SYNC FAILURES (${syncFailures.length}):`);
      syncFailures.forEach((failure, index) => {
        console.log(`\n${index + 1}. Screen: ${failure.screen}`);
        console.log(`   Stage: ${failure.stage}`);
        console.log(`   Error: ${failure.error}`);
        console.log(`   ${'─'.repeat(40)}`);
      });
    }
    
    if (buildFailures.length > 0) {
      console.log(`\n🔨 BUILD/UPLOAD FAILURES (${buildFailures.length}):`);
      buildFailures.forEach((failure, index) => {
        console.log(`\n${syncFailures.length + index + 1}. Screen: ${failure.screen}`);
        console.log(`   Stage: ${failure.stage}`);
        console.log(`   Error: ${failure.error}`);
        console.log(`   ${'─'.repeat(40)}`);
      });
    }
    
    console.log(`\n💥 Production publishing completed with ${failedScreens.length} failure(s)!`);
    console.log(`🚨 Please review the failed screens and fix the issues before next deployment.`);
    if (syncFailures.length > 0) {
      console.log(`⚠️  ${syncFailures.length} screen(s) failed during comprehensive sync (screen management)`);
    }
    if (buildFailures.length > 0) {
      console.log(`⚠️  ${buildFailures.length} screen(s) failed during build/upload (Azure deployment)`);
    }
    
    // Exit with error code to fail the pipeline
    process.exit(1);
  } else {
    console.log(`\n🎉 Production publishing completed successfully!`);
    console.log(`✨ All ${actualSuccessCount} screen(s) were published without errors.`);
  }
}

main().catch((error) => {
  console.error("❌ An unexpected error occurred:", error);
  process.exit(1);
});