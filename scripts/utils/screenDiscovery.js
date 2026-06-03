import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { glob } from 'glob'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const configPath = path.resolve(__dirname, '..', 'screen-discovery.config.json')
let cachedConfig = null
const screenDirsCacheByCwd = new Map()

function loadConfig() {
  if (cachedConfig) {
    return cachedConfig
  }

  const raw = fs.readFileSync(configPath, 'utf8')
  const parsed = JSON.parse(raw)

  if (!parsed || !Array.isArray(parsed.types) || parsed.types.length === 0) {
    throw new Error(`Invalid screen discovery config at ${configPath}`)
  }

  cachedConfig = parsed
  return cachedConfig
}

function normalizePath(value) {
  return value.replace(/\\/g, '/')
}

/**
 * Folders named `_i18n` under `forms`/`apps`/etc. contain Fluent bundles (`export default { 'en-US': enUS, ... }`), not screens.
 * A single path segment after `forms` (etc.) can be `_i18n`, so discovery picks up `forms/_i18n/index.ts` — exclude those paths.
 */
function isI18nBundleIndexPath(normalizedFilePath) {
  const dir = path.posix.dirname(normalizedFilePath)
  const lastSegment = dir.split('/').pop()
  return lastSegment === '_i18n'
}

export function getScreenTypes() {
  return loadConfig().types
}

export function getScreenPatterns() {
  return getScreenTypes().map(type => `src/business-apps/**/${type}/*/index.ts`)
}

export async function getScreenIndexFiles({ cwd = process.cwd() } = {}) {
  const patterns = getScreenPatterns()
  const files = []

  for (const pattern of patterns) {
    const matched = await glob(pattern, { cwd, nodir: true, dot: true })
    files.push(...matched)
  }

  return Array.from(new Set(files.map(normalizePath).filter(f => !isI18nBundleIndexPath(f)))).sort()
}

export async function getScreenDirectories({ cwd = process.cwd() } = {}) {
  const cacheKey = path.resolve(cwd)
  if (screenDirsCacheByCwd.has(cacheKey)) {
    return screenDirsCacheByCwd.get(cacheKey)
  }

  const indexFiles = await getScreenIndexFiles({ cwd })
  const dirs = Array.from(new Set(indexFiles.map(file => path.posix.dirname(file)))).sort()
  screenDirsCacheByCwd.set(cacheKey, dirs)
  return dirs
}

export async function findScreenDirectories({ cwd = process.cwd() } = {}) {
  return getScreenDirectories({ cwd })
}

export async function isScreenSpecificFile(filePath, { cwd = process.cwd(), screenDirs = null } = {}) {
  const normalizedFilePath = normalizePath(filePath)
  const directories = screenDirs || (await getScreenDirectories({ cwd }))

  for (const dir of directories) {
    if (normalizedFilePath === dir || normalizedFilePath.startsWith(`${dir}/`)) {
      return true
    }
  }

  return false
}
