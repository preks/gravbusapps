// Investment Lead Filters hook with lazy loading
import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  label: string
}

export interface InvestmentLeadFilterOptions {
  owners: FilterOption[]
  statuses: FilterOption[]
  ratings: FilterOption[]
  sources: FilterOption[]
  salutations: FilterOption[]
  industries: FilterOption[]
  isLoading: boolean
}

// Prefetch query for initial filter options
const PREFETCH_LEAD_FILTERS_QUERY = `
  query PrefetchLeadFilters {
    owners: InvestmentLead(
      where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } } }
      distinctOn: [ownerEmployeeId]
      limit: 10
      orderBy: [{ ownerEmployeeId: ASC }]
    ) {
      ownerEmployee {
        id
        displayName
        firstName
        lastName
      }
    }
    statuses: InvestmentLead(
      where: { isDeleted: { _eq: false }, leadStatus: { id: { _isNull: false } } }
      distinctOn: [leadStatusRef]
      limit: 10
      orderBy: [{ leadStatusRef: ASC }]
    ) {
      leadStatus {
        id
        code
        value
      }
    }
    ratings: InvestmentLead(
      where: { isDeleted: { _eq: false }, leadRating: { id: { _isNull: false } } }
      distinctOn: [leadRatingRef]
      limit: 10
      orderBy: [{ leadRatingRef: ASC }]
    ) {
      leadRating {
        id
        code
        value
      }
    }
    sources: InvestmentLead(
      where: { isDeleted: { _eq: false }, leadSource: { id: { _isNull: false } } }
      distinctOn: [leadSourceRef]
      limit: 10
      orderBy: [{ leadSourceRef: ASC }]
    ) {
      leadSource {
        id
        code
        value
      }
    }
    industries: InvestmentLead(
      where: { isDeleted: { _eq: false }, industryClass: { id: { _isNull: false } } }
      distinctOn: [industryClassRef]
      limit: 10
      orderBy: [{ industryClassRef: ASC }]
    ) {
      industryClass {
        id
        code
        value
      }
    }
  }
`

export const useInvestmentLeadFilterOptions = (context: BusinessAppContextProps): InvestmentLeadFilterOptions => {
  const { accessToken } = context
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

  const [owners, setOwners] = useState<FilterOption[]>([])
  const [statuses, setStatuses] = useState<FilterOption[]>([])
  const [ratings, setRatings] = useState<FilterOption[]>([])
  const [sources, setSources] = useState<FilterOption[]>([])
  const [salutations, setSalutations] = useState<FilterOption[]>([])
  const [industries, setIndustries] = useState<FilterOption[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Prefetch initial filter options
  const prefetchFilters = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)

    try {
      // Combined GraphQL query for all filters
      const graphqlRes = await graphqlClient.request<{
        owners: Array<{
          ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
        }>
        statuses: Array<{ leadStatus: { id: string; code?: string; value?: string } | null }>
        ratings: Array<{ leadRating: { id: string; code?: string; value?: string } | null }>
        sources: Array<{ leadSource: { id: string; code?: string; value?: string } | null }>
        industries: Array<{ industryClass: { id: string; code?: string; value?: string } | null }>
      }>(PREFETCH_LEAD_FILTERS_QUERY)

      // Process owners
      const ownerItems = (graphqlRes.owners || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const emp = r.ownerEmployee!
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
          return { id: emp.id, label: name }
        })
      setOwners(ownerItems)

      // Process statuses
      const statusItems = (graphqlRes.statuses || [])
        .filter(r => r.leadStatus)
        .map(r => ({
          id: r.leadStatus!.id,
          label: r.leadStatus!.value || r.leadStatus!.code || r.leadStatus!.id
        }))
      setStatuses(statusItems)

      // Process ratings
      const ratingItems = (graphqlRes.ratings || [])
        .filter(r => r.leadRating)
        .map(r => ({
          id: r.leadRating!.id,
          label: r.leadRating!.value || r.leadRating!.code || r.leadRating!.id
        }))
      setRatings(ratingItems)

      // Process sources
      const sourceItems = (graphqlRes.sources || [])
        .filter(r => r.leadSource)
        .map(r => ({
          id: r.leadSource!.id,
          label: r.leadSource!.value || r.leadSource!.code || r.leadSource!.id
        }))
      setSources(sourceItems)

      // Process industries
      const industryItems = (graphqlRes.industries || [])
        .filter(r => r.industryClass)
        .map(r => ({
          id: r.industryClass!.id,
          label: r.industryClass!.value || r.industryClass!.code || r.industryClass!.id
        }))
      setIndustries(industryItems)

      // Load salutations from Catalog API
      try {
        const salutationsResp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Salutation', version: 'v1' },
          { limit: 50, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        )
        const salutationItems = (salutationsResp?.data || []).map((e: any) => ({
          id: e.id,
          label: e.value || e.code || e.id
        }))
        setSalutations(salutationItems)
      } catch (error) {
        console.error('Error loading salutations:', error)
        setSalutations([])
      }
    } catch (error) {
      console.error('Error prefetching lead filters:', error)
      setOwners([])
      setStatuses([])
      setRatings([])
      setSources([])
      setSalutations([])
      setIndustries([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, catalogClient])

  useEffect(() => {
    prefetchFilters()
  }, [prefetchFilters])

  return {
    owners,
    statuses,
    ratings,
    sources,
    salutations,
    industries,
    isLoading
  }
}
