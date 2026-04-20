import { useState, useEffect, useCallback } from 'react'
import {
  EmailProviderSettingsApi,
  type AdminProviderConfig,
  type UpsertProviderSettingsRequest
} from '../../email-apps/services/EmailProviderSettingsApi'

export interface UseProviderSettingsResult {
  settings: AdminProviderConfig[]
  isLoading: boolean
  error: string | null
  errorFallbackKey: string | null
  saveSettings: (data: UpsertProviderSettingsRequest) => Promise<void>
  refreshSettings: () => Promise<void>
}

export function useProviderSettings(accessToken: string): UseProviderSettingsResult {
  const [settings, setSettings] = useState<AdminProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorFallbackKey, setErrorFallbackKey] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)
    setErrorFallbackKey(null)

    try {
      EmailProviderSettingsApi.setAccessToken(accessToken)
      const data = await EmailProviderSettingsApi.getAdminSettings()
      setSettings(data)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
        return
      }

      setErrorFallbackKey('error-load-settings')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const saveSettings = useCallback(
    async (data: UpsertProviderSettingsRequest) => {
      if (!accessToken) return
      EmailProviderSettingsApi.setAccessToken(accessToken)
      await EmailProviderSettingsApi.upsertSettings(data)
      await loadSettings()
    },
    [accessToken, loadSettings]
  )

  return {
    settings,
    isLoading,
    error,
    errorFallbackKey,
    saveSettings,
    refreshSettings: loadSettings
  }
}
