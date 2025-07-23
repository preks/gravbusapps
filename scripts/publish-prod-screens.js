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
  addAppResourceUrl,
  addScreenConfigToScreenManagement,
  updateScreenConfigInScreenManagement,
  getScreenByKey,
  addFormAsLandingScreen,
  formatScreenNameFromPath,
  generateScreenKeyFromPath
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
async function searchResourceUrlInDev(componentPath, devOauthConfig) {
  const devNavigationApi = process.env.NEXT_PUBLIC_NAVIGATION_SERVICE_API;
  
  // Strategy 1: Search with full component path
  console.log(`   Strategy 1: Searching with full component path: ${componentPath}`);
  try {
    const resourceUrls = await getResourceUrls(devNavigationApi, devOauthConfig, {
      search: componentPath,
      sort: '-updatedAt'
    });
    if (resourceUrls.length > 0) {
      const foundResource = resourceUrls[0]; // Take the first (most recently updated) result
      console.log(`   ✅ Found with full path: ${foundResource.url}`);
      return foundResource;
    }
  } catch (error) {
    console.log(`   Strategy 1 failed: ${error.message}`);
  }
  
  // Strategy 2: Search without "apps" or "forms" terms
  const pathWithoutAppsOrForms = componentPath
    .replace(/\/apps\//g, '/')
    .replace(/^apps\//, '')
    .replace(/\/forms\//g, '/')
    .replace(/^forms\//, '');
  if (pathWithoutAppsOrForms !== componentPath) {
    console.log(`   Strategy 2: Searching without 'apps'/'forms' terms: ${pathWithoutAppsOrForms}`);
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
      console.log(`   Strategy 2 failed: ${error.message}`);
    }
  }
  
  // Strategy 3: Search with only component name (last segment)
  const pathSegments = componentPath.split('/');
  const componentName = pathSegments[pathSegments.length - 1];
  console.log(`   Strategy 3: Searching with component name only: ${componentName}`);
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
    console.log(`   Strategy 3 failed: ${error.message}`);
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
              release: PUBLISH_VERSION,
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
                  release: PUBLISH_VERSION,
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

async function publishScreen(screenPath) {
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
    process.exit(1);
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
  
  // Synchronize resource URLs from dev to prod (before screen registration)
  const resourceUrlResult = await handleResourceUrlSynchronization(screenPath, azureDestinationPath);
  
  if (resourceUrlResult.success) {
    const operationText = {
      'skip': 'skipped (no dev resource URL)',
      'exists': 'already exists in prod',
      'created': 'created in prod'
    }[resourceUrlResult.operation] || resourceUrlResult.operation;
    
    console.log(`✅ Resource URL synchronization ${operationText}`);
  } else {
    console.error(`❌ Resource URL synchronization failed: ${resourceUrlResult.error}`);
    // Don't fail the entire process if resource URL sync fails
  }
  
  // Register screen in Screen Management system with build number
  const registrationResult = await handleScreenManagement(screenPath, azureDestinationPath, resourceUrlResult);
  
  if (registrationResult.success) {
    console.log(`✅ Screen Management registration successful for ${screenPath}`);
    console.log(`🎉 Production publish completed successfully for ${screenPath}`);
  } else {
    console.error(`❌ Screen Management registration failed for ${screenPath}:`, registrationResult.error);
    console.error(`⚠️  Production publish completed with errors for ${screenPath}`);
    throw new Error(`Screen Management registration failed: ${registrationResult.error}`);
  }
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

async function main() {
  console.log("🚀 Starting production screen publishing...");
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`);
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`);
  
  // First, run the detect script to find changed screens
  console.log("🔍 Detecting changed screens...");
  
  try {
    execSync("bash scripts/detect-changed-screens.sh", { stdio: "inherit" });
  } catch (error) {
    console.error("❌ Failed to detect changed screens:", error.message);
    process.exit(1);
  }

  // Check if any screens were found
  const changedScreensFile = "changed-tsx.txt";
  if (!fs.existsSync(changedScreensFile) || !fs.statSync(changedScreensFile).size) {
    console.log("✅ No changed screens detected. Nothing to publish.");
    return;
  }

  // Read the changed screens
  const changedScreens = fs.readFileSync(changedScreensFile, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^src\/business-apps\//, ""));

  console.log(`📋 Found ${changedScreens.length} changed screen(s):`);
  changedScreens.forEach(screen => console.log(`   - ${screen}`));

  // Publish each changed screen
  for (const screenPath of changedScreens) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📦 Processing: ${screenPath}`);
    console.log(`${'='.repeat(60)}`);
    
    try {
      await publishScreen(screenPath);
      console.log(`✅ Successfully published: ${screenPath}`);
    } catch (error) {
      console.error(`❌ Failed to publish ${screenPath}:`, error.message);
      // Continue with next screen instead of failing entire process
    }
  }

  console.log(`\n🎉 Production publishing completed!`);
  console.log(`🔢 Build number: ${BITBUCKET_BUILD_NUMBER}`);
  console.log(`🎯 Publish version: ${PUBLISH_VERSION}`);
}

main().catch((error) => {
  console.error("❌ An unexpected error occurred:", error);
  process.exit(1);
});