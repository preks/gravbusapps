export function pickHashBaseline({ localHashes, remoteHashes }) {
  if (localHashes) {
    return { hashes: localHashes, source: 'local' }
  }
  if (remoteHashes) {
    return { hashes: remoteHashes, source: 'remote' }
  }
  return { hashes: {}, source: 'empty_fallback' }
}

export function shouldFailOnMissingBuildOutput(env = process.env) {
  const strictByEnv = env.HASH_DETECT_STRICT_MISSING_OUTPUT === 'true'
  const isDevelopPipeline = env.BITBUCKET_BRANCH === 'develop'
  return strictByEnv || isDevelopPipeline
}

export function getSkippedScreensSummary(skippedScreens, limit = 20) {
  const sample = skippedScreens.slice(0, limit)
  return {
    total: skippedScreens.length,
    sample,
    remaining: Math.max(skippedScreens.length - sample.length, 0)
  }
}

export function isScreenChanged(previousHash, currentHash) {
  return !previousHash || previousHash !== currentHash
}

export function mergeTouchedHashes(remoteHashes, touchedHashes) {
  return { ...remoteHashes, ...touchedHashes }
}

/**
 * Merge bundle-top-dependencies.json baseline with touched entry keys (same shallow merge as hashes).
 * Preserves non-touched screen keys; refreshes _meta.generatedAt.
 * @param {Record<string, unknown>} remote
 * @param {Record<string, unknown>} touched
 */
export function mergeTouchedBundleDeps(remote = {}, touched = {}) {
  const rMeta = remote._meta
  const tMeta = touched._meta
  const { _meta: _r, ...rRest } = remote
  const { _meta: _t, ...tRest } = touched
  const merged = { ...rRest, ...tRest }
  const maintainerNote =
    (rMeta && rMeta.maintainerNote) ||
    (tMeta && tMeta.maintainerNote) ||
    'Updated by CI after screen publishes; hand-edit only for schema fixes or emergencies.'
  merged._meta = {
    schemaVersion: (tMeta && tMeta.schemaVersion) ?? (rMeta && rMeta.schemaVersion) ?? 1,
    generatedAt: new Date().toISOString(),
    maintainerNote
  }
  return merged
}
