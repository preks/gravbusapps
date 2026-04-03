import { useState, useCallback } from 'react'
import { useFlowbotClient } from '@/common/network/flowbot/useFlowbotClient'

export type NoteSource = 'user' | 'agent'

export interface BehaviorNote {
  text: string
  source: NoteSource
}

export interface UserPreferences {
  external_user_id: string
  tool_affinities: Record<string, number>
  behavior_notes: BehaviorNote[]
  sessions_analyzed: number
  updated_at: string | null
}

export interface PreferencesSummary {
  has_preferences: boolean
  sessions_analyzed?: number
  top_tools?: string[]
  notes?: BehaviorNote[]
  user_notes_count?: number
  agent_notes_count?: number
  summary: string
}

export interface UserPreferencesUpdate {
  behavior_notes?: BehaviorNote[]
}

export interface UseUserPreferencesReturn {
  preferences: UserPreferences | null
  summary: PreferencesSummary | null
  isLoading: boolean
  error: string | null
  fetchPreferences: () => Promise<void>
  fetchSummary: () => Promise<void>
  updatePreferences: (updates: UserPreferencesUpdate) => Promise<boolean>
  clearPreferences: () => Promise<boolean>
}

export function useUserPreferences(accessToken: string): UseUserPreferencesReturn {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null)
  const [summary, setSummary] = useState<PreferencesSummary | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const client = useFlowbotClient(accessToken)

  const fetchPreferences = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await client.getPreferences<UserPreferences>()
      setPreferences(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch preferences'
      setError(message)
      console.error('Failed to fetch user preferences:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client])

  const fetchSummary = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const data = await client.getPreferencesSummary<PreferencesSummary>()
      setSummary(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch summary'
      setError(message)
      console.error('Failed to fetch preferences summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client])

  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate): Promise<boolean> => {
      if (!accessToken) return false

      setIsLoading(true)
      setError(null)

      try {
        const data = await client.updatePreferences<UserPreferences>(updates)
        setPreferences(data)
        return true
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update preferences'
        setError(message)
        console.error('Failed to update user preferences:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, client]
  )

  const clearPreferences = useCallback(async (): Promise<boolean> => {
    if (!accessToken) return false

    setIsLoading(true)
    setError(null)

    try {
      await client.clearPreferences()
      setPreferences(null)
      setSummary(null)
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear preferences'
      setError(message)
      console.error('Failed to clear user preferences:', err)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client])

  return {
    preferences,
    summary,
    isLoading,
    error,
    fetchPreferences,
    fetchSummary,
    updatePreferences,
    clearPreferences
  }
}

export default useUserPreferences
