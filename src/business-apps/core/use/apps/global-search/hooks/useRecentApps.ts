import { useEffect, useMemo, useState } from 'react'
import type { SearchItem } from '../types'
import menuConfiguration from '@/components/ide-main-menu/menu-configuration.json'
import { resolveNodeConfiguration } from '@/components/ide-main-menu/menuConfiguration'

const RECENT_APPS_STORAGE_KEY = 'business-app-ide-recent-apps'

interface RecentAppStorageItem {
  name: string
  module: string
  subModule?: string
  screenKey: string
  lastUsed: number
}

const getRecentAppIconFallback = (app: RecentAppStorageItem): string => {
  const key = app.screenKey.toLowerCase()
  const name = app.name.toLowerCase()

  if (key.includes('spreadsheets') || name.includes('spreadsheet')) return 'ChartBar'
  if (key.includes('document') || name.includes('document')) return 'FileText'
  if (key.includes('slides') || name.includes('slide')) return 'ArticleNyTimes'
  if (key.includes('spaces') || name.includes('space')) return 'Buildings'
  if (key.includes('every-box') || name.includes('everybox')) return 'ChatCircle'

  return 'Play'
}

const toRecentAppSearchItem = (app: RecentAppStorageItem, rank: number): SearchItem => {
  const subModule = app.subModule?.split('/')[0]
  const description = subModule && subModule !== 'default' ? `${app.module} > ${subModule}` : app.module
  const appPath = app.subModule ? `${app.module}/${app.subModule}` : app.module
  const appConfiguration = resolveNodeConfiguration(menuConfiguration, [`app:${app.screenKey}`, app.screenKey, appPath])
  const resolvedIcon = appConfiguration.icon ?? getRecentAppIconFallback(app)

  return {
    id: `recent-app-${app.screenKey}`,
    type: 'app',
    typeLabel: 'App',
    categoryIds: ['apps'],
    name: app.name,
    description,
    media: {
      icon: resolvedIcon,
      fallbackIcon: resolvedIcon
    },
    primaryTarget: {
      kind: 'URL',
      href: `?app=${encodeURIComponent(app.screenKey)}`,
      openIn: 'SAME_TAB'
    },
    analytics: {
      provider: 'ide-recent-apps',
      trackingId: `recent-app-${app.screenKey}`,
      rank
    }
  }
}

const parseRecentApps = (): RecentAppStorageItem[] => {
  const saved = localStorage.getItem(RECENT_APPS_STORAGE_KEY)
  if (!saved) {
    return []
  }

  try {
    const parsed = JSON.parse(saved)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .filter(item => item && typeof item.screenKey === 'string' && typeof item.name === 'string')
      .sort((left, right) => (right.lastUsed ?? 0) - (left.lastUsed ?? 0))
      .slice(0, 10)
  } catch {
    return []
  }
}

export const useRecentApps = (enabled = true): SearchItem[] => {
  const [recentApps, setRecentApps] = useState<RecentAppStorageItem[]>([])

  useEffect(() => {
    if (!enabled) {
      setRecentApps([])
      return
    }

    const syncRecentApps = () => {
      setRecentApps(parseRecentApps())
    }

    syncRecentApps()
    globalThis.addEventListener('storage', syncRecentApps)
    globalThis.addEventListener('recentAppsUpdated', syncRecentApps)

    return () => {
      globalThis.removeEventListener('storage', syncRecentApps)
      globalThis.removeEventListener('recentAppsUpdated', syncRecentApps)
    }
  }, [enabled])

  return useMemo(() => recentApps.map((app, index) => toRecentAppSearchItem(app, index + 1)), [recentApps])
}
