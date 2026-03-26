import { useMemo } from 'react'
import type { DocumentSummary } from '../types'

export type DocumentHubSortBy = 'name' | 'modified' | 'created'
export type DocumentHubSortOrder = 'asc' | 'desc'
export type DocumentHubSidebarSection =
  | 'home'
  | 'my-documents'
  | 'shared'
  | 'templates'
  | 'favorites'
  | 'recent'
  | 'archived'

export interface UseDocumentAppsHubFilteringParams {
  documents: DocumentSummary[]
  activeSection: DocumentHubSidebarSection
  favorites: Set<string>
  searchQuery: string
  sortBy: DocumentHubSortBy
  sortOrder: DocumentHubSortOrder
}

export interface UseDocumentAppsHubFilteringReturn {
  myDocuments: DocumentSummary[]
  sharedDocuments: DocumentSummary[]
  recentDocuments: DocumentSummary[]
  archivedDocuments: DocumentSummary[]
  filteredDocuments: DocumentSummary[]
}

function isSharedWithMe(doc: DocumentSummary): boolean {
  return doc.isShared === true || (!doc.isOwner && doc.permission !== 'owner')
}

function applySearchFilter(docs: DocumentSummary[], searchQuery: string): DocumentSummary[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return docs
  return docs.filter(
    doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.description?.toLowerCase().includes(query) ||
      doc.tags?.some(tag => tag.toLowerCase().includes(query))
  )
}

function sortDocuments(docs: DocumentSummary[], sortBy: DocumentHubSortBy, sortOrder: DocumentHubSortOrder): void {
  docs.sort((a, b) => {
    let comparison = 0
    switch (sortBy) {
      case 'name':
        comparison = (a.title || '').localeCompare(b.title || '')
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

export function useDocumentAppsHubFiltering(
  params: UseDocumentAppsHubFilteringParams
): UseDocumentAppsHubFilteringReturn {
  const { documents, activeSection, favorites, searchQuery, sortBy, sortOrder } = params

  const { myDocuments, sharedDocuments, recentDocuments, archivedDocuments } = useMemo(() => {
    const my: DocumentSummary[] = []
    const shared: DocumentSummary[] = []
    const archived: DocumentSummary[] = []

    // Sort by updatedAt for recent
    const sortedByDate = [...documents].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    )
    const recent = sortedByDate.slice(0, 10)

    for (const doc of documents) {
      if (doc.status === 'archived') {
        archived.push(doc)
        continue
      }
      if (isSharedWithMe(doc)) {
        shared.push(doc)
      } else {
        my.push(doc)
      }
    }

    return { myDocuments: my, sharedDocuments: shared, recentDocuments: recent, archivedDocuments: archived }
  }, [documents])

  const filteredDocuments = useMemo(() => {
    let baseDocuments: DocumentSummary[] = []

    switch (activeSection) {
      case 'home':
        baseDocuments = [...myDocuments, ...sharedDocuments]
        break
      case 'shared':
        baseDocuments = sharedDocuments
        break
      case 'favorites':
        baseDocuments = documents.filter(doc => favorites.has(doc.id))
        break
      case 'recent':
        baseDocuments = recentDocuments
        break
      case 'archived':
        baseDocuments = archivedDocuments
        break
      case 'templates':
        return []
      default:
        baseDocuments = myDocuments
    }

    const next = applySearchFilter(baseDocuments, searchQuery)
    sortDocuments(next, sortBy, sortOrder)
    return next
  }, [
    activeSection,
    archivedDocuments,
    documents,
    favorites,
    myDocuments,
    recentDocuments,
    searchQuery,
    sharedDocuments,
    sortBy,
    sortOrder
  ])

  return { myDocuments, sharedDocuments, recentDocuments, archivedDocuments, filteredDocuments }
}
