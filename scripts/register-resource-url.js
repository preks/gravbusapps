/**
 * Register a platform Resource URL + Screen Management entry for an already published screen.
 *
 * Example:
 *   node scripts/register-resource-url.js --url /platform/nexus --componentPath platform/apps/nexus
 */

import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import dotenv from '@dotenvx/dotenvx'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import {
  addCustomResourceUrl,
  getResourceUrlByPath,
  getScreenByKey,
  addScreenConfigToScreenManagement,
  updateScreenConfigInScreenManagementDetailed,
  generateScreenKeyFromPath
} from './api-client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

function normalizeCustomUrlPath(input) {
  const trimmed = (input ?? '').trim()
  if (!trimmed) {
    throw new Error('Missing --url. Provide e.g. "/platform/nexus", "/nexus" or "nexus".')
  }

  let v = trimmed
  if (v.startsWith('/platform/')) v = v.slice('/platform/'.length)
  if (v.startsWith('/')) v = v.slice(1)
  v = v.replace(/\/+$/, '') // remove trailing slash(es)

  if (!v) {
    throw new Error(`Invalid --url "${input}" (resolved to empty path).`)
  }
  return v
}

function normalizeComponentPath(input) {
  const trimmed = (input ?? '').trim()
  if (!trimmed) {
    throw new Error('Missing --componentPath. Provide e.g. "platform/apps/nexus".')
  }
  let v = trimmed
  if (v.startsWith('/')) v = v.slice(1)
  v = v.replace(/\/+$/, '')
  if (!v) {
    throw new Error(`Invalid --componentPath "${input}" (resolved to empty path).`)
  }
  return v
}

const argv = yargs(hideBin(process.argv))
  .option('url', {
    type: 'string',
    demandOption: true,
    describe: 'Platform URL (or path) to register. Examples: /platform/nexus, /nexus, nexus'
  })
  .option('componentPath', {
    type: 'string',
    demandOption: true,
    describe: 'Component path (Azure destination path). Example: platform/apps/nexus'
  })
  .option('dryRun', {
    type: 'boolean',
    default: false,
    describe: 'Print actions without calling APIs'
  })
  .option('forceUpdateScreen', {
    type: 'boolean',
    default: false,
    describe: 'Force update Screen Management entry even if it already matches'
  })
  .help().argv

async function main() {
  const customUrlPath = normalizeCustomUrlPath(argv.url)
  const componentPath = normalizeComponentPath(argv.componentPath)

  const platformUrl = `/platform/${customUrlPath}`
  const screenKey = generateScreenKeyFromPath(customUrlPath)
  const expectedComponentPath = `/${componentPath}`

  console.log('🔧 Registering resource URL + screen config')
  console.log(`   URL: ${platformUrl}`)
  console.log(`   Screen key: ${screenKey}`)
  console.log(`   Component path: ${expectedComponentPath}`)
  console.log(`   Dry run: ${argv.dryRun ? 'YES' : 'NO'}`)

  // 1) Resource URL (Navigation service)
  const existingResource = await getResourceUrlByPath(platformUrl).catch(() => null)
  if (existingResource) {
    console.log(`✅ Resource URL already exists: ${platformUrl}`)
  } else if (argv.dryRun) {
    console.log(`🧪 Would create resource URL: ${platformUrl}`)
  } else {
    await addCustomResourceUrl(customUrlPath)
  }

  // 2) Screen config (Screen Management service)
  const existingScreen = await getScreenByKey(screenKey).catch(() => null)
  if (!existingScreen) {
    if (argv.dryRun) {
      console.log(`🧪 Would create screen config for key: ${screenKey}`)
    } else {
      await addScreenConfigToScreenManagement(componentPath, customUrlPath)
    }
    console.log('✅ Done.')
    return
  }

  const currentComponentPath = existingScreen?.screenComponents?.formDefinition?.componentPath || null
  const needsUpdate =
    argv.forceUpdateScreen ||
    existingScreen?.screenComponents?.builderType !== 'NATIVE_SCREEN' ||
    (typeof currentComponentPath === 'string' && currentComponentPath !== expectedComponentPath) ||
    (!currentComponentPath && expectedComponentPath)

  if (!needsUpdate) {
    console.log(`✅ Screen config already looks correct (ID: ${existingScreen.id})`)
    console.log('✅ Done.')
    return
  }

  if (argv.dryRun) {
    console.log(`🧪 Would update screen config (ID: ${existingScreen.id}) to componentPath: ${expectedComponentPath}`)
    console.log('✅ Done.')
    return
  }

  const updatedScreen = {
    ...existingScreen,
    screenKey: screenKey,
    screenComponents: {
      ...(existingScreen.screenComponents || {}),
      key: screenKey,
      builderType: 'NATIVE_SCREEN',
      formDefinition: {
        ...(existingScreen.screenComponents?.formDefinition || {}),
        componentPath: expectedComponentPath
      },
      release: existingScreen.screenComponents?.release ?? 'true'
    }
  }

  const updateResult = await updateScreenConfigInScreenManagementDetailed(existingScreen.id, updatedScreen)
  if (!updateResult.success) {
    throw new Error(updateResult.message || 'Failed to update screen config')
  }

  console.log(`✅ Screen config updated (ID: ${existingScreen.id})`)
  console.log('✅ Done.')
}

main().catch(error => {
  console.error('❌ Failed to register resource URL:', error?.message || error)
  process.exit(1)
})
