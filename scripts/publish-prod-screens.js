/**
 * Production screen publishing script
 * - Publishes only changed screens using RC promotion (no Vite build)
 * - Promotes RC artifacts from release-candidates/ into prod paths
 * - Updates screen management using RC version per screen
 * - Executed on master merge
 */

import { execSync } from 'node:child_process'
import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import { BlobServiceClient } from '@azure/storage-blob'
import { getAllNativeScreens, syncScreenFromDevToProd } from './api-client.js'
import { getScreenDirectories } from './utils/screenDiscovery.js'
import { compareScreenHashes, loadHashFile, saveHashFile, configureGit } from './utils/componentHashUtils.js'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_PROD
const AZURE_STORAGE_SAS_TOKEN = process.env.AZURE_STORAGE_SAS_TOKEN_PROD
const AZURE_CONTAINER_NAME = process.env.AZURE_BLOB_CONTAINER_NAME_PROD
// Optional secondary target (deploy to a 2nd system)
const AZURE_STORAGE_ACCOUNT_NAME_SECONDARY =
  process.env.AZURE_STORAGE_ACCOUNT_PROD_SECONDARY ||
  process.env.AZURE_STORAGE_ACCOUNT_SECOND ||
  process.env.AZURE_STORAGE_ACCOUNT_PROD_2 ||
  null
const AZURE_STORAGE_SAS_TOKEN_SECONDARY =
  process.env.AZURE_STORAGE_SAS_TOKEN_PROD_SECONDARY ||
  process.env.AZURE_STORAGE_SAS_TOKEN_SECOND ||
  process.env.AZURE_STORAGE_SAS_TOKEN_PROD_2 ||
  null
const AZURE_CONTAINER_NAME_SECONDARY =
  process.env.AZURE_BLOB_CONTAINER_NAME_PROD_SECONDARY ||
  process.env.AZURE_BLOB_CONTAINER_NAME_SECOND ||
  process.env.AZURE_BLOB_CONTAINER_NAME_PROD_2 ||
  null
const BITBUCKET_BUILD_NUMBER = process.env.BITBUCKET_BUILD_NUMBER
const SCREEN_MANAGEMENT_SERVICE_API_PROD = process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD
// Optional secondary target services
const SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY =
  process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY ||
  process.env.SCREEN_MANAGEMENT_SERVICE_API_SECOND ||
  process.env.SCREEN_MANAGEMENT_SERVICE_API_PROD_2

const RC_PREFIX = process.env.RC_PREFIX || 'release-candidates'

// Production OAuth configuration
const OAUTH_CLIENT_ID_PROD = process.env.OAUTH_CLIENT_ID_PROD
const OAUTH_CLIENT_SECRET_PROD = process.env.OAUTH_CLIENT_SECRET_PROD
const OAUTH_URL_PROD = process.env.OAUTH_URL_PROD
const OAUTH_REALM_PROD = process.env.OAUTH_REALM_PROD
// Optional secondary target OAuth
const OAUTH_CLIENT_ID_PROD_SECONDARY =
  process.env.OAUTH_CLIENT_ID_PROD_SECONDARY || process.env.OAUTH_CLIENT_ID_SECOND || process.env.OAUTH_CLIENT_ID_PROD_2
const OAUTH_CLIENT_SECRET_PROD_SECONDARY =
  process.env.OAUTH_CLIENT_SECRET_PROD_SECONDARY ||
  process.env.OAUTH_CLIENT_SECRET_SECOND ||
  process.env.OAUTH_CLIENT_SECRET_PROD_2
const OAUTH_URL_PROD_SECONDARY =
  process.env.OAUTH_URL_PROD_SECONDARY || process.env.OAUTH_URL_SECOND || process.env.OAUTH_URL_PROD_2
const OAUTH_REALM_PROD_SECONDARY =
  process.env.OAUTH_REALM_PROD_SECONDARY || process.env.OAUTH_REALM_SECOND || process.env.OAUTH_REALM_PROD_2

// Validate required environment variables
const requiredEnvVars = [
  { name: 'AZURE_STORAGE_ACCOUNT_PROD', value: AZURE_STORAGE_ACCOUNT_NAME },
  { name: 'AZURE_STORAGE_SAS_TOKEN_PROD', value: AZURE_STORAGE_SAS_TOKEN },
  { name: 'AZURE_BLOB_CONTAINER_NAME_PROD', value: AZURE_CONTAINER_NAME },
  { name: 'SCREEN_MANAGEMENT_SERVICE_API_PROD', value: SCREEN_MANAGEMENT_SERVICE_API_PROD },
  { name: 'OAUTH_CLIENT_ID_PROD', value: OAUTH_CLIENT_ID_PROD },
  { name: 'OAUTH_CLIENT_SECRET_PROD', value: OAUTH_CLIENT_SECRET_PROD }
]

const missingVars = requiredEnvVars.filter(envVar => !envVar.value)

if (missingVars.length > 0) {
  console.error('Missing required environment variables:')
  missingVars.forEach(envVar => {
    console.error(`   - ${envVar.name}`)
  })
  console.error('\nThis production script requires all environment variables to be set.')
  console.error('Please ensure your Bitbucket pipeline has the necessary environment variables configured.')
  process.exit(1)
}

// Compose target configs (primary is required, secondary optional)
const PRIMARY_TARGET = {
  label: 'primary',
  azure: {
    accountName: AZURE_STORAGE_ACCOUNT_NAME,
    sasToken: AZURE_STORAGE_SAS_TOKEN,
    containerName: AZURE_CONTAINER_NAME
  },
  services: {
    screenManagementApi: SCREEN_MANAGEMENT_SERVICE_API_PROD
  },
  oauth: {
    clientId: OAUTH_CLIENT_ID_PROD,
    clientSecret: OAUTH_CLIENT_SECRET_PROD,
    oauthUrl: OAUTH_URL_PROD,
    realm: OAUTH_REALM_PROD
  }
}

const SECONDARY_TARGET =
  SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY &&
  OAUTH_CLIENT_ID_PROD_SECONDARY &&
  OAUTH_CLIENT_SECRET_PROD_SECONDARY &&
  OAUTH_URL_PROD_SECONDARY &&
  OAUTH_REALM_PROD_SECONDARY
    ? {
        label: 'secondary',
        azure:
          AZURE_STORAGE_ACCOUNT_NAME_SECONDARY && AZURE_STORAGE_SAS_TOKEN_SECONDARY && AZURE_CONTAINER_NAME_SECONDARY
            ? {
                accountName: AZURE_STORAGE_ACCOUNT_NAME_SECONDARY,
                sasToken: AZURE_STORAGE_SAS_TOKEN_SECONDARY,
                containerName: AZURE_CONTAINER_NAME_SECONDARY
              }
            : null,
        services: {
          screenManagementApi: SCREEN_MANAGEMENT_SERVICE_API_PROD_SECONDARY
        },
        oauth: {
          clientId: OAUTH_CLIENT_ID_PROD_SECONDARY,
          clientSecret: OAUTH_CLIENT_SECRET_PROD_SECONDARY,
          oauthUrl: OAUTH_URL_PROD_SECONDARY,
          realm: OAUTH_REALM_PROD_SECONDARY
        }
      }
    : null

// ============================================================================
// Hash-based Publishing Utility Functions
// ============================================================================

// Helper function to detect if the screen is a form
function isFormScreen(screenPath) {
  return screenPath.includes('/forms/') || screenPath.includes('/windows/') || screenPath.includes('/popups/')
}

function writePublishedScreensArtifact(outputFilePath, screens, options = {}) {
  const content = screens.length > 0 ? `${screens.join('\n')}\n` : ''
  fs.writeFileSync(outputFilePath, content, 'utf8')
  if (!options.silent) {
    console.log(`Wrote published screens artifact: ${path.basename(outputFilePath)} (${screens.length} screen(s))`)
  }
}

function buildBlobUrl(accountName, containerName, blobName, sasToken) {
  const encodedBlobName = blobName
    .split('/')
    .map(segment => encodeURIComponent(segment))
    .join('/')
  return `https://${accountName}.blob.core.windows.net/${containerName}/${encodedBlobName}?${sasToken}`
}

async function listReleaseCandidateBlobs(containerClient, rcDestinationPath) {
  const blobs = []
  const prefix = `${RC_PREFIX}/${rcDestinationPath}/`.replace(/\\/g, '/')
  for await (const blob of containerClient.listBlobsFlat({ prefix })) {
    blobs.push(blob)
  }
  return blobs
}

function extractRcVersionFromBlobName(blobName, rcDestinationPath) {
  const rcPrefix = `${RC_PREFIX}/${rcDestinationPath}/`.replace(/\\/g, '/')
  if (!blobName.startsWith(rcPrefix)) {
    return null
  }
  const fileName = blobName.slice(rcPrefix.length)
  const match = fileName.match(/^index-(.+)\.js$/)
  return match ? match[1] : null
}

async function promoteReleaseCandidateScreen(screenPath) {
  const sourceAzure = PRIMARY_TARGET.azure
  if (!sourceAzure?.accountName || !sourceAzure?.sasToken || !sourceAzure?.containerName) {
    throw new Error('RC promotion requires primary Azure target configuration.')
  }

  const sourceBlobServiceUrl = `https://${sourceAzure.accountName}.blob.core.windows.net/?${sourceAzure.sasToken}`
  const sourceContainerClient = new BlobServiceClient(sourceBlobServiceUrl).getContainerClient(
    sourceAzure.containerName
  )

  const rcBlobs = await listReleaseCandidateBlobs(sourceContainerClient, screenPath)
  if (rcBlobs.length === 0) {
    throw new Error(`No release-candidate blobs found for ${screenPath}`)
  }

  let rcVersion = null
  for (const blob of rcBlobs) {
    const version = extractRcVersionFromBlobName(blob.name, screenPath)
    if (version) {
      rcVersion = version
      break
    }
  }

  if (!rcVersion) {
    throw new Error(`No index-<version>.js found in release-candidates for ${screenPath}`)
  }

  console.log(`Promoting RC for ${screenPath} (version ${rcVersion})`)

  const targetBlobServiceUrl = `https://${sourceAzure.accountName}.blob.core.windows.net/?${sourceAzure.sasToken}`
  const targetContainerClient = new BlobServiceClient(targetBlobServiceUrl).getContainerClient(
    sourceAzure.containerName
  )

  for (const blob of rcBlobs) {
    const destinationBlobName = blob.name.replace(`${RC_PREFIX}/`, '')
    const sourceUrl = buildBlobUrl(sourceAzure.accountName, sourceAzure.containerName, blob.name, sourceAzure.sasToken)
    const blockBlobClient = targetContainerClient.getBlockBlobClient(destinationBlobName)
    const poller = await blockBlobClient.beginCopyFromURL(sourceUrl)
    await poller.pollUntilDone()
    console.log(`   Copied ${blob.name} -> ${destinationBlobName} (primary)`)
  }

  return rcVersion
}

// Helper function to handle comprehensive screen synchronization
async function handleComprehensiveScreenSyncForTarget(changedScreens, target, versionByComponentPath) {
  console.log('Starting comprehensive screen synchronization from dev to prod...')
  console.log(`Changed screens to process: ${changedScreens.length}`)

  const resolveVersionForComponentPath = componentPath => {
    if (!versionByComponentPath || !versionByComponentPath[componentPath]) {
      throw new Error(`Missing RC version for ${componentPath}`)
    }
    return versionByComponentPath[componentPath]
  }

  // Create OAuth configuration
  const prodOauthConfig = {
    clientId: target.oauth.clientId,
    clientSecret: target.oauth.clientSecret,
    oauthUrl: target.oauth.oauthUrl,
    realm: target.oauth.realm
  }

  try {
    // Fetch all NATIVE_SCREEN screens from dev environment (done once for efficiency)
    console.log('\nFetching all NATIVE_SCREEN screens from dev environment...')
    const devScreens = await getAllNativeScreens(process.env.NEXT_PUBLIC_SCREEN_MANAGEMENT_SERVICE_API, {})

    if (devScreens.length === 0) {
      console.log('   No NATIVE_SCREEN screens found in dev environment')
      return { success: true, processedScreens: 0, syncedScreens: 0, failedSyncScreens: [] }
    }

    // Filter screens that match changed screen paths and separate forms from apps
    console.log('\nFiltering and categorizing matching screens...')
    const matchingScreens = devScreens.filter(screen => {
      if (
        !screen.screenComponents ||
        !screen.screenComponents.formDefinition ||
        !screen.screenComponents.formDefinition.componentPath
      ) {
        return false
      }

      // Remove leading slash and normalize path
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')

      // Check if this component path is in our changed screens list
      const isMatching = changedScreens.some(changedScreen => {
        return componentPath === changedScreen || componentPath.endsWith(`/${changedScreen}`)
      })

      if (isMatching) {
        console.log(`   Match found: ${screen.screenKey} -> ${componentPath}`)
      }

      return isMatching
    })

    // Separate form screens from app screens
    const formScreens = matchingScreens.filter(screen => {
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
      return isFormScreen(componentPath)
    })

    const appScreens = matchingScreens.filter(screen => {
      const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
      return !isFormScreen(componentPath)
    })

    console.log(`   Found ${matchingScreens.length} total matching screens:`)
    console.log(`   Form screens: ${formScreens.length}`)
    console.log(`   App screens: ${appScreens.length}`)

    if (matchingScreens.length === 0) {
      console.log('   No screens match the changed component paths')
      return { success: true, processedScreens: 0, syncedScreens: 0, failedSyncScreens: [] }
    }

    let syncedScreens = 0
    let failedSyncScreens = []

    // Process form screens (no resource URL sync, preserve exact screenKey)
    if (formScreens.length > 0) {
      console.log(`\nProcessing ${formScreens.length} form screen(s) (no resource URL sync)...`)

      for (const screen of formScreens) {
        console.log(`\n   Processing form screen: ${screen.screenKey}`)
        console.log(`   Form screens skip resource URL sync and preserve exact screenKey from dev`)

        // Sync screen to prod with preserved screenKey
        const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
        const screenSyncResult = await syncScreenFromDevToProd(
          screen,
          target.services.screenManagementApi,
          prodOauthConfig,
          resolveVersionForComponentPath(componentPath)
        )

        if (screenSyncResult.success) {
          syncedScreens++
          console.log(`   Form screen sync: ${screenSyncResult.operation} (screenKey: ${screen.screenKey})`)
        } else {
          console.log(`   Form screen sync failed: ${screenSyncResult.error}`)
          failedSyncScreens.push({
            screen: screen.screenComponents?.formDefinition?.componentPath?.replace(/^\//, '') || screen.screenKey,
            error: screenSyncResult.error,
            stage: 'comprehensive_sync_form'
          })
        }
      }
    }

    // Process app screens (resource URL sync runs in dedicated manual pipeline step)
    if (appScreens.length > 0) {
      console.log(`\nProcessing ${appScreens.length} app screen(s) (screen sync only)...`)

      for (const screen of appScreens) {
        console.log(`\n   Processing app screen: ${screen.screenKey}`)

        // Sync screen to prod
        const componentPath = screen.screenComponents.formDefinition.componentPath.replace(/^\//, '')
        const screenSyncResult = await syncScreenFromDevToProd(
          screen,
          target.services.screenManagementApi,
          prodOauthConfig,
          resolveVersionForComponentPath(componentPath)
        )

        if (screenSyncResult.success) {
          syncedScreens++
          console.log(`   App screen sync: ${screenSyncResult.operation}`)
        } else {
          console.log(`   App screen sync failed: ${screenSyncResult.error}`)
          failedSyncScreens.push({
            screen: screen.screenComponents?.formDefinition?.componentPath?.replace(/^\//, '') || screen.screenKey,
            error: screenSyncResult.error,
            stage: 'comprehensive_sync_app'
          })
        }
      }
    }

    // Summary
    console.log(`\nComprehensive Sync Summary:`)
    console.log(`   Total processed screens: ${matchingScreens.length}`)
    console.log(`   Form screens processed: ${formScreens.length}`)
    console.log(`   App screens processed: ${appScreens.length}`)
    console.log(`   Total screens synced: ${syncedScreens}`)
    console.log(`   Failed screen syncs: ${failedSyncScreens.length}`)

    // Determine overall success - true only if no failures occurred
    const overallSuccess = failedSyncScreens.length === 0

    return {
      success: overallSuccess,
      processedScreens: matchingScreens.length,
      formScreens: formScreens.length,
      appScreens: appScreens.length,
      syncedScreens,
      failedSyncScreens
    }
  } catch (error) {
    console.error('Error during comprehensive screen synchronization:', error.message)
    return {
      success: false,
      error: error.message,
      processedScreens: 0,
      syncedScreens: 0,
      failedSyncScreens: []
    }
  }
}

// Detect manual publish mode from pipeline

/**
 * Find all screen directories in the project
 */
async function findAllScreenDirectories() {
  const uniqueDirs = new Set()

  const projectRootDir = path.resolve(__dirname, '..')
  const screenDirs = await getScreenDirectories({ cwd: projectRootDir })

  for (const dir of screenDirs) {
    // strip prefix 'src/business-apps/' to get publish path
    const publishPath = dir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
    if (publishPath) uniqueDirs.add(publishPath)
  }

  return Array.from(uniqueDirs).sort()
}

async function main() {
  console.log('Starting production screen publishing...')
  console.log(`Build number: ${BITBUCKET_BUILD_NUMBER}`)
  console.log('Publish version: rc-per-screen')
  console.log('RC promotion: ENABLED')
  console.log(`Secondary target ${SECONDARY_TARGET ? 'DETECTED' : 'NOT configured'}`)

  // Determine which screens to publish
  let candidateScreens = []
  let isManualScreenList = false
  const manualScreensFile = process.argv[2]

  if (manualScreensFile && fs.existsSync(manualScreensFile)) {
    // Manual screen list provided - use these screens directly (force deploy)
    console.log(`MANUAL MODE: Using specified screens from: ${manualScreensFile}`)
    isManualScreenList = true

    const specifiedScreens = fs
      .readFileSync(manualScreensFile, 'utf8')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Convert all backslashes to forward slashes (Windows paths)
        let normalized = line.replace(/\\/g, '/')
        // Remove any leading slashes that might remain
        normalized = normalized.replace(/^\/+/, '')
        // Remove src/business-apps/ prefix if present (handles both original and converted paths)
        normalized = normalized.replace(/^src\/business-apps\//, '')
        // Remove .ts or .tsx extension if present
        normalized = normalized.replace(/\.tsx?$/, '')
        // Extract screen directory (module/sub-module/.../app-name) - remove subfolders
        // e.g., hr/core/apps/employee-record/components/Foo -> hr/core/apps/employee-record
        const screenMatch = normalized.match(/^(.*?\/(?:apps|forms|popups|records|windows)\/[^/]+)/)
        if (screenMatch) {
          normalized = screenMatch[1]
        }
        return normalized
      })

    console.log(`Found ${specifiedScreens.length} manually specified screen(s):`)
    specifiedScreens.forEach(screen => console.log(`   - ${screen}`))

    // Filter out screens that don't exist
    const projectRootDir = path.resolve(__dirname, '..')
    candidateScreens = specifiedScreens.filter(screen => {
      const sourceEntryFile = path.join(projectRootDir, 'src', 'business-apps', screen, 'index.ts')
      const exists = fs.existsSync(sourceEntryFile)
      if (!exists) {
        console.log(`   WARNING: Skipping non-existent screen: ${screen}`)
      }
      return exists
    })

    console.log(`Will force-deploy ${candidateScreens.length} screen(s) (no hash comparison)`)
  } else {
    // No manual list - compare ALL screens' dev hashes vs prod hashes
    console.log('AUTO MODE: Comparing dev vs prod hashes for ALL screens...')
    candidateScreens = await findAllScreenDirectories()
    console.log(`Found ${candidateScreens.length} total screen(s) in project`)
  }

  const changedScreens = candidateScreens
  const useHashComparison = !isManualScreenList // Skip hash comparison for manual deploys
  const targets = [PRIMARY_TARGET]
  if (SECONDARY_TARGET) targets.push(SECONDARY_TARGET)

  const projectRootDirForHashes = path.resolve(__dirname, '..')
  const devHashFile = path.join(projectRootDirForHashes, 'component-hashes.json')
  const prodHashFile = path.join(projectRootDirForHashes, 'component-hashes-prod.json')
  const publishedScreensFile = path.join(projectRootDirForHashes, 'published-screens.txt')

  // Always initialize the artifact file for downstream manual sync step.
  writePublishedScreensArtifact(publishedScreensFile, [], { silent: true })

  // Load hash files ONCE at the beginning (keep in memory throughout)
  const devHashes = loadHashFile(devHashFile)
  const prodHashes = loadHashFile(prodHashFile)

  // Pre-promotion hash comparison (skip if manual screen list provided)
  let screensToPublish = []
  const skippedScreens = []
  const failedScreens = []

  if (useHashComparison) {
    logPhase('PRE-PROMOTION HASH COMPARISON')

    console.log(`   Dev hashes loaded: ${Object.keys(devHashes).length} screens`)
    console.log(`   Prod hashes loaded: ${Object.keys(prodHashes).length} screens`)

    for (const screen of changedScreens) {
      const comparison = compareScreenHashes(screen, devHashes, prodHashes)

      if (comparison.changed) {
        console.log(`   ${screen}: ${comparison.reason}`)
        screensToPublish.push(screen)
      } else {
        skippedScreens.push({
          screen,
          hash: comparison.devHash,
          reason: 'hash_match'
        })
      }
    }

    console.log(`\n   Pre-promotion comparison results:`)
    console.log(`      Changed screens (will promote): ${screensToPublish.length}`)
    console.log(`      Unchanged screens (skip promotion): ${skippedScreens.length}`)
    console.log(`      Time saved: ~${skippedScreens.length * 10} minutes`)
  } else {
    logPhase('MANUAL SCREEN LIST (HASH COMPARISON SKIPPED)')
    console.log(`   All ${changedScreens.length} specified screen(s) will be force-deployed`)
    screensToPublish = changedScreens
  }

  // Promote RC artifacts (only changed screens or all if manual)
  if (screensToPublish.length === 0) {
    console.log(`\nNo screens need publishing - all unchanged!`)
    return
  }

  logPhase(`RC ARTIFACT PROMOTION (${screensToPublish.length} screen(s))`)

  const successfulScreens = []
  const rcVersionsByScreen = {}

  for (const screen of screensToPublish) {
    console.log(`\nPublishing: ${screen}`)

    try {
      const rcVersion = await promoteReleaseCandidateScreen(screen)
      rcVersionsByScreen[screen] = rcVersion

      successfulScreens.push(screen)
      console.log(`   Published successfully`)
    } catch (error) {
      console.error(`   Failed: ${error.message}`)
      failedScreens.push({
        screen,
        error: error.message,
        stage: 'rc_promote',
        target: error.targetLabel || 'unknown'
      })
    }
  }

  // Keep this artifact strictly scoped to successfully promoted screens.
  writePublishedScreensArtifact(publishedScreensFile, successfulScreens)

  // Screen sync - only for screens that were successfully promoted
  let comprehensiveSyncResults = []

  const screensForSync = successfulScreens

  if (screensForSync.length > 0) {
    logPhase(`SCREEN SYNC (${screensForSync.length} promoted screen(s))`)

    for (const target of targets) {
      console.log(`\nTarget: ${target.label.toUpperCase()} | ScreenMgmt: ${target.services.screenManagementApi}`)
      const result = await handleComprehensiveScreenSyncForTarget(screensForSync, target, rcVersionsByScreen)
      comprehensiveSyncResults.push({ label: target.label, result })
      if (result.success) {
        console.log(`[${target.label}] Comprehensive sync completed successfully.`)
        console.log(`   Processed screens: ${result.processedScreens}`)
        console.log(`   Synced screens: ${result.syncedScreens}`)
      } else {
        console.error(`[${target.label}] Comprehensive sync failed: ${result.error}`)
        console.log('WARNING: Continuing with individual screen uploads as fallback...')
      }
    }

    // Add comprehensive sync failures to failed screens list
    for (const { result, label } of comprehensiveSyncResults) {
      if (result.failedSyncScreens && result.failedSyncScreens.length > 0) {
        failedScreens.push(...result.failedSyncScreens.map(f => ({ ...f, target: label })))
        console.log(`WARNING: [${label}] ${result.failedSyncScreens.length} screen(s) failed during comprehensive sync`)
      }
    }
  } else {
    console.log(`\nNo screens available for comprehensive sync`)
  }

  // Update prod hash file
  if (useHashComparison && successfulScreens.length > 0) {
    logPhase('UPDATE PROD HASH FILE')

    // Update in-memory prod hashes with dev hashes for successfully published screens
    let updatedCount = 0
    for (const screen of successfulScreens) {
      if (devHashes[screen]) {
        prodHashes[screen] = devHashes[screen]
        updatedCount++
        console.log(`   ${screen}: ${devHashes[screen].substring(0, 16)}...`)
      } else {
        console.log(`   WARNING: ${screen}: No dev hash found (screen not in component-hashes.json)`)
      }
    }

    if (updatedCount > 0) {
      // Save updated prod hashes
      saveHashFile(prodHashFile, prodHashes)
      console.log(`\n   Updated ${updatedCount} prod hash(es)`)

      // Keep our new hashes for merge conflict resolution
      const ourNewProdHashes = { ...prodHashes }
      const hashFileName = 'component-hashes-prod.json'

      /**
       * Check if a rebase is currently in progress
       */
      const isRebaseInProgress = () => {
        const gitDir = path.join(projectRootDirForHashes, '.git')
        return fs.existsSync(path.join(gitDir, 'rebase-merge')) || fs.existsSync(path.join(gitDir, 'rebase-apply'))
      }

      /**
       * Abort any in-progress rebase
       */
      const abortRebaseIfNeeded = () => {
        if (isRebaseInProgress()) {
          console.log('   WARNING: Aborting in-progress rebase...')
          try {
            execSync('git rebase --abort', { cwd: projectRootDirForHashes, stdio: 'pipe' })
          } catch {
            // Ignore errors during abort
          }
        }
      }

      /**
       * Resolve merge conflict in hash file by merging our changes with remote
       */
      const resolveHashConflict = () => {
        console.log('   WARNING: Rebase conflict detected, merging hashes manually...')

        // During rebase: --ours = remote (origin/main), --theirs = our local changes
        try {
          execSync(`git checkout --ours ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
        } catch {
          console.log('   Remote version not available, using local as base')
        }

        // Load whatever version we have now
        let remoteHashes = {}
        try {
          remoteHashes = loadHashFile(prodHashFile)
        } catch {
          // If file doesn't exist or is invalid, start fresh
        }

        // Merge our new hashes into the remote version
        const mergedHashes = { ...remoteHashes, ...ourNewProdHashes }

        // Save the merged result
        saveHashFile(prodHashFile, mergedHashes)
        console.log(
          `   Merged ${Object.keys(ourNewProdHashes).length} local hash(es) with ${Object.keys(remoteHashes).length} remote hash(es)`
        )

        // Stage the resolved file
        execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

        // Continue the rebase
        try {
          execSync('git rebase --continue', {
            cwd: projectRootDirForHashes,
            stdio: 'pipe',
            env: { ...process.env, GIT_EDITOR: 'true' }
          })
        } catch {
          execSync('git -c core.editor=true rebase --continue', { cwd: projectRootDirForHashes, stdio: 'pipe' })
        }

        console.log('   Conflict resolved and rebase continued')
      }

      // Commit and push to main
      const targetBranch = 'main'

      try {
        configureGit(projectRootDirForHashes, execSync)

        // Get the current branch name
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
          cwd: projectRootDirForHashes,
          encoding: 'utf8'
        }).trim()
        console.log(`   Current branch: ${currentBranch}`)
        console.log(`   Target branch: ${targetBranch}`)

        // Check if we're already on the target branch
        const needsBranchSwitch = currentBranch !== targetBranch

        if (needsBranchSwitch) {
          console.log(`   Switching from ${currentBranch} to ${targetBranch}...`)

          // Save the hash file content before switching
          const hashFileContent = fs.readFileSync(prodHashFile, 'utf8')

          // Fetch the target branch
          execSync(`git fetch origin ${targetBranch}:${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

          // Checkout the target branch
          execSync(`git checkout ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

          // Restore the hash file with our changes
          fs.writeFileSync(prodHashFile, hashFileContent, 'utf8')
          console.log(`   Switched to ${targetBranch} and restored hash file`)
        }

        execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes })
        execSync(`git commit --no-verify -m "chore(ci): update prod component hashes [skip ci]"`, {
          cwd: projectRootDirForHashes
        })

        // Pull with rebase and push with retry logic
        let pushSuccess = false
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            // Check if there's an incomplete rebase from a previous attempt
            if (isRebaseInProgress()) {
              console.log(`   Attempt ${attempt}/3: Resolving in-progress rebase...`)
              resolveHashConflict()
            } else {
              console.log(`   Attempt ${attempt}/3: Pulling and rebasing...`)
              execSync(`git pull --rebase origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
            }

            // If we got here, rebase succeeded - try to push
            execSync(`git push origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
            pushSuccess = true
            console.log(`   Prod hashes committed and pushed to ${targetBranch}`)
            break
          } catch (error) {
            const errorOutput =
              (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '')

            // Check if this is a rebase conflict or if rebase is in progress
            const isConflict =
              errorOutput.includes('CONFLICT') ||
              errorOutput.includes('Merge conflict') ||
              errorOutput.includes('unmerged files') ||
              errorOutput.includes('fix conflicts') ||
              isRebaseInProgress()

            if (isConflict) {
              try {
                resolveHashConflict()
                // After resolving, try to push
                execSync(`git push origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
                pushSuccess = true
                console.log(`   Prod hashes committed and pushed to ${targetBranch} (after conflict resolution)`)
                break
              } catch (pushError) {
                const pushErrorOutput =
                  (pushError.stdout?.toString() || '') +
                  (pushError.stderr?.toString() || '') +
                  (pushError.message || '')
                if (pushErrorOutput.includes('rejected') || pushErrorOutput.includes('non-fast-forward')) {
                  console.log('   WARNING: More remote changes detected, retrying...')
                  abortRebaseIfNeeded()
                  execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
                  try {
                    execSync(`git commit --no-verify -m "chore(ci): update prod component hashes [skip ci]"`, {
                      cwd: projectRootDirForHashes,
                      stdio: 'pipe'
                    })
                  } catch {
                    // Commit might fail if no changes
                  }
                } else {
                  throw pushError
                }
              }
            } else if (attempt < 3) {
              console.log(`   Push failed (attempt ${attempt}/3), retrying with rebase...`)
              abortRebaseIfNeeded()
              await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
            } else {
              abortRebaseIfNeeded()
              throw error
            }
          }
        }

        if (!pushSuccess) {
          abortRebaseIfNeeded()
          throw new Error('Failed to push after 3 retries')
        }

        // ---------------------------------------------------------------------
        // ALSO COMMIT & PUSH THE FINAL (PUBLISH-GENERATED) HASH FILE TO develop
        // Requirement: always commit the current state from this publish run,
        // regardless of whatever is currently on develop (overwrite/force file).
        // ---------------------------------------------------------------------
        const developBranch = 'develop'
        try {
          // Capture the final state (may include conflict-resolution merges)
          execSync(`git pull origin ${targetBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
          const finalHashFileContent = fs.readFileSync(prodHashFile, 'utf8')

          console.log(`\n   Also syncing ${hashFileName} back to ${developBranch} (overwrite) ...`)

          // Fetch + checkout develop
          execSync(`git fetch origin ${developBranch}:${developBranch}`, {
            cwd: projectRootDirForHashes,
            stdio: 'pipe'
          })
          execSync(`git checkout ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })

          // Overwrite the file with the publish-generated content (force)
          fs.writeFileSync(prodHashFile, finalHashFileContent, 'utf8')

          // Commit (if there are changes)
          execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
          try {
            execSync(`git commit --no-verify -m "chore(ci): sync prod component hashes to develop [skip ci]"`, {
              cwd: projectRootDirForHashes,
              stdio: 'pipe'
            })
          } catch {
            // No changes to commit is fine
            console.log(`   INFO: No ${hashFileName} changes to commit on ${developBranch}`)
          }

          // Pull with rebase and push with retry logic.
          // If there is a conflict, ALWAYS re-apply the publish-generated file content.
          const resolveHashConflictByOverwriting = () => {
            console.log(
              `   WARNING: Rebase conflict detected on ${developBranch}, overwriting ${hashFileName} with publish version...`
            )
            fs.writeFileSync(prodHashFile, finalHashFileContent, 'utf8')
            execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
            try {
              execSync('git rebase --continue', {
                cwd: projectRootDirForHashes,
                stdio: 'pipe',
                env: { ...process.env, GIT_EDITOR: 'true' }
              })
            } catch {
              execSync('git -c core.editor=true rebase --continue', { cwd: projectRootDirForHashes, stdio: 'pipe' })
            }
          }

          let developPushSuccess = false
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              if (isRebaseInProgress()) {
                resolveHashConflictByOverwriting()
              } else {
                execSync(`git pull --rebase origin ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
              }

              // Ensure the publish-generated file content wins (even without conflicts)
              fs.writeFileSync(prodHashFile, finalHashFileContent, 'utf8')
              execSync(`git add ${hashFileName}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
              try {
                execSync(`git commit --no-verify -m "chore(ci): sync prod component hashes to develop [skip ci]"`, {
                  cwd: projectRootDirForHashes,
                  stdio: 'pipe'
                })
              } catch {
                // No changes after rebase is fine
              }

              execSync(`git push origin ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
              developPushSuccess = true
              console.log(`   Prod hashes committed and pushed to ${developBranch}`)
              break
            } catch (error) {
              const errorOutput =
                (error.stdout?.toString() || '') + (error.stderr?.toString() || '') + (error.message || '')

              const isConflict =
                errorOutput.includes('CONFLICT') ||
                errorOutput.includes('Merge conflict') ||
                errorOutput.includes('unmerged files') ||
                errorOutput.includes('fix conflicts') ||
                isRebaseInProgress()

              if (isConflict) {
                try {
                  resolveHashConflictByOverwriting()
                  execSync(`git push origin ${developBranch}`, { cwd: projectRootDirForHashes, stdio: 'pipe' })
                  developPushSuccess = true
                  console.log(
                    `   Prod hashes committed and pushed to ${developBranch} (after overwrite conflict resolution)`
                  )
                  break
                } catch {
                  abortRebaseIfNeeded()
                }
              } else if (attempt < 3) {
                abortRebaseIfNeeded()
                await new Promise(resolve => setTimeout(resolve, 2000 * attempt))
              } else {
                abortRebaseIfNeeded()
                throw error
              }
            }
          }

          if (!developPushSuccess) {
            abortRebaseIfNeeded()
            throw new Error('Failed to push develop hashes after 3 retries')
          }
        } catch (error) {
          abortRebaseIfNeeded()
          console.log(`   WARNING: Failed to commit/push prod hashes to develop: ${error.message}`)
          console.log('   INFO: Screens were published successfully, develop hash sync is non-critical')
        }
      } catch (error) {
        abortRebaseIfNeeded()
        console.log(`   WARNING: Failed to commit/push prod hashes: ${error.message}`)
        console.log('   INFO: Screens were published successfully, hash update is non-critical')
      }
    } else {
      console.log('   INFO: No hashes to update')
    }
  }

  // Print final summary
  logPhase('PRODUCTION PUBLISHING SUMMARY')
  if (BITBUCKET_BUILD_NUMBER) {
    console.log(`Build number: ${BITBUCKET_BUILD_NUMBER}`)
  }
  console.log('Publish version: rc-per-screen')
  console.log(`Total screens processed: ${changedScreens.length}`)

  const totalFailures = failedScreens.length
  const totalSkipped = skippedScreens.length
  const actualSuccessCount = changedScreens.length - totalFailures - totalSkipped

  console.log(`Successfully published: ${actualSuccessCount}`)
  console.log(`Skipped (unchanged): ${totalSkipped}`)
  console.log(`Failed: ${totalFailures}`)

  // Add comprehensive sync summary per target
  console.log(`\nCOMPREHENSIVE SYNC RESULTS (per target):`)
  for (const { label, result } of comprehensiveSyncResults) {
    console.log(`\n   Target: ${label}`)
    console.log(`   Total screens processed: ${result.processedScreens || 0}`)
    console.log(`   Form screens processed: ${result.formScreens || 0}`)
    console.log(`   App screens processed: ${result.appScreens || 0}`)
    console.log(`   Screen configs synced: ${result.syncedScreens || 0}`)
    console.log(`   Screen sync failures: ${result.failedSyncScreens?.length || 0}`)
    if (result.success) {
      console.log(`   Comprehensive sync: SUCCESSFUL`)
    } else {
      console.log(`   Comprehensive sync: FAILED${result.error ? ` (${result.error})` : ''}`)
    }
  }

  // Display skipped screens details
  if (skippedScreens.length > 0) {
    console.log(`\nSKIPPED SCREENS (hashes matched):`)
    skippedScreens.forEach((skip, index) => {
      console.log(`\n${index + 1}. Screen: ${skip.screen}`)
      console.log(`   Hash: ${skip.hash ? skip.hash.substring(0, 16) + '...' : 'N/A'}`)
      console.log(`   Reason: ${skip.reason}`)
    })
  }

  if (failedScreens.length > 0) {
    console.log(`\nFAILED SCREENS:`)

    // Group failures by stage for better readability
    const syncFailures = failedScreens.filter(f => f.stage?.includes('comprehensive_sync'))
    const promoteFailures = failedScreens.filter(f => f.stage === 'rc_promote')

    if (syncFailures.length > 0) {
      console.log(`\nCOMPREHENSIVE SYNC FAILURES (${syncFailures.length}):`)
      syncFailures.forEach((failure, index) => {
        console.log(`\n${index + 1}. Screen: ${failure.screen}`)
        console.log(`   Target: ${failure.target || 'unknown'}`)
        console.log(`   Stage: ${failure.stage}`)
        console.log(`   Error: ${failure.error}`)
      })
    }

    if (promoteFailures.length > 0) {
      console.log(`\nRC PROMOTION FAILURES (${promoteFailures.length}):`)
      promoteFailures.forEach((failure, index) => {
        console.log(`\n${syncFailures.length + index + 1}. Screen: ${failure.screen}`)
        console.log(`   Target: ${failure.target || 'unknown'}`)
        console.log(`   Stage: ${failure.stage}`)
        console.log(`   Error: ${failure.error}`)
      })
    }

    console.log(`\nProduction publishing completed with ${failedScreens.length} failure(s)!`)
    console.log(`Please review the failed screens and fix the issues before next deployment.`)
    if (syncFailures.length > 0) {
      console.log(`WARNING: ${syncFailures.length} screen(s) failed during comprehensive sync`)
    }
    if (promoteFailures.length > 0) {
      console.log(`WARNING: ${promoteFailures.length} screen(s) failed during RC promotion (Azure copy)`)
    }

    // Exit with error code to fail the pipeline
    process.exit(1)
  } else {
    console.log(`\nProduction publishing completed successfully!`)
    console.log(`All ${actualSuccessCount} screen(s) were published without errors.`)
  }
}

main().catch(error => {
  console.error('An unexpected error occurred:', error)
  process.exit(1)
})
