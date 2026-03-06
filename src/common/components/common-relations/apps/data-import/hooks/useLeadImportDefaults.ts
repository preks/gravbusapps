/**
 * Lead Import Defaults Hook
 * Fetches Lead Status, Lead Source and Lead Rating catalog options
 * based on the current domain (CRM → Sales catalogs, IRM → Investment catalogs)
 */

import { useState, useEffect } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import {
  LEAD_STATUS as CUSTOMER_LEAD_STATUS,
  LEAD_SOURCE as CUSTOMER_LEAD_SOURCE,
  LEAD_RATING as CUSTOMER_LEAD_RATING
} from '@/common/data/customer/constants/customerCatalogs'
import {
  LEAD_STATUS as INVESTMENT_LEAD_STATUS,
  LEAD_SOURCE as INVESTMENT_LEAD_SOURCE,
  LEAD_RATING as INVESTMENT_LEAD_RATING
} from '@/common/data/investment/constants/investmentCatalogs'

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

// fetchCatalogEntriesByIdentifier expects plain identifier without :version suffix
const stripVersion = (id: string) => id.split(':')[0]

const CATALOG_IDENTIFIERS: Record<'customer' | 'investment', { status: string; source: string; rating: string }> = {
  customer: {
    status: stripVersion(CUSTOMER_LEAD_STATUS),
    source: stripVersion(CUSTOMER_LEAD_SOURCE),
    rating: stripVersion(CUSTOMER_LEAD_RATING)
  },
  investment: {
    status: stripVersion(INVESTMENT_LEAD_STATUS),
    source: stripVersion(INVESTMENT_LEAD_SOURCE),
    rating: stripVersion(INVESTMENT_LEAD_RATING)
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
