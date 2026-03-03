/**
 * UserPreferencesContext - Global state management for user preferences
 *
 * Manages user preferences extracted from previous sessions, providing
 * a way for users to view and edit their personalization settings.
 */

import React, { createContext, useContext, useState, useCallback } from 'react'
import {
  useUserPreferences,
  UserPreferences,
  PreferencesSummary,
  UserPreferencesUpdate
} from '../hooks/useUserPreferences'

export interface UserPreferencesContextValue {
  // Preferences data
  preferences: UserPreferences | null
  summary: PreferencesSummary | null

  // Loading state
  isLoading: boolean
  error: string | null

  // Modal state
  isModalOpen: boolean
  openModal: () => void
  closeModal: () => void

  // Actions
  refresh: () => Promise<void>
  updatePreferences: (updates: UserPreferencesUpdate) => Promise<boolean>
  clearPreferences: () => Promise<boolean>

  // Computed state
  hasPreferences: boolean
}

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null)

interface UserPreferencesProviderProps {
  children: React.ReactNode
  accessToken: string
}

export function UserPreferencesProvider({ children, accessToken }: UserPreferencesProviderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  const {
    preferences,
    summary,
    isLoading,
    error,
    fetchPreferences,
    fetchSummary,
    updatePreferences: hookUpdatePreferences,
    clearPreferences: hookClearPreferences
  } = useUserPreferences(accessToken)

  // Fetch preferences on mount (lazy load - only fetch when modal opens for the first time)
  const [hasFetched, setHasFetched] = useState(false)

  const refresh = useCallback(async () => {
    await Promise.all([fetchPreferences(), fetchSummary()])
  }, [fetchPreferences, fetchSummary])

  const openModal = useCallback(() => {
    setIsModalOpen(true)
    if (!hasFetched) {
      refresh()
      setHasFetched(true)
    }
  }, [hasFetched, refresh])

  const closeModal = useCallback(() => {
    setIsModalOpen(false)
  }, [])

  const updatePreferences = useCallback(
    async (updates: UserPreferencesUpdate): Promise<boolean> => {
      const success = await hookUpdatePreferences(updates)
      if (success) {
        await fetchSummary()
      }
      return success
    },
    [hookUpdatePreferences, fetchSummary]
  )

  const clearPreferences = useCallback(async (): Promise<boolean> => {
    const success = await hookClearPreferences()
    if (success) {
      setHasFetched(false)
    }
    return success
  }, [hookClearPreferences])

  const hasPreferences =
    preferences !== null &&
    (Object.keys(preferences.tool_affinities).length > 0 || preferences.behavior_notes.length > 0)

  const value: UserPreferencesContextValue = {
    preferences,
    summary,
    isLoading,
    error,
    isModalOpen,
    openModal,
    closeModal,
    refresh,
    updatePreferences,
    clearPreferences,
    hasPreferences
  }

  return <UserPreferencesContext.Provider value={value}>{children}</UserPreferencesContext.Provider>
}

export function useUserPreferencesContext() {
  const context = useContext(UserPreferencesContext)
  if (!context) {
    throw new Error('useUserPreferencesContext must be used within a UserPreferencesProvider')
  }
  return context
}

export default UserPreferencesContext
