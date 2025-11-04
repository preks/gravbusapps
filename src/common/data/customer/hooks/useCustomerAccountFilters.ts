// Customer Account Filters hook
import { useEffect, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  label: string
}

export interface UseCustomerAccountFiltersReturn {
  owners: FilterOption[]
  industries: FilterOption[]
  legalForms: FilterOption[]
  companySizes: FilterOption[]
  revenueBands: FilterOption[]
  countries: FilterOption[]
  regions: FilterOption[]
  cities: FilterOption[]
  isLoading: boolean
}

export const useCustomerAccountFilters = (context: BusinessAppContextProps): UseCustomerAccountFiltersReturn => {
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const [owners, setOwners] = useState<FilterOption[]>([])
  const [industries, setIndustries] = useState<FilterOption[]>([])
  const [legalForms, setLegalForms] = useState<FilterOption[]>([])
  const [companySizes, setCompanySizes] = useState<FilterOption[]>([])
  const [revenueBands, setRevenueBands] = useState<FilterOption[]>([])
  const [countries, setCountries] = useState<FilterOption[]>([])
  const [regions, setRegions] = useState<FilterOption[]>([])
  const [cities, setCities] = useState<FilterOption[]>([])

  const loadFilters = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)

    try {
      const [industriesResp, legalFormsResp, companySizesResp, revenueBandsResp, countriesResp] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Industry', version: 'v1' },
          { limit: 200, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'LegalForm', version: 'v1' },
          { limit: 200, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'CompanySize', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AnnualRevenueBand', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 300, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        )
      ])

      // Load owners from GraphQL
      const ownerQuery = `
        query GetAccountOwners {
          Account(
            where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }
            distinctOn: [ownerEmployeeId]
            limit: 50
          ) {
            ownerEmployee {
              id
              firstName
              lastName
              displayName
            }
          }
        }
      `
      const ownersRes = await graphqlClient.request<{
        Account: Array<{
          ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
      }>(ownerQuery)

      setIndustries((industriesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setLegalForms((legalFormsResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setCompanySizes((companySizesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setRevenueBands((revenueBandsResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setCountries((countriesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))

      const ownerItems = (ownersRes.Account || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const emp = r.ownerEmployee!
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
          return { id: emp.id, label: name }
        })
      setOwners(ownerItems)

      setRegions([])
      setCities([])
    } catch (error) {
      console.error('Error loading account filters:', error)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient, graphqlClient])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  return {
    owners,
    industries,
    legalForms,
    companySizes,
    revenueBands,
    countries,
    regions,
    cities,
    isLoading
  }
}
