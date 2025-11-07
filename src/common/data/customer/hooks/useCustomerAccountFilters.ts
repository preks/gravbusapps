// Customer Account Filters hook with lazy loading
import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { CommonAccountFilters } from '@/common/data/relations/types/commonAccountTypes'

type CustomerAccountFilters = CommonAccountFilters
import {
  PREFETCH_ALL_FILTERS_QUERY,
  SEARCH_OWNERS_QUERY,
  SEARCH_INDUSTRIES_QUERY,
  SEARCH_LEGAL_FORMS_QUERY,
  SEARCH_COMPANY_SIZES_QUERY,
  SEARCH_REVENUE_BANDS_QUERY
} from '@/business-apps/crm/core/apps/customer-relations/views/account-view/queries/accountFilterFragments'

interface FilterOption {
  id: string
  label: string
}

interface PrefetchResponse {
  owners: Array<{ ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null }>
  industries: Array<{ industry: { id: string; code?: string; value?: string } | null }>
  legalForms: Array<{ legalForm: { id: string; code?: string; value?: string } | null }>
  companySizes: Array<{ numberOfEmployees: { id: string; code?: string; value?: string } | null }>
  revenueBands: Array<{ annualRevenue: { id: string; code?: string; value?: string } | null }>
}

export const useCustomerAccountFilters = (context: BusinessAppContextProps): CustomerAccountFilters => {
  const [isLoading, setIsLoading] = useState(false)
  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const [owners, setOwners] = useState<FilterOption[]>([])
  const [industries, setIndustries] = useState<FilterOption[]>([])
  const [legalForms, setLegalForms] = useState<FilterOption[]>([])
  const [companySizes, setCompanySizes] = useState<FilterOption[]>([])
  const [revenueBands, setRevenueBands] = useState<FilterOption[]>([])
  const [countries, setCountries] = useState<FilterOption[]>([])

  // Prefetch initial filter options (first 10 distinct values per filter)
  const prefetchFilters = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)

    try {
      // Combined GraphQL query for all filters (limit 10 each)
      const graphqlRes = await graphqlClient.request<PrefetchResponse>(PREFETCH_ALL_FILTERS_QUERY)

      // Process owners
      const ownerItems = (graphqlRes.owners || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const emp = r.ownerEmployee!
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
          return { id: emp.id, label: name }
        })
      setOwners(ownerItems)

      // Process industries
      const industryItems = (graphqlRes.industries || [])
        .filter(r => r.industry)
        .map(r => ({
          id: r.industry!.id,
          label: r.industry!.value || r.industry!.code || r.industry!.id
        }))
      setIndustries(industryItems)

      // Process legal forms
      const legalFormItems = (graphqlRes.legalForms || [])
        .filter(r => r.legalForm)
        .map(r => ({
          id: r.legalForm!.id,
          label: r.legalForm!.value || r.legalForm!.code || r.legalForm!.id
        }))
      setLegalForms(legalFormItems)

      // Process company sizes
      const companySizeItems = (graphqlRes.companySizes || [])
        .filter(r => r.numberOfEmployees)
        .map(r => ({
          id: r.numberOfEmployees!.id,
          label: r.numberOfEmployees!.value || r.numberOfEmployees!.code || r.numberOfEmployees!.id
        }))
      setCompanySizes(companySizeItems)

      // Process revenue bands
      const revenueBandItems = (graphqlRes.revenueBands || [])
        .filter(r => r.annualRevenue)
        .map(r => ({
          id: r.annualRevenue!.id,
          label: r.annualRevenue!.value || r.annualRevenue!.code || r.annualRevenue!.id
        }))
      setRevenueBands(revenueBandItems)

      // Load countries from Catalog API (limit 10)
      const countriesResp = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: 'Country', version: 'v1' },
        { limit: 10, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
      )
      setCountries((countriesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
    } catch (error) {
      console.error('Error prefetching customer account filters:', error)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient, graphqlClient])

  // Search owners with query
  const searchOwners = useCallback(
    async (query: string): Promise<FilterOption[]> => {
      if (!context.accessToken) return []

      try {
        const res = await graphqlClient.request<{
          Account: Array<{
            ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
          }>
        }>(SEARCH_OWNERS_QUERY(query))

        const results = (res.Account || [])
          .filter(r => r.ownerEmployee)
          .map(r => {
            const emp = r.ownerEmployee!
            const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
            return { id: emp.id, label: name }
          })

        setOwners(results)
        return results
      } catch (error) {
        console.error('Error searching owners:', error)
        return []
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Search industries with query
  const searchIndustries = useCallback(
    async (query: string): Promise<FilterOption[]> => {
      if (!context.accessToken) return []

      try {
        const res = await graphqlClient.request<{
          Account: Array<{ industry: { id: string; code?: string; value?: string } | null }>
        }>(SEARCH_INDUSTRIES_QUERY(query))

        const results = (res.Account || [])
          .filter(r => r.industry)
          .map(r => ({
            id: r.industry!.id,
            label: r.industry!.value || r.industry!.code || r.industry!.id
          }))

        setIndustries(results)
        return results
      } catch (error) {
        console.error('Error searching industries:', error)
        return []
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Search legal forms with query
  const searchLegalForms = useCallback(
    async (query: string): Promise<FilterOption[]> => {
      if (!context.accessToken) return []

      try {
        const res = await graphqlClient.request<{
          Account: Array<{ legalForm: { id: string; code?: string; value?: string } | null }>
        }>(SEARCH_LEGAL_FORMS_QUERY(query))

        const results = (res.Account || [])
          .filter(r => r.legalForm)
          .map(r => ({
            id: r.legalForm!.id,
            label: r.legalForm!.value || r.legalForm!.code || r.legalForm!.id
          }))

        setLegalForms(results)
        return results
      } catch (error) {
        console.error('Error searching legal forms:', error)
        return []
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Search company sizes with query
  const searchCompanySizes = useCallback(
    async (query: string): Promise<FilterOption[]> => {
      if (!context.accessToken) return []

      try {
        const res = await graphqlClient.request<{
          Account: Array<{ numberOfEmployees: { id: string; code?: string; value?: string } | null }>
        }>(SEARCH_COMPANY_SIZES_QUERY(query))

        const results = (res.Account || [])
          .filter(r => r.numberOfEmployees)
          .map(r => ({
            id: r.numberOfEmployees!.id,
            label: r.numberOfEmployees!.value || r.numberOfEmployees!.code || r.numberOfEmployees!.id
          }))

        setCompanySizes(results)
        return results
      } catch (error) {
        console.error('Error searching company sizes:', error)
        return []
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Search revenue bands with query
  const searchRevenueBands = useCallback(
    async (query: string): Promise<FilterOption[]> => {
      if (!context.accessToken) return []

      try {
        const res = await graphqlClient.request<{
          Account: Array<{ annualRevenue: { id: string; code?: string; value?: string } | null }>
        }>(SEARCH_REVENUE_BANDS_QUERY(query))

        const results = (res.Account || [])
          .filter(r => r.annualRevenue)
          .map(r => ({
            id: r.annualRevenue!.id,
            label: r.annualRevenue!.value || r.annualRevenue!.code || r.annualRevenue!.id
          }))

        setRevenueBands(results)
        return results
      } catch (error) {
        console.error('Error searching revenue bands:', error)
        return []
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Search countries with query (uses Catalog API)
  const searchCountries = useCallback(
    async (query: string): Promise<FilterOption[]> => {
      if (!context.accessToken) return []

      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          {
            limit: 50,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            searchCriteria: query
          }
        )
        const results = (resp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code }))
        setCountries(results)
        return results
      } catch (error) {
        console.error('Error searching countries:', error)
        return []
      }
    },
    [context.accessToken, catalogClient]
  )

  // Auto-load filters on mount
  useEffect(() => {
    prefetchFilters()
  }, [prefetchFilters])

  return {
    owners,
    industries,
    legalForms,
    companySizes,
    revenueBands,
    countries,
    isLoading,
    prefetchFilters,
    searchOwners,
    searchIndustries,
    searchLegalForms,
    searchCompanySizes,
    searchRevenueBands,
    searchCountries
  }
}
