import { useMemo } from 'react'
import type { SpreadsheetAppSummary } from '../types'

export type SpreadsheetHubSidebarSection = 'home' | 'my-files' | 'shared' | 'favorites' | 'recent' | 'trash'
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

/** Excel Collection copies: hidden from manager who sent them; recipient sees their copy */
function shouldExcludeExcelCollectionCopy(
  app: SpreadsheetAppSummary,
  currentUserId: string
): boolean {
  const settings = app.settings as Record<string, unknown> | undefined
  const isCopy = settings?.excel_collection_copy === true
  if (!isCopy) return false
  const initiatorId = settings?.excel_collection_initiator_id as string | undefined
  if (initiatorId === currentUserId) return true // hide from manager (new data)
  if (initiatorId) return false // recipient (initiatorId is manager); show
  const isOwner = app.isOwner ?? app.createdBy === currentUserId
  return isOwner // old data: hide when manager (owner), show when recipient (shared)
}

function filterBySection(params: {
  apps: SpreadsheetAppSummary[]
  activeSection: SpreadsheetHubSidebarSection
  currentUserId: string
  favorites: Set<string>
}): SpreadsheetAppSummary[] {
  const { apps, activeSection, currentUserId, favorites } = params

  const excludeSentExcelCollectionCopies = (list: SpreadsheetAppSummary[]) =>
    list.filter(app => !shouldExcludeExcelCollectionCopy(app, currentUserId))

  switch (activeSection) {
    case 'my-files':
      return excludeSentExcelCollectionCopies(
        apps.filter(app => app.isOwner ?? app.createdBy === currentUserId)
      )
    case 'shared':
      return apps.filter(app => app.isShared && !(app.isOwner ?? app.createdBy === currentUserId))
    case 'favorites':
      return excludeSentExcelCollectionCopies(apps.filter(app => favorites.has(app.id)))
    case 'recent':
      return excludeSentExcelCollectionCopies(
        [...apps].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 10)
      )
    case 'trash':
      return apps
    case 'home':
    default:
      return excludeSentExcelCollectionCopies(apps)
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
