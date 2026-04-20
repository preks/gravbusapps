/**
 * User-facing artifact visibility — must stay aligned with prompt-manager
 * `_is_user_facing_artifact_path` in `src/api/routes/deep_agent.py`.
 *
 * A **user-facing artifact** is a file the agent wrote under a normal workspace path that we
 * expose in REST and SSE. Internal tool scratch files (e.g. `call_*`) are not artifacts.
 */
export const isUserFacingArtifactPath = (nameOrPath: string): boolean => {
  const trimmed = nameOrPath?.trim() ?? ''
  if (!trimmed) return false
  const name = trimmed.includes('/') ? (trimmed.split('/').filter(Boolean).pop() ?? trimmed) : trimmed
  if (name.startsWith('call_')) return false
  if (name.startsWith('.')) return false
  const lower = trimmed.toLowerCase()
  if (lower.includes('/__pycache__/') || lower.includes('/.git/')) return false
  return true
}
