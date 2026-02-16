import { useState, useCallback } from 'react'
import { FLOW_ENGINE_API_BASE } from '../constants'

export interface UseOnboardingTaskActionsProps {
  accessToken: string
  userId: string | undefined
  onSuccess?: () => void
  onError?: (err: string) => void
}

export interface UseOnboardingTaskActionsReturn {
  claim: (taskId: string) => Promise<void>
  complete: (taskId: string, formData?: Record<string, unknown>) => Promise<void>
  reject: (taskId: string, reason: string) => Promise<void>
  isPerforming: boolean
}

async function request(base: string, path: string, accessToken: string, body: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`
    },
    body: JSON.stringify(body)
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }
}

export function useOnboardingTaskActions({
  accessToken,
  userId,
  onSuccess,
  onError
}: UseOnboardingTaskActionsProps): UseOnboardingTaskActionsReturn {
  const [isPerforming, setIsPerforming] = useState(false)

  const run = useCallback(
    async (name: string, fn: () => Promise<void>) => {
      if (!userId || !accessToken) {
        onError?.('Missing user or token')
        return
      }
      setIsPerforming(true)
      try {
        await fn()
        onSuccess?.()
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        onError?.(msg)
        throw err
      } finally {
        setIsPerforming(false)
      }
    },
    [accessToken, userId, onSuccess, onError]
  )

  const claim = useCallback(
    (taskId: string) =>
      run('claim', () => request(FLOW_ENGINE_API_BASE, `/tasks/${taskId}/claim`, accessToken, { userId: userId! })),
    [accessToken, userId, run]
  )

  const complete = useCallback(
    (taskId: string, formData?: Record<string, unknown>) =>
      run('complete', () =>
        request(FLOW_ENGINE_API_BASE, `/tasks/${taskId}/complete`, accessToken, {
          userId: userId!,
          formData: formData ?? {}
        })
      ),
    [accessToken, userId, run]
  )

  const reject = useCallback(
    (taskId: string, reason: string) =>
      run('reject', () =>
        request(FLOW_ENGINE_API_BASE, `/tasks/${taskId}/reject`, accessToken, {
          userId: userId!,
          comment: reason
        })
      ),
    [accessToken, userId, run]
  )

  return { claim, complete, reject, isPerforming }
}
