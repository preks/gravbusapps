import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface PersonalInformationData {
  salutationRef?: string | null
  genderRef?: string | null
  nationalityRef?: string | null
  languageRef?: string | null
  maritalStatusRef?: string | null
  schoolQualificationRef?: string | null
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  displayName?: string
  pictureThumbnail?: string
  position?: string
}

/**
 * Raw employee data from GraphQL query with nested position structure
 */
interface EmployeeQueryResult {
  id: string
  firstName: string
  lastName: string
  displayName?: string
  pictureThumbnail?: string
  employeePosition?: {
    jobPosition?: {
      name?: string
    }
  }
}

interface CatalogEntry {
  id: string
  value: string
  code?: string
  translations?: Array<{ value: string }>
}

interface UsePersonalDataReviewDataProps {
  accessToken: string
  employeeId?: string
  newPersonalInformation: PersonalInformationData
  oldPersonalInformation: PersonalInformationData
}

interface UsePersonalDataReviewDataResult {
  employeeData: EmployeeData | null
  catalogMap: Record<string, CatalogEntry>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const GET_EMPLOYEE_DATA = `
  query GetEmployeeById($employeeId: uuid!) {
    employee: EmployeeByPk(id: $employeeId) {
      id
      firstName
      lastName
      displayName
      pictureThumbnail
      employeePosition {
        jobPosition {
          name
        }
      }
    }
  }
`

const GET_PERSONAL_DATA_CATALOGS = `
  query GetPersonalDataCatalogs(
    $ids: [String!],
    $activeUserLocale: String!
  ) {
    entries: CatalogEntry(where: {id: {_in: $ids}}) {
      id
      value
      code
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { identifier version defaultLocale }
    }
  }
`

// Helper: Transform raw employee query result to expected format
const transformEmployeeData = (employee: EmployeeQueryResult): EmployeeData => ({
  id: employee.id,
  firstName: employee.firstName,
  lastName: employee.lastName,
  displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
  pictureThumbnail: employee.pictureThumbnail,
  position: employee.employeePosition?.jobPosition?.name
})

// Helper: Collect catalog IDs from personal information
const collectCatalogIds = (newInfo: PersonalInformationData, oldInfo: PersonalInformationData): string[] => {
  return Array.from(
    new Set(
      [
        newInfo?.salutationRef,
        oldInfo?.salutationRef,
        newInfo?.genderRef,
        oldInfo?.genderRef,
        newInfo?.nationalityRef,
        oldInfo?.nationalityRef,
        newInfo?.languageRef,
        oldInfo?.languageRef,
        newInfo?.maritalStatusRef,
        oldInfo?.maritalStatusRef,
        newInfo?.schoolQualificationRef,
        oldInfo?.schoolQualificationRef
      ]
        .filter(Boolean)
        .map(String)
    )
  )
}

// Helper: Build catalog map from entries
const buildCatalogMap = (entries: CatalogEntry[] | undefined): Record<string, CatalogEntry> => {
  const catalog: Record<string, CatalogEntry> = {}
  for (const entry of entries || []) {
    catalog[String(entry.id)] = entry
  }
  return catalog
}

export const usePersonalDataReviewData = ({
  accessToken,
  employeeId,
  newPersonalInformation,
  oldPersonalInformation
}: UsePersonalDataReviewDataProps): UsePersonalDataReviewDataResult => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [catalogMap, setCatalogMap] = useState<Record<string, CatalogEntry>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId) return
    try {
      const result = await graphqlClient.request<{ employee: EmployeeQueryResult }>(GET_EMPLOYEE_DATA, { employeeId })
      if (result.employee) {
        setEmployeeData(transformEmployeeData(result.employee))
      }
    } catch (err) {
      console.error('Error fetching employee:', err)
    }
  }, [employeeId, graphqlClient])

  const fetchCatalogData = useCallback(async () => {
    const catalogIds = collectCatalogIds(newPersonalInformation, oldPersonalInformation)
    if (catalogIds.length === 0) return
    try {
      const result = await graphqlClient.request<{ entries: CatalogEntry[] }>(GET_PERSONAL_DATA_CATALOGS, {
        ids: catalogIds,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      setCatalogMap(buildCatalogMap(result?.entries))
    } catch (err) {
      console.error('Error fetching catalog data:', err)
    }
  }, [graphqlClient, newPersonalInformation, oldPersonalInformation])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchEmployeeData(), fetchCatalogData()])
    } catch (err) {
      console.error('Error in usePersonalDataReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load personal data review data')
    } finally {
      setLoading(false)
    }
  }, [fetchEmployeeData, fetchCatalogData])

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, fetchData])

  return {
    employeeData,
    catalogMap,
    loading,
    error,
    refetch: fetchData
  }
}
