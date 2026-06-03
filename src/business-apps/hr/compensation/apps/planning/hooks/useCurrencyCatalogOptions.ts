import { useEffect, useState } from 'react'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

/** Catalog API may return `data` as array or nested `{ data: [...] }`. */
function normalizeCatalogEntries(response: unknown): CatalogEntry[] {
  if (response == null) {
    return []
  }
  if (Array.isArray(response)) {
    return response as CatalogEntry[]
  }
  if (typeof response !== 'object') {
    return []
  }
  const r = response as Record<string, unknown>
  const top = r.data
  if (Array.isArray(top)) {
    return top as CatalogEntry[]
  }
  if (top && typeof top === 'object' && Array.isArray((top as { data?: unknown }).data)) {
    return (top as { data: CatalogEntry[] }).data
  }
  return []
}

export interface CurrencyCatalogOption {
  id: string
  label: string
}

/**
 * Loads Currency catalog entries (same pattern as MDM company form) for select controls.
 */
export function useCurrencyCatalogOptions(accessToken: string | undefined) {
  const catalogClient = useCatalogManagerClient(accessToken ?? '')
  const [options, setOptions] = useState<CurrencyCatalogOption[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) {
      setOptions([])
      return
    }

    let cancelled = false
    setLoading(true)

    catalogClient
      .getCatalogEntriesList(
        { catalogIdentifier: 'Currency', version: 'v1' },
        { limit: 200, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: false }
      )
      .then(response => {
        if (cancelled) return
        const catalogEntries = normalizeCatalogEntries(response)
        const opts: CurrencyCatalogOption[] = catalogEntries
          .filter(entry => !entry.isDeleted)
          .map(entry => ({
            id: entry.id,
            label: entry.code || entry.value || entry.id
          }))
        opts.sort((a, b) => a.label.localeCompare(b.label))
        setOptions(opts)
      })
      .catch(err => {
        console.error('Failed to load currency catalog:', err)
        if (!cancelled) {
          setOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [accessToken, catalogClient])

  return { options, loading }
}
