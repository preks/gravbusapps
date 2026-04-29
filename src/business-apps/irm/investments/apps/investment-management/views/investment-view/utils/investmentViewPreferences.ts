import {
  readViewPreferences,
  writeViewPreferences,
  type StoredPreferences
} from '@/common/hooks/useViewPreferencesStorage'
import type { InvestmentGroup } from '../hooks/useInvestmentGroups'

export const INVESTMENT_OVERVIEW_PREFERENCES_KEY = 'irm:investment-view:overview-preferences:v1'

export const getInvestmentGroupPreferencesKey = (group: Pick<InvestmentGroup, 'code' | 'id'>): string => {
  return `irm:investment-view:group:${group.code || group.id}:preferences:v1`
}

export const saveInvestmentViewPreferencePatch = (storageKey: string | undefined, patch: StoredPreferences): void => {
  if (!storageKey) return
  writeViewPreferences(storageKey, { ...readViewPreferences(storageKey), ...patch })
}

export const reconcileVisibleColumns = (
  cachedVisibleColumns: string[] | undefined,
  availableColumnIds: string[],
  defaultVisibleColumns: string[]
): string[] | null => {
  if (!cachedVisibleColumns) {
    return null
  }

  const available = new Set(availableColumnIds)
  const visibleColumns = cachedVisibleColumns.filter(column => available.has(column))

  return visibleColumns.length > 0 ? visibleColumns : defaultVisibleColumns
}

export const readPreferencesByTab = (preferenceKeysByTab: Record<string, string>): Record<string, StoredPreferences> =>
  Object.entries(preferenceKeysByTab).reduce(
    (acc, [tabId, storageKey]) => {
      acc[tabId] = readViewPreferences(storageKey)
      return acc
    },
    {} as Record<string, StoredPreferences>
  )
