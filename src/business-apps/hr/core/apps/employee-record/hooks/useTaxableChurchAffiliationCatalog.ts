import { useState, useEffect, useMemo } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

type TaxableChurchAffiliationEntry = CatalogEntry & {
  additionalValue1: string
}

interface UseTaxableChurchAffiliationCatalogResult {
  taxableChurchAffiliationEntries: TaxableChurchAffiliationEntry[]
  loading: boolean
  error: Error | null
  getTaxableChurchAffiliationValueById: (id: string) => string
}

/**
 * Fetches TaxableChurchAffiliation catalog entries and returns translated labels.
 */
export const useTaxableChurchAffiliationCatalog = (accessToken: string): UseTaxableChurchAffiliationCatalogResult => {
  const [taxableChurchAffiliationEntries, setTaxableChurchAffiliationEntries] = useState<
    TaxableChurchAffiliationEntry[]
  >([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const catalogClient = useCatalogManagerClient(accessToken)
  const activeLocale = getCurrentActiveUserLocale()

  useEffect(() => {
    const fetchTaxableChurchAffiliationEntries = async () => {
      if (!accessToken) return

      try {
        setLoading(true)
        setError(null)

        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'TaxableChurchAffiliation',
            version: 'v1'
          },
          {
            limit: 50,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            includeTranslations: true,
            localeCode: activeLocale
          }
        )

        setTaxableChurchAffiliationEntries((response.data || []) as unknown as TaxableChurchAffiliationEntry[])
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch taxable church affiliation catalog'))
        console.error('Error fetching taxable church affiliation catalog:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchTaxableChurchAffiliationEntries()
  }, [accessToken, catalogClient])

  const getTaxableChurchAffiliationValueById = useMemo(() => {
    return (id: string): string => {
      if (!id) return ''

      const matchingEntry = taxableChurchAffiliationEntries.find(entry => entry.id === id)
      return matchingEntry?.translations?.[0]?.value || matchingEntry?.value || id
    }
  }, [taxableChurchAffiliationEntries])

  return {
    taxableChurchAffiliationEntries,
    loading,
    error,
    getTaxableChurchAffiliationValueById
  }
}
