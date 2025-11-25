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
  picture?: string
  position?: string
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
      picture
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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch employee data
      if (employeeId) {
        try {
          const employeeResult = await graphqlClient.request<{ employee: EmployeeData }>(GET_EMPLOYEE_DATA, {
            employeeId
          })

          if (employeeResult.employee) {
            // Transform employee data to match expected format
            const employee = employeeResult.employee
            setEmployeeData({
              id: employee.id,
              firstName: employee.firstName,
              lastName: employee.lastName,
              displayName: employee.displayName || `${employee.firstName} ${employee.lastName}`,
              picture: employee.picture,
              position: (employee as any).employeePosition?.jobPosition?.name
            })
          }
        } catch (err) {
          console.error('Error fetching employee:', err)
          // Don't fail completely if employee fetch fails
        }
      }

      // Collect catalog IDs to fetch
      const catalogIds = Array.from(
        new Set(
          [
            newPersonalInformation?.salutationRef,
            oldPersonalInformation?.salutationRef,
            newPersonalInformation?.genderRef,
            oldPersonalInformation?.genderRef,
            newPersonalInformation?.nationalityRef,
            oldPersonalInformation?.nationalityRef,
            newPersonalInformation?.languageRef,
            oldPersonalInformation?.languageRef,
            newPersonalInformation?.maritalStatusRef,
            oldPersonalInformation?.maritalStatusRef,
            newPersonalInformation?.schoolQualificationRef,
            oldPersonalInformation?.schoolQualificationRef
          ]
            .filter(Boolean)
            .map(String)
        )
      )

      // Fetch catalog data if needed
      if (catalogIds.length) {
        try {
          const result = await graphqlClient.request<any>(GET_PERSONAL_DATA_CATALOGS, {
            ids: catalogIds,
            activeUserLocale: getCurrentActiveUserLocale()
          })

          // Build catalog map
          const catalog: Record<string, CatalogEntry> = {}
          for (const entry of result?.entries || []) {
            catalog[String(entry.id)] = entry
          }
          setCatalogMap(catalog)
        } catch (err) {
          console.error('Error fetching catalog data:', err)
          // Don't fail completely if catalog fetch fails
        }
      }
    } catch (err) {
      console.error('Error in usePersonalDataReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load personal data review data')
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient, newPersonalInformation, oldPersonalInformation])

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
