import { useState, useEffect, useMemo } from 'react'
import { useCatalogEntries } from '@/common/data/catalog/hooks/useCatalogEntries'
import { useInvestmentGroupPermissions } from './useInvestmentGroupPermissions'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import type { FormFieldsDefinition } from '@/common/data/investment/hooks/useInvestmentCatalogs'
import type { RequiredSubtypeKey } from '@/business-apps/irm/core/apps/investment-settings/pages/investment-data/types'

export interface InvestmentGroupObjectValue extends FormFieldsDefinition {
  requiredSubtypeKey?: RequiredSubtypeKey
  [key: string]: unknown
}

export interface InvestmentGroup {
  id: string
  code: string
  value: string
  label: string
  tabId: string
  objectValue?: InvestmentGroupObjectValue | null
}

export interface InvestmentCatalogEntry {
  id: string
  code?: string
  value?: string
  parentEntryId?: string
  parentEntry?: {
    id: string
    code?: string
  }
  objectValue?: InvestmentGroupObjectValue | null
}

export interface InvestmentListCatalogData {
  investmentGroups: InvestmentCatalogEntry[]
  investmentTypes: InvestmentCatalogEntry[]
  investmentLiquidFundTypes: InvestmentCatalogEntry[]
}

const parseInvestmentGroupObjectValue = (objectValue: unknown): InvestmentGroupObjectValue | null => {
  if (!objectValue) return null
  if (typeof objectValue === 'string') {
    try {
      return JSON.parse(objectValue) as InvestmentGroupObjectValue
    } catch {
      return null
    }
  }
  return objectValue as InvestmentGroupObjectValue
}

const toInvestmentCatalogEntry = (entry: CatalogEntry): InvestmentCatalogEntry => ({
  id: entry.id,
  code: entry.code,
  value: entry.value,
  parentEntryId: entry.parentEntryId,
  parentEntry: entry.parentEntry
    ? {
        id: entry.parentEntry.id,
        code: entry.parentEntry.code
      }
    : undefined,
  objectValue: parseInvestmentGroupObjectValue(entry.objectValue)
})

/**
 * Hook to fetch all investment groups from catalog and format them for UI
 * Returns investment groups dynamically discovered from the catalog
 */
export const useInvestmentGroups = (accessToken: string) => {
  const { fetchCatalogEntriesByIdentifier } = useCatalogEntries({ accessToken })
  const { fetchInvestmentGroupPermissionsMap } = useInvestmentGroupPermissions(accessToken)
  const [catalogData, setCatalogData] = useState<InvestmentListCatalogData>({
    investmentGroups: [],
    investmentTypes: [],
    investmentLiquidFundTypes: []
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadGroups = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const permsMap = await fetchInvestmentGroupPermissionsMap()
        const [groupsResult, typesResult, liquidFundTypesResult] = await Promise.all([
          fetchCatalogEntriesByIdentifier('InvestmentGroup', { limit: 1000 }),
          fetchCatalogEntriesByIdentifier('InvestmentType', { includeParentCatalogEntry: true, limit: 1000 }),
          fetchCatalogEntriesByIdentifier('InvestmentLiquidFundType', { includeParentCatalogEntry: true, limit: 1000 })
        ])

        setCatalogData({
          investmentGroups: (groupsResult.entries || [])
            .filter(entry => permsMap[entry.id])
            .map(toInvestmentCatalogEntry),
          investmentTypes: (typesResult.entries || []).map(toInvestmentCatalogEntry),
          investmentLiquidFundTypes: (liquidFundTypesResult.entries || []).map(toInvestmentCatalogEntry)
        })
      } catch (err) {
        console.error('[useInvestmentGroups] Error fetching investment groups:', err)
        setError(err instanceof Error ? err.message : 'Failed to load investment groups')
      } finally {
        setIsLoading(false)
      }
    }

    loadGroups()
  }, [accessToken, fetchCatalogEntriesByIdentifier, fetchInvestmentGroupPermissionsMap])

  const investmentGroups = useMemo<InvestmentGroup[]>(() => {
    if (catalogData.investmentGroups.length === 0) return []

    return catalogData.investmentGroups.map(entry => ({
      id: entry.id,
      code: entry.code || '',
      value: entry.value || '',
      label: entry.value || entry.code || '',
      tabId: (entry.code || '').toLowerCase().replace(/_/g, '-'),
      objectValue: entry.objectValue
    }))
  }, [catalogData.investmentGroups])

  return {
    investmentGroups,
    catalogData,
    isLoading,
    error
  }
}
