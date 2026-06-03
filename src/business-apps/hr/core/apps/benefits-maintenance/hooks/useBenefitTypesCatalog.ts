import { useState, useCallback, useEffect } from 'react'
import { useCatalogEntries, CatalogEntry } from '@/common/data/catalog'
import {
  BENEFIT_TYPE_CATALOG,
  BENEFIT_TYPE_VERSION,
  ENTRIES_PAGE_SIZE
} from '../constants/benefitsMaintenanceConstants'
import { BenefitTypeEntry, BenefitObjectValue } from '../types/benefitsMaintenanceTypes'

interface UseBenefitTypesCatalogProps {
  accessToken: string
  autoFetch?: boolean
}

interface UseBenefitTypesCatalogResult {
  entries: BenefitTypeEntry[]
  totalCount: number
  loading: boolean
  error: string | null
  fetchEntries: (options?: { search?: string; parentEntryId?: string }) => Promise<void>
  markAsDeleted: (entryId: string) => void
  updateEntry: (entryId: string, patch: Partial<BenefitTypeEntry>) => void
}

const parseObjectValue = (raw: unknown): BenefitObjectValue | undefined => {
  if (!raw) return undefined
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return {
      value: parsed?.value,
      period: parsed?.period,
      currency: parsed?.currency,
      groups: parsed?.groups,
      employeeYearlyContribution: parsed?.employeeYearlyContribution,
      employeeMonthlyContribution: parsed?.employeeMonthlyContribution,
      icon: parsed?.icon,
      legalEntityId: parsed?.legalEntityId,
      legalEntityName: parsed?.legalEntityName,
      countryRef: parsed?.countryRef
    }
  } catch {
    return undefined
  }
}

const toBenefitTypeEntry = (entry: CatalogEntry): BenefitTypeEntry => ({
  ...entry,
  parsedObjectValue: parseObjectValue(entry.objectValue),
  providersCount: entry.childEntries?.length ?? 0
})

export const useBenefitTypesCatalog = ({
  accessToken,
  autoFetch = false
}: UseBenefitTypesCatalogProps): UseBenefitTypesCatalogResult => {
  const [entries, setEntries] = useState<BenefitTypeEntry[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { fetchCatalogEntries } = useCatalogEntries({ accessToken })

  const fetchEntries = useCallback(
    async (options?: { search?: string; parentEntryId?: string }) => {
      setLoading(true)
      setError(null)

      try {
        const { entries: raw, totalCount: count } = await fetchCatalogEntries({
          catalogIdentifier: BENEFIT_TYPE_CATALOG,
          version: BENEFIT_TYPE_VERSION,
          limit: ENTRIES_PAGE_SIZE,
          offset: 0,
          search: options?.search,
          parentEntryId: options?.parentEntryId,
          includeChildCatalogEntries: true,
          orderBy: [{ field: 'displayOrder', direction: 'ASC_NULLS_LAST' }]
        })

        setEntries(raw.map(toBenefitTypeEntry))
        setTotalCount(count)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to fetch benefit types'
        setError(message)
        setEntries([])
        setTotalCount(0)
      } finally {
        setLoading(false)
      }
    },
    [fetchCatalogEntries]
  )

  useEffect(() => {
    if (autoFetch && accessToken) fetchEntries()
  }, [autoFetch, accessToken, fetchEntries])

  const markAsDeleted = useCallback((entryId: string) => {
    setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, isDeleted: true } : e)))
  }, [])

  const updateEntry = useCallback((entryId: string, patch: Partial<BenefitTypeEntry>) => {
    setEntries(prev => prev.map(e => (e.id === entryId ? { ...e, ...patch } : e)))
  }, [])

  return { entries, totalCount, loading, error, fetchEntries, markAsDeleted, updateEntry }
}

export default useBenefitTypesCatalog
