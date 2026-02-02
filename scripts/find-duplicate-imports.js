#!/usr/bin/env node

/**
 * Script to find files with duplicate imports from the same path
 *
 * Usage: node scripts/find-duplicate-imports.js [directory]
 *
 * If no directory is provided, it will scan the specified directories:
 * - src/business-apps/irm/core/records
 * - src/business-apps/irm/core/apps/investment-relations
 * - src/business-apps/crm/core/records
 * - src/business-apps/crm/core/apps/customer-relations
 * - src/common/data/investment
 * - src/common/components/common-relations
 * - src/common/data/customer
 * - src/common/data/relations
 */

import fs from 'node:fs'
import path from 'node:path'

// Directories to scan
const DEFAULT_DIRECTORIES = [
  'src/business-apps/irm/core/records',
  'src/business-apps/irm/core/apps/investment-relations',
  'src/business-apps/crm/core/records',
  'src/business-apps/crm/core/apps/customer-relations',
  'src/common/data/investment',
  'src/common/components/common-relations',
  'src/common/data/customer',
  'src/common/data/relations'
]

// Regex to match import statements
const IMPORT_REGEX =
  /^import\s+(?:(?:(?:type\s+)?\{[^}]+\}|(?:type\s+)?\*\s+as\s+\w+|(?:type\s+)?\w+)(?:\s*,\s*(?:(?:type\s+)?\{[^}]+\}|(?:type\s+)?\*\s+as\s+\w+|(?:type\s+)?\w+))*\s+from\s+)?['"]([^'"]+)['"]/gm

/**
 * Recursively get all TypeScript/TSX files in a directory
 */
function getAllTsFiles(dir, fileList = []) {
  if (!fs.existsSync(dir)) {
    return fileList
  }

  const files = fs.readdirSync(dir)

  files.forEach(file => {
    const filePath = path.join(dir, file)
    const stat = fs.statSync(filePath)

    if (stat.isDirectory()) {
      // Skip node_modules and dist directories
      if (file !== 'node_modules' && file !== 'dist' && !file.startsWith('.')) {
        getAllTsFiles(filePath, fileList)
      }
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath)
    }
  })

  return fileList
}

/**
 * Extract all imports from a file
 */
function extractImports(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const imports = []
  let match

  // Reset regex lastIndex
  IMPORT_REGEX.lastIndex = 0

  while ((match = IMPORT_REGEX.exec(content)) !== null) {
    const importPath = match[1]
    if (importPath) {
      imports.push({
        line: content.substring(0, match.index).split('\n').length,
        path: importPath,
        fullMatch: match[0]
      })
    }
  }

  return imports
}

/**
 * Find duplicate imports (same path imported multiple times)
 */
function findDuplicateImports(filePath) {
  const imports = extractImports(filePath)

  // Group imports by path
  const importsByPath = {}
  imports.forEach(imp => {
    if (!importsByPath[imp.path]) {
      importsByPath[imp.path] = []
    }
    importsByPath[imp.path].push(imp)
  })

  // Find paths that are imported multiple times
  const duplicates = {}
  Object.keys(importsByPath).forEach(importPath => {
    if (importsByPath[importPath].length > 1) {
      duplicates[importPath] = importsByPath[importPath]
    }
  })

  return Object.keys(duplicates).length > 0 ? duplicates : null
}

/**
 * Main function
 */
function main() {
  const directories = process.argv[2] ? [process.argv[2]] : DEFAULT_DIRECTORIES

  console.log('Scanning directories for duplicate imports...\n')
  console.log('Directories:', directories.join(', '), '\n')

  const results = []
  let totalFilesScanned = 0

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.warn(`Warning: Directory not found: ${dir}`)
      return
    }

    const files = getAllTsFiles(dir)
    totalFilesScanned += files.length

    files.forEach(filePath => {
      const duplicates = findDuplicateImports(filePath)
      if (duplicates) {
        results.push({
          file: filePath,
          duplicates
        })
      }
    })
  })

  // Output results
  console.log(`\nScanned ${totalFilesScanned} files\n`)
  console.log(`Found ${results.length} files with duplicate imports:\n`)

  if (results.length === 0) {
    console.log('✅ No duplicate imports found!')
    return
  }

  // Group by directory for better readability
  const grouped = {}
  results.forEach(result => {
    const dir = path.dirname(result.file)
    if (!grouped[dir]) {
      grouped[dir] = []
    }
    grouped[dir].push(result)
  })

  // Output grouped results
  Object.keys(grouped)
    .sort()
    .forEach(dir => {
      console.log(`\n📁 ${dir}`)
      console.log('─'.repeat(80))

      grouped[dir].forEach(result => {
        const relativePath = path.relative(process.cwd(), result.file)
        console.log(`\n  📄 ${relativePath}`)

        Object.keys(result.duplicates).forEach(importPath => {
          const occurrences = result.duplicates[importPath]
          console.log(`     ⚠️  "${importPath}" imported ${occurrences.length} times:`)
          occurrences.forEach((occ, idx) => {
            console.log(
              `        ${idx + 1}. Line ${occ.line}: ${occ.fullMatch.substring(0, 80)}${
                occ.fullMatch.length > 80 ? '...' : ''
              }`
            )
          })
        })
      })
    })

  // Summary
  console.log('\n' + '='.repeat(80))
  console.log(`\nSummary: ${results.length} file(s) with duplicate imports found`)
  console.log(`Total files scanned: ${totalFilesScanned}`)

  // Exit with error code if duplicates found
  process.exit(results.length > 0 ? 1 : 0)
}

// Run the script
main()
