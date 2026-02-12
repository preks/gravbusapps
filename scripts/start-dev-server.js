import detect from 'detect-port'
import { spawn } from 'child_process'
import readline from 'readline'

const DEFAULT_PORT = 3001
const MAX_PORT = 3010

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

  const command = `npm install @newwork/cursor-rules@latest && npm install && npm run cleanup:logs && vite --port ${port}`

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

async function main() {
  try {
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
