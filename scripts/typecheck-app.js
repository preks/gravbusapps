import { spawnSync } from 'child_process'
import { existsSync, rmSync, statSync, writeFileSync } from 'fs'
import { dirname, relative, resolve, sep } from 'path'
import { fileURLToPath } from 'url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDirectory, '..')
const businessAppsRoot = resolve(repoRoot, 'src', 'business-apps')
const tempConfigPrefix = 'tsconfig.typecheck-app'

function exitWithMessage(message) {
  console.error(message)
  process.exit(1)
}

function readTargetArgument() {
  const argumentsList = process.argv.slice(2)

  if (argumentsList.length === 0) {
    exitWithMessage('Missing app path. Usage: npm run typecheck:app -- <path-under-src/business-apps>')
  }

  if (argumentsList.length > 1) {
    exitWithMessage('Expected exactly one app path argument.')
  }

  return argumentsList[0]
}

function resolveTargetDirectory(targetArgument) {
  const normalizedTarget = targetArgument.trim()

  if (!normalizedTarget) {
    exitWithMessage('App path cannot be empty.')
  }

  if (normalizedTarget.startsWith('/') || normalizedTarget.startsWith('\\')) {
    exitWithMessage('App path must be relative to src/business-apps.')
  }

  const candidatePath = resolve(businessAppsRoot, normalizedTarget)
  const relativeTargetPath = relative(businessAppsRoot, candidatePath)

  if (
    relativeTargetPath === '' ||
    relativeTargetPath === '..' ||
    relativeTargetPath.startsWith(`..${sep}`) ||
    relativeTargetPath.includes(`${sep}..${sep}`)
  ) {
    exitWithMessage('App path must stay within src/business-apps.')
  }

  if (!existsSync(candidatePath)) {
    exitWithMessage(`App path does not exist: ${normalizedTarget}`)
  }

  if (!statSync(candidatePath).isDirectory()) {
    exitWithMessage(`App path must point to a directory: ${normalizedTarget}`)
  }

  return {
    candidatePath,
    normalizedTarget
  }
}

function createTempConfig(relativeAppPath) {
  const uniqueSuffix = `${Date.now()}-${process.pid}`
  const tempConfigPath = resolve(repoRoot, `${tempConfigPrefix}.${uniqueSuffix}.json`)
  const includePath = `src/business-apps/${relativeAppPath}/**/*`
  const tempConfig = {
    extends: './tsconfig.json',
    include: [includePath],
    exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx']
  }

  writeFileSync(tempConfigPath, `${JSON.stringify(tempConfig, null, 2)}\n`)

  return tempConfigPath
}

function runTypeScriptProject(tempConfigPath) {
  const tscEntryPoint = resolve(repoRoot, 'node_modules', 'typescript', 'bin', 'tsc')
  const result = spawnSync(
    process.execPath,
    [tscEntryPoint, '--noEmit', '--pretty', 'false', '--project', tempConfigPath],
    {
      cwd: repoRoot,
      stdio: 'inherit'
    }
  )

  if (result.error) {
    throw result.error
  }

  return result.status ?? 1
}

function cleanupTempConfig(tempConfigPath) {
  if (tempConfigPath && existsSync(tempConfigPath)) {
    rmSync(tempConfigPath)
  }
}

function main() {
  const targetArgument = readTargetArgument()
  const { normalizedTarget } = resolveTargetDirectory(targetArgument)
  let tempConfigPath = ''

  try {
    tempConfigPath = createTempConfig(normalizedTarget)
    process.exitCode = runTypeScriptProject(tempConfigPath)
  } finally {
    cleanupTempConfig(tempConfigPath)
  }
}

try {
  main()
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`typecheck:app failed: ${errorMessage}`)
  process.exitCode = 1
}
