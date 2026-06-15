import { useState, useEffect, useCallback } from 'react'
import type { ActivityTabType, ActivityViewFilter } from '../types'
import {
  type AppScreen,
  parseActivity360Url,
  updateActivity360Url,
  initializeActivity360Url
} from '../utils/activity360UrlHelpers'

const normalizeTabForFilter = (tab: ActivityTabType, filter: ActivityViewFilter): ActivityTabType => {
  if (tab === 'comparison' && filter !== 'all') {
    return 'list'
  }

  return tab
}

export interface Activity360UrlState {
  appScreen: AppScreen
  activeTab: ActivityTabType
  goHome: () => void
  goEntityPicker: (filter: ActivityViewFilter) => void
  goActivities: (input: {
    filter: ActivityViewFilter
    entityId?: string
    entityName?: string
    tab?: ActivityTabType
  }) => void
  handleTabChange: (tab: ActivityTabType) => void
}

export function useActivity360UrlState(): Activity360UrlState {
  const [snapshot, setSnapshot] = useState(() => parseActivity360Url())

  const syncUrl = useCallback((next: ReturnType<typeof parseActivity360Url>) => {
    setSnapshot(next)
    updateActivity360Url(next)
  }, [])

  const goHome = useCallback(() => {
    syncUrl({
      appScreen: { screen: 'view-selector' },
      tab: 'list'
    })
  }, [syncUrl])

  const goEntityPicker = useCallback(
    (filter: ActivityViewFilter) => {
      syncUrl({
        appScreen: { screen: 'entity-selector', filter },
        tab: 'list'
      })
    },
    [syncUrl]
  )

  const goActivities = useCallback(
    (input: { filter: ActivityViewFilter; entityId?: string; entityName?: string; tab?: ActivityTabType }) => {
      const tab = normalizeTabForFilter(input.tab ?? snapshot.tab, input.filter)

      syncUrl({
        appScreen: {
          screen: 'activity-view',
          filter: input.filter,
          entityId: input.entityId,
          entityName: input.entityName
        },
        tab
      })
    },
    [snapshot.tab, syncUrl]
  )

  const handleTabChange = useCallback(
    (tab: ActivityTabType) => {
      if (snapshot.appScreen.screen !== 'activity-view') {
        return
      }

      const normalizedTab = normalizeTabForFilter(tab, snapshot.appScreen.filter)

      syncUrl({
        appScreen: snapshot.appScreen,
        tab: normalizedTab
      })
    },
    [snapshot.appScreen, syncUrl]
  )

  useEffect(() => {
    initializeActivity360Url(snapshot)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setSnapshot(parseActivity360Url())
    }

    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  return {
    appScreen: snapshot.appScreen,
    activeTab: snapshot.tab,
    goHome,
    goEntityPicker,
    goActivities,
    handleTabChange
  }
}
