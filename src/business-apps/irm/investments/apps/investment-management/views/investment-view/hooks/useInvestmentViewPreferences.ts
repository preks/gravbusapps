import { useCallback, useState } from 'react'
import type { StoredPreferences } from '@/common/hooks/useViewPreferencesStorage'
import type { InvestmentGroup } from './useInvestmentGroups'
import {
  getInvestmentGroupPreferencesKey,
  INVESTMENT_OVERVIEW_PREFERENCES_KEY,
  readPreferencesByTab,
  saveInvestmentViewPreferencePatch
} from '../utils/investmentViewPreferences'

export interface InvestmentViewPreferencesState {
  preferenceKeysByTab: Record<string, string>
  preferencesByTab: Record<string, StoredPreferences>
  initialFiltersByTab: Record<string, Record<string, any>>
  savePreferencePatch: (tabId: string, patch: StoredPreferences) => void
}

const buildPreferenceKeysByTab = (investmentGroups: InvestmentGroup[]): Record<string, string> => {
  return investmentGroups.reduce(
    (acc, group) => {
      acc[group.tabId] = getInvestmentGroupPreferencesKey(group)
      return acc
    },
    { overview: INVESTMENT_OVERVIEW_PREFERENCES_KEY } as Record<string, string>
  )
}

export const useInvestmentViewPreferences = (investmentGroups: InvestmentGroup[]): InvestmentViewPreferencesState => {
  const [preferenceKeysByTab, setPreferenceKeysByTab] = useState<Record<string, string>>(() =>
    buildPreferenceKeysByTab(investmentGroups)
  )
  // Keep preference keys in sync with groups (groups load asynchronously).
  // Using the "adjusting state during render" pattern so the update is synchronous.
  const currentKeys = buildPreferenceKeysByTab(investmentGroups)
  if (JSON.stringify(currentKeys) !== JSON.stringify(preferenceKeysByTab)) {
    setPreferenceKeysByTab(currentKeys)
  }

  // Read once from localStorage per key set.
  // When preferenceKeysByTab changes (new groups added), merge fresh localStorage
  // data for the new tabs while preserving any in-session overrides already in state.
  const [preferencesByTab, setPreferencesByTab] = useState<Record<string, StoredPreferences>>(() =>
    readPreferencesByTab(preferenceKeysByTab)
  )
  const [prevPreferenceKeysByTab, setPrevPreferenceKeysByTab] = useState(preferenceKeysByTab)
  if (preferenceKeysByTab !== prevPreferenceKeysByTab) {
    setPrevPreferenceKeysByTab(preferenceKeysByTab)
    setPreferencesByTab(prev => ({
      // Fresh localStorage data for every tab (covers newly added group tabs)
      ...readPreferencesByTab(preferenceKeysByTab),
      // In-session overrides take priority (e.g. user already changed columns)
      ...prev
    }))
  }

  const initialFiltersByTab = Object.fromEntries(
    Object.entries(preferencesByTab).map(([tabId, prefs]) => [tabId, prefs.filters ?? {}])
  )

  const savePreferencePatch = useCallback(
    (tabId: string, patch: StoredPreferences) => {
      saveInvestmentViewPreferencePatch(preferenceKeysByTab[tabId], patch)
      // Update in-memory state so switching back to this tab restores the latest values
      setPreferencesByTab(prev => ({
        ...prev,
        [tabId]: { ...prev[tabId], ...patch }
      }))
    },
    [preferenceKeysByTab]
  )

  return {
    preferenceKeysByTab,
    preferencesByTab,
    initialFiltersByTab,
    savePreferencePatch
  }
}
