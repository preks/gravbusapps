import { useState, useCallback, useEffect } from 'react'
import type { BoardCollection } from '../types/collection'
import type { BoardSummary } from '../types/board'
import { CollectionApiService } from '../services/CollectionApiService'

export interface UseBoardCollectionsReturn {
  collections: BoardCollection[]
  collectionBoards: Map<string, BoardSummary[]>
  isLoading: boolean
  error: string | null
  createCollection: (data: {
    name: string
    description?: string
    icon?: string
    color?: string
    isPublic?: boolean
    dimension?: { type: string; id: string; name: string }
    memberIds?: string[]
  }) => Promise<BoardCollection | null>
  updateCollection: (
    id: string,
    updates: Partial<Pick<BoardCollection, 'name' | 'description' | 'icon' | 'color'>>
  ) => Promise<boolean>
  deleteCollection: (id: string) => Promise<boolean>
  moveBoardToCollection: (collectionId: string, boardId: string) => Promise<boolean>
  removeBoardFromCollection: (collectionId: string, boardId: string) => Promise<boolean>
  refreshCollections: () => Promise<void>
  loadCollectionBoards: (collectionId: string) => Promise<void>
}

export function useBoardCollections(): UseBoardCollectionsReturn {
  const [collections, setCollections] = useState<BoardCollection[]>([])
  const [collectionBoards, setCollectionBoards] = useState<Map<string, BoardSummary[]>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshCollections = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await CollectionApiService.listCollections()
      setCollections(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load spaces')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshCollections()
  }, [refreshCollections])

  const loadCollectionBoards = useCallback(async (collectionId: string) => {
    try {
      const boards = await CollectionApiService.getCollectionBoards(collectionId)
      setCollectionBoards(prev => {
        const next = new Map(prev)
        next.set(collectionId, boards)
        return next
      })
    } catch {
      // keep existing data
    }
  }, [])

  const createCollection = useCallback(
    async (data: {
      name: string
      description?: string
      icon?: string
      color?: string
      isPublic?: boolean
      dimension?: { type: string; id: string; name: string }
      memberIds?: string[]
    }) => {
      try {
        const created = await CollectionApiService.createCollection(data)
        setCollections(prev => [created, ...prev])
        return created
      } catch {
        return null
      }
    },
    []
  )

  const updateCollection = useCallback(
    async (id: string, updates: Partial<Pick<BoardCollection, 'name' | 'description' | 'icon' | 'color'>>) => {
      try {
        const updated = await CollectionApiService.updateCollection(id, updates)
        setCollections(prev => prev.map(c => (c.id === id ? updated : c)))
        return true
      } catch {
        return false
      }
    },
    []
  )

  const deleteCollection = useCallback(async (id: string) => {
    const ok = await CollectionApiService.deleteCollection(id)
    if (ok) {
      setCollections(prev => prev.filter(c => c.id !== id))
      setCollectionBoards(prev => {
        const next = new Map(prev)
        next.delete(id)
        return next
      })
    }
    return ok
  }, [])

  const moveBoardToCollection = useCallback(
    async (collectionId: string, boardId: string) => {
      const ok = await CollectionApiService.moveBoardToCollection(collectionId, boardId)
      if (ok) {
        await loadCollectionBoards(collectionId)
        await refreshCollections()
      }
      return ok
    },
    [loadCollectionBoards, refreshCollections]
  )

  const removeBoardFromCollection = useCallback(
    async (collectionId: string, boardId: string) => {
      const ok = await CollectionApiService.removeBoardFromCollection(collectionId, boardId)
      if (ok) {
        setCollectionBoards(prev => {
          const next = new Map(prev)
          const boards = next.get(collectionId)
          if (boards)
            next.set(
              collectionId,
              boards.filter(b => b.id !== boardId)
            )
          return next
        })
        await refreshCollections()
      }
      return ok
    },
    [refreshCollections]
  )

  return {
    collections,
    collectionBoards,
    isLoading,
    error,
    createCollection,
    updateCollection,
    deleteCollection,
    moveBoardToCollection,
    removeBoardFromCollection,
    refreshCollections,
    loadCollectionBoards
  }
}
