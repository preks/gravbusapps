import { useMemo } from 'react'
import type { BoardSummary } from '../types'

export type BoardHubSortBy = 'name' | 'modified' | 'created'
export type BoardHubSortOrder = 'asc' | 'desc'
export type BoardHubSidebarSection = 'home' | 'my-boards' | 'shared' | 'favorites' | 'recent'

export interface UseBoardAppsHubFilteringParams {
  boards: BoardSummary[]
  activeSection: BoardHubSidebarSection
  favorites: Set<string>
  searchQuery: string
  sortBy: BoardHubSortBy
  sortOrder: BoardHubSortOrder
}

export interface UseBoardAppsHubFilteringReturn {
  myBoards: BoardSummary[]
  sharedBoards: BoardSummary[]
  recentBoards: BoardSummary[]
  filteredBoards: BoardSummary[]
}

function isSharedWithMe(board: BoardSummary): boolean {
  return board.isShared === true
}

function applySearchFilter(boards: BoardSummary[], searchQuery: string): BoardSummary[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return boards
  return boards.filter(b => b.name.toLowerCase().includes(query) || b.description?.toLowerCase().includes(query))
}

function sortBoards(boards: BoardSummary[], sortBy: BoardHubSortBy, sortOrder: BoardHubSortOrder): void {
  boards.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = (a.name || '').localeCompare(b.name || '')
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

const RECENT_LIMIT = 15

export function useBoardAppsHubFiltering(params: UseBoardAppsHubFilteringParams): UseBoardAppsHubFilteringReturn {
  const { boards, activeSection, favorites, searchQuery, sortBy, sortOrder } = params

  const { myBoards, sharedBoards, recentBoards } = useMemo(() => {
    const my: BoardSummary[] = []
    const shared: BoardSummary[] = []

    const sortedByDate = [...boards].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const recent = sortedByDate.slice(0, RECENT_LIMIT)

    for (const board of boards) {
      if (isSharedWithMe(board)) {
        shared.push(board)
      } else {
        my.push(board)
      }
    }

    return { myBoards: my, sharedBoards: shared, recentBoards: recent }
  }, [boards])

  const filteredBoards = useMemo(() => {
    let base: BoardSummary[] = []

    switch (activeSection) {
      case 'home':
        base = [...myBoards, ...sharedBoards]
        break
      case 'shared':
        base = sharedBoards
        break
      case 'favorites':
        base = boards.filter(b => favorites.has(b.id))
        break
      case 'recent':
        base = recentBoards
        break
      default:
        base = myBoards
    }

    const next = applySearchFilter(base, searchQuery)
    sortBoards(next, sortBy, sortOrder)
    return next
  }, [activeSection, boards, favorites, myBoards, recentBoards, searchQuery, sharedBoards, sortBy, sortOrder])

  return { myBoards, sharedBoards, recentBoards, filteredBoards }
}
