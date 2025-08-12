/**
 * Build-only validation script for pull requests
 * - Builds changed screens to validate they compile successfully
 * - Does NOT upload to Azure or register in screen management
 * - Fails fast if any screen has build errors
 * - Used for PR validation to prevent merging broken screens
 */

import { execSync } from "child_process";
import path, { dirname } from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "@dotenvx/dotenvx";
import { glob } from "glob";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

// Use a simple build version for validation
const BUILD_VERSION = "validation";

console.log("🔍 Starting build validation for changed screens...");
console.log(`🎯 Build version: ${BUILD_VERSION}`);

async function buildScreenOnly(screenPath) {
  console.log(`🔨 Building screen for validation: ${screenPath}`);

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

  console.log(`   Source Entry File: ${sourceEntryFile}`);
  console.log(`   Vite Entry Key: ${viteEntryKey}`);
  console.log(`   Build Output Dir: ${buildOutputDir}`);

  // Check if source file exists
  if (!fs.existsSync(path.join(projectRootDir, sourceEntryFile))) {
    throw new Error(`Source file not found: ${sourceEntryFile}`);
  }

  console.log("\n⚙️  Building screen with Vite (validation only)...");

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
  const tempDir = path.join(projectRootDir, "temp_build_validation");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const screenPathParts = screenPath.split("/");
  const product = screenPathParts[0];

  const originalIndexCssPath = path.join(projectRootDir, "src", "index.css");
  const tempIndexCssPath = path.join(tempDir, "index.css");

  // Create a modified index.css
  console.log("📝 Creating screen-specific index.css...");

  const indexCssContent = fs.readFileSync(originalIndexCssPath, "utf8");
  const modifiedIndexCss = indexCssContent
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

  // Build environment with validation-specific variables
  const buildEnv = {
    ...process.env,
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER:
      process.env.VITE_GIT_USER ||
      execSync("git config user.name").toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    VITE_BUILD_VERSION: BUILD_VERSION,
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey,
    TEMP_INDEX_CSS: tempIndexCssPath.replace(/\\/g, "/"),
    SINGLE_SCREEN_CSS: "true",
    NODE_ENV: "production",
    // Use simple build number for validation
    VITE_BUILD_NUMBER: "validation",
  };

  const viteBuildCommand = `npx vite build`;

  console.log(`   Executing: ${viteBuildCommand} for validation`);
  console.log(`   Build version: ${BUILD_VERSION}`);
  
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

    // Clean up build output since this is validation only
    console.log("🧹 Cleaning up build output (validation only)...");
    if (fs.existsSync(buildOutputDir)) {
      fs.rmSync(buildOutputDir, { recursive: true, force: true });
    }

    return {
      success: true,
      screen: screenPath
    };

  } catch (error) {
    console.error("❌ Build validation failed:", error.message);
    
    // Clean up temporary directory even on failure
    console.log("🧹 Cleaning up temporary build files...");
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    throw error;
  }
}

async function main() {
  console.log("🔍 Starting build validation for changed screens...");
  
  // Check if manual screen list file is provided as command line argument
  const manualScreensFile = process.argv[2];
  let screensFile;
  
  if (manualScreensFile && fs.existsSync(manualScreensFile)) {
    console.log(`📋 Using manually specified screens from: ${manualScreensFile}`);
    screensFile = manualScreensFile;
  } else {
    console.log("🔍 Using change detection to find screens to validate...");
    
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
    console.log("✅ No screens found to validate. Nothing to validate.");
    return;
  }

  // Read the screens to validate
  const changedScreens = fs.readFileSync(screensFile, "utf8")
    .split("\n")
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.replace(/^src\/business-apps\//, ""));

  console.log(`📋 Found ${changedScreens.length} screen(s) to validate:`);
  changedScreens.forEach(screen => console.log(`   - ${screen}`));

  // Validate each screen by building it
  console.log(`\n${'='.repeat(80)}`);
  console.log(`🔨 SCREEN BUILD VALIDATION`);
  console.log(`${'='.repeat(80)}`);

  const buildResults = [];
  let successCount = 0;
  const failedScreens = [];

  for (const screen of changedScreens) {
    console.log(`\n🔨 Validating screen: ${screen}`);
    
    try {
      const result = await buildScreenOnly(screen);
      
      console.log(`   ✅ Screen validation successful`);
      buildResults.push({
        screen,
        success: true,
        result
      });
      successCount++;

    } catch (error) {
      console.error(`   ❌ Screen validation failed: ${error.message}`);
      failedScreens.push({ 
        screen, 
        error: error.message, 
        stage: 'build_validation' 
      });
      break;
    }
  }

  // Print final summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`📊 BUILD VALIDATION SUMMARY`);
  console.log(`${'='.repeat(80)}`);
  console.log(`🎯 Build version: ${BUILD_VERSION}`);
  console.log(`📈 Total screens validated: ${changedScreens.length}`);
  console.log(`✅ Successfully validated: ${successCount}`);
  console.log(`❌ Failed validation: ${failedScreens.length}`);

  if (failedScreens.length > 0) {
    console.log(`\n❌ FAILED SCREEN VALIDATIONS:`);
    console.log(`${'='.repeat(50)}`);
    
    failedScreens.forEach((failure, index) => {
      console.log(`\n${index + 1}. Screen: ${failure.screen}`);
      console.log(`   Stage: ${failure.stage}`);
      console.log(`   Error: ${failure.error}`);
      console.log(`   ${'─'.repeat(40)}`);
    });
    
    console.log(`\n💥 Build validation completed with ${failedScreens.length} failure(s)!`);
    console.log(`🚨 Please fix the build errors before merging this pull request.`);
    console.log(`⚠️  The following screen(s) failed to compile:`);
    failedScreens.forEach(f => console.log(`     - ${f.screen}`));
    
    // Exit with error code to fail the pipeline
    process.exit(1);
  } else {
    console.log(`\n🎉 Build validation completed successfully!`);
    console.log(`✨ All ${successCount} screen(s) compiled without errors.`);
    console.log(`🚀 Screens are ready for deployment after merge.`);
  }
}

main().catch((error) => {
  console.error("❌ An unexpected error occurred during build validation:", error);
  process.exit(1);
});
