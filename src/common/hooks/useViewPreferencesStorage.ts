import { useState, useCallback, useRef } from 'react'

export interface SortingEntry {
  id: string
  desc: boolean
}

interface StoredPreferences {
  filters?: Record<string, any>
  sorting?: SortingEntry[]
  visibleColumns?: string[]
}

const readPreferences = (key: string): StoredPreferences => {
  try {
    const saved = localStorage.getItem(key)
    return saved ? (JSON.parse(saved) as StoredPreferences) : {}
  } catch {
    return {}
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
  const [prefs] = useState<StoredPreferences>(() => readPreferences(storageKey))
  const prefsRef = useRef<StoredPreferences>(prefs)

  const persist = useCallback(
    (updated: StoredPreferences) => {
      prefsRef.current = updated
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {
        // Ignore storage quota / security errors
      }
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
