import { CUSTOM_FLOW_ENGINE_API_URL } from '@/common/utils/serviceResolver'
import { decodeAccessTokenSub } from '@/common/utils/decodeJwtSub'
import { trimTrailingSlashes } from './learningServiceUrl'

function getCflowTaskApiBase(): string {
  const trimmed = trimTrailingSlashes((CUSTOM_FLOW_ENGINE_API_URL || '').trim())
  if (trimmed.endsWith('/api/v1')) return trimmed.slice(0, -'/api/v1'.length)
  if (trimmed.endsWith('/api')) return trimmed.slice(0, -'/api'.length)
  return trimmed
}

export async function completeLearningQuizTask(accessToken: string, taskId: string, result: Record<string, unknown>) {
  const userId = decodeAccessTokenSub(accessToken)
  const response = await fetch(`${getCflowTaskApiBase()}/api/tasks/${taskId}/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify({
      userId: userId ?? '',
      formData: result
    })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Failed to complete learning quiz task' }))
    const message =
      typeof errorData.error === 'string' || typeof errorData.message === 'string'
        ? (errorData.error ?? errorData.message)
        : 'Failed to complete learning quiz task'
    throw new Error(message)
  }
}
