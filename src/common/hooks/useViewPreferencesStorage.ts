import { useState, useCallback, useRef } from 'react'

export interface SortingEntry {
  id: string
  desc: boolean
}

export interface StoredPreferences {
  filters?: Record<string, any>
  sorting?: SortingEntry[]
  visibleColumns?: string[]
}

export const readViewPreferences = (key: string): StoredPreferences => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as StoredPreferences) : {}
  } catch {
    return {}
  }
}

export const writeViewPreferences = (key: string, preferences: StoredPreferences): void => {
  try {
    localStorage.setItem(key, JSON.stringify(preferences))
  } catch {
    // Ignore storage quota / security errors
  }
}

export interface ViewPreferencesStorage {
  initialFilters: Record<string, any>
  saveFilters: (filters: Record<string, any>) => void
  initialSorting: SortingEntry[] | null
  saveSorting: (sorting: SortingEntry[]) => void
  initialVisibleColumns: string[] | null
  saveVisibleColumns: (columns: string[]) => void
}

export const useViewPreferencesStorage = (storageKey: string): ViewPreferencesStorage => {
  const [prefs] = useState<StoredPreferences>(() => readViewPreferences(storageKey))
  const prefsRef = useRef<StoredPreferences>(prefs)

  const persist = useCallback(
    (updated: StoredPreferences) => {
      prefsRef.current = updated
      writeViewPreferences(storageKey, updated)
    },
    [storageKey]
  )

  const saveFilters = useCallback(
    (filters: Record<string, any>) => persist({ ...prefsRef.current, filters }),
    [persist]
  )

  const saveSorting = useCallback((sorting: SortingEntry[]) => persist({ ...prefsRef.current, sorting }), [persist])

  const saveVisibleColumns = useCallback(
    (visibleColumns: string[]) => persist({ ...prefsRef.current, visibleColumns }),
    [persist]
  )

  return {
    initialFilters: prefs.filters ?? {},
    saveFilters,
    initialSorting: prefs.sorting ?? null,
    saveSorting,
    initialVisibleColumns: prefs.visibleColumns ?? null,
    saveVisibleColumns
  }
}
