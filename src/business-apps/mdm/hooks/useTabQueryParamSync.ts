import { useCallback, useEffect, useMemo, useState } from 'react'

function readTabFromLocation<T extends string>(valid: ReadonlySet<T>, defaultTab: T, queryKey: string): T {
  if (typeof window === 'undefined') return defaultTab
  const tabParam = new URLSearchParams(window.location.search).get(queryKey)
  if (!tabParam) return defaultTab
  return valid.has(tabParam as T) ? (tabParam as T) : defaultTab
}

/**
 * Keeps tab selection in sync with a query param (default `?tab=`) using replaceState + popstate.
 */
export function useTabQueryParamSync<T extends string>(
  tabEnum: Record<string, T>,
  defaultTab: T,
  queryKey = 'tab'
): readonly [T, (nextTab: string) => void] {
  const validTabs = useMemo(() => Object.values(tabEnum) as T[], [tabEnum])
  const validSet = useMemo(() => new Set(validTabs), [validTabs])

  const [selectedTab, setSelectedTab] = useState<T>(() => readTabFromLocation(validSet, defaultTab, queryKey))

  const syncFromUrl = useCallback(() => {
    setSelectedTab(readTabFromLocation(validSet, defaultTab, queryKey))
  }, [validSet, defaultTab, queryKey])

  useEffect(() => {
    syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    return () => window.removeEventListener('popstate', syncFromUrl)
  }, [syncFromUrl])

  const onTabChange = useCallback(
    (value: string) => {
      if (!validSet.has(value as T)) return
      const url = new URL(window.location.href)
      url.searchParams.set(queryKey, value)
      history.replaceState(null, '', url.toString())
      setSelectedTab(value as T)
    },
    [validSet, queryKey]
  )

  return [selectedTab, onTabChange] as const
}
