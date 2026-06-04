import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveHasExistingShares } from '@/business-apps/core/office/sharing/hasExistingShares'
import { NoteApiService } from '../services/NoteApiService'
import type { NoteSummary } from '../types'

function isNoteFolder(note: NoteSummary): boolean {
  return note.icon === '📁' || Boolean(note.hasChildren && !note.preview)
}

function isNoteOwner(note: NoteSummary, currentUserId: string): boolean {
  return note.ownerId === currentUserId || note.permission === 'owner'
}

function shouldLoadShareCount(note: NoteSummary, currentUserId: string): boolean {
  return !isNoteFolder(note) && isNoteOwner(note, currentUserId)
}

async function fetchShareCount(noteId: string): Promise<number> {
  try {
    const shares = await NoteApiService.getSharedUsers(noteId)
    return Array.isArray(shares) ? shares.length : 0
  } catch {
    return 0
  }
}

export function useNoteAppsHubShareLookup(params: { notes: NoteSummary[]; currentUserId: string }): {
  sharedUsersCountMap: Record<string, number>
  hasSharesForNote: (noteId: string) => boolean
  refreshSharesForNote: (noteId: string) => Promise<void>
} {
  const [sharedUsersCountMap, setSharedUsersCountMap] = useState<Record<string, number>>({})
  const loadedSharesRef = useRef<Set<string>>(new Set())
  const notesById = useMemo(() => new Map(params.notes.map(note => [note.id, note])), [params.notes])

  const ownedNoteIdsKey = useMemo(
    () =>
      params.notes
        .filter(note => shouldLoadShareCount(note, params.currentUserId))
        .map(note => note.id)
        .sort()
        .join(','),
    [params.currentUserId, params.notes]
  )

  const refreshSharesForNote = useCallback(async (noteId: string) => {
    if (!noteId) return
    const count = await fetchShareCount(noteId)
    loadedSharesRef.current.add(noteId)
    setSharedUsersCountMap(prev => ({ ...prev, [noteId]: count }))
  }, [])

  const hasSharesForNote = useCallback(
    (noteId: string) => {
      const note = notesById.get(noteId)
      return resolveHasExistingShares(sharedUsersCountMap[noteId], note?.sharedWithCount)
    },
    [notesById, sharedUsersCountMap]
  )

  useEffect(() => {
    if (!params.currentUserId || !ownedNoteIdsKey) return

    const ownedIds = ownedNoteIdsKey.split(',').filter(Boolean)
    const toLoad = ownedIds.filter(id => !loadedSharesRef.current.has(id))
    if (toLoad.length === 0) return

    let cancelled = false
    void Promise.all(
      toLoad.map(async noteId => {
        const count = await fetchShareCount(noteId)
        return { noteId, count }
      })
    ).then(results => {
      if (cancelled) return
      for (const result of results) {
        loadedSharesRef.current.add(result.noteId)
      }
      setSharedUsersCountMap(prev => {
        const next = { ...prev }
        for (const result of results) {
          next[result.noteId] = result.count
        }
        return next
      })
    })

    return () => {
      cancelled = true
      for (const noteId of toLoad) {
        loadedSharesRef.current.delete(noteId)
      }
    }
  }, [ownedNoteIdsKey, params.currentUserId])

  return { sharedUsersCountMap, hasSharesForNote, refreshSharesForNote }
}
