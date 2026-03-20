import { useMemo } from 'react'
import type { NoteSummary } from '../types'

export type NoteHubSortBy = 'name' | 'modified' | 'created'
export type NoteHubSortOrder = 'asc' | 'desc'
export type NoteHubSidebarSection = 'home' | 'my-notes' | 'shared' | 'pinned' | 'recent' | 'archived'

export interface UseNoteAppsHubFilteringParams {
  notes: NoteSummary[]
  currentUserId: string
  activeSection: NoteHubSidebarSection
  favorites: Set<string>
  searchQuery: string
  sortBy: NoteHubSortBy
  sortOrder: NoteHubSortOrder
}

export interface UseNoteAppsHubFilteringReturn {
  myNotes: NoteSummary[]
  sharedNotes: NoteSummary[]
  pinnedNotes: NoteSummary[]
  archivedNotes: NoteSummary[]
  recentNotes: NoteSummary[]
  filteredNotes: NoteSummary[]
}

function applySearchFilter(notes: NoteSummary[], searchQuery: string): NoteSummary[] {
  const query = searchQuery.trim().toLowerCase()
  if (!query) return notes
  return notes.filter(
    note =>
      note.title?.toLowerCase().includes(query) ||
      note.preview?.toLowerCase().includes(query) ||
      note.tags?.some(tag => tag.toLowerCase().includes(query))
  )
}

function sortNotes(notes: NoteSummary[], sortBy: NoteHubSortBy, sortOrder: NoteHubSortOrder): void {
  notes.sort((a, b) => {
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

export function useNoteAppsHubFiltering(params: UseNoteAppsHubFilteringParams): UseNoteAppsHubFilteringReturn {
  const { notes, currentUserId, activeSection, searchQuery, sortBy, sortOrder } = params

  const { myNotes, sharedNotes, pinnedNotes, archivedNotes, recentNotes } = useMemo(() => {
    const my: NoteSummary[] = []
    const shared: NoteSummary[] = []
    const pinned: NoteSummary[] = []
    const archived: NoteSummary[] = []
    const recent: NoteSummary[] = []

    const sortedByDate = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    const recentSet = new Set(sortedByDate.slice(0, 10).map(n => n.id))

    for (const note of notes) {
      if (note.isArchived) {
        archived.push(note)
        continue
      }

      if (note.isPinned) {
        pinned.push(note)
      }

      if (recentSet.has(note.id)) {
        recent.push(note)
      }

      const isSharedWithMe = note.isShared === true || (note.ownerId !== currentUserId && note.permission !== 'owner')
      if (isSharedWithMe) {
        shared.push(note)
      } else {
        my.push(note)
      }
    }

    return { myNotes: my, sharedNotes: shared, pinnedNotes: pinned, archivedNotes: archived, recentNotes: recent }
  }, [notes, currentUserId])

  const filteredNotes = useMemo(() => {
    let baseNotes: NoteSummary[] = []

    switch (activeSection) {
      case 'home':
        baseNotes = [...myNotes, ...sharedNotes]
        break
      case 'pinned':
        baseNotes = pinnedNotes
        break
      case 'shared':
        baseNotes = sharedNotes
        break
      case 'archived':
        baseNotes = archivedNotes
        break
      case 'recent':
        baseNotes = recentNotes
        break
      default:
        baseNotes = myNotes
    }

    const next = applySearchFilter(baseNotes, searchQuery)
    sortNotes(next, sortBy, sortOrder)
    return next
  }, [activeSection, archivedNotes, myNotes, pinnedNotes, recentNotes, searchQuery, sharedNotes, sortBy, sortOrder])

  return { myNotes, sharedNotes, pinnedNotes, archivedNotes, recentNotes, filteredNotes }
}
