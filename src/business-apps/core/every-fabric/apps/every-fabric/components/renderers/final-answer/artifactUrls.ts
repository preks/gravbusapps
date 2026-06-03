import { PROMPT_MANAGER_API_URL } from '@/common/utils/serviceResolver'

export function buildArtifactDownloadUrl(sessionId: string, artifactPath: string): string {
  const base = PROMPT_MANAGER_API_URL.endsWith('/') ? PROMPT_MANAGER_API_URL.slice(0, -1) : PROMPT_MANAGER_API_URL
  return `${base}/deep-agent/sessions/${encodeURIComponent(sessionId)}/artifacts/${encodeURIComponent(artifactPath)}`
}
