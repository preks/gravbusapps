import { useState, useCallback, useEffect } from 'react'
import { SelectOption } from '../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface InvestmentTypeCatalogState {
  options: SelectOption[]
  loading: boolean
  error: string | null
}

export const INVESTMENT_TYPE_CATALOG = 'InvestmentType'
export const CATALOG_VERSION = 'v1'

export const useInvestmentTypeCatalog = (accessToken: string, investmentGroupRef?: string) => {
  const [state, setState] = useState<InvestmentTypeCatalogState>({
    options: [],
    loading: false,
    error: null
  })

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchInvestmentTypes = useCallback(
    async (groupRef?: string): Promise<void> => {
      if (!groupRef) {
        setState({
          options: [],
          loading: false,
          error: null
        })
        return
      }

      setState(prev => ({
        ...prev,
        loading: true,
        error: null
      }))

      try {
        // Extract the parent ID from the group reference (e.g., "InvestmentGroup:v1:REAL_ESTATE" -> "REAL_ESTATE")
        const groupCode = groupRef.split(':').pop()

        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: INVESTMENT_TYPE_CATALOG,
            version: CATALOG_VERSION
          },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: true,
            includeChildCatalogEntries: true
          }
        )

        // Filter entries by parent group code in the response data
        const filteredEntries = response.data.filter((entry: any) => {
          // Check if the entry has the expected parent structure
          // The parent should be the investment group with the matching code
          const expectedParentRef = `InvestmentGroup:${CATALOG_VERSION}:${groupCode}`

          // Check various possible parent reference formats
          return (
            entry.parentEntryId === expectedParentRef ||
            entry.parentId === expectedParentRef ||
            entry.parent === expectedParentRef ||
            (entry.parent && entry.parent.code === groupCode) ||
            entry.code?.includes(groupCode)
          ) // fallback check
        })

        const mappedOptions: SelectOption[] = filteredEntries.map((entry: any) => {
          // Create the reference format: InvestmentType:v1:CODE
          const referenceValue = `${INVESTMENT_TYPE_CATALOG}:${CATALOG_VERSION}:${entry.code || entry.id}`

          return {
            id: entry.id,
            name: entry.value || entry.label || entry.name || 'Unknown',
            label: entry.value || entry.label || entry.name || 'Unknown',
            value: referenceValue
          }
        })

        setState(prev => ({
          ...prev,
          loading: false,
          options: mappedOptions
        }))
      } catch (err) {
        console.error(`Error fetching ${INVESTMENT_TYPE_CATALOG} catalog for group ${groupRef}:`, err)
        setState(prev => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : 'Unknown error occurred'
        }))
      }
    },
    [catalogClient]
  )

  // Auto-fetch when group changes
  useEffect(() => {
    if (accessToken) {
      fetchInvestmentTypes(investmentGroupRef)
    }
  }, [accessToken, investmentGroupRef, fetchInvestmentTypes])

  const refetch = useCallback(() => {
    fetchInvestmentTypes(investmentGroupRef)
  }, [fetchInvestmentTypes, investmentGroupRef])

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    refetch
  }
}
