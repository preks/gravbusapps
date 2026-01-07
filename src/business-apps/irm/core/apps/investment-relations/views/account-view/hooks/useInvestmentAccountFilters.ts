import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { DataFilterGroup } from '@/components/data-filter/DataFilter'
import { DateRangeFilter } from '@/business-apps/crm/core/apps/customer-relations/views/lead-view/components/DateRangeFilter'

interface OwnerItem {
  id: string
  name: string
}
interface CatalogItem {
  id: string
  code?: string
  value?: string
}

export interface UseInvestmentAccountFiltersReturn {
  filterGroups: DataFilterGroup[]
  filterLabelMap: Record<string, string>
  handleFilterChange: (filterId: string, selected: boolean) => void
  createdAfter?: string
  createdBefore?: string
  filtersInitialized: boolean
}

export const useInvestmentAccountFilters = (
  context: BusinessAppContextProps,
  selectedFilters: string[],
  setSelectedFilters: (filters: string[]) => void
): UseInvestmentAccountFiltersReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  // Filters initialization state
  const [filtersInitialized, setFiltersInitialized] = useState(false)

  // Date range filter state (createdAt)
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined)
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined)

  const handleDateRangeChange = useCallback((after?: string, before?: string) => {
    setCreatedAfter(after)
    setCreatedBefore(before)
  }, [])

  // Owners
  const [owners, setOwners] = useState<OwnerItem[]>([])
  const [loadingOwners, setLoadingOwners] = useState(false)
  const [errorOwners, setErrorOwners] = useState<Error | null>(null)
  const lastOwnerSearchRef = useRef<string>('')
  const loadOwners = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingOwners(true)
      setErrorOwners(null)
      try {
        const where = `where: { isDeleted: { _eq: false }, ownerEmployee: { id: { _isNull: false } ${search.trim() ? `, _or: [ { firstName: { _ilike: "%${search}%" } }, { lastName: { _ilike: "%${search}%" } }, { displayName: { _ilike: "%${search}%" } } ]` : ''} } }`
        const query = `
        query GetAccountOwners {
          InvestmentAccount(${where}, distinctOn: [ownerEmployeeId], limit: 50) {
            ownerEmployee { id displayName firstName lastName }
          }
        }
      `
        const res = await graphqlClient.request<{
          InvestmentAccount: Array<{
            ownerEmployee?: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
          }>
        }>(query)
        const items: OwnerItem[] = (res?.InvestmentAccount || [])
          .filter(r => r.ownerEmployee)
          .map(r => {
            const emp = r.ownerEmployee!
            const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
            return { id: emp.id, name }
          })
        setOwners(items)
      } catch (e) {
        setOwners([])
        setErrorOwners(e as Error)
      } finally {
        setLoadingOwners(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Companies (names)
  const [companies, setCompanies] = useState<string[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [errorCompanies, setErrorCompanies] = useState<Error | null>(null)
  const lastCompanySearchRef = useRef<string>('')
  const loadCompanies = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingCompanies(true)
      setErrorCompanies(null)
      try {
        const where = `where: { isDeleted: { _eq: false } ${search.trim() ? `, name: { _ilike: "%${search}%" }` : ''} }`
        const query = `
        query GetAccountCompanies {
          InvestmentAccount(${where}, distinctOn: [name], limit: 100) { name }
        }
      `
        const res = await graphqlClient.request<{ InvestmentAccount: Array<{ name?: string }> }>(query)
        const names = new Set<string>()
        ;(res?.InvestmentAccount || []).forEach(a => {
          if (a.name) names.add(a.name)
        })
        setCompanies(Array.from(names))
      } catch (e) {
        setCompanies([])
        setErrorCompanies(e as Error)
      } finally {
        setLoadingCompanies(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Geographic Presence (free text distinct)
  const [locations, setLocations] = useState<string[]>([])
  const [loadingLocations, setLoadingLocations] = useState(false)
  const [errorLocations, setErrorLocations] = useState<Error | null>(null)
  const lastLocationSearchRef = useRef<string>('')
  const loadLocations = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingLocations(true)
      setErrorLocations(null)
      try {
        const where = `where: { isDeleted: { _eq: false } ${search.trim() ? `, geographicPresence: { _ilike: "%${search}%" }` : ''} }`
        const query = `
        query GetGeographicPresence {
          InvestmentAccount(${where}, distinctOn: [geographicPresence], limit: 100) { geographicPresence }
        }
      `
        const res = await graphqlClient.request<{ InvestmentAccount: Array<{ geographicPresence?: string }> }>(query)
        const vals = new Set<string>()
        ;(res?.InvestmentAccount || []).forEach(a => {
          if (a.geographicPresence) vals.add(a.geographicPresence)
        })
        setLocations(Array.from(vals))
      } catch (e) {
        setLocations([])
        setErrorLocations(e as Error)
      } finally {
        setLoadingLocations(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Catalogs: LegalForm, IndustryClass, CompanySize, AccountAnnualRevenueBand
  const [legalForms, setLegalForms] = useState<CatalogItem[]>([])
  const [loadingLegalForms, setLoadingLegalForms] = useState(false)
  const [errorLegalForms, setErrorLegalForms] = useState<Error | null>(null)
  const lastLegalFormSearchRef = useRef<string>('')
  const loadLegalForms = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingLegalForms(true)
      setErrorLegalForms(null)
      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'LegalForm', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            ...(search.trim() ? { searchCriteria: search.trim() } : {})
          }
        )
        setLegalForms((resp?.data || []).map((e: any) => ({ id: e.id, code: e.code, value: e.value })))
      } catch (e) {
        setLegalForms([])
        setErrorLegalForms(e as Error)
      } finally {
        setLoadingLegalForms(false)
      }
    },
    [catalogClient, context.accessToken]
  )

  const [industries, setIndustries] = useState<CatalogItem[]>([])
  const [loadingIndustries, setLoadingIndustries] = useState(false)
  const [errorIndustries, setErrorIndustries] = useState<Error | null>(null)
  const lastIndustrySearchRef = useRef<string>('')
  const loadIndustries = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingIndustries(true)
      setErrorIndustries(null)
      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'IndustryClass', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            ...(search.trim() ? { searchCriteria: search.trim() } : {})
          }
        )
        setIndustries((resp?.data || []).map((e: any) => ({ id: e.id, code: e.code, value: e.value })))
      } catch (e) {
        setIndustries([])
        setErrorIndustries(e as Error)
      } finally {
        setLoadingIndustries(false)
      }
    },
    [catalogClient, context.accessToken]
  )

  const [companySizes, setCompanySizes] = useState<CatalogItem[]>([])
  const [loadingCompanySizes, setLoadingCompanySizes] = useState(false)
  const [errorCompanySizes, setErrorCompanySizes] = useState<Error | null>(null)
  const lastSizeSearchRef = useRef<string>('')
  const loadCompanySizes = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingCompanySizes(true)
      setErrorCompanySizes(null)
      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'CompanySize', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            ...(search.trim() ? { searchCriteria: search.trim() } : {})
          }
        )
        setCompanySizes((resp?.data || []).map((e: any) => ({ id: e.id, code: e.code, value: e.value })))
      } catch (e) {
        setCompanySizes([])
        setErrorCompanySizes(e as Error)
      } finally {
        setLoadingCompanySizes(false)
      }
    },
    [catalogClient, context.accessToken]
  )

  const [revenueBands, setRevenueBands] = useState<CatalogItem[]>([])
  const [loadingRevenueBands, setLoadingRevenueBands] = useState(false)
  const [errorRevenueBands, setErrorRevenueBands] = useState<Error | null>(null)
  const lastRevenueSearchRef = useRef<string>('')
  const loadRevenueBands = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingRevenueBands(true)
      setErrorRevenueBands(null)
      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AccountAnnualRevenueBand', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            ...(search.trim() ? { searchCriteria: search.trim() } : {})
          }
        )
        setRevenueBands((resp?.data || []).map((e: any) => ({ id: e.id, code: e.code, value: e.value })))
      } catch (e) {
        setRevenueBands([])
        setErrorRevenueBands(e as Error)
      } finally {
        setLoadingRevenueBands(false)
      }
    },
    [catalogClient, context.accessToken]
  )

  // BackendSearch adapters
  const toFilters = (arr: Array<{ id: string; label: string }>) =>
    arr.map(f => ({ id: f.id, label: f.label, selected: selectedFilters.includes(f.id) }))

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    const ownerFilters = owners.map(o => ({ id: `owner:${o.id}`, label: o.name }))
    const legalFormFilters = legalForms.map(c => ({ id: `legalForm:${c.id}`, label: c.value || c.code || c.id }))
    const industryFilters = industries.map(c => ({ id: `industry:${c.id}`, label: c.value || c.code || c.id }))
    const sizeFilters = companySizes.map(c => ({ id: `companySize:${c.id}`, label: c.value || c.code || c.id }))
    const revenueFilters = revenueBands.map(c => ({
      id: `annualRevenueBand:${c.id}`,
      label: c.value || c.code || c.id
    }))
    const companyFilters = companies.map(n => ({ id: `company:${n}`, label: n }))
    const locationFilters = locations.map(l => ({ id: `location:${l}`, label: l }))

    return [
      {
        id: 'owners',
        title: 'Owner',
        filters: toFilters(ownerFilters),
        backendSearch: (search: string) => {
          if (search !== lastOwnerSearchRef.current) {
            lastOwnerSearchRef.current = search
            void loadOwners(search)
          }
          const filtered = ownerFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingOwners, error: errorOwners } as any
        }
      },
      {
        id: 'industries',
        title: 'Industry',
        filters: toFilters(industryFilters),
        backendSearch: (search: string) => {
          if (search !== lastIndustrySearchRef.current) {
            lastIndustrySearchRef.current = search
            void loadIndustries(search)
          }
          const filtered = industryFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingIndustries, error: errorIndustries } as any
        }
      },
      {
        id: 'legalForms',
        title: 'Legal Form',
        filters: toFilters(legalFormFilters),
        backendSearch: (search: string) => {
          if (search !== lastLegalFormSearchRef.current) {
            lastLegalFormSearchRef.current = search
            void loadLegalForms(search)
          }
          const filtered = legalFormFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingLegalForms, error: errorLegalForms } as any
        }
      },
      {
        id: 'companySizes',
        title: 'Company Size',
        filters: toFilters(sizeFilters),
        backendSearch: (search: string) => {
          if (search !== lastSizeSearchRef.current) {
            lastSizeSearchRef.current = search
            void loadCompanySizes(search)
          }
          const filtered = sizeFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingCompanySizes, error: errorCompanySizes } as any
        }
      },
      {
        id: 'annualRevenueBands',
        title: 'Annual Revenue',
        filters: toFilters(revenueFilters),
        backendSearch: (search: string) => {
          if (search !== lastRevenueSearchRef.current) {
            lastRevenueSearchRef.current = search
            void loadRevenueBands(search)
          }
          const filtered = revenueFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingRevenueBands, error: errorRevenueBands } as any
        }
      },
      {
        id: 'companies',
        title: 'Company',
        filters: toFilters(companyFilters),
        backendSearch: (search: string) => {
          if (search !== lastCompanySearchRef.current) {
            lastCompanySearchRef.current = search
            void loadCompanies(search)
          }
          const filtered = companyFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingCompanies, error: errorCompanies } as any
        }
      },
      {
        id: 'locations',
        title: 'Location',
        filters: toFilters(locationFilters),
        backendSearch: (search: string) => {
          if (search !== lastLocationSearchRef.current) {
            lastLocationSearchRef.current = search
            void loadLocations(search)
          }
          const filtered = locationFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingLocations, error: errorLocations } as any
        }
      },
      {
        id: 'dateRange',
        title: 'Creation Date',
        filters: [],
        customComponent: React.createElement(DateRangeFilter, {
          createdAfter: createdAfter,
          createdBefore: createdBefore,
          onDateRangeChange: handleDateRangeChange,
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
        }),
        hideSearch: true
      } as any,
      {
        id: 'status',
        title: 'Status',
        filters: toFilters([
          { id: 'status:active', label: 'Active' },
          { id: 'status:inactive', label: 'Inactive' }
        ])
      },
      {
        id: 'communicationChannels',
        title: 'Contact Info',
        filters: toFilters([
          { id: 'has:website', label: 'Has website' },
          { id: 'missing:website', label: 'Missing website' },
          { id: 'has:email', label: 'Has email' },
          { id: 'missing:email', label: 'Missing email' },
          { id: 'has:phone', label: 'Has phone' },
          { id: 'missing:phone', label: 'Missing phone' },
          { id: 'has:contact', label: 'Has contact' },
          { id: 'missing:contact', label: 'Missing contact' }
        ])
      }
    ]
  }, [
    owners,
    legalForms,
    industries,
    companySizes,
    revenueBands,
    companies,
    locations,
    loadingOwners,
    errorOwners,
    loadingIndustries,
    errorIndustries,
    loadingLegalForms,
    errorLegalForms,
    loadingCompanySizes,
    errorCompanySizes,
    loadingRevenueBands,
    errorRevenueBands,
    loadingCompanies,
    errorCompanies,
    loadingLocations,
    errorLocations,
    createdAfter,
    createdBefore,
    handleDateRangeChange,
    selectedFilters,
    loadOwners,
    loadIndustries,
    loadLegalForms,
    loadCompanySizes,
    loadRevenueBands,
    loadCompanies,
    loadLocations
  ])

  // Label map for DataController tags
  const filterLabelMap = useMemo(() => {
    return {
      ...Object.fromEntries(owners.map(o => [`owner:${o.id}`, o.name])),
      ...Object.fromEntries(legalForms.map(c => [`legalForm:${c.id}`, c.value || c.code || c.id])),
      ...Object.fromEntries(industries.map(c => [`industry:${c.id}`, c.value || c.code || c.id])),
      ...Object.fromEntries(companySizes.map(c => [`companySize:${c.id}`, c.value || c.code || c.id])),
      ...Object.fromEntries(revenueBands.map(c => [`annualRevenueBand:${c.id}`, c.value || c.code || c.id])),
      ...Object.fromEntries(companies.map(n => [`company:${n}`, n])),
      ...Object.fromEntries(locations.map(l => [`location:${l}`, l])),
      'status:active': 'Active',
      'status:inactive': 'Inactive',
      'has:website': 'Has website',
      'missing:website': 'Missing website',
      'has:email': 'Has email',
      'missing:email': 'Missing email',
      'has:phone': 'Has phone',
      'missing:phone': 'Missing phone',
      'has:contact': 'Has contact',
      'missing:contact': 'Missing contact'
    } as Record<string, string>
  }, [owners, legalForms, industries, companySizes, revenueBands, companies, locations])

  // Change handler
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      const exists = selectedFilters.includes(filterId)
      if (selected && !exists) {
        setSelectedFilters([...selectedFilters, filterId])
      } else if (!selected && exists) {
        setSelectedFilters(selectedFilters.filter((id: string) => id !== filterId))
      }
    },
    [setSelectedFilters, selectedFilters]
  )

  // Initial preloading minimal data
  useEffect(() => {
    void loadOwners('')
    void loadIndustries('')
    void loadLegalForms('')
    void loadCompanySizes('')
    void loadRevenueBands('')
    void loadCompanies('')
    void loadLocations('')
  }, [loadOwners, loadIndustries, loadLegalForms, loadCompanySizes, loadRevenueBands, loadCompanies, loadLocations])

  // Track when all initial filter loading is complete
  useEffect(() => {
    const anyLoading =
      loadingOwners ||
      loadingIndustries ||
      loadingLegalForms ||
      loadingCompanySizes ||
      loadingRevenueBands ||
      loadingCompanies ||
      loadingLocations

    setFiltersInitialized(!anyLoading)
  }, [
    loadingOwners,
    loadingIndustries,
    loadingLegalForms,
    loadingCompanySizes,
    loadingRevenueBands,
    loadingCompanies,
    loadingLocations
  ])

  return {
    filterGroups,
    filterLabelMap,
    handleFilterChange,
    createdAfter,
    createdBefore,
    filtersInitialized
  }
}
