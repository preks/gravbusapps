/**
 * Screen Management Path Update Script
 * Updates component paths in screen management service after CRM/IRM restructuring
 *
 * Usage:
 *   node scripts/update-screen-paths.js --dry-run    # Dry run mode (default)
 *   node scripts/update-screen-paths.js --execute   # Execute updates
 *   node scripts/update-screen-paths.js --validate  # Only validate paths exist
 */

import path, { dirname } from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import dotenv from '@dotenvx/dotenvx'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { getScreenByKey, updateScreenConfigInScreenManagement, getAllNativeScreens } from './api-client.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

// Screen key mappings (from docs/update_screen_resources.md lines 1-28)
const screenKeyMappings = {
  'url_crm~customer-launcher': '/crm/core/apps/customer-launcher',
  'url_crm~customer-relations': '/crm/core/apps/customer-relations',
  'url_crm~customer-settings': '/crm/core/apps/customer-settings',
  'url_crm~account-record': '/crm/core/records/account-record',
  'url_crm~campaign-record': '/crm/core/records/campaign-record',
  'url_crm~contact-record': '/crm/core/records/contact-record',
  'url_crm~lead-record': '/crm/core/records/lead-record',
  'url_crm~opportunity-record': '/crm/core/records/opportunity-record',
  'url_crm~team-performance': '/crm/performance/apps/sales-team-performance',
  'url_irm~investment-launcher': '/irm/core/apps/investment-launcher',
  'url_irm~investment-relations': '/irm/core/apps/investment-relations',
  'url_irm~investment-settings': '/irm/core/apps/investment-settings',
  'url_irm~account-record': '/irm/core/records/account-record',
  'url_irm~contact-record': '/irm/core/records/contact-record',
  'url_irm~lead-record': '/irm/core/records/lead-record',
  'url_irm~opportunity-record': '/irm/core/records/opportunity-record',
  'url_irm~investment-management': '/irm/investments/apps/investment-management',
  'url_irm~investment-report-portal': '/irm/investments/apps/investment-report-portal',
  'url_irm~investment-record': '/irm/investments/records/investment-record'
}

// Component path mappings (from docs/update_screen_resources.md lines 30-85)
const componentPathMappings = {
  // CRM Forms
  '/crm/common/forms/account-form': '/crm/core/forms/account-form',
  '/crm/common/forms/campaign-form': '/crm/core/forms/campaign-form',
  '/crm/common/forms/contact-form': '/crm/core/forms/contact-form',
  '/crm/common/forms/convert-lead-form': '/crm/core/forms/convert-lead-form',
  '/crm/common/forms/document-upload-form': '/crm/core/forms/document-upload-form',
  '/crm/common/forms/lead-form': '/crm/core/forms/lead-form',
  '/crm/forms/mark-as-lost-form': '/crm/core/forms/mark-as-lost-form',
  '/crm/common/forms/notes-form': '/crm/core/forms/notes-form',
  '/crm/common/forms/opportunity-form': '/crm/core/forms/opportunity-form',
  '/crm/common/forms/sales-activity-form': '/crm/core/forms/sales-activity-form',
  '/crm/common/forms/sales-task-form': '/crm/core/forms/sales-task-form',

  // CRM Popups
  '/crm/common/popups/document-creation-popup': '/crm/core/popups/document-creation-popup',
  '/crm/common/popups/stage-condition-popup': '/crm/core/popups/stage-condition-popup',
  '/crm/common/popups/stage-transition-popup': '/crm/core/popups/stage-transition-popup',

  // IRM Forms
  '/crm/investments/forms/account-form': '/irm/core/forms/account-form',
  '/crm/investments/forms/activity-form': '/irm/core/forms/activity-form',
  '/crm/investments/forms/contact-form': '/irm/core/forms/contact-form',
  '/crm/investments/forms/lead-convert-form': '/irm/core/forms/lead-convert-form',
  '/crm/investments/forms/lead-form': '/irm/core/forms/lead-form',
  '/crm/investments/forms/note-form': '/irm/core/forms/note-form',
  '/crm/investments/forms/opportunity-form': '/irm/core/forms/opportunity-form',
  '/crm/investments/forms/task-form': '/irm/core/forms/task-form',
  '/crm/investments/forms/equity-investment-round-form': '/irm/investments/forms/equity-investment-round-form',
  '/crm/investments/forms/investment-form': '/irm/investments/forms/investment-form',
  '/crm/investments/forms/investment-report-approve-form': '/irm/investments/forms/investment-report-approve-form',
  '/crm/investments/forms/investment-report-upload-form': '/irm/investments/forms/investment-report-upload-form',

  // IRM Popups
  '/crm/investments/popups/activity-delete-popup': '/irm/core/popups/activity-delete-popup',
  '/crm/investments/popups/document-delete-popup': '/irm/core/popups/document-delete-popup',
  '/crm/investments/popups/document-popup': '/irm/core/popups/document-popup',
  '/crm/investments/popups/note-delete-popup': '/irm/core/popups/note-delete-popup',
  '/crm/investments/popups/stage-condition-popup': '/irm/core/popups/stage-condition-popup',
  '/crm/investments/popups/stage-transition-popup': '/irm/core/popups/stage-transition-popup',
  '/crm/investments/popups/task-delete-popup': '/irm/core/popups/task-delete-popup',
  '/crm/investments/popups/equity-investment-round-delete-popup':
    '/irm/investments/popups/equity-investment-round-delete-popup',
  '/crm/investments/popups/investment-delete-popup': '/irm/investments/popups/investment-delete-popup',
  '/crm/investments/popups/investment-popup': '/irm/investments/popups/investment-popup'
}

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('dry-run', {
    description: 'Dry run mode - show what would be updated without making changes',
    type: 'boolean',
    default: true
  })
  .option('execute', {
    description: 'Execute mode - actually perform the updates',
    type: 'boolean',
    default: false
  })
  .option('validate', {
    description: 'Validation mode - only check if paths exist',
    type: 'boolean',
    default: false
  })
  .help().argv

// Logging utility
class Logger {
  constructor() {
    this.logs = []
    this.startTime = new Date()
  }

  log(level, message, data = null) {
    const timestamp = new Date().toISOString()
    const logEntry = { timestamp, level, message, data }
    this.logs.push(logEntry)

    const prefix =
      {
        INFO: 'ℹ️',
        SUCCESS: '✅',
        WARNING: '⚠️',
        ERROR: '❌',
        DRY_RUN: '🔍'
      }[level] || '📝'

    console.log(`${prefix} [${timestamp}] ${message}`)
    if (data) {
      console.log(`   Data:`, JSON.stringify(data, null, 2))
    }
  }

  info(message, data = null) {
    this.log('INFO', message, data)
  }
  success(message, data = null) {
    this.log('SUCCESS', message, data)
  }
  warning(message, data = null) {
    this.log('WARNING', message, data)
  }
  error(message, data = null) {
    this.log('ERROR', message, data)
  }
  dryRun(message, data = null) {
    this.log('DRY_RUN', message, data)
  }

  getSummary() {
    const endTime = new Date()
    const duration = endTime - this.startTime
    const errorCount = this.logs.filter(l => l.level === 'ERROR').length
    const warningCount = this.logs.filter(l => l.level === 'WARNING').length
    const successCount = this.logs.filter(l => l.level === 'SUCCESS').length

    return {
      duration: `${duration}ms`,
      totalLogs: this.logs.length,
      errors: errorCount,
      warnings: warningCount,
      successes: successCount
    }
  }
}

// Validation functions
function validateRepositoryPath(componentPath) {
  const projectRoot = path.resolve(__dirname, '..')
  const fullPath = path.join(projectRoot, 'src', 'business-apps', componentPath.substring(1)) // Remove leading slash
  const indexPath = path.join(fullPath, 'index.ts')

  return {
    exists: fs.existsSync(fullPath),
    hasIndex: fs.existsSync(indexPath),
    path: fullPath,
    indexPath
  }
}

function validateAllRepositoryPaths() {
  const logger = new Logger()
  logger.info('Validating repository paths...')

  const allPaths = [...Object.values(screenKeyMappings), ...Object.values(componentPathMappings)]
  const results = {
    valid: [],
    invalid: [],
    missing: []
  }

  for (const componentPath of allPaths) {
    const validation = validateRepositoryPath(componentPath)

    if (validation.exists && validation.hasIndex) {
      results.valid.push({ path: componentPath, ...validation })
      logger.success(`Repository path exists: ${componentPath}`)
    } else if (validation.exists && !validation.hasIndex) {
      results.invalid.push({ path: componentPath, ...validation })
      logger.warning(`Repository path exists but missing index.ts: ${componentPath}`)
    } else {
      results.missing.push({ path: componentPath, ...validation })
      logger.error(`Repository path missing: ${componentPath}`)
    }
  }

  logger.info(
    `Validation complete: ${results.valid.length} valid, ${results.invalid.length} invalid, ${results.missing.length} missing`
  )
  return results
}

// Screen management functions
async function findScreensByScreenKey(screenKey) {
  try {
    const screen = await getScreenByKey(screenKey)
    return screen ? [screen] : []
  } catch (error) {
    console.error(`Error finding screen by key ${screenKey}:`, error.message)
    return []
  }
}

async function findScreensByComponentPath(componentPath) {
  try {
    const allScreens = await getAllNativeScreens()
    return allScreens.filter(screen => screen.screenComponents?.formDefinition?.componentPath === componentPath)
  } catch (error) {
    console.error(`Error finding screens by component path ${componentPath}:`, error.message)
    return []
  }
}

async function updateScreenComponentPath(screen, newComponentPath, isDryRun = true) {
  const logger = new Logger()

  if (isDryRun) {
    logger.dryRun(`Would update screen ${screen.screenKey} (ID: ${screen.id})`)
    logger.dryRun(`  Current path: ${screen.screenComponents?.formDefinition?.componentPath}`)
    logger.dryRun(`  New path: ${newComponentPath}`)
    return { success: true, dryRun: true }
  }

  try {
    const updateData = {
      ...screen,
      screenComponents: {
        ...screen.screenComponents,
        formDefinition: {
          ...screen.screenComponents.formDefinition,
          componentPath: newComponentPath
        }
      }
    }

    const success = await updateScreenConfigInScreenManagement(screen.id, updateData)

    if (success) {
      logger.success(`Updated screen ${screen.screenKey} (ID: ${screen.id})`)
      logger.success(`  New path: ${newComponentPath}`)
      return { success: true, dryRun: false }
    } else {
      logger.error(`Failed to update screen ${screen.screenKey} (ID: ${screen.id})`)
      return { success: false, dryRun: false }
    }
  } catch (error) {
    logger.error(`Error updating screen ${screen.screenKey}:`, error.message)
    return { success: false, dryRun: false, error: error.message }
  }
}

// Main execution functions
async function processScreenKeyUpdates(isDryRun = true) {
  const logger = new Logger()
  logger.info('Processing screen key updates...')

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    notFound: 0,
    notFoundKeys: []
  }

  for (const [screenKey, newComponentPath] of Object.entries(screenKeyMappings)) {
    logger.info(`Processing screen key: ${screenKey}`)

    const screens = await findScreensByScreenKey(screenKey)

    if (screens.length === 0) {
      logger.warning(`No screen found for key: ${screenKey}`)
      results.notFound++
      results.notFoundKeys.push(screenKey)
      continue
    }

    for (const screen of screens) {
      results.processed++
      const result = await updateScreenComponentPath(screen, newComponentPath, isDryRun)

      if (result.success) {
        results.successful++
      } else {
        results.failed++
      }
    }
  }

  logger.info(
    `Screen key updates complete: ${results.processed} processed, ${results.successful} successful, ${results.failed} failed, ${results.notFound} not found`
  )

  if (results.notFoundKeys.length > 0) {
    logger.warning(`Screen keys not found in screen management:`)
    results.notFoundKeys.forEach(key => {
      logger.warning(`  - ${key}`)
    })
  }

  return results
}

async function processComponentPathUpdates(isDryRun = true) {
  const logger = new Logger()
  logger.info('Processing component path updates...')

  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    notFound: 0,
    notFoundPaths: []
  }

  for (const [oldComponentPath, newComponentPath] of Object.entries(componentPathMappings)) {
    logger.info(`Processing component path: ${oldComponentPath} -> ${newComponentPath}`)

    const screens = await findScreensByComponentPath(oldComponentPath)

    if (screens.length === 0) {
      logger.warning(`No screens found for component path: ${oldComponentPath}`)
      results.notFound++
      results.notFoundPaths.push(oldComponentPath)
      continue
    }

    logger.info(`Found ${screens.length} screen(s) with component path: ${oldComponentPath}`)

    for (const screen of screens) {
      results.processed++
      const result = await updateScreenComponentPath(screen, newComponentPath, isDryRun)

      if (result.success) {
        results.successful++
      } else {
        results.failed++
      }
    }
  }

  logger.info(
    `Component path updates complete: ${results.processed} processed, ${results.successful} successful, ${results.failed} failed, ${results.notFound} not found`
  )

  if (results.notFoundPaths.length > 0) {
    logger.warning(`Component paths not found in screen management:`)
    results.notFoundPaths.forEach(path => {
      logger.warning(`  - ${path}`)
    })
  }

  return results
}

// Main execution
async function main() {
  const logger = new Logger()
  const isDryRun = argv.dryRun && !argv.execute
  const isValidationOnly = argv.validate

  logger.info(`Starting screen path update script...`)
  logger.info(`Mode: ${isValidationOnly ? 'VALIDATION' : isDryRun ? 'DRY_RUN' : 'EXECUTE'}`)

  try {
    // Step 1: Validate repository paths
    logger.info('Step 1: Validating repository paths...')
    const validationResults = validateAllRepositoryPaths()

    if (validationResults.missing.length > 0) {
      logger.error(
        `Found ${validationResults.missing.length} missing repository paths. Please fix these before proceeding.`
      )
      logger.error(
        'Missing paths:',
        validationResults.missing.map(p => p.path)
      )

      if (isValidationOnly) {
        logger.info('Validation complete. Exiting due to missing paths.')
        return
      }

      // Ask if user wants to continue despite missing paths
      logger.warning('Some repository paths are missing. Continuing with available paths only.')
    }

    if (isValidationOnly) {
      logger.info('Validation complete. Exiting.')
      return
    }

    // Step 2: Process screen key updates
    logger.info('Step 2: Processing screen key updates...')
    const screenKeyResults = await processScreenKeyUpdates(isDryRun)

    // Step 3: Process component path updates
    logger.info('Step 3: Processing component path updates...')
    const componentPathResults = await processComponentPathUpdates(isDryRun)

    // Step 4: Summary
    logger.info('Step 4: Generating summary...')
    const summary = logger.getSummary()

    logger.info('=== EXECUTION SUMMARY ===')
    logger.info(`Duration: ${summary.duration}`)
    logger.info(`Total logs: ${summary.totalLogs}`)
    logger.info(`Errors: ${summary.errors}`)
    logger.info(`Warnings: ${summary.warnings}`)
    logger.info(`Successes: ${summary.successes}`)

    logger.info('=== SCREEN KEY UPDATES ===')
    logger.info(`Processed: ${screenKeyResults.processed}`)
    logger.info(`Successful: ${screenKeyResults.successful}`)
    logger.info(`Failed: ${screenKeyResults.failed}`)
    logger.info(`Not found: ${screenKeyResults.notFound}`)

    if (screenKeyResults.notFoundKeys && screenKeyResults.notFoundKeys.length > 0) {
      logger.warning(`Screen keys not found:`)
      screenKeyResults.notFoundKeys.forEach(key => {
        logger.warning(`  - ${key}`)
      })
    }

    logger.info('=== COMPONENT PATH UPDATES ===')
    logger.info(`Processed: ${componentPathResults.processed}`)
    logger.info(`Successful: ${componentPathResults.successful}`)
    logger.info(`Failed: ${componentPathResults.failed}`)
    logger.info(`Not found: ${componentPathResults.notFound}`)

    if (componentPathResults.notFoundPaths && componentPathResults.notFoundPaths.length > 0) {
      logger.warning(`Component paths not found:`)
      componentPathResults.notFoundPaths.forEach(path => {
        logger.warning(`  - ${path}`)
      })
    }

    if (isDryRun) {
      logger.info('=== DRY RUN COMPLETE ===')
      logger.info('No actual changes were made. Use --execute to perform updates.')
    } else {
      logger.info('=== EXECUTION COMPLETE ===')
      logger.info('All updates have been processed.')
    }
  } catch (error) {
    logger.error('Script execution failed:', error.message)
    process.exit(1)
  }
}

main().catch(error => {
  console.error('❌ Unexpected error:', error)
  process.exit(1)
})
