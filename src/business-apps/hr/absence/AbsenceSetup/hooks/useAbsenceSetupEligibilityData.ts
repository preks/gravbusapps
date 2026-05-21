import { useEffect, useState, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface EligibilityOption {
  id: string
  label: string
  /** Set when the catalog entry has a parent (e.g. ContractType scoped to a Country). */
  parentEntryId?: string
}

const ELIGIBILITY_CATALOGS_QUERY = `
  query GetEligibilityCatalogsForAbsenceSetup {
    employmentTypes: CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentType" } }, isDeleted: { _eq: false } }
      orderBy: { value: ASC }
      limit: 200
    ) {
      id
      value
      parentEntryId
    }
    contractTypes: CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "ContractType" } }, isDeleted: { _eq: false } }
      orderBy: { value: ASC }
      limit: 200
    ) {
      id
      value
      parentEntryId
    }
    countries: CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "Country" } }, isDeleted: { _eq: false } }
      orderBy: { value: ASC }
      limit: 300
    ) {
      id
      value
      parentEntryId
    }
    allRegions: CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegion" } }, isDeleted: { _eq: false } }
      orderBy: { value: ASC }
      limit: 500
    ) {
      id
      value
      parentEntryId
      additionalValue3
    }
  }
`

export const useAbsenceSetupEligibilityData = (accessToken: string) => {
  const [employmentTypes, setEmploymentTypes] = useState<EligibilityOption[]>([])
  const [contractTypes, setContractTypes] = useState<EligibilityOption[]>([])
  const [countries, setCountries] = useState<EligibilityOption[]>([])
  const [allRegions, setAllRegions] = useState<EligibilityOption[]>([])
  const [loading, setLoading] = useState(false)

  const graphqlClient = useGraphqlClient(accessToken)
  const [regionsLoading, setRegionsLoading] = useState<Record<string, boolean>>({})

  const fetchAll = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    try {
      const data = await graphqlClient.request(ELIGIBILITY_CATALOGS_QUERY)

      setEmploymentTypes(
        (data?.employmentTypes || []).map((e: any) => ({
          id: e.id,
          label: e.value || e.id,
          parentEntryId: e.parentEntryId ?? undefined
        }))
      )
      setContractTypes(
        (data?.contractTypes || []).map((e: any) => ({
          id: e.id,
          label: e.value || e.id,
          parentEntryId: e.parentEntryId ?? undefined
        }))
      )
      setCountries(
        (data?.countries || []).map((e: any) => ({
          id: e.id,
          label: e.value || e.id,
          parentEntryId: e.parentEntryId ?? undefined
        }))
      )

      const rawRegions: any[] = data?.allRegions || []

      console.log('[eligibility] raw region sample:', JSON.stringify(rawRegions.slice(0, 3)))
      // Use additionalValue3 as the country link (same as UpdateWorkingConditions);
      // fall back to parentEntryId if additionalValue3 is absent.
      setAllRegions(
        rawRegions.map(e => ({
          id: e.id,
          label: e.value || e.id,
          parentEntryId: e.additionalValue3 || e.parentEntryId || undefined
        }))
      )
    } catch (err) {
      console.error('Error fetching absence eligibility catalog data:', err)
    } finally {
      setLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  /**
   * Derives regions for a country from the already-fetched allRegions list.
   * The loading state is a brief visual cue only (data is already available).
   */
  const fetchRegionsForCountry = useCallback((countryId: string) => {
    setRegionsLoading(prev => ({ ...prev, [countryId]: true }))
    setTimeout(() => {
      setRegionsLoading(prev => ({ ...prev, [countryId]: false }))
    }, 0)
  }, [])

  // Build regionsByCountry derived map from allRegions.
  const regionsByCountry: Record<string, EligibilityOption[]> = {}
  for (const region of allRegions) {
    const parentId = region.parentEntryId
    if (parentId) {
      if (!regionsByCountry[parentId]) regionsByCountry[parentId] = []
      regionsByCountry[parentId].push(region)
    }
  }

  console.log('[eligibility] regionsByCountry keys:', Object.keys(regionsByCountry))

  return {
    employmentTypes,
    contractTypes,
    countries,
    regionsByCountry,
    loading,
    regionsLoading,
    fetchRegionsForCountry
  }
}
