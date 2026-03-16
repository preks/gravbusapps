import fs from 'fs'

const ENV_FILE = '.env'
const ENV_EXAMPLE_FILE = '.env.example'
const ENV_BACKUP_FILE = '.env.bak'
const SECRETS_FILE = '.secrets'

const KEY_LINE_REGEX = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/
const TOKEN_KEY_REGEX = /(TOKEN|KEY|SECRET|PASSWORD|SAS)/i
const URL_KEY_REGEX = /(URL|ENDPOINT|_API_)/i
const PLACEHOLDER_VALUE_REGEX = /^(?:<[^>]+>|(["'])<[^>]+>\1)$/

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
      comment
    })
  }

  return entries
}

function readFileIfExists(filePath) {
  if (!fs.existsSync(filePath)) return ''
  return fs.readFileSync(filePath, 'utf8')
}

function readEnvEntries(filePath) {
  return parseEnvEntries(readFileIfExists(filePath))
}

function isPlaceholderValue(value) {
  return PLACEHOLDER_VALUE_REGEX.test(value.trim())
}

function classifyKey(key, exampleValue) {
  if (TOKEN_KEY_REGEX.test(key)) return 'token'
  if (URL_KEY_REGEX.test(key)) return 'url'
  if (isPlaceholderValue(exampleValue)) return 'token'
  return 'other'
}

function isSecretBackedKey(key, exampleEntries) {
  const exampleEntry = exampleEntries.get(key)
  return Boolean(exampleEntry) && classifyKey(key, exampleEntry.value) === 'token'
}

function buildAssignmentLine(key, value, comment) {
  if (!comment) return `${key}=${value}`
  return `${key}=${value} ${comment}`
}

function writeSecretsFile(exampleEntries, envEntries) {
  const secretLines = []

  for (const [key, exampleEntry] of exampleEntries) {
    if (classifyKey(key, exampleEntry.value) !== 'token') continue
    const envEntry = envEntries.get(key)
    if (!envEntry) continue
    secretLines.push(buildAssignmentLine(key, envEntry.value, ''))
  }

  if (secretLines.length === 0) return 0

  fs.writeFileSync(SECRETS_FILE, `${secretLines.join('\n')}\n`)
  return secretLines.length
}

function ensureSecretsFile(exampleEntries, envEntries) {
  if (fs.existsSync(SECRETS_FILE)) {
    return {
      secretEntries: readEnvEntries(SECRETS_FILE),
      createdSecretCount: 0
    }
  }

  const createdSecretCount = writeSecretsFile(exampleEntries, envEntries)

  return {
    secretEntries: createdSecretCount > 0 ? readEnvEntries(SECRETS_FILE) : new Map(),
    createdSecretCount
  }
}

function resolveExampleValue(key, exampleEntries, secretEntries) {
  const exampleEntry = exampleEntries.get(key)
  if (!exampleEntry) return ''

  if (isSecretBackedKey(key, exampleEntries)) {
    return secretEntries.get(key)?.value ?? exampleEntry.value
  }

  return exampleEntry.value
}

function shouldHydrateSecretValue(currentValue) {
  const normalizedCurrentValue = currentValue.trim()
  return normalizedCurrentValue === '' || isPlaceholderValue(normalizedCurrentValue)
}

function buildExampleEnvContent(
  exampleContent,
  exampleEntries,
  preservedEntries,
  secretEntries,
  shouldResetTokens,
  shouldResetUrls
) {
  let preservedTokenCount = 0
  let preservedUrlCount = 0
  let reappliedSecretCount = 0

  const rebuiltLines = splitLines(exampleContent).map(line => {
    const assignment = parseAssignmentLine(line)
    if (!assignment) return line

    const exampleEntry = exampleEntries.get(assignment.key)
    if (!exampleEntry) return line

    const keyCategory = classifyKey(assignment.key, exampleEntry.value)

    if (keyCategory === 'token') {
      const preservedEntry = preservedEntries.get(assignment.key)
      const secretEntry = secretEntries.get(assignment.key)

      if (preservedEntry && !shouldResetTokens) {
        preservedTokenCount += 1
        return buildAssignmentLine(assignment.key, preservedEntry.value, exampleEntry.comment)
      }

      if (secretEntry) {
        reappliedSecretCount += 1
        return buildAssignmentLine(assignment.key, secretEntry.value, exampleEntry.comment)
      }

      return buildAssignmentLine(assignment.key, exampleEntry.value, exampleEntry.comment)
    }

    if (keyCategory === 'url' && !shouldResetUrls) {
      const preservedEntry = preservedEntries.get(assignment.key)
      if (preservedEntry) {
        preservedUrlCount += 1
        return buildAssignmentLine(assignment.key, preservedEntry.value, exampleEntry.comment)
      }
    }

    return buildAssignmentLine(assignment.key, exampleEntry.value, exampleEntry.comment)
  })

  return {
    content: `${rebuiltLines.join('\n')}\n`,
    preservedTokenCount,
    preservedUrlCount,
    reappliedSecretCount
  }
}

function isEnabledNpmConfigFlag(flagName) {
  const configValue = process.env[`npm_config_${flagName}`]
  if (configValue === undefined) return false
  return configValue !== 'false'
}

function hasFlag(scriptArguments, flagNames) {
  return flagNames.some(flagName => scriptArguments.has(`--${flagName}`) || isEnabledNpmConfigFlag(flagName))
}

function syncEnv() {
  const exampleContent = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf8')
  const exampleEntries = parseEnvEntries(exampleContent)
  const envEntries = readEnvEntries(ENV_FILE)
  const { secretEntries, createdSecretCount } = ensureSecretsFile(exampleEntries, envEntries)

  if (!fs.existsSync(ENV_FILE)) {
    const { content, reappliedSecretCount } = buildExampleEnvContent(
      exampleContent,
      exampleEntries,
      new Map(),
      secretEntries,
      false,
      false
    )
    fs.writeFileSync(ENV_FILE, content)

    const logParts = ['Created .env from .env.example.']
    if (createdSecretCount > 0) logParts.push(`Created .secrets with ${createdSecretCount} value(s).`)
    if (reappliedSecretCount > 0)
      logParts.push(`Reapplied ${reappliedSecretCount} placeholder-backed value(s) from .secrets.`)
    console.log(logParts.join(' '))
    return
  }

  const envContent = readFileIfExists(ENV_FILE)
  const exampleLines = splitLines(exampleContent)
  const existingKeys = new Set(envEntries.keys())
  let synchronizedSecretCount = 0

  const synchronizedLines = splitLines(envContent).map(line => {
    const assignment = parseAssignmentLine(line)
    if (!assignment || !isSecretBackedKey(assignment.key, exampleEntries)) return line

    const secretEntry = secretEntries.get(assignment.key)
    if (!secretEntry) return line

    const { value: currentValue, comment } = splitValueAndComment(assignment.rawValue)
    if (!shouldHydrateSecretValue(currentValue)) return line

    const nextLine = buildAssignmentLine(assignment.key, secretEntry.value, comment)

    if (nextLine !== line) synchronizedSecretCount += 1
    return nextLine
  })

  let nextEnvContent = synchronizedLines.join('\n')
  let pendingCommentLines = []
  const linesToAppend = []
  let addedCount = 0

  for (const line of exampleLines) {
    const assignment = parseAssignmentLine(line)

    if (assignment) {
      if (!existingKeys.has(assignment.key)) {
        const exampleEntry = exampleEntries.get(assignment.key)
        const nextLine = buildAssignmentLine(
          assignment.key,
          resolveExampleValue(assignment.key, exampleEntries, secretEntries),
          exampleEntry?.comment ?? ''
        )
        linesToAppend.push(...pendingCommentLines, nextLine)
        existingKeys.add(assignment.key)
        addedCount += 1
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

  if (linesToAppend.length > 0) {
    const suffix = nextEnvContent === '' || nextEnvContent.endsWith('\n') ? '' : '\n'
    nextEnvContent = `${nextEnvContent}${suffix}${linesToAppend.join('\n')}\n`
  }

  if (nextEnvContent !== envContent) {
    fs.writeFileSync(ENV_FILE, nextEnvContent)
  }

  if (createdSecretCount === 0 && synchronizedSecretCount === 0 && addedCount === 0) return

  const logParts = []
  if (createdSecretCount > 0) logParts.push(`Created .secrets with ${createdSecretCount} value(s).`)
  if (synchronizedSecretCount > 0) {
    logParts.push(`Synchronized ${synchronizedSecretCount} placeholder-backed value(s) from .secrets.`)
  }
  if (addedCount > 0) logParts.push(`Added ${addedCount} variable(s) from .env.example.`)
  console.log(logParts.join(' '))
}

function resetEnv(shouldResetTokens, shouldResetUrls) {
  const exampleContent = fs.readFileSync(ENV_EXAMPLE_FILE, 'utf8')
  const exampleEntries = parseEnvEntries(exampleContent)
  const envEntries = readEnvEntries(ENV_FILE)
  const { secretEntries, createdSecretCount } = ensureSecretsFile(exampleEntries, envEntries)

  if (!fs.existsSync(ENV_FILE)) {
    const { content, reappliedSecretCount } = buildExampleEnvContent(
      exampleContent,
      exampleEntries,
      new Map(),
      secretEntries,
      shouldResetTokens,
      shouldResetUrls
    )
    fs.writeFileSync(ENV_FILE, content)

    const logParts = ['Created .env from .env.example.']
    if (createdSecretCount > 0) logParts.push(`Created .secrets with ${createdSecretCount} value(s).`)
    if (reappliedSecretCount > 0) {
      logParts.push(`Reapplied ${reappliedSecretCount} placeholder-backed value(s) from .secrets.`)
    }
    if (shouldResetTokens) logParts.push('`--token` resolves placeholder-backed values from .secrets.')
    console.log(logParts.join(' '))
    return
  }

  let backupWasCreated = false
  let shouldDeleteBackup = false

  try {
    fs.copyFileSync(ENV_FILE, ENV_BACKUP_FILE)
    backupWasCreated = true

    const backupEntries = readEnvEntries(ENV_BACKUP_FILE)
    const { content, preservedTokenCount, preservedUrlCount, reappliedSecretCount } = buildExampleEnvContent(
      exampleContent,
      exampleEntries,
      backupEntries,
      secretEntries,
      shouldResetTokens,
      shouldResetUrls
    )
    fs.writeFileSync(ENV_FILE, content)

    shouldDeleteBackup = true
    const removedVariableCount = Array.from(backupEntries.keys()).filter(key => !exampleEntries.has(key)).length
    const logParts = []
    if (createdSecretCount > 0) logParts.push(`Created .secrets with ${createdSecretCount} value(s).`)
    logParts.push(
      `Reset .env from .env.example. Preserved ${preservedTokenCount} token value(s), reapplied ${reappliedSecretCount} placeholder-backed value(s) from .secrets, preserved ${preservedUrlCount} URL value(s), and removed ${removedVariableCount} custom variable(s).`
    )
    if (shouldResetTokens) logParts.push('`--token` resolves placeholder-backed values from .secrets.')
    console.log(logParts.join(' '))
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

  syncEnv()
}

try {
  run()
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error)
  console.error(`setup-env failed: ${errorMessage}`)
  process.exitCode = 1
}
