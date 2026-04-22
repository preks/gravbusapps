import { useState, useCallback } from 'react'
import { resolveFlowbotBaseUrl } from '@/common/utils/flowbotUtils'

export type NoteSource = 'user' | 'agent'

export interface BehaviorNote {
  text: string
  source: NoteSource
}

/**
 * LLM providers a user is allowed to pin via developer settings. The backend
 * keeps a longer list of supported providers, but only these two are exposed
 * in the UI today. `null` (or omitted) means "use the server default".
 */
export type UserSelectableLlmProvider = 'azure' | 'stackit'

/**
 * User-controlled feature flags persisted on `UserProfile.settings`
 * (TEXT/JSON column on the backend). All keys are optional so newly-added
 * flags default to "off" / "use server default" without a migration.
 */
export interface UserPreferencesSettings {
  /** Opt in to the Redis-backed exact + semantic chat response cache. */
  chat_cache_enabled?: boolean
  /** Pin chat to a specific LLM provider; `null` defers to the server. */
  llm_provider?: UserSelectableLlmProvider | null
}

export interface UserPreferences {
  external_user_id: string
  tool_affinities: Record<string, number>
  behavior_notes: BehaviorNote[]
  sessions_analyzed: number
  updated_at: string | null
  settings: UserPreferencesSettings
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
  /**
   * Partial update of user settings. Only the keys provided here are
   * touched on the backend (shallow merge). Send `null` for a value to
   * unset a previously-pinned setting (e.g. revert `llm_provider` to
   * the server default).
   */
  settings?: UserPreferencesSettings
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

  const getHeaders = useCallback(() => {
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json'
    }
  }, [accessToken])

  const fetchPreferences = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const res = await fetch(`${baseUrl}/flowbot/api/preferences`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch preferences: ${res.statusText}`)
      }

      const data = (await res.json()) as UserPreferences
      setPreferences({ ...data, settings: data.settings ?? {} })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch preferences'
      setError(message)
      console.error('Failed to fetch user preferences:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, getHeaders])

  const fetchSummary = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const res = await fetch(`${baseUrl}/flowbot/api/preferences/summary`, {
        method: 'GET',
        headers: getHeaders()
      })

      if (!res.ok) {
        throw new Error(`Failed to fetch summary: ${res.statusText}`)
      }

      const data = (await res.json()) as PreferencesSummary
      setSummary(data)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch summary'
      setError(message)
      console.error('Failed to fetch preferences summary:', err)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, getHeaders])

  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate): Promise<boolean> => {
      if (!accessToken) return false

      setIsLoading(true)
      setError(null)

      try {
        const baseUrl = resolveFlowbotBaseUrl()
        const res = await fetch(`${baseUrl}/flowbot/api/preferences`, {
          method: 'PATCH',
          headers: getHeaders(),
          body: JSON.stringify(updates)
        })

        if (!res.ok) {
          throw new Error(`Failed to update preferences: ${res.statusText}`)
        }

        const data = (await res.json()) as UserPreferences
        setPreferences({ ...data, settings: data.settings ?? {} })
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
    [accessToken, getHeaders]
  )

  const clearPreferences = useCallback(async (): Promise<boolean> => {
    if (!accessToken) return false

    setIsLoading(true)
    setError(null)

    try {
      const baseUrl = resolveFlowbotBaseUrl()
      const res = await fetch(`${baseUrl}/flowbot/api/preferences`, {
        method: 'DELETE',
        headers: getHeaders()
      })

      if (!res.ok) {
        throw new Error(`Failed to clear preferences: ${res.statusText}`)
      }

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
  }, [accessToken, getHeaders])

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
