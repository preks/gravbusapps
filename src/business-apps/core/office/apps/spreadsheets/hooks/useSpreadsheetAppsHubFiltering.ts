import { useMemo } from 'react'
import type { SpreadsheetAppSummary } from '../types'

export type SpreadsheetHubSidebarSection =
  | 'home'
  | 'my-files'
  | 'shared'
  | 'favorites'
  | 'recent'
  | 'automations'
  | 'tasks'
  | 'trash'
export type SpreadsheetHubSortBy = 'name' | 'modified' | 'created'
export type SpreadsheetHubSortOrder = 'asc' | 'desc'

export interface UseSpreadsheetAppsHubFilteringParams {
  apps: SpreadsheetAppSummary[]
  currentUserId: string
  activeSection: SpreadsheetHubSidebarSection
  favorites: Set<string>
  searchQuery: string
  sortBy: SpreadsheetHubSortBy
  sortOrder: SpreadsheetHubSortOrder
}

export interface UseSpreadsheetAppsHubFilteringReturn {
  filteredApps: SpreadsheetAppSummary[]
}

function isOwner(app: SpreadsheetAppSummary, currentUserId: string): boolean {
  if (app.createdBy) return app.createdBy === currentUserId
  return app.isOwner === true
}

function isExcelCollectionCopy(app: SpreadsheetAppSummary): boolean {
  const settings = app.settings && typeof app.settings === 'object' ? app.settings : {}
  const settingsRecord = settings as Record<string, unknown>
  const rootRecord = app as unknown as Record<string, unknown>

  const isTruthyCopyFlag = (value: unknown): boolean => {
    if (value === true) return true
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      return normalized === 'true' || normalized === '1' || normalized === 'yes'
    }
    if (typeof value === 'number') return value === 1
    return false
  }

  if (
    isTruthyCopyFlag(settingsRecord.excel_collection_copy) ||
    isTruthyCopyFlag(settingsRecord.excelCollectionCopy) ||
    isTruthyCopyFlag(rootRecord.excel_collection_copy)
  ) {
    return true
  }

  // Some environments may miss the explicit copy flag;
  // these markers are set when collection copies are duplicated.
  const hasCollectionCopyMarkers =
    (typeof settingsRecord.parentAppId === 'string' && settingsRecord.parentAppId.length > 0) ||
    (typeof settingsRecord.copyAppId === 'string' && settingsRecord.copyAppId.length > 0) ||
    (typeof settingsRecord.automationRunId === 'string' && settingsRecord.automationRunId.length > 0)

  return hasCollectionCopyMarkers
}

function hasContributorAccess(app: SpreadsheetAppSummary, currentUserId: string): boolean {
  if (isOwner(app, currentUserId)) return true
  return app.permission === 'owner' || app.permission === 'edit' || app.permission === 'admin'
}

function isExcelCollectionTaskForCurrentUser(app: SpreadsheetAppSummary, currentUserId: string): boolean {
  return isExcelCollectionCopy(app) && hasContributorAccess(app, currentUserId)
}

function filterBySection(params: {
  apps: SpreadsheetAppSummary[]
  activeSection: SpreadsheetHubSidebarSection
  currentUserId: string
  favorites: Set<string>
}): SpreadsheetAppSummary[] {
  const { apps, activeSection, currentUserId, favorites } = params
  const taskApps = apps.filter(app => isExcelCollectionTaskForCurrentUser(app, currentUserId))
  // Keep all collection copies out of the regular hub lists.
  const visibleApps = apps.filter(app => !isExcelCollectionCopy(app))

  switch (activeSection) {
    case 'my-files':
      return visibleApps.filter(app => isOwner(app, currentUserId))
    case 'shared':
      return visibleApps.filter(app => app.isShared && !isOwner(app, currentUserId))
    case 'tasks':
      return taskApps
    case 'favorites':
      return visibleApps.filter(app => favorites.has(app.id))
    case 'recent':
      return [...visibleApps]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 10)
    case 'trash':
      return visibleApps
    case 'home':
    default:
      return visibleApps
  }
}

function applySearchFilter(apps: SpreadsheetAppSummary[], searchQuery: string): SpreadsheetAppSummary[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return apps
  return apps.filter(app => app.name.toLowerCase().includes(query) || app.description?.toLowerCase().includes(query))
}

function sortApps(
  apps: SpreadsheetAppSummary[],
  sortBy: SpreadsheetHubSortBy,
  sortOrder: SpreadsheetHubSortOrder
): void {
  apps.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name)
        break
      case 'modified':
        comparison = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        break
      case 'created':
        comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        break
    }
    return sortOrder === 'asc' ? -comparison : comparison
  })
}

export function useSpreadsheetAppsHubFiltering(
  params: UseSpreadsheetAppsHubFilteringParams
): UseSpreadsheetAppsHubFilteringReturn {
  const { apps, currentUserId, activeSection, favorites, searchQuery, sortBy, sortOrder } = params

  const filteredApps = useMemo(() => {
    const sectionFiltered = filterBySection({ apps, activeSection, currentUserId, favorites })
    const searched = applySearchFilter(sectionFiltered, searchQuery)
    const sorted = [...searched]
    sortApps(sorted, sortBy, sortOrder)
    return sorted
  }, [activeSection, apps, currentUserId, favorites, searchQuery, sortBy, sortOrder])

  return { filteredApps }
}
