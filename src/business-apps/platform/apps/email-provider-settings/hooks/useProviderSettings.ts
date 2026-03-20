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
  saveSettings: (data: UpsertProviderSettingsRequest) => Promise<void>
  refreshSettings: () => Promise<void>
}

export function useProviderSettings(accessToken: string): UseProviderSettingsResult {
  const [settings, setSettings] = useState<AdminProviderConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSettings = useCallback(async () => {
    if (!accessToken) return
    setIsLoading(true)
    setError(null)

    try {
      EmailProviderSettingsApi.setAccessToken(accessToken)
      const data = await EmailProviderSettingsApi.getAdminSettings()
      setSettings(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load settings')
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
    saveSettings,
    refreshSettings: loadSettings
  }
}
