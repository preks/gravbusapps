import { useCallback, useEffect, useState } from 'react'
import { EmailApiService } from '../../email-apps/services/EmailApiService'
import type { EmailAssistantPolicy, EmailAssistantPolicyUpdateRequest } from '../../email-apps/types'

export interface UseAssistantPolicySettingsResult {
  policy: EmailAssistantPolicy | null
  isLoading: boolean
  isSaving: boolean
  error: string | null
  errorFallbackKey: string | null
  savePolicy: (payload: EmailAssistantPolicyUpdateRequest) => Promise<void>
  refreshPolicy: () => Promise<void>
}

export function useAssistantPolicySettings(accessToken: string): UseAssistantPolicySettingsResult {
  const [policy, setPolicy] = useState<EmailAssistantPolicy | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorFallbackKey, setErrorFallbackKey] = useState<string | null>(null)

  const loadPolicy = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    setErrorFallbackKey(null)
    try {
      EmailApiService.setAccessToken(accessToken)
      const response = await EmailApiService.getAssistantPolicy()
      setPolicy(response)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setErrorFallbackKey('error-load-assistant-policy')
      }
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    void loadPolicy()
  }, [loadPolicy])

  const savePolicy = useCallback(
    async (payload: EmailAssistantPolicyUpdateRequest) => {
      if (!accessToken) return
      setIsSaving(true)
      setError(null)
      setErrorFallbackKey(null)
      try {
        EmailApiService.setAccessToken(accessToken)
        const updated = await EmailApiService.updateAssistantPolicy(payload)
        setPolicy(updated)
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message)
        } else {
          setErrorFallbackKey('error-save-assistant-policy')
        }
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [accessToken]
  )

  return {
    policy,
    isLoading,
    isSaving,
    error,
    errorFallbackKey,
    savePolicy,
    refreshPolicy: loadPolicy
  }
}
