/**
 * useNotes Hook
 *
 * Manages notes state and CRUD operations.
 * Provides a clean interface for note management with loading states and error handling.
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { NoteApiService } from '../services/NoteApiService'
import type {
  Note,
  NoteSummary,
  NoteQueryParams,
  CreateNoteInput,
  UpdateNoteInput,
  MoveNoteInput,
  NotePermission,
  NoteShare
} from '../types'

export interface UseNotesOptions {
  accessToken?: string
  userId?: string
  initialQuery?: NoteQueryParams
  autoLoad?: boolean
  /** Optional i18n translator for user-facing error messages */
  translate?: (key: string) => string
}

export interface UseNotesReturn {
  // Data
  notes: NoteSummary[]
  currentNote: Note | null
  currentNotePermission: NotePermission | 'owner' | null

  // State
  isLoading: boolean
  isLoadingNote: boolean
  error: string | null

  // CRUD Operations
  loadNotes: (params?: NoteQueryParams) => Promise<void>
  loadNote: (id: string) => Promise<Note | null>
  createNote: (input: CreateNoteInput) => Promise<Note | null>
  updateNote: (id: string, updates: UpdateNoteInput) => Promise<Note | null>
  deleteNote: (id: string) => Promise<boolean>
  duplicateNote: (id: string) => Promise<Note | null>

  // Actions
  togglePin: (id: string) => Promise<boolean>
  archiveNote: (id: string) => Promise<boolean>
  unarchiveNote: (id: string) => Promise<boolean>
  moveNote: (id: string, move: MoveNoteInput) => Promise<boolean>

  // Sharing
  shareNote: (noteId: string, shares: Array<{ userId: string; permission: NotePermission }>) => Promise<boolean>
  getSharedUsers: (noteId: string) => Promise<NoteShare[]>
  revokeAccess: (noteId: string, userId: string) => Promise<boolean>

  // Utilities
  clearCurrentNote: () => void
  refreshNotes: () => Promise<void>
  /** Merge fields into list + current note without an API call (e.g. collaboration socket). */
  patchNoteInState: (id: string, patch: Partial<NoteSummary>) => void
}

export function useNotes(options: UseNotesOptions = {}): UseNotesReturn {
  const { accessToken, initialQuery, autoLoad = true, translate } = options

  // Keep the API service's in-memory token in sync with the prop
  useEffect(() => {
    NoteApiService.setAccessToken(accessToken || null)
  }, [accessToken])

  // State
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [currentNote, setCurrentNote] = useState<Note | null>(null)
  const [currentNotePermission, setCurrentNotePermission] = useState<NotePermission | 'owner' | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingNote, setIsLoadingNote] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track last query for refresh
  const lastQueryRef = useRef<NoteQueryParams | undefined>(initialQuery)
  const noteUpdateSequenceRef = useRef(new Map<string, number>())

  const dedupeNoteSummaries = useCallback((items: NoteSummary[]): NoteSummary[] => {
    const byId = new Map<string, NoteSummary>()
    items.forEach(item => {
      byId.set(item.id, item)
    })
    return Array.from(byId.values())
  }, [])

  /**
   * Load notes list (paginated fetch, max 100 per request)
   */
  const loadNotes = useCallback(
    async (params?: NoteQueryParams): Promise<void> => {
      setIsLoading(true)
      setError(null)
      lastQueryRef.current = params

      try {
        const PAGE_SIZE = 100
        let allNotes: NoteSummary[] = []
        let page = 1
        let hasMore = true

        while (hasMore) {
          const result = await NoteApiService.listNotes({ ...params, limit: PAGE_SIZE, page })
          allNotes = dedupeNoteSummaries([...allNotes, ...result.items])
          hasMore = result.items.length === PAGE_SIZE
          page++
        }

        setNotes(allNotes)
      } catch (err) {
        const message = err instanceof Error ? err.message : translate ? translate('notes-load-failed') : String(err)
        setError(message)
        console.error('[useNotes] Failed to load notes:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [dedupeNoteSummaries, translate]
  )

  /**
   * Load a single note
   */
  const loadNote = useCallback(async (id: string): Promise<Note | null> => {
    setIsLoadingNote(true)
    setError(null)

    try {
      const note = await NoteApiService.getNoteForOpenById(id)
      if (note) {
        setCurrentNote(note)
        // Use backend permission, default to 'owner' if not specified (creator case)
        const resolvedPermission = note.permission || 'owner'
        console.log('[useNotes] loadNote permission:', {
          noteId: note.id,
          backendPermission: note.permission,
          resolvedPermission
        })
        setCurrentNotePermission(resolvedPermission)
      }
      return note
    } catch (err) {
      const message = err instanceof Error ? err.message : translate ? translate('notes-load-note-failed') : String(err)
      setError(message)
      console.error('[useNotes] Failed to load note:', err)
      return null
    } finally {
      setIsLoadingNote(false)
    }
  }, [])

  /**
   * Create a new note
   */
  const createNote = useCallback(
    async (input: CreateNoteInput): Promise<Note | null> => {
      try {
        const note = await NoteApiService.createNote(input)

        // Add to list
        const summary: NoteSummary = {
          id: note.id,
          title: note.title,
          preview: note.content?.replace(/<[^>]*>/g, ' ').slice(0, 150),
          tags: note.tags,
          color: note.color,
          icon: note.icon,
          isPinned: note.isPinned,
          isArchived: note.isArchived,
          parentId: note.parentId,
          position: note.position,
          ownerId: note.ownerId,
          spaceId: note.spaceId,
          createdAt: note.createdAt,
          updatedAt: note.updatedAt,
          trashedAt: note.trashedAt,
          permission: 'owner'
        }

        setNotes(prev => dedupeNoteSummaries([summary, ...prev]))
        setCurrentNote(note)
        setCurrentNotePermission('owner')

        return note
      } catch (err) {
        console.error('[useNotes] Failed to create note:', err)
        return null
      }
    },
    [dedupeNoteSummaries]
  )

  /**
   * Update a note
   */
  const updateNote = useCallback(
    async (id: string, updates: UpdateNoteInput): Promise<Note | null> => {
      try {
        const nextSequence = (noteUpdateSequenceRef.current.get(id) || 0) + 1
        noteUpdateSequenceRef.current.set(id, nextSequence)
        const note = await NoteApiService.updateNote(id, updates)
        if ((noteUpdateSequenceRef.current.get(id) || 0) !== nextSequence) {
          return note
        }

        // Update in list
        setNotes(prev =>
          prev.map(n =>
            n.id === id
              ? {
                  ...n,
                  title: note.title,
                  preview: note.content?.replace(/<[^>]*>/g, ' ').slice(0, 150),
                  tags: note.tags,
                  color: note.color,
                  icon: note.icon,
                  isPinned: note.isPinned,
                  isArchived: note.isArchived,
                  spaceId: note.spaceId,
                  updatedAt: note.updatedAt,
                  trashedAt: note.trashedAt
                }
              : n
          )
        )

        // Update current if same
        if (currentNote?.id === id) {
          setCurrentNote(note)
        }

        return note
      } catch (err) {
        console.error('[useNotes] Failed to update note:', err)
        return null
      }
    },
    [currentNote?.id]
  )

  /**
   * Delete a note
   */
  const deleteNote = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const success = await NoteApiService.deleteNote(id)
        if (success) {
          setNotes(prev => prev.filter(n => n.id !== id))
          if (currentNote?.id === id) {
            setCurrentNote(null)
            setCurrentNotePermission(null)
          }
        }
        return success
      } catch (err) {
        console.error('[useNotes] Failed to delete note:', err)
        return false
      }
    },
    [currentNote?.id]
  )

  /**
   * Duplicate a note
   */
  const duplicateNote = useCallback(
    async (id: string): Promise<Note | null> => {
      try {
        const note = await NoteApiService.duplicateNote(id)
        if (note) {
          const summary: NoteSummary = {
            id: note.id,
            title: note.title,
            preview: note.content?.replace(/<[^>]*>/g, ' ').slice(0, 150),
            tags: note.tags,
            color: note.color,
            icon: note.icon,
            isPinned: note.isPinned,
            isArchived: note.isArchived,
            parentId: note.parentId,
            position: note.position,
            ownerId: note.ownerId,
            spaceId: note.spaceId,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            trashedAt: note.trashedAt,
            permission: 'owner'
          }
          setNotes(prev => dedupeNoteSummaries([summary, ...prev]))
        }
        return note
      } catch (err) {
        console.error('[useNotes] Failed to duplicate note:', err)
        return null
      }
    },
    [dedupeNoteSummaries]
  )

  /**
   * Toggle pin status
   */
  const togglePin = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const note = await NoteApiService.togglePin(id)
        if (note) {
          setNotes(prev =>
            prev.map(n => (n.id === id ? { ...n, isPinned: note.isPinned, updatedAt: note.updatedAt } : n))
          )
          if (currentNote?.id === id) {
            setCurrentNote(note)
          }
          return true
        }
        return false
      } catch (err) {
        console.error('[useNotes] Failed to toggle pin:', err)
        return false
      }
    },
    [currentNote?.id]
  )

  /**
   * Archive a note
   */
  const archiveNote = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const note = await NoteApiService.archiveNote(id)
        if (note) {
          // Remove from list if not showing archived
          setNotes(prev => prev.filter(n => n.id !== id))
          if (currentNote?.id === id) {
            setCurrentNote(null)
            setCurrentNotePermission(null)
          }
          return true
        }
        return false
      } catch (err) {
        console.error('[useNotes] Failed to archive note:', err)
        return false
      }
    },
    [currentNote?.id]
  )

  /**
   * Unarchive a note
   */
  const unarchiveNote = useCallback(
    async (id: string): Promise<boolean> => {
      try {
        const note = await NoteApiService.unarchiveNote(id)
        if (note) {
          // Refresh to show unarchived note
          await loadNotes(lastQueryRef.current)
          return true
        }
        return false
      } catch (err) {
        console.error('[useNotes] Failed to unarchive note:', err)
        return false
      }
    },
    [loadNotes]
  )

  /**
   * Move a note
   */
  const moveNote = useCallback(
    async (id: string, move: MoveNoteInput): Promise<boolean> => {
      try {
        const note = await NoteApiService.moveNote(id, move)
        if (note) {
          setNotes(prev =>
            prev.map(n =>
              n.id === id ? { ...n, parentId: note.parentId, position: note.position, updatedAt: note.updatedAt } : n
            )
          )
          if (currentNote?.id === id) {
            setCurrentNote(note)
          }
          return true
        }
        return false
      } catch (err) {
        console.error('[useNotes] Failed to move note:', err)
        return false
      }
    },
    [currentNote?.id]
  )

  /**
   * Share a note
   */
  const shareNote = useCallback(
    async (noteId: string, shares: Array<{ userId: string; permission: NotePermission }>): Promise<boolean> => {
      try {
        return await NoteApiService.shareNote(noteId, shares)
      } catch (err) {
        console.error('[useNotes] Failed to share note:', err)
        return false
      }
    },
    []
  )

  /**
   * Get shared users
   */
  const getSharedUsers = useCallback(async (noteId: string): Promise<NoteShare[]> => {
    try {
      return await NoteApiService.getSharedUsers(noteId)
    } catch (err) {
      console.error('[useNotes] Failed to get shared users:', err)
      return []
    }
  }, [])

  /**
   * Revoke access
   */
  const revokeAccess = useCallback(async (noteId: string, userId: string): Promise<boolean> => {
    try {
      return await NoteApiService.revokeAccess(noteId, userId)
    } catch (err) {
      console.error('[useNotes] Failed to revoke access:', err)
      return false
    }
  }, [])

  /**
   * Clear current note
   */
  const clearCurrentNote = useCallback(() => {
    setCurrentNote(null)
    setCurrentNotePermission(null)
  }, [])

  /**
   * Refresh notes list
   */
  const refreshNotes = useCallback(async () => {
    await loadNotes(lastQueryRef.current)
  }, [loadNotes])

  const patchNoteInState = useCallback((id: string, patch: Partial<NoteSummary>) => {
    setCurrentNote(prev => (prev?.id === id ? { ...prev, ...patch } : prev))
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...patch } : n)))
  }, [])

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadNotes(initialQuery)
    }
  }, [autoLoad, initialQuery, loadNotes])

  return {
    // Data
    notes,
    currentNote,
    currentNotePermission,

    // State
    isLoading,
    isLoadingNote,
    error,

    // CRUD Operations
    loadNotes,
    loadNote,
    createNote,
    updateNote,
    deleteNote,
    duplicateNote,

    // Actions
    togglePin,
    archiveNote,
    unarchiveNote,
    moveNote,

    // Sharing
    shareNote,
    getSharedUsers,
    revokeAccess,

    // Utilities
    clearCurrentNote,
    refreshNotes,
    patchNoteInState
  }
}

export default useNotes
