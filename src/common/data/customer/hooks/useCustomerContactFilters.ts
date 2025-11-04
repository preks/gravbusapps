// Customer Contact Filters hook
import { useEffect, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface FilterOption {
  id: string
  label: string
}

export interface UseCustomerContactFiltersReturn {
  owners: FilterOption[]
  contactTypes: FilterOption[]
  accounts: FilterOption[]
  genders: FilterOption[]
  academicTitles: FilterOption[]
  professionalTitles: FilterOption[]
  departments: FilterOption[]
  countries: FilterOption[]
  regions: FilterOption[]
  cities: FilterOption[]
  isLoading: boolean
}

export const useCustomerContactFilters = (context: BusinessAppContextProps): UseCustomerContactFiltersReturn => {
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(context.accessToken)
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const [owners, setOwners] = useState<FilterOption[]>([])
  const [contactTypes, setContactTypes] = useState<FilterOption[]>([])
  const [accounts, setAccounts] = useState<FilterOption[]>([])
  const [genders, setGenders] = useState<FilterOption[]>([])
  const [academicTitles, setAcademicTitles] = useState<FilterOption[]>([])
  const [professionalTitles, setProfessionalTitles] = useState<FilterOption[]>([])
  const [departments, setDepartments] = useState<FilterOption[]>([])
  const [countries, setCountries] = useState<FilterOption[]>([])
  const [regions, setRegions] = useState<FilterOption[]>([])
  const [cities, setCities] = useState<FilterOption[]>([])

  const loadFilters = useCallback(async () => {
    if (!context.accessToken) return

    setIsLoading(true)

    try {
      const [contactTypesResp, gendersResp, academicResp, professionalResp, countriesResp] = await Promise.all([
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ContactType', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Gender', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'AcademicTitle', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'ProfessionalTitle', version: 'v1' },
          { limit: 100, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        ),
        catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'Country', version: 'v1' },
          { limit: 300, offset: 0, returnTotalRecords: false, includeChildCatalogEntries: false }
        )
      ])

      // Load owners and accounts from GraphQL
      const ownerQuery = `
        query GetContactOwners {
          Contact(
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
      const accountQuery = `
        query GetAccounts {
          Account(
            where: { isDeleted: { _eq: false } }
            limit: 100
          ) {
            id
            name
          }
        }
      `
      const [ownersRes, accountsRes] = await Promise.all([
        graphqlClient.request<{
          Contact: Array<{
            ownerEmployee: { id: string; displayName?: string; firstName?: string; lastName?: string } | null
          }>
        }>(ownerQuery),
        graphqlClient.request<{
          Account: Array<{ id: string; name: string }>
        }>(accountQuery)
      ])

      setContactTypes((contactTypesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setGenders((gendersResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setAcademicTitles((academicResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setProfessionalTitles((professionalResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))
      setCountries((countriesResp?.data || []).map((e: any) => ({ id: e.id, label: e.value || e.code })))

      const ownerItems = (ownersRes.Contact || [])
        .filter(r => r.ownerEmployee)
        .map(r => {
          const emp = r.ownerEmployee!
          const name = emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Unknown'
          return { id: emp.id, label: name }
        })
      setOwners(ownerItems)

      const accountItems = (accountsRes.Account || []).map(a => ({ id: a.id, label: a.name }))
      setAccounts(accountItems)

      setDepartments([])
      setRegions([])
      setCities([])
    } catch (error) {
      console.error('Error loading contact filters:', error)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient, graphqlClient])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  return {
    owners,
    contactTypes,
    accounts,
    genders,
    academicTitles,
    professionalTitles,
    departments,
    countries,
    regions,
    cities,
    isLoading
  }
}
