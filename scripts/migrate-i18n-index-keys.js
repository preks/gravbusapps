#!/usr/bin/env node

/**
 * Migrates _i18n/index.ts: camelCase locale keys -> BCP-47 keys ('en-US', ...).
 * Keeps imports, merge logic, and structure unchanged.
 *
 * Usage:
 *   node scripts/migrate-i18n-index-keys.js
 *   node scripts/migrate-i18n-index-keys.js --dry-run
 *   node scripts/migrate-i18n-index-keys.js path/to/_i18n/index.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = process.cwd()
const DRY_RUN = process.argv.includes('--dry-run')
const pathFilter = process.argv.find(
  argument => !argument.startsWith('--') && (argument.endsWith('_i18n/index.ts') || argument.endsWith('i18n/index.ts'))
)

/** @type {Record<string, string>} */
const CAMEL_TO_LOCALE = {
  enUS: 'en-US',
  deDE: 'de-DE',
  roRO: 'ro-RO'
}

const LEGACY_TYPE_ASSERTION = /as\s*\{\s*enUS:\s*string;\s*deDE:\s*string;\s*roRO:\s*string\s*\}/g

const LEGACY_EXPORT_LINE =
  /^\s*(?:en|de|ro|en_US|de_DE|ro_RO|enUS|deDE|roRO)\s*[:,]|^\s*(?:en|de|ro|en_US|de_DE|ro_RO)\s*:/

const CANONICAL_EXPORT_LINE = /^\s*'(en-US|de-DE|ro-RO)'\s*:/

/**
 * @param {string} inner
 * @returns {{ inner: string, changed: boolean }}
 */
function cleanupExportInner(inner) {
  const seen = new Set()
  let changed = false
  const parts = inner
    .split(',')
    .map(part => part.trim())
    .filter(Boolean)
  const kept = []

  for (const part of parts) {
    const canonical = part.match(/^'(en-US|de-DE|ro-RO)'\s*:/)
    if (canonical) {
      if (seen.has(canonical[1])) {
        changed = true
        continue
      }
      seen.add(canonical[1])
      kept.push(part)
      continue
    }

    if (/^(?:en|de|ro|en_US|de_DE|ro_RO|enUS|deDE|roRO)\s*:/.test(part)) {
      changed = true
      continue
    }

    kept.push(part)
  }

  if (!changed) {
    return { inner, changed: false }
  }

  const separator = inner.includes('\n') ? ',\n  ' : ', '
  return { inner: kept.join(separator), changed: true }
}

/**
 * @param {string} line
 * @returns {{ line: string, changed: boolean }}
 */
function cleanupInlineExportLine(line) {
  const match = line.match(/^(\s*export\s+default\s*\{)([\s\S]*)(\}\s*)$/)
  if (!match) {
    return { line, changed: false }
  }

  const { inner, changed } = cleanupExportInner(match[2])
  if (!changed) {
    return { line, changed: false }
  }

  return { line: `${match[1]}${inner}${match[3]}`, changed: true }
}

/**
 * Drops legacy locale aliases and duplicate BCP-47 keys inside export default { ... }.
 *
 * @param {string} content
 * @returns {{ content: string, changed: boolean }}
 */
function dedupeExportLocaleKeys(content) {
  const lines = content.split('\n')
  const output = []
  let changed = false
  let inExport = false
  let braceDepth = 0
  const seenCanonical = new Set()

  for (const line of lines) {
    if (!inExport) {
      if (/export\s+default\s+\{/.test(line)) {
        const inline = cleanupInlineExportLine(line)
        if (inline.changed) {
          changed = true
          output.push(inline.line)
          continue
        }

        inExport = true
        braceDepth = (line.match(/\{/g) || []).length - (line.match(/\}/g) || []).length
        output.push(line)

        if (braceDepth <= 0) {
          inExport = false
          seenCanonical.clear()
        }

        continue
      }

      output.push(line)
      continue
    }

    braceDepth += (line.match(/\{/g) || []).length
    braceDepth -= (line.match(/\}/g) || []).length

    const canonical = line.match(CANONICAL_EXPORT_LINE)
    if (canonical) {
      if (seenCanonical.has(canonical[1])) {
        changed = true
        if (braceDepth <= 0) {
          inExport = false
          seenCanonical.clear()
        }
        continue
      }

      seenCanonical.add(canonical[1])
      output.push(line)

      if (braceDepth <= 0) {
        inExport = false
        seenCanonical.clear()
      }

      continue
    }

    if (LEGACY_EXPORT_LINE.test(line)) {
      changed = true
      if (braceDepth <= 0) {
        inExport = false
        seenCanonical.clear()
      }
      continue
    }

    output.push(line)

    if (braceDepth <= 0) {
      inExport = false
      seenCanonical.clear()
    }
  }

  return { content: output.join('\n'), changed }
}

/**
 * @param {string} content
 * @returns {{ content: string, changed: boolean }}
 */
function migrateContent(content) {
  let result = content
  let changed = false

  for (const [camel, locale] of Object.entries(CAMEL_TO_LOCALE)) {
    const parentRefRegex = new RegExp(`(\\w+)\\.${camel}\\b`, 'g')
    const next = result.replace(parentRefRegex, `$1['${locale}']`)
    if (next !== result) {
      result = next
      changed = true
    }
  }

  if (LEGACY_TYPE_ASSERTION.test(result)) {
    result = result.replace(LEGACY_TYPE_ASSERTION, 'as Record<string, string>')
    changed = true
  }

  for (const [camel, locale] of Object.entries(CAMEL_TO_LOCALE)) {
    const inlineShorthandRegex = new RegExp(`([{,]\\s*)${camel}(\\s*[,}])`, 'g')
    const next = result.replace(inlineShorthandRegex, `$1'${locale}': ${camel}$2`)
    if (next !== result) {
      result = next
      changed = true
    }
  }

  const lines = result.split('\n')
  const outputLines = lines.map(line => {
    let nextLine = line
    let lineChanged = false

    for (const [camel, locale] of Object.entries(CAMEL_TO_LOCALE)) {
      const shorthandRegex = new RegExp(`^(\\s*)${camel}(,?)(\\s*(?:\\/\\/.*)?)$`)
      const shorthandMatch = line.match(shorthandRegex)
      if (shorthandMatch) {
        nextLine = `${shorthandMatch[1]}'${locale}': ${camel}${shorthandMatch[2] ?? ''}${shorthandMatch[3] ?? ''}`
        lineChanged = true
        break
      }

      const keyValueRegex = new RegExp(`^(\\s*)${camel}:(\\s*)`)
      if (keyValueRegex.test(nextLine)) {
        nextLine = nextLine.replace(keyValueRegex, `$1'${locale}':$2`)
        lineChanged = true
      }
    }

    if (lineChanged) {
      changed = true
    }

    return nextLine
  })

  const joined = outputLines.join('\n')
  const deduped = dedupeExportLocaleKeys(joined)

  return {
    content: deduped.content,
    changed: changed || deduped.changed
  }
}

/**
 * @param {string} dir
 * @param {string[]} files
 */
function collectI18nIndexFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files
  }

  const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', 'coverage', '.git', '.cursor'])

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) {
      continue
    }

    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      collectI18nIndexFiles(fullPath, files)
      continue
    }

    const isI18nIndex =
      entry.name === 'index.ts' &&
      (fullPath.includes(`${path.sep}_i18n${path.sep}`) || fullPath.includes(`${path.sep}i18n${path.sep}`))

    if (isI18nIndex) {
      files.push(fullPath)
    }
  }

  return files
}

function main() {
  const files = collectI18nIndexFiles(PROJECT_ROOT).sort()
  const updated = []

  for (const filePath of files) {
    if (pathFilter && !filePath.replace(/\\/g, '/').endsWith(pathFilter.replace(/\\/g, '/'))) {
      continue
    }

    const original = fs.readFileSync(filePath, 'utf8')
    const { content: migrated, changed } = migrateContent(original)

    if (!changed) {
      continue
    }

    updated.push(path.relative(PROJECT_ROOT, filePath))

    if (!DRY_RUN) {
      fs.writeFileSync(filePath, migrated, 'utf8')
    }
  }

  const mode = DRY_RUN ? 'DRY-RUN' : 'APPLY'
  console.log(`[migrate-i18n-index-keys] mode=${mode} scanned=${files.length} changed=${updated.length}`)

  if (updated.length > 0) {
    console.log('\nChanged files:')
    for (const file of updated) {
      console.log(`  ${file}`)
    }
  }

  if (DRY_RUN && updated.length > 0) {
    console.log('\nRe-run without --dry-run to apply.')
  }

  if (updated.length === 0) {
    console.log('Nothing to migrate.')
  }
}

const isDirectRun = process.argv[1] && path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1])

if (isDirectRun) {
  main()
}
