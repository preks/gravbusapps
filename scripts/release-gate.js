import fs from 'node:fs'
import path, { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { logPhase } from './utils/logPhase.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const SCREEN_RELEASE_RESULT_FILE = path.resolve(__dirname, '..', 'screen-release-result.json')
const RESOURCE_URL_RESULT_FILE = path.resolve(__dirname, '..', 'resource-url-result.json')

function readResultFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing required release result artifact: ${path.basename(filePath)}`)
  }

  return JSON.parse(fs.readFileSync(filePath, 'utf8'))
}

function printCreatedResourceUrls(created) {
  logPhase('FINAL CREATED RESOURCE URLS')

  if (!created || created.length === 0) {
    console.log('No resource URLs were created.')
    return
  }

  const byTarget = new Map()
  for (const item of created) {
    const items = byTarget.get(item.target) || []
    items.push(item)
    byTarget.set(item.target, items)
  }

  for (const [target, items] of byTarget.entries()) {
    console.log(`\n${target}:`)
    items.forEach(item => {
      const id = item.id ? ` (id: ${item.id})` : ''
      console.log(`   - ${item.url}${id}`)
    })
  }
}

function printDuplicateNameWarnings(warnings) {
  logPhase('FINAL RESOURCE URL DUPLICATE NAME WARNINGS')

  if (!warnings || warnings.length === 0) {
    console.log('No duplicate resource URL names found.')
    return
  }

  for (const warning of warnings) {
    if (warning.error) {
      console.log(`\n${warning.target}: duplicate check failed (${warning.error})`)
      continue
    }

    console.log(`\n${warning.target}: ${warning.name} (${warning.count})`)
    warning.entries.forEach(entry => {
      const id = entry.id ? ` [${entry.id}]` : ''
      console.log(`   - ${entry.url}${id}`)
    })
  }
}

function printMovedResourceUrlWarnings(warnings) {
  logPhase('FINAL MOVED SCREEN RESOURCE URL WARNINGS')

  if (!warnings || warnings.length === 0) {
    console.log('No possible moved screen resource URLs found.')
    return
  }

  for (const warning of warnings) {
    if (warning.error) {
      console.log(`\n${warning.target}: moved resource URL check failed (${warning.error})`)
      continue
    }

    console.log(`\n${warning.target}: ${warning.name}`)
    console.log(`   Screen key: ${warning.screenKey || 'unknown'}`)
    console.log(`   New URL: ${warning.newUrl}`)
    warning.previousEntries.forEach(entry => {
      const id = entry.id ? ` [${entry.id}]` : ''
      console.log(`   Previous URL: ${entry.url}${id}`)
    })
  }
}

function printScreenFailures(failedScreens) {
  if (!failedScreens || failedScreens.length === 0) {
    return
  }

  logPhase('SCREEN RELEASE FAILURES')
  failedScreens.forEach((failure, index) => {
    console.log(`\n${index + 1}. Screen: ${failure.screen}`)
    console.log(`   Stage: ${failure.stage || 'unknown'}`)
    console.log(`   Target: ${failure.target || 'unknown'}`)
    console.log(`   Error: ${failure.error}`)
  })
}

function printResourceUrlFailures(failedResourceUrls) {
  if (!failedResourceUrls || failedResourceUrls.length === 0) {
    return
  }

  logPhase('RESOURCE URL CREATION FAILURES')
  failedResourceUrls.forEach((failure, index) => {
    console.log(`\n${index + 1}. URL: ${failure.url || 'unknown'}`)
    console.log(`   Target: ${failure.target || 'unknown'}`)
    console.log(`   Screen key: ${failure.screenKey || 'unknown'}`)
    console.log(`   Error: ${failure.error}`)
  })
}

function main() {
  const screenResult = readResultFile(SCREEN_RELEASE_RESULT_FILE)
  const resourceUrlResult = readResultFile(RESOURCE_URL_RESULT_FILE)

  logPhase('FINAL RELEASE GATE SUMMARY')
  console.log(`Screen release status: ${screenResult.status}`)
  console.log(`Resource URL creation status: ${resourceUrlResult.status}`)
  console.log(`Published screens: ${screenResult.publishedScreens?.length || 0}`)
  console.log(`Screen release failures: ${screenResult.failedScreens?.length || 0}`)
  console.log(`Resource URL create failures: ${resourceUrlResult.failed?.length || 0}`)

  printCreatedResourceUrls(resourceUrlResult.created)
  printDuplicateNameWarnings(resourceUrlResult.duplicateNameWarnings)
  printMovedResourceUrlWarnings(resourceUrlResult.movedResourceUrlWarnings)
  printScreenFailures(screenResult.failedScreens)
  printResourceUrlFailures(resourceUrlResult.failed)

  if (screenResult.status === 'failed' || resourceUrlResult.status === 'failed') {
    console.log('\nRelease pipeline failed. See failures above.')
    process.exit(1)
  }

  console.log('\nRelease pipeline completed successfully.')
}

main()
