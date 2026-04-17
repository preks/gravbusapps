/**
 * Investment Import Type Defaults Hook
 * Fetches Investment Type catalog options for optional forced type selection.
 */

import { useEffect, useState } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import { investmentType as INVESTMENT_TYPE } from '@/common/data/investment/constants/investmentCatalogs'

export interface InvestmentTypeOption {
  id: string
  label: string
}

export interface InvestmentTypeDefaults {
  options: InvestmentTypeOption[]
  selectedType: string
  onTypeChange: (value: string) => void
  isLoading: boolean
}

const stripVersion = (id: string) => id.split(':')[0]
const toInvestmentGroupRef = (groupCodeHint: string) => `InvestmentGroup:v1:${groupCodeHint.trim().toUpperCase()}`

function toOptions(entries: CatalogEntry[]): InvestmentTypeOption[] {
  return entries
    .map(entry => ({
      id: entry.id,
      label: entry.value || entry.code || entry.id
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
}

export function useInvestmentTypeDefaults(
  accessToken: string,
  investmentGroupCodeHint?: string
): InvestmentTypeDefaults {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const [options, setOptions] = useState<InvestmentTypeOption[]>([])
  const [selectedType, setSelectedType] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!accessToken) return

    setIsLoading(true)
    fetchCatalogEntriesByIdentifier(stripVersion(INVESTMENT_TYPE))
      .then(result => {
        const filteredEntries = investmentGroupCodeHint
          ? result.entries.filter(entry => entry.parentEntryId === toInvestmentGroupRef(investmentGroupCodeHint))
          : result.entries
        setOptions(toOptions(filteredEntries))
      })
      .catch(err => console.error('Failed to load investment type defaults:', err))
      .finally(() => setIsLoading(false))
  }, [accessToken, fetchCatalogEntriesByIdentifier, investmentGroupCodeHint])

  useEffect(() => {
    if (!selectedType) return
    const hasSelectedType = options.some(option => option.id === selectedType)
    if (!hasSelectedType) {
      setSelectedType('')
    }
  }, [options, selectedType])

  return {
    options,
    selectedType,
    onTypeChange: setSelectedType,
    isLoading
  }
}
