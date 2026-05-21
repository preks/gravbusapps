import { useState, useEffect, useCallback } from 'react'
import { WhiteboardApiService } from '../services/WhiteboardApiService'
import type { WhiteboardSummary } from '../types'

interface UseWhiteboardsOptions {
  accessToken: string
  section?: 'favorites'
  search?: string
  includeShared?: boolean
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: string
}

interface UseWhiteboardsReturn {
  whiteboards: WhiteboardSummary[]
  total: number
  totalPages: number
  isLoading: boolean
  error: string | null
  refresh: () => void
  createWhiteboard: (title: string) => Promise<string | null>
  deleteWhiteboard: (id: string) => Promise<void>
  duplicateWhiteboard: (id: string) => Promise<void>
  renameWhiteboard: (id: string, title: string) => Promise<void>
}

export function useWhiteboards(options: UseWhiteboardsOptions): UseWhiteboardsReturn {
  const {
    accessToken,
    section,
    search,
    includeShared = true,
    page = 1,
    limit = 20,
    sortBy = 'updatedAt',
    sortOrder = 'DESC'
  } = options

  const [whiteboards, setWhiteboards] = useState<WhiteboardSummary[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => setRefreshKey(k => k + 1), [])

  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    setIsLoading(true)
    setError(null)

    WhiteboardApiService.list(accessToken, { section, search, includeShared, page, limit, sortBy, sortOrder })
      .then(result => {
        if (cancelled) return
        setWhiteboards(result.items)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      })
      .catch(err => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load whiteboards')
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, section, search, includeShared, page, limit, sortBy, sortOrder, refreshKey])

  const createWhiteboard = useCallback(
    async (title: string): Promise<string | null> => {
      if (!accessToken) return null
      const wb = await WhiteboardApiService.create(accessToken, { title })
      refresh()
      return wb.id
    },
    [accessToken, refresh]
  )

  const deleteWhiteboard = useCallback(
    async (id: string) => {
      if (!accessToken) return
      await WhiteboardApiService.remove(accessToken, id)
      refresh()
    },
    [accessToken, refresh]
  )

  const duplicateWhiteboard = useCallback(
    async (id: string) => {
      if (!accessToken) return
      await WhiteboardApiService.duplicate(accessToken, id)
      refresh()
    },
    [accessToken, refresh]
  )

  const renameWhiteboard = useCallback(
    async (id: string, title: string) => {
      if (!accessToken) return
      await WhiteboardApiService.update(accessToken, id, { title })
      refresh()
    },
    [accessToken, refresh]
  )

  return {
    whiteboards,
    total,
    totalPages,
    isLoading,
    error,
    refresh,
    createWhiteboard,
    deleteWhiteboard,
    duplicateWhiteboard,
    renameWhiteboard
  }
}
