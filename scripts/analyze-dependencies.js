#!/usr/bin/env node
/**
 * Smart dependency analyzer
 * Traces which screens are affected by changes to:
 * - Package dependencies (package.json)
 * - Shared code (src/common/*, src/components/*)
 *
 * Returns list of affected screen paths
 */

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { glob } from 'glob'

const projectRoot = process.cwd()

/**
 * Find all screen directories
 */
async function findAllScreens() {
  const patterns = [
    'src/business-apps/**/apps/*/index.ts',
    'src/business-apps/**/forms/*/index.ts',
    'src/business-apps/**/popups/*/index.ts',
    'src/business-apps/**/records/*/index.ts',
    'src/business-apps/**/windows/*/index.ts',
    'src/business-apps/**/debug/*/index.ts'
  ]

  const screens = new Set()

  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd: projectRoot, nodir: true })
    for (const file of files) {
      const dir = path.dirname(file)
      const screenPath = dir.replace(/^src[\\/]+business-apps[\\/]+/, '').replace(/\\/g, '/')
      screens.add(screenPath)
    }
  }

  return Array.from(screens).sort()
}

/**
 * Get all TypeScript/JavaScript files in a screen directory
 */
async function getScreenFiles(screenPath) {
  const screenDir = path.join(projectRoot, 'src', 'business-apps', screenPath)
  const files = await glob('**/*.{ts,tsx,js,jsx}', { cwd: screenDir, nodir: true })
  return files.map(f => path.join(screenDir, f))
}

/**
 * Check if a file imports from a specific path pattern
 */
function fileImportsFrom(filePath, importPattern) {
  try {
    const content = fs.readFileSync(filePath, 'utf8')

    // Match various import patterns
    const patterns = [
      new RegExp(`from\\s+['"]${importPattern}['"]`, 'g'),
      new RegExp(`from\\s+['"]${importPattern}/`, 'g'),
      new RegExp(`import\\s+['"]${importPattern}['"]`, 'g'),
      new RegExp(`import\\s+['"]${importPattern}/`, 'g'),
      new RegExp(`require\\s*\\(\\s*['"]${importPattern}`, 'g')
    ]

    for (const pattern of patterns) {
      if (pattern.test(content)) {
        return true
      }
    }

    return false
  } catch {
    return false
  }
}

/**
 * Check if a screen uses a specific package
 */
async function screenUsesPackage(screenPath, packageName) {
  const files = await getScreenFiles(screenPath)

  for (const file of files) {
    if (fileImportsFrom(file, packageName)) {
      return true
    }
  }

  return false
}

/**
 * Find screens that import a specific changed file
 */
async function findScreensImportingFile(changedFile) {
  const affectedScreens = new Set()
  const allScreens = await findAllScreens()

  // Normalize the changed file path to various import formats
  // e.g., src/common/utils/formatters.ts -> @/common/utils/formatters
  const fileWithoutExt = changedFile.replace(/\.(ts|tsx|js|jsx)$/, '').replace(/\/index$/, '')

  // Format 1: @/ alias (e.g., @/common/utils/formatters)
  const aliasPath = fileWithoutExt.replace(/^src\//, '@/')

  // Format 2: Raw path without src/ (e.g., common/utils/formatters)
  const rawPath = fileWithoutExt.replace(/^src\//, '')

  // Format 3: For relative imports, we need the path segments
  // e.g., '../../../../../common/network/cost-center/useCostCentersByStructure'
  // We look for the distinctive part: 'common/network/cost-center/useCostCentersByStructure'
  const relativePath = rawPath

  // Also get directory paths for folder imports
  const aliasDir = path.dirname(aliasPath)
  const rawDir = path.dirname(rawPath)

  for (const screen of allScreens) {
    const files = await getScreenFiles(screen)

    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8')

        // Check for various import formats:
        // 1. @/ alias imports: import { x } from '@/common/utils/file'
        // 2. Raw path imports: import { x } from 'common/utils/file'
        // 3. Relative imports: import { x } from '../../../common/utils/file'
        //    For relative imports, we just check if the path ends with our target
        if (
          content.includes(aliasPath) ||
          content.includes(aliasDir) ||
          content.includes(`/${relativePath}'`) || // Matches '../../../common/utils/file'
          content.includes(`/${relativePath}"`) || // Double quotes
          content.includes(`/${rawDir}'`) ||
          content.includes(`/${rawDir}"`)
        ) {
          affectedScreens.add(screen)
          break
        }
      } catch {
        // Skip unreadable files
      }
    }
  }

  return affectedScreens
}

/**
 * Cache of known screen directories (folders with index.ts)
 */
let screenDirectoriesCache = null

/**
 * Get all screen directories (folders with index.ts in apps/forms/popups/records)
 */
async function getScreenDirectories() {
  if (screenDirectoriesCache !== null) {
    return screenDirectoriesCache
  }

  const patterns = [
    'src/business-apps/**/apps/*/index.ts',
    'src/business-apps/**/forms/*/index.ts',
    'src/business-apps/**/popups/*/index.ts',
    'src/business-apps/**/records/*/index.ts',
    'src/business-apps/**/windows/*/index.ts'
  ]

  const screenDirs = new Set()

  for (const pattern of patterns) {
    const files = await glob(pattern, { cwd: projectRoot, nodir: true })
    for (const file of files) {
      // Get the directory containing the index.ts
      const dir = path.dirname(file)
      screenDirs.add(dir)
    }
  }

  screenDirectoriesCache = screenDirs
  return screenDirs
}

/**
 * Check if a file path is a screen-specific file
 * A screen is defined as a folder in apps/forms/popups/records that has an index.ts file
 */
async function isScreenSpecificFile(filePath) {
  // Must be in a potential screen location (apps/forms/popups/records)
  if (!/\/(apps|forms|popups|records)\//.test(filePath)) {
    return false
  }

  // Get all known screen directories
  const screenDirs = await getScreenDirectories()

  // Check if this file is inside any screen directory
  for (const screenDir of screenDirs) {
    if (filePath.startsWith(screenDir + '/') || filePath === screenDir) {
      return true
    }
  }

  // File is in apps/forms/popups/records but NOT in a folder with index.ts
  // This means it's shared code (e.g., forms/components/)
  return false
}

/**
 * Find shared files that import from a specific package
 * Shared files include:
 * 1. Global shared: src/* except src/business-apps/*
 * 2. Shared in business-apps: NOT inside a screen folder (folder with index.ts)
 *    Examples: hr/core/hooks/, forms/components/, etc.
 */
async function findSharedFilesUsingPackage(packageName) {
  const sharedFiles = []

  // Search in ALL src/ folders
  const allSrcFiles = await glob('src/**/*.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    nodir: true
  })

  for (const file of allSrcFiles) {
    // Skip screen-specific files (inside a screen folder with index.ts)
    if (await isScreenSpecificFile(file)) {
      continue
    }

    const filePath = path.join(projectRoot, file)
    if (fileImportsFrom(filePath, packageName)) {
      sharedFiles.push(file)
    }
  }

  return sharedFiles
}

/**
 * Find screens affected by a package change through transitive dependencies
 * Path: package -> shared code (src/* except business-apps) -> screens
 */
async function findScreensAffectedByPackageTransitively(packageName) {
  const affectedScreens = new Set()

  console.log(`   🔗 Checking transitive dependencies for: ${packageName}`)

  // Step 1: Find shared files that use this package
  const sharedFiles = await findSharedFilesUsingPackage(packageName)

  if (sharedFiles.length > 0) {
    console.log(`      Found ${sharedFiles.length} shared file(s) using ${packageName}:`)
    sharedFiles.slice(0, 5).forEach(f => console.log(`         - ${f}`))
    if (sharedFiles.length > 5) {
      console.log(`         ... and ${sharedFiles.length - 5} more`)
    }

    // Step 2: Find screens that import from these shared files
    for (const sharedFile of sharedFiles) {
      const screensUsingFile = await findScreensImportingFile(sharedFile)

      for (const screen of screensUsingFile) {
        affectedScreens.add(screen)
      }
    }

    console.log(`      → Screens affected via shared code: ${affectedScreens.size}`)
  }

  return affectedScreens
}

/**
 * Find screens affected by a shared file change through transitive dependencies
 * Path: changed shared file -> other shared files that import it -> screens
 */
async function findScreensAffectedBySharedFileTransitively(changedFile) {
  const affectedScreens = new Set()

  // Normalize the changed file path for import matching
  const fileWithoutExt = changedFile.replace(/\.(ts|tsx|js|jsx)$/, '').replace(/\/index$/, '')

  const rawPath = fileWithoutExt.replace(/^src\//, '')

  // Find all shared files that import this changed file
  const allSrcFiles = await glob('src/**/*.{ts,tsx,js,jsx}', {
    cwd: projectRoot,
    nodir: true
  })

  const sharedFilesImportingChanged = []

  for (const file of allSrcFiles) {
    // Skip the changed file itself
    if (file === changedFile) continue

    // Skip screen-specific files (we only want shared files)
    if (await isScreenSpecificFile(file)) continue

    const filePath = path.join(projectRoot, file)
    try {
      const content = fs.readFileSync(filePath, 'utf8')

      // Check if this file imports the changed file
      if (
        content.includes(`/${rawPath}'`) ||
        content.includes(`/${rawPath}"`) ||
        content.includes(`@/${rawPath.replace(/^common\//, 'common/')}'`) ||
        content.includes(`@/${rawPath.replace(/^common\//, 'common/')}"`)
      ) {
        sharedFilesImportingChanged.push(file)
      }
    } catch {
      // Skip unreadable files
    }
  }

  if (sharedFilesImportingChanged.length > 0) {
    // Find screens that import from these intermediate shared files
    for (const sharedFile of sharedFilesImportingChanged) {
      const screensUsingFile = await findScreensImportingFile(sharedFile)
      for (const screen of screensUsingFile) {
        affectedScreens.add(screen)
      }
    }
  }

  return affectedScreens
}

/**
 * Parse package.json diff to find changed packages
 * Only looks at dependencies, devDependencies, and peerDependencies sections
 */
function getChangedPackages(gitDiffOutput) {
  const changedPackages = new Set()

  // First, read the actual package.json to understand which packages are in dependency sections
  const packageJsonPath = path.join(process.cwd(), 'package.json')
  let dependencyPackages = new Set()

  try {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))

    // Collect all package names from dependency and resolutions sections
    const dependencySections = ['dependencies', 'devDependencies', 'peerDependencies', 'resolutions']
    for (const section of dependencySections) {
      if (packageJson[section]) {
        Object.keys(packageJson[section]).forEach(pkg => dependencyPackages.add(pkg))
      }
    }
  } catch (e) {
    console.log(`   Warning: Could not read package.json: ${e.message}`)
  }

  // Now scan the diff for changed lines that match known dependency packages
  const lines = gitDiffOutput.split('\n')

  for (const line of lines) {
    // Only look at added or removed lines
    if (!/^[+-]/.test(line)) continue

    // Skip diff metadata lines
    if (line.startsWith('+++') || line.startsWith('---')) continue

    // Match package entries like: +    "@newwork/nw-design-system": "^0.0.1-51",
    const packageMatch = line.match(/^[+-]\s*"(@?[\w\-/.]+)":\s*"/)
    if (packageMatch) {
      const packageName = packageMatch[1]

      // Only include if this package exists in a dependency section
      if (dependencyPackages.has(packageName)) {
        changedPackages.add(packageName)
      }
    }
  }

  return Array.from(changedPackages)
}

/**
 * Main analysis function
 */
async function analyzeChangedDependencies(changedFiles) {
  // Check if we're in a PR (skip package rebuilds) or branch build (rebuild everything)
  const isPullRequest = !!process.env.BITBUCKET_PR_DESTINATION_BRANCH

  // Separate tracking: package-affected vs shared-code-affected
  // In PRs: package-affected = log only (too slow to rebuild 200+ screens)
  // In branch builds: package-affected = rebuild (need to update hashes)
  const packageAffectedScreens = new Set()
  const sharedCodeAffectedScreens = new Set()
  const analysis = {
    packageChanges: [],
    globalSharedChanges: [],
    moduleSharedChanges: [],
    affectedByPackage: {},
    affectedByGlobalShared: {},
    affectedByModuleShared: {}
  }

  const allScreens = await findAllScreens()
  console.log(`📋 Total screens in project: ${allScreens.length}`)

  for (const changedFile of changedFiles) {
    console.log(`\n🔍 Analyzing: ${changedFile}`)

    // Handle package.json changes
    if (changedFile === 'package.json') {
      console.log('   📦 Package file changed - analyzing affected packages...')

      try {
        // Get the diff for package.json
        // - For PRs: compare against target branch (BITBUCKET_PR_DESTINATION_BRANCH)
        // - For branch builds: use git show HEAD
        let diff
        const targetBranch = process.env.BITBUCKET_PR_DESTINATION_BRANCH
        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim()

        if (targetBranch && targetBranch !== currentBranch) {
          // PR build - compare against target branch
          console.log(`   Comparing against target branch: ${targetBranch}`)
          try {
            execSync(`git fetch origin ${targetBranch}:${targetBranch}`, { encoding: 'utf8', stdio: 'pipe' })
          } catch {
            // Ignore fetch errors - branch might already exist locally
          }
          diff = execSync(`git diff ${targetBranch}...HEAD -- package.json`, { encoding: 'utf8' })
        } else {
          // Branch build - use last commit
          diff = execSync('git show --pretty="" HEAD -- package.json', { encoding: 'utf8' })
        }
        const changedPackages = getChangedPackages(diff)

        if (changedPackages.length > 0) {
          console.log(`   Changed packages: ${changedPackages.join(', ')}`)
          analysis.packageChanges.push(...changedPackages)

          for (const pkg of changedPackages) {
            analysis.affectedByPackage[pkg] = { direct: [], transitive: [] }

            // STEP 1: Find screens that directly import the package
            console.log(`\n   📦 ${pkg}:`)
            console.log(`      Checking direct imports in screens...`)

            for (const screen of allScreens) {
              if (await screenUsesPackage(screen, pkg)) {
                packageAffectedScreens.add(screen)
                analysis.affectedByPackage[pkg].direct.push(screen)
              }
            }
            console.log(`      → Direct: ${analysis.affectedByPackage[pkg].direct.length} screen(s)`)

            // STEP 2: Find screens affected via transitive dependencies
            // (screens using src/common/ or src/components/ that use the package)
            const transitiveScreens = await findScreensAffectedByPackageTransitively(pkg)

            for (const screen of transitiveScreens) {
              if (!analysis.affectedByPackage[pkg].direct.includes(screen)) {
                packageAffectedScreens.add(screen)
                analysis.affectedByPackage[pkg].transitive.push(screen)
              }
            }
            console.log(`      → Transitive: ${analysis.affectedByPackage[pkg].transitive.length} screen(s)`)

            const totalForPkg =
              analysis.affectedByPackage[pkg].direct.length + analysis.affectedByPackage[pkg].transitive.length
            console.log(`      → Total for ${pkg}: ${totalForPkg} screen(s)`)
          }
        } else {
          console.log('   No dependency version changes detected')
        }
      } catch (error) {
        console.log(`   ⚠️  Could not analyze package changes: ${error.message}`)
      }
    }

    // Handle shared code changes:
    // 1. Global shared: src/* except business-apps
    // 2. Shared in business-apps: NOT inside a screen folder (folder with index.ts)
    else if (changedFile.startsWith('src/') && !(await isScreenSpecificFile(changedFile))) {
      const isModuleLevelShared = changedFile.startsWith('src/business-apps/')

      if (isModuleLevelShared) {
        // Module-level shared code (e.g., hr/core/hooks/, forms/components/)
        console.log('   📂 Module-level shared code changed - finding importing screens...')
        if (!analysis.moduleSharedChanges) analysis.moduleSharedChanges = []
        analysis.moduleSharedChanges.push(changedFile)
      } else {
        // Global shared code (anything in src/* except business-apps)
        console.log('   📁 Global shared code changed - finding importing screens...')
        if (!analysis.globalSharedChanges) analysis.globalSharedChanges = []
        analysis.globalSharedChanges.push(changedFile)
      }

      // STEP 1: Find screens that DIRECTLY import the changed file
      const directScreens = await findScreensImportingFile(changedFile)
      console.log(`      Direct imports: ${directScreens.size} screen(s)`)

      // STEP 2: Find screens affected via TRANSITIVE dependencies
      // (other shared files that import the changed file, then screens that import those)
      const transitiveScreens = await findScreensAffectedBySharedFileTransitively(changedFile)
      console.log(`      Transitive imports: ${transitiveScreens.size} screen(s)`)

      // Combine direct and transitive
      const allAffectedScreens = new Set([...directScreens, ...transitiveScreens])

      // Store affected screens
      if (isModuleLevelShared) {
        if (!analysis.affectedByModuleShared) analysis.affectedByModuleShared = {}
        analysis.affectedByModuleShared[changedFile] = Array.from(allAffectedScreens)
      } else {
        if (!analysis.affectedByGlobalShared) analysis.affectedByGlobalShared = {}
        analysis.affectedByGlobalShared[changedFile] = Array.from(allAffectedScreens)
      }

      for (const screen of allAffectedScreens) {
        sharedCodeAffectedScreens.add(screen)
      }

      console.log(`   → ${allAffectedScreens.size} screen(s) total (direct + transitive)`)
    }
  }

  return {
    // Screens affected by shared code changes - ALWAYS BUILD
    sharedCodeAffectedScreens: Array.from(sharedCodeAffectedScreens).sort(),
    // Screens affected by package changes
    // - PRs: log only (too slow to rebuild 200+ screens for validation)
    // - Branch builds: rebuild (need to update hashes for prod comparison)
    packageAffectedScreens: Array.from(packageAffectedScreens).sort(),
    isPullRequest,
    analysis
  }
}

/**
 * CLI entry point
 */
async function main() {
  // Read changed files from stdin or file argument
  let changedFiles = []

  if (process.argv[2]) {
    // Read from file
    const content = fs.readFileSync(process.argv[2], 'utf8')
    changedFiles = content.split('\n').filter(line => line.trim())
  } else {
    // Read from stdin
    const stdin = fs.readFileSync(0, 'utf8')
    changedFiles = stdin.split('\n').filter(line => line.trim())
  }

  if (changedFiles.length === 0) {
    console.log('No changed files provided')
    process.exit(0)
  }

  console.log('🔬 Smart Dependency Analysis')
  console.log('='.repeat(60))
  console.log(`📝 Changed files to analyze: ${changedFiles.length}`)

  // Filter to dependency-related files:
  // - Package files (package.json, etc.)
  // - Global shared code (src/* except business-apps)
  // - Shared code in business-apps (NOT inside a screen folder with index.ts)
  const dependencyFiles = []
  for (const f of changedFiles) {
    if (f === 'package.json') {
      dependencyFiles.push(f)
    } else if (f.startsWith('src/') && !f.startsWith('src/business-apps/')) {
      dependencyFiles.push(f) // Global shared code
    } else if (f.startsWith('src/business-apps/') && !(await isScreenSpecificFile(f))) {
      dependencyFiles.push(f) // Shared code (module-level or in forms/components/, etc.)
    }
  }

  if (dependencyFiles.length === 0) {
    console.log('\nNo shared code or dependency changes detected')
    process.exit(0)
  }

  // Categorize for display
  const packageFiles = dependencyFiles.filter(f => f === 'package.json')
  const globalSharedFiles = dependencyFiles.filter(f => f.startsWith('src/') && !f.startsWith('src/business-apps/'))
  // Module shared files are everything else that's in business-apps
  const moduleSharedFiles = dependencyFiles.filter(f => f.startsWith('src/business-apps/'))

  console.log(`🔗 Dependency-related files: ${dependencyFiles.length}`)
  if (packageFiles.length > 0) {
    console.log(`   📦 Package files: ${packageFiles.length}`)
    packageFiles.forEach(f => console.log(`      - ${f}`))
  }
  if (globalSharedFiles.length > 0) {
    console.log(`   📁 Global shared code: ${globalSharedFiles.length}`)
    globalSharedFiles.slice(0, 10).forEach(f => console.log(`      - ${f}`))
    if (globalSharedFiles.length > 10) {
      console.log(`      ... and ${globalSharedFiles.length - 10} more`)
    }
  }
  if (moduleSharedFiles.length > 0) {
    console.log(`   📂 Module-level shared code: ${moduleSharedFiles.length}`)
    moduleSharedFiles.slice(0, 10).forEach(f => console.log(`      - ${f}`))
    if (moduleSharedFiles.length > 10) {
      console.log(`      ... and ${moduleSharedFiles.length - 10} more`)
    }
  }

  const result = await analyzeChangedDependencies(dependencyFiles)

  console.log('\n' + '='.repeat(60))
  console.log('📊 ANALYSIS RESULTS')
  console.log('='.repeat(60))

  // ========================================================================
  // Package changes
  // - PRs: log only (validation, too slow to rebuild 200+ screens)
  // - Branch builds: will be rebuilt (need to update hashes for prod)
  // ========================================================================
  if (result.analysis.packageChanges.length > 0) {
    console.log(`\n📦 Package changes: ${result.analysis.packageChanges.length}`)
    for (const pkg of result.analysis.packageChanges) {
      const affected = result.analysis.affectedByPackage[pkg] || { direct: [], transitive: [] }
      const directCount = affected.direct?.length || 0
      const transitiveCount = affected.transitive?.length || 0
      const totalCount = directCount + transitiveCount
      console.log(`   ${pkg}: ${totalCount} screen(s) (${directCount} direct, ${transitiveCount} via shared code)`)
    }

    if (result.isPullRequest) {
      console.log(
        `\n   ⏩ PR mode: Package-affected screens (${result.packageAffectedScreens.length}) will NOT be rebuilt`
      )
      console.log(`   ℹ️  These will be rebuilt when PR is merged`)
    } else {
      console.log(
        `\n   🔨 Branch mode: Package-affected screens (${result.packageAffectedScreens.length}) WILL be rebuilt`
      )
    }
  }

  // ========================================================================
  // Shared code changes - WILL BE BUILT
  // ========================================================================
  if (result.analysis.globalSharedChanges?.length > 0) {
    console.log(`\n📁 Global shared code (src/* except business-apps): ${result.analysis.globalSharedChanges.length}`)
    for (const file of result.analysis.globalSharedChanges) {
      const affected = result.analysis.affectedByGlobalShared?.[file] || []
      console.log(`   ${file}: ${affected.length} screen(s)`)
    }
  }

  if (result.analysis.moduleSharedChanges?.length > 0) {
    console.log(
      `\n📂 Module-level shared code (business-apps/**/shared): ${result.analysis.moduleSharedChanges.length}`
    )
    for (const file of result.analysis.moduleSharedChanges) {
      const affected = result.analysis.affectedByModuleShared?.[file] || []
      console.log(`   ${file}: ${affected.length} screen(s)`)
    }
  }

  // ========================================================================
  // Summary and output
  // ========================================================================
  console.log(`\n📊 Summary:`)
  console.log(
    `   🔀 Mode: ${result.isPullRequest ? 'Pull Request (skip package rebuilds)' : 'Branch Build (rebuild all)'}`
  )
  console.log(`   📦 Package-affected screens: ${result.packageAffectedScreens.length}`)
  console.log(`   📁 Shared-code-affected screens: ${result.sharedCodeAffectedScreens.length}`)

  // Determine which screens to include in output file
  // - Shared code changes: ALWAYS include
  // - Package changes: Only in branch builds, not in PRs
  const screensToRebuild = new Set(result.sharedCodeAffectedScreens)

  if (!result.isPullRequest) {
    // Branch build: also include package-affected screens
    result.packageAffectedScreens.forEach(s => screensToRebuild.add(s))
  }

  const screensToRebuildArray = Array.from(screensToRebuild).sort()

  console.log(`   🔨 Total screens to rebuild: ${screensToRebuildArray.length}`)

  if (screensToRebuildArray.length > 0) {
    console.log('\n🔨 Screens to rebuild:')
    screensToRebuildArray.slice(0, 10).forEach(screen => console.log(`   src/business-apps/${screen}`))
    if (screensToRebuildArray.length > 10) {
      console.log(`      ... and ${screensToRebuildArray.length - 10} more`)
    }

    // Write to output file for pipeline consumption
    const outputFile = 'dependency-affected-screens.txt'
    fs.writeFileSync(outputFile, screensToRebuildArray.map(s => `src/business-apps/${s}`).join('\n') + '\n')
    console.log(`\n📝 Written to: ${outputFile}`)
  } else {
    console.log('\n✅ No screens need rebuilding from dependency changes')
  }
}

main().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
