import { useMemo } from 'react'
import type { BusinessAppInfo } from '@/components/ide-main-menu'
import {
  buildSearchTokens,
  resolveNodeConfiguration,
  type MenuConfiguration
} from '@/components/ide-main-menu/menuConfiguration'
import type { SearchItem, SearchSection } from '../types'

type BusinessAppType = BusinessAppInfo['type']

interface UseBusinessAppSearchOptions {
  enabled: boolean
  query: string
  selectedCategoryIds: string[]
  businessApps?: BusinessAppInfo[]
  menuConfiguration?: MenuConfiguration
}

const typeTitleMap: Record<BusinessAppType, string> = {
  app: 'Apps',
  record: 'Records',
  form: 'Forms',
  popup: 'Popups',
  window: 'Windows'
}

const typeIconMap: Record<BusinessAppType, string> = {
  app: 'Play',
  record: 'Play',
  form: 'ArticleNyTimes',
  popup: 'ChatCircle',
  window: 'Gauge'
}

const getAppPath = (businessApp: BusinessAppInfo): string =>
  businessApp.subModule ? `${businessApp.module}/${businessApp.subModule}` : businessApp.module

const createAppItem = (
  app: BusinessAppInfo,
  menuConfiguration: MenuConfiguration | undefined,
  rank: number
): SearchItem => {
  const appConfiguration = resolveNodeConfiguration(menuConfiguration, [
    `app:${app.screenKey}`,
    app.screenKey,
    getAppPath(app)
  ])
  const label = appConfiguration.searchLabel ?? appConfiguration.menuLabel ?? app.name
  const subModuleLabel = app.subModule ? ` > ${app.subModule}` : ''

  return {
    id: `business-app-${app.screenKey}`,
    type: app.type,
    typeLabel: app.type.toUpperCase(),
    categoryIds: ['apps'],
    name: label,
    description: `${app.module}${subModuleLabel}`,
    media: {
      icon: appConfiguration.icon ?? typeIconMap[app.type],
      fallbackIcon: typeIconMap[app.type]
    },
    primaryTarget: {
      kind: 'URL',
      href: `?${encodeURIComponent(app.type)}=${encodeURIComponent(app.screenKey)}`,
      openIn: 'SAME_TAB'
    },
    analytics: {
      provider: 'legacy-global-search-command',
      trackingId: `legacy-app-${app.screenKey}`,
      rank
    }
  }
}

export const useBusinessAppSearch = ({
  enabled,
  query,
  selectedCategoryIds,
  businessApps = [],
  menuConfiguration
}: UseBusinessAppSearchOptions): SearchSection[] => {
  return useMemo(() => {
    if (!enabled) {
      return []
    }

    const trimmedQuery = query.trim().toLowerCase()
    if (!trimmedQuery) {
      return []
    }
    const selectedSet = new Set(selectedCategoryIds)
    const appsCategorySelected = selectedSet.size === 0 || selectedSet.has('all') || selectedSet.has('apps')
    if (!appsCategorySelected) {
      return []
    }

    const filteredApps = businessApps
      .filter(app => {
        const appConfiguration = resolveNodeConfiguration(menuConfiguration, [
          `app:${app.screenKey}`,
          app.screenKey,
          getAppPath(app)
        ])
        const searchTitle = appConfiguration.searchLabel ?? appConfiguration.menuLabel ?? app.name
        const subModuleSuffix = app.subModule ? ` > ${app.subModule}` : ''
        const fallbackSubtitle = `${app.module}${subModuleSuffix}`
        const searchSubtitle = appConfiguration.menuLabel ?? fallbackSubtitle
        const searchTokens = buildSearchTokens(
          searchTitle,
          searchSubtitle,
          app.name,
          app.module,
          app.subModule,
          app.path,
          appConfiguration.searchKeywords,
          appConfiguration.searchTags
        )

        return searchTokens.some(token => token.includes(trimmedQuery))
      })
      .slice(0, 50)

    if (filteredApps.length === 0) {
      return []
    }

    const groupedByType: Record<BusinessAppType, BusinessAppInfo[]> = {
      app: [],
      record: [],
      form: [],
      popup: [],
      window: []
    }

    filteredApps.forEach(app => {
      groupedByType[app.type].push(app)
    })

    const orderedTypes: BusinessAppType[] = ['app', 'record', 'form', 'window', 'popup']
    let currentRank = 1

    return orderedTypes
      .filter(type => groupedByType[type].length > 0)
      .map(type => {
        const items = groupedByType[type].map(app => {
          const item = createAppItem(app, menuConfiguration, currentRank)
          currentRank += 1
          return item
        })

        const section: SearchSection = {
          id: `section-legacy-${type}`,
          kind: 'RESULTS',
          title: `${typeTitleMap[type]} (${items.length})`,
          presentation: 'LIST',
          total: items.length,
          items
        }
        return section
      })
  }, [businessApps, enabled, menuConfiguration, query, selectedCategoryIds])
}
