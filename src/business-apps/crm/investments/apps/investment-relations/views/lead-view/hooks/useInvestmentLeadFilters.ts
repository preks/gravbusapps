import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Switch } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildFilterGroups } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_LEAD_DESCRIPTORS } from '@/common/data/investment/queries/investmentLeadQueries'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { DataFilterGroup, DataFilter } from '@/components/data-filter/DataFilter'
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter'

interface OwnerItem {
  id: string
  name: string
}
interface StatusItem {
  id: string
  code?: string
  value?: string
}
interface CatalogItem {
  id: string
  code?: string
  value?: string
}
interface CompanyItem {
  name: string
}
interface CountryItem {
  id: string
  code?: string
  value?: string
}

export const useInvestmentLeadFilters = (
  context: BusinessAppContextProps,
  selectedFilters: string[],
  setSelectedFilters: (filters: string[]) => void
) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [owners, setOwners] = useState<OwnerItem[]>([])
  const [statuses, setStatuses] = useState<StatusItem[]>([])
  const [ratings, setRatings] = useState<CatalogItem[]>([])
  const [sources, setSources] = useState<CatalogItem[]>([])
  const [loadingOwners, setLoadingOwners] = useState(false)
  const [loadingStatuses, setLoadingStatuses] = useState(false)
  const [loadingRatings, setLoadingRatings] = useState(false)
  const [loadingSources, setLoadingSources] = useState(false)
  const [loadingContacts, setLoadingContacts] = useState(false)
  const [loadingCompanies, setLoadingCompanies] = useState(false)
  const [loadingCountries, setLoadingCountries] = useState(false)
  const [loadingRegions, setLoadingRegions] = useState(false)
  const [loadingCities, setLoadingCities] = useState(false)
  const [errorOwners, setErrorOwners] = useState<Error | null>(null)
  const [errorStatuses, setErrorStatuses] = useState<Error | null>(null)
  const [errorRatings, setErrorRatings] = useState<Error | null>(null)
  const [errorSources, setErrorSources] = useState<Error | null>(null)
  const [errorContacts, setErrorContacts] = useState<Error | null>(null)
  const [errorCompanies, setErrorCompanies] = useState<Error | null>(null)
  const [errorCountries, setErrorCountries] = useState<Error | null>(null)
  const [errorRegions, setErrorRegions] = useState<Error | null>(null)
  const [errorCities, setErrorCities] = useState<Error | null>(null)

  // Date range filter state (creation date)
  const [createdAfter, setCreatedAfter] = useState<string | undefined>(undefined)
  const [createdBefore, setCreatedBefore] = useState<string | undefined>(undefined)

  // Distinct option states
  const [contacts, setContacts] = useState<Array<{ firstName: string; lastName: string }>>([])
  const [companies, setCompanies] = useState<CompanyItem[]>([])
  const [countries, setCountries] = useState<CountryItem[]>([])
  const [regions, setRegions] = useState<string[]>([])
  const [cities, setCities] = useState<string[]>([])

  const loadOwners = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingOwners(true)
      setErrorOwners(null)
      try {
        const queries = buildFilterGroups({
          entityName: 'InvestmentLead',
          descriptors: INVESTMENT_LEAD_DESCRIPTORS,
          searchByKey: { ownerEmployeeIds: search },
          limit: 50
        })
        const query = queries['ownerEmployeeIds']
        const res = await graphqlClient.request<{
          InvestmentLead: Array<{
            ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
          }>
        }>(query)
        const items: OwnerItem[] = (res.InvestmentLead || [])
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

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const loadStatuses = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingStatuses(true)
      setErrorStatuses(null)
      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'InvestmentLeadStatus', version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            ...(search.trim() ? { searchCriteria: search.trim() } : {})
          }
        )
        const items: StatusItem[] = (resp?.data || []).map((e: any) => ({ id: e.id, code: e.code, value: e.value }))
        setStatuses(items)
      } catch (e) {
        setStatuses([])
        setErrorStatuses(e as Error)
      } finally {
        setLoadingStatuses(false)
      }
    },
    [context.accessToken, catalogClient]
  )

  const loadCatalog = useCallback(
    async (
      cfg: { catalogIdentifier: string },
      opts: { search?: string },
      setItems: (arr: CatalogItem[]) => void,
      setLoading: (v: boolean) => void,
      setError: (e: Error | null) => void
    ) => {
      if (!context.accessToken) return
      setLoading(true)
      setError(null)
      try {
        const resp = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: cfg.catalogIdentifier, version: 'v1' },
          {
            limit: 100,
            offset: 0,
            returnTotalRecords: false,
            includeChildCatalogEntries: false,
            ...(opts.search?.trim() ? { searchCriteria: opts.search.trim() } : {})
          }
        )
        const items: CatalogItem[] = (resp?.data || []).map((e: any) => ({ id: e.id, code: e.code, value: e.value }))
        setItems(items)
      } catch (e) {
        setItems([])
        setError(e as Error)
      } finally {
        setLoading(false)
      }
    },
    [catalogClient, context.accessToken]
  )

  // Contacts (distinct names)
  const loadContacts = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingContacts(true)
      setErrorContacts(null)
      try {
        const queries = buildFilterGroups({
          entityName: 'InvestmentLead',
          descriptors: INVESTMENT_LEAD_DESCRIPTORS,
          searchByKey: { contactFullNames: search },
          limit: 100
        })
        const query = queries['contactFullNames']
        const res = await graphqlClient.request<{ InvestmentLead: Array<{ firstName?: string; lastName?: string }> }>(
          query
        )
        const uniq = new Map<string, { firstName: string; lastName: string }>()
        ;(res.InvestmentLead || []).forEach(l => {
          const f = (l.firstName || '').trim()
          const s = (l.lastName || '').trim()
          const key = `${f}|${s}`
          if (!uniq.has(key)) uniq.set(key, { firstName: f, lastName: s })
        })
        setContacts(Array.from(uniq.values()).slice(0, 100))
      } catch (e) {
        setContacts([])
        setErrorContacts(e as Error)
      } finally {
        setLoadingContacts(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Companies
  const loadCompanies = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingCompanies(true)
      setErrorCompanies(null)
      try {
        const queries = buildFilterGroups({
          entityName: 'InvestmentLead',
          descriptors: INVESTMENT_LEAD_DESCRIPTORS,
          searchByKey: { companyNames: search },
          limit: 100
        })
        const query = queries['companyNames']
        const names = new Set<string>()
        const res = await graphqlClient.request<{ InvestmentLead: Array<{ companyName?: string }> }>(query)
        ;(res.InvestmentLead || []).forEach(r => {
          if (r.companyName) names.add(r.companyName)
        })
        setCompanies(
          Array.from(names)
            .slice(0, 100)
            .map(n => ({ name: n }))
        )
      } catch (e) {
        setCompanies([])
        setErrorCompanies(e as Error)
      } finally {
        setLoadingCompanies(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Countries catalog via distinct leads (country catalog entry)
  const loadCountries = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingCountries(true)
      setErrorCountries(null)
      try {
        const queries = buildFilterGroups({
          entityName: 'InvestmentLead',
          descriptors: INVESTMENT_LEAD_DESCRIPTORS,
          searchByKey: { countryIds: search },
          limit: 100
        })
        const query = queries['countryIds']
        const map = new Map<string, CountryItem>()
        const res = await graphqlClient.request<{ InvestmentLead: Array<{ country?: CountryItem }> }>(query)
        ;(res.InvestmentLead || []).forEach(r => {
          if (r.country?.id) map.set(r.country.id, r.country)
        })
        setCountries(Array.from(map.values()))
      } catch (e) {
        setCountries([])
        setErrorCountries(e as Error)
      } finally {
        setLoadingCountries(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Regions (strings from CatalogEntry.value)
  const loadRegions = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingRegions(true)
      setErrorRegions(null)
      try {
        const queries = buildFilterGroups({
          entityName: 'InvestmentLead',
          descriptors: INVESTMENT_LEAD_DESCRIPTORS,
          searchByKey: { regions: search },
          limit: 100
        })
        const query = queries['regions']
        const values = new Set<string>()
        const res = await graphqlClient.request<{
          InvestmentLead: Array<{ region?: { id?: string; code?: string; value?: string } | null }>
        }>(query)
        ;(res.InvestmentLead || []).forEach(r => {
          const val = (r.region?.value || r.region?.code || '').trim()
          if (val) values.add(val)
        })
        setRegions(Array.from(values))
      } catch (e) {
        setRegions([])
        setErrorRegions(e as Error)
      } finally {
        setLoadingRegions(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  // Cities (locality)
  const loadCities = useCallback(
    async (search: string = '') => {
      if (!context.accessToken) return
      setLoadingCities(true)
      setErrorCities(null)
      try {
        const queries = buildFilterGroups({
          entityName: 'InvestmentLead',
          descriptors: INVESTMENT_LEAD_DESCRIPTORS,
          searchByKey: { localities: search },
          limit: 100
        })
        const query = queries['localities']
        const set = new Set<string>()
        const res = await graphqlClient.request<{ InvestmentLead: Array<{ locality?: string }> }>(query)
        ;(res.InvestmentLead || []).forEach(r => {
          if (r.locality?.trim()) set.add(r.locality.trim())
        })
        setCities(Array.from(set))
      } catch (e) {
        setCities([])
        setErrorCities(e as Error)
      } finally {
        setLoadingCities(false)
      }
    },
    [context.accessToken, graphqlClient]
  )

  useEffect(() => {
    loadOwners('')
    loadStatuses('')
    void loadCatalog(
      { catalogIdentifier: 'InvestmentLeadRating' },
      { search: '' },
      setRatings,
      v => setLoadingRatings(v),
      setErrorRatings
    )
    void loadCatalog(
      { catalogIdentifier: 'InvestmentLeadSource' },
      { search: '' },
      setSources,
      v => setLoadingSources(v),
      setErrorSources
    )
    loadContacts('')
    loadCompanies('')
    loadCountries('')
    loadRegions('')
    loadCities('')
  }, [loadOwners, loadStatuses])

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {}
    owners.forEach(o => {
      map[`owner:${o.id}`] = o.name
    })
    statuses.forEach(s => {
      map[`status:${s.id}`] = s.code || s.value || 'Status'
    })
    ratings.forEach(r => {
      map[`rating:${r.id}`] = r.code || r.value || 'Rating'
    })
    sources.forEach(s => {
      map[`source:${s.id}`] = s.code || s.value || 'Source'
    })
    contacts.forEach(c => {
      map[`contact:${c.firstName}|${c.lastName}`] = `${c.firstName} ${c.lastName}`.trim() || 'Unknown'
    })
    companies.forEach(c => {
      map[`company:${c.name}`] = c.name
    })
    countries.forEach(c => {
      map[`country:${c.id}`] = c.code || c.value || 'Country'
    })
    regions.forEach(r => {
      map[`region:${r}`] = r
    })
    cities.forEach(c => {
      map[`city:${c}`] = c
    })
    // High Priority toggle label (on state only)
    map['sensitive:true'] = 'Sensitive'
    return map
  }, [owners, statuses, ratings, sources, contacts, companies, countries, regions, cities])

  const toFilters = useCallback(
    (items: Array<{ id: string; label: string }>): DataFilter[] => {
      return items.map(i => ({ id: i.id, label: i.label, selected: selectedFilters.includes(i.id) }))
    },
    [selectedFilters]
  )

  const lastOwnerSearchRef = useRef<string>('')
  const lastStatusSearchRef = useRef<string>('')
  const lastRatingSearchRef = useRef<string>('')
  const lastSourceSearchRef = useRef<string>('')
  const lastContactSearchRef = useRef<string>('')
  const lastCompanySearchRef = useRef<string>('')
  const lastCountrySearchRef = useRef<string>('')
  const lastRegionSearchRef = useRef<string>('')
  const lastCitySearchRef = useRef<string>('')

  const filterGroups: DataFilterGroup[] = useMemo(() => {
    const ownerFilters = owners.map(o => ({ id: `owner:${o.id}`, label: o.name }))
    const statusFilters = statuses.map(s => ({ id: `status:${s.id}`, label: s.code || s.value || 'Status' }))
    const ratingFilters = ratings.map(r => ({ id: `rating:${r.id}`, label: r.code || r.value || 'Rating' }))
    const sourceFilters = sources.map(s => ({ id: `source:${s.id}`, label: s.code || s.value || 'Source' }))
    const contactFilters = contacts.map(c => ({
      id: `contact:${c.firstName}|${c.lastName}`,
      label: `${c.firstName} ${c.lastName}`.trim() || 'Unknown'
    }))
    const companyFilters = companies.map(c => ({ id: `company:${c.name}`, label: c.name }))
    const countryFilters = countries.map(c => ({ id: `country:${c.id}`, label: c.code || c.value || 'Country' }))
    const regionFilters = regions.map(r => ({ id: `region:${r}`, label: r }))
    const cityFilters = cities.map(c => ({ id: `city:${c}`, label: c }))

    const isSensitive = selectedFilters.includes('sensitive:true')

    return [
      {
        id: 'sensitive',
        title: 'Sensitive',
        // Use custom component with design-system Switch to act as a toggle
        customComponent: React.createElement(
          'div',
          { className: 'gba:flex gba:items-center gba:gap-3 gba:px-2' },
          React.createElement(Switch as any, {
            checked: isSensitive,
            onCheckedChange: (checked: boolean) => {
              setSelectedFilters(
                checked ? [...selectedFilters, 'sensitive:true'] : selectedFilters.filter(f => f !== 'sensitive:true')
              )
            },
            'data-testid': 'investment-leads-high-priority-switch'
          }),
          React.createElement('span', { className: 'gba:text-sm' }, 'Sensitive')
        ),
        hideSearch: true
      } as any,
      {
        id: 'leadContacts',
        title: 'Lead Contact',
        filters: toFilters(contactFilters),
        backendSearch: (search: string) => {
          if (search !== lastContactSearchRef.current) {
            lastContactSearchRef.current = search
            void loadContacts(search)
          }
          const filtered = contactFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingContacts, error: errorContacts }
        }
      },
      {
        id: 'leadCompanies',
        title: 'Lead Company',
        filters: toFilters(companyFilters),
        backendSearch: (search: string) => {
          if (search !== lastCompanySearchRef.current) {
            lastCompanySearchRef.current = search
            void loadCompanies(search)
          }
          const filtered = companyFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingCompanies, error: errorCompanies }
        }
      },
      {
        id: 'countries',
        title: 'Country',
        filters: toFilters(countryFilters),
        backendSearch: (search: string) => {
          if (search !== lastCountrySearchRef.current) {
            lastCountrySearchRef.current = search
            void loadCountries(search)
          }
          const filtered = countryFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingCountries, error: errorCountries }
        }
      },
      {
        id: 'regions',
        title: 'Region/State',
        filters: toFilters(regionFilters),
        backendSearch: (search: string) => {
          if (search !== lastRegionSearchRef.current) {
            lastRegionSearchRef.current = search
            void loadRegions(search)
          }
          const filtered = regionFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingRegions, error: errorRegions }
        }
      },
      {
        id: 'cities',
        title: 'City',
        filters: toFilters(cityFilters),
        backendSearch: (search: string) => {
          if (search !== lastCitySearchRef.current) {
            lastCitySearchRef.current = search
            void loadCities(search)
          }
          const filtered = cityFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingCities, error: errorCities }
        }
      },
      {
        id: 'dateRange',
        title: 'Creation Date',
        customComponent: React.createElement(DateRangeFilter as any, {
          createdAfter,
          createdBefore,
          onDateRangeChange: (after?: string, before?: string) => {
            setCreatedAfter(after)
            setCreatedBefore(before)
          },
          className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
        }),
        hideSearch: true
      },
      {
        id: 'owners',
        title: 'Owner',
        filters: toFilters(ownerFilters),
        backendSearch: (search: string) => {
          // Trigger async refresh only when search actually changes
          if (search !== lastOwnerSearchRef.current) {
            lastOwnerSearchRef.current = search
            // Fire and forget; result stored in state
            void loadOwners(search)
          }
          const filtered = ownerFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingOwners, error: errorOwners }
        }
      },
      {
        id: 'leadStatuses',
        title: 'Status',
        filters: toFilters(statusFilters),
        backendSearch: (search: string) => {
          if (search !== lastStatusSearchRef.current) {
            lastStatusSearchRef.current = search
            void loadStatuses(search)
          }
          const filtered = statusFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingStatuses, error: errorStatuses }
        }
      },
      {
        id: 'leadRatings',
        title: 'Rating',
        filters: toFilters(ratingFilters),
        backendSearch: (search: string) => {
          if (search !== lastRatingSearchRef.current) {
            lastRatingSearchRef.current = search
            void loadCatalog(
              { catalogIdentifier: 'InvestmentLeadRating' },
              { search },
              setRatings,
              v => setLoadingRatings(v),
              setErrorRatings
            )
          }
          const filtered = ratingFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingRatings, error: errorRatings }
        }
      },
      {
        id: 'leadSources',
        title: 'Source',
        filters: toFilters(sourceFilters),
        backendSearch: (search: string) => {
          if (search !== lastSourceSearchRef.current) {
            lastSourceSearchRef.current = search
            void loadCatalog(
              { catalogIdentifier: 'InvestmentLeadSource' },
              { search },
              setSources,
              v => setLoadingSources(v),
              setErrorSources
            )
          }
          const filtered = sourceFilters.filter(f => f.label.toLowerCase().includes((search || '').toLowerCase()))
          return { filters: toFilters(filtered), loading: loadingSources, error: errorSources }
        }
      }
    ]
  }, [
    owners,
    statuses,
    ratings,
    sources,
    contacts,
    companies,
    countries,
    regions,
    cities,
    toFilters,
    loadOwners,
    loadStatuses,
    loadCatalog,
    loadContacts,
    loadCompanies,
    loadCountries,
    loadRegions,
    loadCities,
    loadingOwners,
    loadingStatuses,
    loadingRatings,
    loadingSources,
    loadingContacts,
    loadingCompanies,
    loadingCountries,
    loadingRegions,
    loadingCities,
    errorOwners,
    errorStatuses,
    errorRatings,
    errorSources,
    errorContacts,
    errorCompanies,
    errorCountries,
    errorRegions,
    errorCities,
    createdAfter,
    createdBefore
  ])

  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      setSelectedFilters(selected ? [...selectedFilters, filterId] : selectedFilters.filter(f => f !== filterId))
    },
    [selectedFilters, setSelectedFilters]
  )

  return { filterGroups, filterLabelMap, handleFilterChange, createdAfter, createdBefore }
}
