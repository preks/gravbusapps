import { execSync } from 'child_process'; 
import path, { dirname } from 'path'; 
import fs from 'fs';
import { fileURLToPath } from 'url'; 
import dotenv from 'dotenv'; 
import { BlobServiceClient } from '@azure/storage-blob'; 
import { glob } from 'glob'; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT; 
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN;
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME || 'screens'; 

function getContentType(fileName) {
  const ext = path.extname(fileName).toLowerCase();
  switch (ext) {
    case '.js': return 'application/javascript';
    case '.css': return 'text/css';
    case '.html': return 'text/html';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

async function uploadDirectory(buildOutputDir, azureDestinationPath) {
  if (!AZURE_STORAGE_ACCOUNT_NAME || !AZURE_STORAGE_SAS_TOKEN) {
    console.error('Error: AZURE_STORAGE_ACCOUNT and AZURE_STORAGE_SAS_TOKEN must be set in .env for SDK upload.');
    process.exit(1);
  }

  const blobServiceUrl = `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/?${AZURE_STORAGE_SAS_TOKEN}`;
  const blobServiceClient = new BlobServiceClient(blobServiceUrl);
  const containerClient = blobServiceClient.getContainerClient(AZURE_CONTAINER_NAME);

  console.log(`☁️  Uploading to Azure Storage account: ${AZURE_STORAGE_ACCOUNT_NAME}, container: ${AZURE_CONTAINER_NAME}`);
  console.log(`   Source: ${buildOutputDir}`);
  console.log(`   Destination base path: ${azureDestinationPath}`);

  const filesToUpload = await glob('**/*', { cwd: buildOutputDir, nodir: true });

  if (filesToUpload.length === 0) {
    console.log('No files found in build output directory to upload.');
    return;
  }

  for (const file of filesToUpload) {
    const localFilePath = path.join(buildOutputDir, file);
    const blobName = path.join(azureDestinationPath, file).replace(/\\/g, '/'); 
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    const contentType = getContentType(file);

    try {
      console.log(`   Uploading: ${file} as ${blobName} (Content-Type: ${contentType})`);
      await blockBlobClient.uploadFile(localFilePath, {
        blobHTTPHeaders: { blobContentType: contentType }
      });
    } catch (error) {
      console.error(`❌ Error uploading ${file}:`, error.message);
    }
  }
  console.log('✅ All files uploaded successfully.');
}

async function main() {
  const screenPathArg = process.argv[2];
  if (!screenPathArg) {
    console.error('Error: Screen path argument is missing.');
    console.log('Usage: npm run publish:screen -- <product>/[path/to/]/<ScreenName>');
    console.log('Example: npm run publish:screen -- irm/overview-screens/LeadOverview');
    console.log('Example: npm run publish:screen -- .debug/DebugView');
    process.exit(1);
  }

  const screenPathParts = screenPathArg.split('/');
  if (screenPathParts.length < 2) {
    console.error('Error: Invalid screen path format. Expected at least <product>/<ScreenName>');
    console.log('Example: npm run publish:screen -- irm/overview-screens/LeadOverview');
    console.log('Example: npm run publish:screen -- .debug/DebugView');
    process.exit(1);
  }

  const product = screenPathParts[0];
  const screenName = screenPathParts[screenPathParts.length - 1];
  console.log(`🚀 Publishing screen: ${screenPathArg}`);

  const projectRootDir = path.resolve(__dirname, '..');
  console.log(`   Project Root Dir: ${projectRootDir}`);

  // Use the full screenPathArg for paths to maintain the directory structure
  const sourceEntryFile = path.join('src', 'business-apps', screenPathArg, 'index.ts');
  const viteEntryKey = screenPathArg;
  const buildOutputDir = path.join(projectRootDir, 'dist', screenPathArg);
  const azureDestinationPath = screenPathArg.replace(/\\/g, '/');

  console.log(`   Source Entry File: ${sourceEntryFile}`);
  console.log(`   Vite Entry Key: ${viteEntryKey}`);
  console.log(`   Build Output Dir: ${buildOutputDir}`);
  console.log(`   Azure Destination: ${AZURE_CONTAINER_NAME}/${azureDestinationPath}`);

  console.log('\n⚙️  Building screen with Vite...');
  const buildScriptPath = path.join(projectRootDir, 'scripts', 'build-screen.js'); 
  
  if (fs.existsSync(buildOutputDir)) {
    console.log(`🗑️  Deleting existing output directory: ${buildOutputDir}`);
    fs.rmSync(buildOutputDir, { recursive: true, force: true });
    console.log('✅ Directory deleted successfully.');
  } else {
    console.log(`ℹ️  Output directory ${buildOutputDir} does not exist, no need to delete.`);
  }

  // For Windows compatibility, set environment variables in the options object
  const envVars = {
    PROJECT_ROOT_DIR: projectRootDir,
    VITE_GIT_USER: process.env.VITE_GIT_USER || execSync('git config user.name').toString().trim(),
    VITE_PUBLISH_TIME: new Date().toISOString(),
    TARGET_ENTRY_FILE: sourceEntryFile,
    TARGET_ENTRY_KEY: viteEntryKey
  };
  
  const viteBuildCommand = 'vite build';
  
  console.log(`   Executing: ${viteBuildCommand} with environment variables:`, envVars);
  try {
    execSync(viteBuildCommand, { 
      stdio: 'inherit', 
      cwd: projectRootDir,
      env: { ...process.env, ...envVars } 
    });
    console.log('✅ Screen built successfully.');
  } catch (error) { 
    console.error('❌ Build failed:', error.message);
    process.exit(1);
  }

  await uploadDirectory(buildOutputDir, azureDestinationPath);
  console.log('✅ Screen published successfully to Azure!');
}

main().catch(error => {
  console.error('❌ An unexpected error occurred:', error);
  process.exit(1);
});
