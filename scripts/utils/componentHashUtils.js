import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { glob } from 'glob'

/**
 * Calculate MD5 hash of a single file
 */
export function calculateFileHash(filePath) {
  const content = fs.readFileSync(filePath)
  const hash = crypto.createHash('md5')
  hash.update(content)
  return hash.digest('hex') // Full 32-char MD5 hash
}

/**
 * Calculate combined hash for all artifacts in a screen's build directory
 * Combines hashes of:
 * - all .js/.css files in the screen directory
 * - referenced shared chunk files under dist/chunks (if any)
 */
export function calculateScreenHash(buildOutputDir) {
  const screenFiles = glob.sync('**/*.{js,css}', { cwd: buildOutputDir, nodir: true })

  if (screenFiles.length === 0) {
    throw new Error(`No artifacts found in ${buildOutputDir}`)
  }

  const distMarker = `${path.sep}dist${path.sep}`
  const markerIndex = buildOutputDir.lastIndexOf(distMarker)
  const distRootDir = markerIndex >= 0 ? buildOutputDir.slice(0, markerIndex + distMarker.length - 1) : null

  // Detect shared chunk dependencies referenced from screen JS output.
  // This captures shared component changes that end up in dist/chunks/* or dist/_chunks/*.
  const referencedChunkFiles = new Set()
  if (distRootDir) {
    for (const relativeFile of screenFiles) {
      if (!relativeFile.endsWith('.js')) continue
      const absoluteFilePath = path.join(buildOutputDir, relativeFile)
      const content = fs.readFileSync(absoluteFilePath, 'utf8')
      const chunkPathMatches = content.match(/_?chunks\/[A-Za-z0-9._/-]+\.(js|css)/g) || []
      for (const chunkRelPath of chunkPathMatches) {
        const normalized = chunkRelPath.replace(/\//g, path.sep)
        const absoluteChunkPath = path.join(distRootDir, normalized)
        if (fs.existsSync(absoluteChunkPath)) {
          referencedChunkFiles.add(absoluteChunkPath)
        }
      }
    }
  }

  // Sort for deterministic hash
  const screenFilesSorted = [...screenFiles].sort()
  const chunkFilesSorted = [...referencedChunkFiles].sort()

  // Combine all file hashes
  const combinedHash = crypto.createHash('md5')
  for (const file of screenFilesSorted) {
    const filePath = path.join(buildOutputDir, file)
    const fileHash = calculateFileHash(filePath)
    combinedHash.update(fileHash)
  }
  for (const chunkPath of chunkFilesSorted) {
    const chunkHash = calculateFileHash(chunkPath)
    combinedHash.update(chunkHash)
  }

  return combinedHash.digest('hex') // Full 32-char MD5 hash
}

/**
 * Load hash file from disk
 */
export function loadHashFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`   Hash file not found: ${filePath}, using empty state`)
    return {}
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    return JSON.parse(content)
  } catch (error) {
    console.error(`   Error loading hash file ${filePath}: ${error.message}`)
    return {}
  }
}

/**
 * Save hash file to disk (formatted JSON)
 */
export function saveHashFile(filePath, hashes) {
  // Sort keys for consistent diffs
  const sortedHashes = Object.keys(hashes)
    .sort()
    .reduce((acc, key) => {
      acc[key] = hashes[key]
      return acc
    }, {})

  fs.writeFileSync(filePath, JSON.stringify(sortedHashes, null, 2) + '\n')
}

/**
 * Compare dev and prod hashes for a screen
 */
export function compareScreenHashes(screenPath, devHashes, prodHashes) {
  const devHash = devHashes[screenPath]
  const prodHash = prodHashes[screenPath]

  if (!devHash) {
    return { changed: true, reason: 'no_dev_hash', devHash: null, prodHash }
  }

  if (!prodHash) {
    return { changed: true, reason: 'new_screen', devHash, prodHash: null }
  }

  if (devHash !== prodHash) {
    return { changed: true, reason: 'hash_mismatch', devHash, prodHash }
  }

  return { changed: false, reason: 'hash_match', devHash, prodHash }
}

/**
 * Configure git for CI commits
 */
export function configureGit(projectRootDir, execSyncFn) {
  try {
    // 1) Configure Git identity (these do NOT need to be secret; it's just who is performing the commit)
    execSyncFn('git config user.name "CI Hash Update Bot"', { cwd: projectRootDir })
    execSyncFn('git config user.email "ci-bot@newwork.com"', { cwd: projectRootDir })

    // 2) Reconfigure 'origin' URL with credentials
    const pipelineBot = process.env.PIPELINE_BOT
    const pipelineAppSecret = process.env.PIPELINE_APP_SECRET
    const bitbucketRepoOwner = process.env.BITBUCKET_REPO_OWNER
    const bitbucketRepoSlug = process.env.BITBUCKET_REPO_SLUG
    execSyncFn(
      `git remote set-url origin "https://${pipelineBot}:${pipelineAppSecret}@bitbucket.org/${bitbucketRepoOwner}/${bitbucketRepoSlug}.git"`,
      { cwd: projectRootDir }
    )

    // 3) Configure git to not fail on detached HEAD
    execSyncFn('git config advice.detachedHead false', { cwd: projectRootDir })

    // 4) Checkout current branch if detached
    const currentBranch = process.env.BITBUCKET_BRANCH
    if (currentBranch) {
      try {
        execSyncFn(`git checkout ${currentBranch}`, { cwd: projectRootDir })
      } catch {
        console.log('   Already on correct branch')
      }
    }
  } catch (error) {
    console.log(`   ⚠️  Git configuration warning: ${error.message}`)
  }
}
