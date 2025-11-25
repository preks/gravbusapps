import { useState, useEffect, useCallback } from 'react'
import { SelectOption } from '../types'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

interface LeadCatalogsHookParams {
  accessToken: string
}

// Catalog constants
export const LEAD_SOURCE_CATALOG = 'SalesLeadSource'
export const LEAD_STATUS_CATALOG = 'SalesLeadStatus'
export const LEAD_RATING_CATALOG = 'SalesLeadRating'
export const LEGAL_FORM_CATALOG = 'LegalForm'
export const INDUSTRY_CATALOG = 'IndustryClass'
export const COUNTRY_CATALOG = 'Country'
export const EMPLOYEE_SIZE_CATALOG = 'EmployeeSize'
export const REVENUE_SIZE_CATALOG = 'RevenueSize'
export const TIMEZONE_CATALOG = 'TimeZone'
export const ACADEMIC_TITLE_CATALOG = 'AcademicTitle'
export const CATALOG_VERSION = 'v1'

export const useLeadCatalogs = ({ accessToken }: LeadCatalogsHookParams) => {
  const [leadSources, setLeadSources] = useState<SelectOption[]>([])
  const [leadStatuses, setLeadStatuses] = useState<SelectOption[]>([])
  const [leadRatings, setLeadRatings] = useState<SelectOption[]>([])
  const [legalForms, setLegalForms] = useState<SelectOption[]>([])
  const [industries, setIndustries] = useState<SelectOption[]>([])
  const [countries, setCountries] = useState<SelectOption[]>([])
  const [employeeSizes, setEmployeeSizes] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchLeadSources = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: LEAD_SOURCE_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedSources: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setLeadSources(mappedSources)
      return mappedSources
    } catch (err) {
      console.error('Error fetching lead sources:', err)
      throw err
    }
  }, [catalogClient])

  const fetchLeadStatuses = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: LEAD_STATUS_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedStatuses: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setLeadStatuses(mappedStatuses)
      return mappedStatuses
    } catch (err) {
      console.error('Error fetching lead statuses:', err)
      throw err
    }
  }, [catalogClient])

  const fetchLeadRatings = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: LEAD_RATING_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedRatings: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setLeadRatings(mappedRatings)
      return mappedRatings
    } catch (err) {
      console.error('Error fetching lead ratings:', err)
      throw err
    }
  }, [catalogClient])

  const fetchLegalForms = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: LEGAL_FORM_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedForms: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setLegalForms(mappedForms)
      return mappedForms
    } catch (err) {
      console.error('Error fetching legal forms:', err)
      throw err
    }
  }, [catalogClient])

  const fetchIndustries = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: INDUSTRY_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedIndustries: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setIndustries(mappedIndustries)
      return mappedIndustries
    } catch (err) {
      console.error('Error fetching industries:', err)
      throw err
    }
  }, [catalogClient])

  const fetchCountries = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: COUNTRY_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedCountries: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setCountries(mappedCountries)
      return mappedCountries
    } catch (err) {
      console.error('Error fetching countries:', err)
      throw err
    }
  }, [catalogClient])

  const fetchEmployeeSizes = useCallback(async (): Promise<SelectOption[]> => {
    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: EMPLOYEE_SIZE_CATALOG,
          version: CATALOG_VERSION
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      )

      const mappedSizes: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }))

      setEmployeeSizes(mappedSizes)
      return mappedSizes
    } catch (err) {
      console.error('Error fetching employee sizes:', err)
      throw err
    }
  }, [catalogClient])

  const loadCatalogs = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      await Promise.all([
        fetchLeadSources(),
        fetchLeadStatuses(),
        fetchLeadRatings(),
        fetchLegalForms(),
        fetchIndustries(),
        fetchCountries(),
        fetchEmployeeSizes()
      ])
    } catch (err) {
      console.error('Error loading lead catalogs:', err)
      setError(err instanceof Error ? err.message : 'Failed to load lead catalogs')
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    fetchLeadSources,
    fetchLeadStatuses,
    fetchLeadRatings,
    fetchLegalForms,
    fetchIndustries,
    fetchCountries,
    fetchEmployeeSizes
  ])

  useEffect(() => {
    loadCatalogs()
  }, [loadCatalogs])

  return {
    leadSources,
    leadStatuses,
    leadRatings,
    legalForms,
    industries,
    countries,
    employeeSizes,
    loading,
    error,
    refetch: loadCatalogs,
    fetchLeadSources,
    fetchLeadStatuses,
    fetchLeadRatings,
    fetchLegalForms,
    fetchIndustries,
    fetchCountries,
    fetchEmployeeSizes
  }
}
