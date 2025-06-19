import { execSync } from "child_process";
import path, { dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { BlobServiceClient } from "@azure/storage-blob";
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT;
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || "screens";

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
      "Error: AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN must be set in .env for SDK upload."
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

async function publishMainCss() {
  console.log("🚀 Publishing main CSS file: assets/main.css");
  const projectRootDir = path.resolve(__dirname, "..");
  console.log(`   Project Root Dir: ${projectRootDir}`);

  // Paths
  const sourceDir = path.join(projectRootDir, "dist", "assets");
  const sourceCssPath = path.join(sourceDir, "main.css");
  const azureDestination = "assets";

  // Check if the CSS file exists
  if (!fs.existsSync(sourceCssPath)) {
    console.error(
      `❌ Error: Main CSS file not found at ${sourceCssPath}. Did you run 'npm run build' first?`
    );
    process.exit(1);
  }

  console.log(`   Source CSS File: ${sourceCssPath}`);
  console.log(`   Azure Destination: ${azureDestination}`);

  // Create a temporary directory with just the main.css file to use with uploadDirectory
  const tempDir = path.join(projectRootDir, "temp_upload_dir");
  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Copy the CSS file to the temp directory
    fs.copyFileSync(sourceCssPath, path.join(tempDir, "main.css"));

    // Upload using the existing uploadDirectory function
    await uploadDirectory(tempDir, azureDestination);

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });

    console.log("✅ Main CSS file published successfully to Azure!");
  } catch (error) {
    // Clean up temp directory if it exists
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    console.error("❌ Error during publishing:", error);
    process.exit(1);
  }
}

async function main() {
  const screenPathArg = process.argv[2];

  if (!screenPathArg) {
    console.error("Error: Screen path argument is missing.");
    console.log(
      "Usage: npm run publish:screen -- <product>/[path/to/]/<ScreenName>"
    );
    console.log(
      "Example: npm run publish:screen -- irm/overview-screens/LeadOverview"
    );
    console.log("Example: npm run publish:screen -- .debug/DebugView");
    console.log(
      "Example: npm run publish:screen -- assets/main.css (to publish the main CSS file)"
    );
    process.exit(1);
  }

  // Special case for publishing main.css
  if (screenPathArg === "assets/main.css") {
    return publishMainCss();
  }

  const screenPathParts = screenPathArg.split("/");
  if (screenPathParts.length < 2) {
    console.error(
      "Error: Invalid screen path format. Expected at least <product>/<ScreenName>"
    );
    console.log(
      "Example: npm run publish:screen -- irm/overview-screens/LeadOverview"
    );
    console.log("Example: npm run publish:screen -- .debug/DebugView");
    process.exit(1);
  }

  const product = screenPathParts[0];
  const screenName = screenPathParts[screenPathParts.length - 1];
  console.log(`🚀 Publishing screen: ${screenPathArg}`);

  const projectRootDir = path.resolve(__dirname, "..");
  console.log(`   Project Root Dir: ${projectRootDir}`);

  // Use the full screenPathArg for paths to maintain the directory structure
  const sourceEntryFile = path.join(
    "src",
    "business-apps",
    screenPathArg,
    "index.ts"
  );
  const viteEntryKey = screenPathArg;
  const buildOutputDir = path.join(projectRootDir, "dist", screenPathArg);
  const azureDestinationPath = screenPathArg.replace(/\\/g, "/");

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
    "../src/business-apps/${screenPathArg}/**/*.{js,ts,jsx,tsx}",
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

  // The temp directory is already created and files are directly written there

  // Use cross-env compatible approach for Windows with additional env vars for temp files
  const viteBuildCommand = `cross-env PROJECT_ROOT_DIR="${projectRootDir.replace(
    /\\/g,
    "/"
  )}" VITE_GIT_USER="${
    process.env.VITE_GIT_USER ||
    execSync("git config user.name").toString().trim()
  }" VITE_PUBLISH_TIME="${new Date().toISOString()}" TARGET_ENTRY_FILE=${sourceEntryFile} TARGET_ENTRY_KEY=${viteEntryKey} TEMP_INDEX_CSS=${path
    .join(tempDir, "index.css")
    .replace(/\\/g, "/")} SINGLE_SCREEN_CSS=true vite build`;

  console.log(`   Executing: ${viteBuildCommand} with environment variables`);
  try {
    execSync(viteBuildCommand, {
      stdio: "inherit",
      cwd: projectRootDir,
      env: { ...process.env },
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

  await uploadDirectory(buildOutputDir, azureDestinationPath);
  console.log("✅ Screen JS published successfully to Azure!");

  const cssOutputDir = path.join(projectRootDir, "dist", "assets");
  await uploadDirectory(cssOutputDir, azureDestinationPath);
  console.log("✅ Screen CSS published successfully to Azure!");
}

main().catch((error) => {
  console.error("❌ An unexpected error occurred:", error);
  process.exit(1);
});
