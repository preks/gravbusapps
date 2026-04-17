/**
 * Build Bitbucket pipeline results URL from standard pipeline env vars.
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {string | null}
 */
export function getBitbucketPipelineResultsUrl(env = process.env) {
  const n = env.BITBUCKET_BUILD_NUMBER
  if (n == null || String(n).trim() === '') return null
  const build = String(n).trim()
  const full = env.BITBUCKET_REPO_FULL_NAME
  if (full) {
    return `https://bitbucket.org/${full}/pipelines/results/${build}/`
  }
  const w = env.BITBUCKET_WORKSPACE
  const s = env.BITBUCKET_REPO_SLUG
  if (w && s) {
    return `https://bitbucket.org/${w}/${s}/pipelines/results/${build}/`
  }
  return null
}

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ bitbucketBuildNumber: number | null, pipelineUrl: string | null }}
 */
export function getBitbucketPipelineMetadata(env = process.env) {
  const raw = env.BITBUCKET_BUILD_NUMBER
  let bitbucketBuildNumber = null
  if (raw != null && String(raw).trim() !== '') {
    const num = Number(raw)
    if (Number.isFinite(num)) bitbucketBuildNumber = num
  }
  const pipelineUrl = getBitbucketPipelineResultsUrl(env)
  return { bitbucketBuildNumber, pipelineUrl }
}
