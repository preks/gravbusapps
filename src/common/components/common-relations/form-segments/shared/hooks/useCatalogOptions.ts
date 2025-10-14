import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface Option {
  value: string
  label: string
}

export interface CatalogRef {
  identifier: string
  version: string
}

export interface UseCatalogOptionsParams {
  accessToken?: string
  catalog?: CatalogRef
  providedOptions?: Option[]
  providedLoading?: boolean
  fetchOptions?: (search?: string) => Promise<Option[]>
  mapFn?: (entry: any) => Option
  initialSearch?: string
  page?: { limit?: number; offset?: number }
}

export const useCatalogOptions = ({
  accessToken,
  catalog,
  providedOptions,
  providedLoading,
  fetchOptions,
  mapFn,
  initialSearch = '',
  page
}: UseCatalogOptionsParams) => {
  const [options, setOptions] = useState<Option[]>(providedOptions || [])
  const [loading, setLoading] = useState<boolean>(Boolean(providedLoading))
  const [searchTerm, setSearchTerm] = useState<string>(initialSearch)

  const limit = page?.limit ?? 100
  const offset = page?.offset ?? 0
  const mapper = useMemo(() => mapFn || ((e: any) => ({ value: e.id, label: e.value })), [mapFn])

  const catalogClient = accessToken ? useCatalogManagerClient(accessToken) : null
  // Use a stable key instead of object identity to avoid unnecessary reloads
  const catalogKey = useMemo(
    () => (catalog ? `${catalog.identifier}:${catalog.version}` : ''),
    [catalog?.identifier, catalog?.version]
  )

  useEffect(() => {
    setOptions(providedOptions || [])
    setLoading(Boolean(providedLoading))
  }, [providedOptions, providedLoading])

  const load = useCallback(async () => {
    if (providedOptions) return
    setLoading(true)
    try {
      if (fetchOptions) {
        const result = await fetchOptions(searchTerm)
        setOptions(result || [])
        return
      }
      if (catalogKey && catalog && catalogClient) {
        const res = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: catalog.identifier, version: catalog.version },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(searchTerm && { searchCriteria: searchTerm })
          }
        )
        setOptions((res?.data || []).map(mapper))
        return
      }
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [providedOptions, fetchOptions, searchTerm, catalogKey, limit, offset, mapper])

  useEffect(() => {
    if (!providedOptions) {
      load()
    }
  }, [load, providedOptions])

  return { options, loading, searchTerm, setSearchTerm, reload: load }
}
