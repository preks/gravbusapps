import fs from 'fs'

const ENV_FILE = '.env'
const ENV_EXAMPLE_FILE = '.env.example'
const ENV_BACKUP_FILE = '.env.bak'

const KEY_LINE_REGEX = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/
const TOKEN_KEY_REGEX = /(TOKEN|KEY|SECRET|PASSWORD|SAS)/i
const URL_KEY_REGEX = /(URL|ENDPOINT|_API_)/i
const PLACEHOLDER_VALUE_REGEX = /^<[^>]+>$/

function splitLines(content) {
  return content.split(/\r?\n/)
}

function parseAssignmentLine(line) {
  const keyMatch = line.match(KEY_LINE_REGEX)
  if (!keyMatch) return null

  const separatorIndex = line.indexOf('=')

  return {
    key: keyMatch[1],
    rawValue: line.slice(separatorIndex + 1)
  }
}

function splitValueAndComment(rawValue) {
  let isInsideSingleQuote = false
  let isInsideDoubleQuote = false

  for (let index = 0; index < rawValue.length; index += 1) {
    const currentCharacter = rawValue[index]
    const previousCharacter = index > 0 ? rawValue[index - 1] : ''

    if (currentCharacter === "'" && !isInsideDoubleQuote && previousCharacter !== '\\') {
      isInsideSingleQuote = !isInsideSingleQuote
      continue
    }

    if (currentCharacter === '"' && !isInsideSingleQuote && previousCharacter !== '\\') {
      isInsideDoubleQuote = !isInsideDoubleQuote
      continue
    }

    if (
      !isInsideSingleQuote &&
      !isInsideDoubleQuote &&
      currentCharacter === '#' &&
      index > 0 &&
      /\s/.test(rawValue[index - 1])
    ) {
      return {
        value: rawValue.slice(0, index).trimEnd(),
        comment: rawValue.slice(index)
      }
    }
  }

  return {
    value: rawValue.trimEnd(),
    comment: ''
  }
}

function parseEnvEntries(envContent) {
  const entries = new Map()

  for (const line of splitLines(envContent)) {
    const assignment = parseAssignmentLine(line)
    if (!assignment) continue

    const { value, comment } = splitValueAndComment(assignment.rawValue)
    entries.set(assignment.key, {
      key: assignment.key,
      value,
      comment,
      originalLine: line
    })
  }

  return entries
}

function getExistingKeys(envContent) {
  const keys = new Set()

  for (const line of splitLines(envContent)) {
    const assignment = parseAssignmentLine(line)
    if (assignment) keys.add(assignment.key)
  }

  return keys
}

function classifyKey(key, exampleValue) {
  if (TOKEN_KEY_REGEX.test(key)) return 'token'
  if (URL_KEY_REGEX.test(key)) return 'url'
  if (PLACEHOLDER_VALUE_REGEX.test(exampleValue.trim())) return 'token'
  return 'other'
}

function shouldReuseBackupValue(key, exampleValue, shouldResetTokens, shouldResetUrls) {
  const keyCategory = classifyKey(key, exampleValue)

  if (keyCategory === 'token') return !shouldResetTokens
  if (keyCategory === 'url') return !shouldResetUrls

  return false
}

function buildAssignmentLine(key, value, comment) {
  if (!comment) return `${key}=${value}`
  return `${key}=${value} ${comment}`
}

function isEnabledNpmConfigFlag(flagName) {
  const configValue = process.env[`npm_config_${flagName}`]
  if (configValue === undefined) return false
  return configValue !== 'false'
}

function hasFlag(scriptArguments, flagNames) {
  return flagNames.some(flagName => scriptArguments.has(`--${flagName}`) || isEnabledNpmConfigFlag(flagName))
}

function appendMissingKeys() {
  if (!fs.existsSync(ENV_FILE)) {
    fs.copyFileSync(ENV_EXAMPLE_FILE, ENV_FILE)
    console.log('Created .env from .env.example. Please review and adjust values.')
    return
  }

  const envContent = fs.readFileSync(ENV_FILE, 'utf8')
  const exampleContent = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf8')
  const existingKeys = getExistingKeys(envContent)
  const exampleLines = splitLines(exampleContent)

  let pendingCommentLines = []
  const linesToAppend = []

  for (const line of exampleLines) {
    const assignment = parseAssignmentLine(line)

    if (assignment) {
      if (!existingKeys.has(assignment.key)) {
        linesToAppend.push(...pendingCommentLines, line)
        existingKeys.add(assignment.key)
      }
      pendingCommentLines = []
      continue
    }

    if (line.trimStart().startsWith('#')) {
      pendingCommentLines.push(line)
      continue
    }

    pendingCommentLines = []
  }

  if (linesToAppend.length === 0) return

  const suffix = envContent.endsWith('\n') ? '' : '\n'
  fs.appendFileSync(ENV_FILE, suffix + linesToAppend.join('\n') + '\n')

  const addedCount = linesToAppend.filter(line => KEY_LINE_REGEX.test(line)).length
  console.log(`Updated .env: added ${addedCount} variable(s) from .env.example. Please review and adjust values.`)
}

function resetEnv(shouldResetTokens, shouldResetUrls) {
  const exampleContent = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf8')

  if (!fs.existsSync(ENV_FILE)) {
    fs.writeFileSync(ENV_FILE, exampleContent)
    console.log('Created .env from .env.example. No existing .env found to preserve.')
    return
  }

  let backupWasCreated = false
  let shouldDeleteBackup = false

  try {
    fs.copyFileSync(ENV_FILE, ENV_BACKUP_FILE)
    backupWasCreated = true

    const backupContent = fs.readFileSync(ENV_BACKUP_FILE, 'utf8')
    const exampleEntries = parseEnvEntries(exampleContent)
    const backupEntries = parseEnvEntries(backupContent)
    const exampleLines = splitLines(exampleContent)

    let preservedValueCount = 0
    const rebuiltEnvLines = exampleLines.map(line => {
      const assignment = parseAssignmentLine(line)
      if (!assignment) return line

      const exampleEntry = exampleEntries.get(assignment.key)
      const backupEntry = backupEntries.get(assignment.key)

      if (!exampleEntry) return line

      const shouldPreserveBackupValue =
        backupEntry && shouldReuseBackupValue(assignment.key, exampleEntry.value, shouldResetTokens, shouldResetUrls)

      const valueToUse = shouldPreserveBackupValue ? backupEntry.value : exampleEntry.value

      if (shouldPreserveBackupValue) preservedValueCount += 1

      return buildAssignmentLine(assignment.key, valueToUse, exampleEntry.comment)
    })
    fs.writeFileSync(ENV_FILE, `${rebuiltEnvLines.join('\n')}\n`)

    shouldDeleteBackup = true
    const removedVariableCount = Array.from(backupEntries.keys()).filter(key => !exampleEntries.has(key)).length
    console.log(
      `Reset .env from .env.example. Preserved ${preservedValueCount} value(s) and removed ${removedVariableCount} custom variable(s).`
    )
  } finally {
    if (backupWasCreated && shouldDeleteBackup && fs.existsSync(ENV_BACKUP_FILE)) {
      fs.unlinkSync(ENV_BACKUP_FILE)
    }
  }
}

function run() {
  if (!fs.existsSync(ENV_EXAMPLE_FILE)) return

  const scriptArguments = new Set(process.argv.slice(2))
  const shouldReset = hasFlag(scriptArguments, ['reset'])
  const shouldResetTokens = hasFlag(scriptArguments, ['token', 'tokens'])
  const shouldResetUrls = hasFlag(scriptArguments, ['url', 'urls'])

  if (shouldReset) {
    resetEnv(shouldResetTokens, shouldResetUrls)
    return
  }

  appendMissingKeys()
}

try {
  run()
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`setup-env failed: ${errorMessage}`)
  process.exitCode = 1
}
