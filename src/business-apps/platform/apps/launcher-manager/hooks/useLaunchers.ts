import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogEntries, CatalogEntry } from '@/common/data/catalog'

export interface UseLaunchersOptions {
  search?: string
  limit?: number
  offset?: number
}

export const LAUNCHER_CATALOG = 'Launcher'
export const LAUNCHER_VERSION = 'v1'

export const useLaunchers = (context: BusinessAppContextProps, options: UseLaunchersOptions = {}) => {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken: context.accessToken })
  const [data, setData] = useState<CatalogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [total, setTotal] = useState(0)

  const limit = options.limit ?? 100
  const offset = options.offset ?? 0
  const search = options.search?.trim() ?? ''

  const fetchData = useCallback(async () => {
    if (!context.accessToken) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await fetchCatalogEntriesByIdentifier(LAUNCHER_CATALOG, {
        version: LAUNCHER_VERSION,
        limit,
        offset,
        includeChildEntries: false,
        ...(search && { search })
      })
      setData(result.entries || [])
      setTotal(result.totalCount || 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load launchers')
    } finally {
      setIsLoading(false)
    }
  }, [fetchCatalogEntriesByIdentifier, limit, offset, search, context.accessToken])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    total,
    isLoading,
    error,
    refetch: fetchData
  }
}
