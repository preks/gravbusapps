/**
 * Lead Import Defaults Hook
 * Fetches Lead Status, Lead Source and Lead Rating catalog options
 * based on the current domain (CRM → Sales catalogs, IRM → Investment catalogs)
 */

import { useState, useEffect } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'

export interface LeadCatalogOption {
  id: string
  label: string
}

export interface LeadImportDefaults {
  statusOptions: LeadCatalogOption[]
  sourceOptions: LeadCatalogOption[]
  ratingOptions: LeadCatalogOption[]
  selectedStatus: string
  selectedSource: string
  selectedRating: string
  onStatusChange: (value: string) => void
  onSourceChange: (value: string) => void
  onRatingChange: (value: string) => void
  isLoading: boolean
}

const CATALOG_IDENTIFIERS: Record<'customer' | 'investment', { status: string; source: string; rating: string }> = {
  customer: {
    status: 'SalesLeadStatus',
    source: 'SalesLeadSource',
    rating: 'SalesLeadRating'
  },
  investment: {
    status: 'InvestmentLeadStatus',
    source: 'InvestmentLeadSource',
    rating: 'InvestmentLeadRating'
  }
}

function toOptions(entries: CatalogEntry[]): LeadCatalogOption[] {
  return entries.map(entry => ({
    id: entry.id,
    label: entry.value || entry.code || entry.id
  }))
}

export function useLeadImportDefaults(accessToken: string, domain: 'customer' | 'investment'): LeadImportDefaults {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })

  const [statusOptions, setStatusOptions] = useState<LeadCatalogOption[]>([])
  const [sourceOptions, setSourceOptions] = useState<LeadCatalogOption[]>([])
  const [ratingOptions, setRatingOptions] = useState<LeadCatalogOption[]>([])
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedSource, setSelectedSource] = useState('')
  const [selectedRating, setSelectedRating] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const catalogs = CATALOG_IDENTIFIERS[domain]

  useEffect(() => {
    if (!accessToken) return

    setIsLoading(true)

    Promise.all([
      fetchCatalogEntriesByIdentifier(catalogs.status),
      fetchCatalogEntriesByIdentifier(catalogs.source),
      fetchCatalogEntriesByIdentifier(catalogs.rating)
    ])
      .then(([statusRes, sourceRes, ratingRes]) => {
        setStatusOptions(toOptions(statusRes.entries))
        setSourceOptions(toOptions(sourceRes.entries))
        setRatingOptions(toOptions(ratingRes.entries))
      })
      .catch(err => console.error('Failed to load lead catalog defaults:', err))
      .finally(() => setIsLoading(false))
  }, [accessToken, catalogs.status, catalogs.source, catalogs.rating, fetchCatalogEntriesByIdentifier])

  return {
    statusOptions,
    sourceOptions,
    ratingOptions,
    selectedStatus,
    selectedSource,
    selectedRating,
    onStatusChange: setSelectedStatus,
    onSourceChange: setSelectedSource,
    onRatingChange: setSelectedRating,
    isLoading
  }
}
