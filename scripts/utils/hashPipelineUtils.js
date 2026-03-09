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
