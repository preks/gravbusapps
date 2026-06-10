import detect from 'detect-port'
import { execSync, spawn } from 'child_process'
import readline from 'readline'
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'

const DEFAULT_PORT = 3001
const MAX_PORT = 3010

function getInstalledCursorRulesVersion() {
  const packagePath = join(process.cwd(), 'node_modules', '@newwork', 'cursor-rules', 'package.json')
  if (!existsSync(packagePath)) {
    return null
  }

  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    return packageJson.version ?? null
  } catch {
    return null
  }
}

function isCursorRulesDeclared() {
  const packagePath = join(process.cwd(), 'package.json')
  if (!existsSync(packagePath)) {
    return false
  }

  try {
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'))
    const deps = {
      ...(packageJson.dependencies ?? {}),
      ...(packageJson.devDependencies ?? {}),
      ...(packageJson.optionalDependencies ?? {})
    }
    return Boolean(deps['@newwork/cursor-rules'])
  } catch {
    return false
  }
}

function syncPlatformAssets() {
  try {
    execSync('node ./scripts/sync-platform-assets.mjs', { stdio: 'inherit' })
  } catch {
    console.warn(
      'WARNING: sync-platform-assets failed. Default chat background may 404. Run: npm run sync:platform-assets'
    )
  }
}

const CURSOR_RULES_BIN = join(process.cwd(), 'node_modules', '@newwork', 'cursor-rules', 'bin', 'cursor-rules.js')
const CURSOR_RULES_STAMP = join(process.cwd(), '.cursor', 'rules', '.cursor-rules-sync-stamp')

function getCursorRulesStamp() {
  const version = getInstalledCursorRulesVersion()
  if (!version) return null

  const configPaths = ['cursor-rules.config.js', 'cursor-rules.config.cjs', 'cursor-rules.config.mjs']
  let fingerprint = ''
  for (const configPath of configPaths) {
    const absolutePath = join(process.cwd(), configPath)
    if (existsSync(absolutePath)) {
      fingerprint += `${configPath}:${statSync(absolutePath).mtimeMs};`
    }
  }

  return `${version}|${fingerprint || 'no-config'}`
}

function syncCursorRules() {
  if (!isCursorRulesDeclared()) {
    return
  }

  const installedVersion = getInstalledCursorRulesVersion()
  if (!installedVersion) {
    console.warn('WARNING: @newwork/cursor-rules is declared but not installed. Run: npm install')
    return
  }

  if (!existsSync(CURSOR_RULES_BIN)) {
    return
  }

  const currentStamp = getCursorRulesStamp()
  if (currentStamp && existsSync(CURSOR_RULES_STAMP)) {
    try {
      if (readFileSync(CURSOR_RULES_STAMP, 'utf8').trim() === currentStamp) {
        return
      }
    } catch {
      // Continue with sync when stamp cannot be read.
    }
  }

  try {
    execSync(`node "${CURSOR_RULES_BIN}" sync --silent`, {
      stdio: 'ignore'
    })
    if (currentStamp) {
      mkdirSync(join(process.cwd(), '.cursor', 'rules'), { recursive: true })
      writeFileSync(CURSOR_RULES_STAMP, currentStamp)
    }
  } catch {
    console.warn('WARNING: cursor-rules sync failed. Run manually: npx cursor-rules sync')
  }
}

function installDependencies() {
  execSync('npm install', {
    stdio: 'inherit'
  })
}

/**
 * Ask user for confirmation using readline
 */
function askUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close()
      const normalized = answer.toLowerCase().trim()
      // Accept 'y', 'yes', 'j', 'ja', or just pressing Enter (empty string)
      resolve(
        normalized === 'y' || normalized === 'yes' || normalized === 'j' || normalized === 'ja' || normalized === ''
      )
    })
  })
}

/**
 * Start the dev server on the specified port
 */
function startDevServer(port) {
  console.log(`\nStarting dev server on port ${port}...\n`)

  installDependencies()
  syncPlatformAssets()
  syncCursorRules()

  const command = `npm run cleanup:logs && vite --port ${port} --host`

  const child = spawn(command, {
    stdio: 'inherit',
    shell: true
  })

  child.on('error', err => {
    console.error('Failed to start dev server:', err)
    process.exit(1)
  })

  child.on('exit', code => {
    process.exit(code || 0)
  })

  // Handle Ctrl+C gracefully
  process.on('SIGINT', () => {
    child.kill('SIGINT')
  })

  process.on('SIGTERM', () => {
    child.kill('SIGTERM')
  })
}

function parseExplicitPort() {
  const portArg = process.argv[2]
  if (!portArg) return null

  const port = Number(portArg)
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error(`Invalid port: "${portArg}". Must be an integer between 1 and 65535.`)
    process.exit(1)
  }
  return port
}

async function main() {
  try {
    const explicitPort = parseExplicitPort()

    if (explicitPort) {
      console.log(`Using explicitly requested port ${explicitPort}.`)
      startDevServer(explicitPort)
      return
    }

    const availablePort = await detect(DEFAULT_PORT)

    // If the default port is available, use it directly
    if (availablePort === DEFAULT_PORT) {
      console.log(`Port ${DEFAULT_PORT} is available.`)
      startDevServer(DEFAULT_PORT)
      return
    }

    // Check if the suggested port is within our allowed range
    if (availablePort > MAX_PORT) {
      console.error(`\nPort ${DEFAULT_PORT} is not available.`)
      console.error(`No available ports found between ${DEFAULT_PORT} and ${MAX_PORT}.`)
      console.error('Please free up a port or stop other services.\n')
      process.exit(1)
    }

    // Ask user if they want to use the alternative port
    const shouldUseAlternative = await askUser(
      `\n? Port ${DEFAULT_PORT} is not available.\n  Would you like to run the dev server on port ${availablePort} instead? (Y/n) `
    )

    if (shouldUseAlternative) {
      startDevServer(availablePort)
    } else {
      console.log('\nDev server start cancelled.\n')
      process.exit(0)
    }
  } catch (error) {
    console.error('Error detecting available port:', error)
    process.exit(1)
  }
}

main()
