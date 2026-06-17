import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface EmployeeRelationshipData {
  firstName?: string | null
  lastName?: string | null
  phoneNumber?: string | null
  email?: string | null
  notes?: string | null
  typeRef?: string | null
  emergencyContact?: boolean | null
  relationshipDocument?: string | null
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
  displayName: string
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

interface UseRelationshipReviewDataProps {
  accessToken: string
  employeeId?: string
  newRelationship: EmployeeRelationshipData
  oldRelationship: EmployeeRelationshipData
}

interface UseRelationshipReviewDataResult {
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

const GET_CATALOG_ENTRIES = `
  query GetCatalogEntries($ids: [String!], $activeUserLocale: String!) {
    entries: CatalogEntry(where: {id: {_in: $ids}, isDeleted: {_eq: false}}) {
      id
      value
      code
      alternativeCode
      additionalValue1
      additionalValue2
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog { identifier version defaultLocale }
    }
  }
`

export const useRelationshipReviewData = ({
  accessToken,
  employeeId,
  newRelationship,
  oldRelationship
}: UseRelationshipReviewDataProps): UseRelationshipReviewDataResult => {
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
          setEmployeeData(employeeResult.employee)
        } catch (err) {
          console.error('Error fetching employee:', err)
          // Don't fail completely if employee fetch fails
        }
      }

      // Collect catalog IDs to fetch (relationship type refs)
      const catalogIds = Array.from(
        new Set([newRelationship?.typeRef, oldRelationship?.typeRef].filter(Boolean).map(String))
      )

      // Fetch catalog data if needed
      if (catalogIds.length > 0) {
        try {
          const result = await graphqlClient.request<any>(GET_CATALOG_ENTRIES, {
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
      console.error('Error in useRelationshipReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load relationship review data')
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient, newRelationship, oldRelationship])

  useEffect(() => {
    if (accessToken && employeeId) {
      fetchData()
    }
  }, [accessToken, employeeId]) // ✅ Remove fetchData from dependencies to prevent infinite loop

  return {
    employeeData,
    catalogMap,
    loading,
    error,
    refetch: fetchData
  }
}
