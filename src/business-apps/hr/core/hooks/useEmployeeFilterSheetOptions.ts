import { useEffect, useMemo, useState } from 'react'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useActiveStructureCompanies } from '@/business-apps/hr/compensation/hooks/useActiveStructureCompanies'

export interface FilterOption {
  id: string
  label: string
}

interface UseEmployeeFilterSheetOptionsResult {
  companies: FilterOption[]
  organizationalUnits: FilterOption[]
  employmentTypes: FilterOption[]
  contractTypes: FilterOption[]
  matrixTeams: FilterOption[]
  loading: boolean
  error: string | null
}

const ORG_UNITS_QUERY = `
  query EmployeeFilterOrgUnits($structureId: uuid!, $limit: Int!) {
    OrganizationalUnit(
      where: {
        structureId: { _eq: $structureId }
        isDeleted: { _eq: false }
      }
      orderBy: { name: ASC }
      limit: $limit
    ) {
      id
      name
    }
  }
`

const MATRIX_TEAMS_QUERY = `
  query EmployeeFilterMatrixTeams($structureId: uuid!, $limit: Int!) {
    EmployeeMatrixUnit(
      where: { structureId: { _eq: $structureId } }
      distinctOn: [matrixUnitId]
      limit: $limit
    ) {
      matrixUnitId
      matrixUnit {
        id
        name
        isDeleted
      }
    }
  }
`

function normalizeOptions(options: FilterOption[]): FilterOption[] {
  const seen = new Set<string>()
  const result: FilterOption[] = []
  for (const opt of options) {
    const id = String(opt.id ?? '').trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    result.push({ id, label: String(opt.label ?? '').trim() || id })
  }
  return result
}

/**
 * Static option lists for the Employee Management filter sheet.
 * These are intended for the analytics-style filter sheet (local search, no backend paging).
 */
export function useEmployeeFilterSheetOptions(accessToken: string): UseEmployeeFilterSheetOptionsResult {
  const userLocale = useUserLocale() ?? 'en-US'
  const graphqlClient = useGraphqlClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)
  const structureId = getCurrentActiveStructureId()
  const { companies, loading: companiesLoading, error: companiesError } = useActiveStructureCompanies(accessToken)

  const [organizationalUnits, setOrganizationalUnits] = useState<FilterOption[]>([])
  const [employmentTypes, setEmploymentTypes] = useState<FilterOption[]>([])
  const [contractTypes, setContractTypes] = useState<FilterOption[]>([])
  const [matrixTeams, setMatrixTeams] = useState<FilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) return
    if (!structureId) return

    let cancelled = false
    setLoading(true)
    setError(null)
    ;(async () => {
      try {
        const [ouRes, teamsRes] = await Promise.all([
          graphqlClient.request<{ OrganizationalUnit: Array<{ id: string; name: string }> }>(ORG_UNITS_QUERY, {
            structureId,
            limit: 500
          }),
          graphqlClient.request<{
            EmployeeMatrixUnit: Array<{
              matrixUnitId: string
              matrixUnit: { id: string; name: string; isDeleted?: boolean | null } | null
            }>
          }>(MATRIX_TEAMS_QUERY, { structureId, limit: 500 })
        ])

        const ouOptions: FilterOption[] = (ouRes?.OrganizationalUnit ?? []).map(ou => ({
          id: ou.id,
          label: ou.name
        }))

        const teamOptions: FilterOption[] = (teamsRes?.EmployeeMatrixUnit ?? [])
          .map(row => row?.matrixUnit)
          .filter((u): u is { id: string; name: string; isDeleted?: boolean | null } => Boolean(u?.id))
          .filter(u => u.isDeleted !== true)
          .map(u => ({ id: u.id, label: u.name }))

        const [employmentRes, contractRes] = await Promise.all([
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'EmploymentType', version: 'v1' },
            { limit: 200, offset: 0, returnTotalRecords: true, localeCode: userLocale }
          ),
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'ContractType', version: 'v1' },
            { limit: 200, offset: 0, returnTotalRecords: true, localeCode: userLocale }
          )
        ])

        const extractEntries = (response: any): any[] => {
          if (Array.isArray(response?.data?.data)) return response.data.data
          if (Array.isArray(response?.data)) return response.data
          if (Array.isArray(response)) return response
          return []
        }

        const employmentOptions: FilterOption[] = extractEntries(employmentRes)
          .filter((entry: any) => entry && (entry.id || entry._id))
          .map((entry: any) => ({
            id: String(entry.id || entry._id || ''),
            label: String(entry.value || entry.name || entry.label || entry.id || '')
          }))

        const contractOptions: FilterOption[] = extractEntries(contractRes)
          .filter((entry: any) => entry && (entry.id || entry._id))
          .map((entry: any) => ({
            id: String(entry.id || entry._id || ''),
            label: String(entry.value || entry.name || entry.label || entry.id || '')
          }))

        if (cancelled) return

        setOrganizationalUnits(normalizeOptions(ouOptions))
        setMatrixTeams(normalizeOptions(teamOptions))
        setEmploymentTypes(normalizeOptions(employmentOptions))
        setContractTypes(normalizeOptions(contractOptions))
        setError(null)
      } catch (err) {
        if (cancelled) return
        setOrganizationalUnits([])
        setMatrixTeams([])
        setEmploymentTypes([])
        setContractTypes([])
        setError(err instanceof Error ? err.message : 'Failed to load filter options')
      } finally {
        if (cancelled) return
        setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, catalogClient, graphqlClient, structureId, userLocale])

  const companyOptions = useMemo(
    () =>
      normalizeOptions(
        (companies ?? []).map(c => ({
          id: c.id,
          label: c.name
        }))
      ),
    [companies]
  )

  const combinedLoading = loading || companiesLoading
  const combinedError = error ?? companiesError

  return {
    companies: companyOptions,
    organizationalUnits,
    employmentTypes,
    contractTypes,
    matrixTeams,
    loading: combinedLoading,
    error: combinedError
  }
}
