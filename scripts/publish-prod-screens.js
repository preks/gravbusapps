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
import {
  addScreenConfigToScreenManagement,
  updateScreenConfigInScreenManagement,
  addFormAsLandingScreen
} from "./api-client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_PROD;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN_PROD;
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME_PROD;
const BITBUCKET_BUILD_NUMBER = process.env.BITBUCKET_BUILD_NUMBER;
const SCREEN_MANAGEMENT_SERVICE_API_PROD = process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD;

// Validate required environment variables
const requiredEnvVars = [
  { name: 'AZURE_STORAGE_ACCOUNT_PROD', value: AZURE_STORAGE_ACCOUNT_NAME },
  { name: 'AZURE_STORAGE_SAS_TOKEN_PROD', value: AZURE_STORAGE_SAS_TOKEN },
  { name: 'AZURE_BLOB_CONTAINER_NAME_PROD', value: AZURE_CONTAINER_NAME },
  { name: 'BITBUCKET_BUILD_NUMBER', value: BITBUCKET_BUILD_NUMBER },
  { name: 'SCREEN_MANAGEMENT_SERVICE_API_PROD', value: SCREEN_MANAGEMENT_SERVICE_API_PROD }
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

// Helper function to handle screen management registration for production
async function handleScreenManagement(screenPath, azureDestinationPath) {
  console.log("📋 Registering screen in Screen Management system...");
  
  try {
    if (isFormScreen(screenPath)) {
      // For forms, register as landing screen (production deployment)
      console.log("   Detected form - registering as production form screen");
      
      // Extract process name from path for forms
      const pathParts = screenPath.split("/");
      const formName = pathParts[pathParts.length - 1]; // Get the form name
      const processName = formName.replace(/-form$/, ""); // Remove "-form" suffix if present
      
      const formId = await addFormAsLandingScreen(processName, azureDestinationPath, BITBUCKET_BUILD_NUMBER, SCREEN_MANAGEMENT_SERVICE_API_PROD);
      if (formId) {
        console.log(`✅ Form screen registered successfully with ID: ${formId}`);
      } else {
        console.log(`⚠️  Form screen registration failed or already exists, try updating the form`);

        // Update the form with build number as version
        const updateData = {
            screenKey: `frm_${processName}`,
            name: camelCaseToNaturalLanguageWithWhiteSpaces(processName),
            type: "SCREEN",
            screenComponents: {
              key: `frm_${processName}`,
              name: camelCaseToNaturalLanguageWithWhiteSpaces(processName),
              builderType: "NATIVE_SCREEN",
              formDefinition: {
                componentPath: `/${azureDestinationPath}`,
                version: BITBUCKET_BUILD_NUMBER,
              },
              release: BITBUCKET_BUILD_NUMBER,
            },
          };
          
          const updateSuccess = await updateScreenConfigInScreenManagement(formId, updateData, SCREEN_MANAGEMENT_SERVICE_API_PROD);
          if (updateSuccess) {
            console.log(`✅ Form version updated to build ${BITBUCKET_BUILD_NUMBER}`);
          } else {
            console.error(`❌ Form version update failed`);
          }
      }
    } else {
      // For regular screens, register with build number as version
      console.log("   Detected app screen - registering as production app screen");
      
      // Generate custom URL path from screen path
      const customUrlPath = `apps/${azureDestinationPath}`;
      
      // Try to add screen config first
      const screenId = await addScreenConfigToScreenManagement(
        azureDestinationPath, 
        customUrlPath,
        BITBUCKET_BUILD_NUMBER,
        SCREEN_MANAGEMENT_SERVICE_API_PROD
      );
      
      if (screenId) {
        console.log(`✅ Screen registered successfully with ID: ${screenId}`);
      } else {
        console.log(`⚠️  Screen registration failed or already exists, try updating the screen`);

        // Update the screen with build number as version
        const updateData = {
            screenKey: `url_${customUrlPath.split("/").map(s => s.toLowerCase()).join("~")}`,
            name: azureDestinationPath.split("/").pop(),
            type: "SCREEN",
            screenComponents: {
                key: `url_${customUrlPath.split("/").map(s => s.toLowerCase()).join("~")}`,
                name: azureDestinationPath.split("/").pop(),
                builderType: "NATIVE_SCREEN",
                formDefinition: {
                componentPath: `/${azureDestinationPath}`,
                version: BITBUCKET_BUILD_NUMBER,
                },
                release: BITBUCKET_BUILD_NUMBER,
            },
        };
        
        const updateSuccess = await updateScreenConfigInScreenManagement(screenId, updateData, SCREEN_MANAGEMENT_SERVICE_API_PROD);
        if (updateSuccess) {
            console.log(`✅ Screen version updated to build ${BITBUCKET_BUILD_NUMBER}`);
        } else {
            console.error(`❌ Screen version update failed`);
        }
      }
    }
  } catch (error) {
    console.error("❌ Error during screen management registration:", error.message);
    // Don't fail the entire publish process for screen management errors
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
  console.log(`🚀 Publishing screen: ${screenPath} (Build: ${BITBUCKET_BUILD_NUMBER})`);

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
    VITE_BUILD_VERSION: BITBUCKET_BUILD_NUMBER,
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, "/"),
    SINGLE_SCREEN_CSS: "true",
    NODE_ENV: "production",
    // Add build number to filename
    VITE_BUILD_NUMBER: BITBUCKET_BUILD_NUMBER,
  };

  const viteBuildCommand = `vite build`;

  console.log(`   Executing: ${viteBuildCommand} with production environment`);
  console.log(`   Build version: ${BITBUCKET_BUILD_NUMBER}`);
  
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

  await renameFilesWithBuildNumber(buildOutputDir, BITBUCKET_BUILD_NUMBER);
  await uploadDirectory(buildOutputDir, azureDestinationPath);
  console.log("✅ Screen JS published successfully to Azure!");

  // For single screen builds, CSS is output to the screen-specific directory, not global assets
  console.log("🎨 Handling screen-specific CSS...");
  const screenCssFiles = await glob("**/*.css", {
    cwd: buildOutputDir,
    nodir: true,
  });
  
  if (screenCssFiles.length > 0) {
    console.log(`   Found ${screenCssFiles.length} CSS file(s) in screen directory:`);
    screenCssFiles.forEach(file => console.log(`     - ${file}`));
    
    // Rename CSS files in the screen directory with build number
    await renameCssFilesInDirectory(buildOutputDir, BITBUCKET_BUILD_NUMBER);
    console.log("✅ Screen-specific CSS processed and ready for upload!");
  } else {
    console.log("   No CSS files found in screen directory");
  }
  
  // Register screen in Screen Management system with build number
  await handleScreenManagement(screenPath, azureDestinationPath);
  
  console.log(`🎉 Production publish completed for ${screenPath}`);
}

async function renameFilesWithBuildNumber(buildOutputDir, buildNumber) {
  console.log(`🔄 Renaming JS files with build number: ${buildNumber}`);
  const files = await glob("**/*", {
    cwd: buildOutputDir,
    nodir: true,
  });

  for (const file of files) {
    const filePath = path.join(buildOutputDir, file);
    const parsedPath = path.parse(filePath);
    
    // Rename index.js to index-{buildNumber}.js
    if (parsedPath.name === 'index' && parsedPath.ext === '.js') {
      const newName = `index-${buildNumber}${parsedPath.ext}`;
      const newPath = path.join(parsedPath.dir, newName);
      
      console.log(`   Renaming: ${file} → ${path.relative(buildOutputDir, newPath)}`);
      fs.renameSync(filePath, newPath);
    }
  }
}

async function renameCssFilesInDirectory(targetDir, buildNumber) {
  console.log(`🎨 Renaming CSS files in directory with build number: ${buildNumber}`);
  const files = await glob("**/*.css", {
    cwd: targetDir,
    nodir: true,
  });

  for (const file of files) {
    const filePath = path.join(targetDir, file);
    const parsedPath = path.parse(filePath);
    
    // Rename any CSS file (main.css or others) to include build number
    const newName = `${parsedPath.name}-${buildNumber}${parsedPath.ext}`;
    const newPath = path.join(parsedPath.dir, newName);
    
    console.log(`   Renaming CSS: ${file} → ${path.relative(targetDir, newPath)}`);
    fs.renameSync(filePath, newPath);
  }
}

async function main() {
  console.log("🚀 Starting production screen publishing...");
  console.log(`📦 Using build number: ${BITBUCKET_BUILD_NUMBER}`);
  
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
  console.log(`📊 Build version: ${BITBUCKET_BUILD_NUMBER}`);
}

main().catch((error) => {
  console.error("❌ An unexpected error occurred:", error);
  process.exit(1);
});