import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface AddressData {
  type?: string | null
  addressLine?: string[] | null
  poBox?: boolean | null
  postalCode?: string | null
  locality?: string | null
  regionRef?: string | null
  countryRef?: string | null
  notes?: string | null
  employeeDocument?: string | null
}

interface EmployeeData {
  id: string
  firstName: string
  lastName: string
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

interface UseAddressReviewDataProps {
  accessToken: string
  employeeId?: string
  newAddress: AddressData
  oldAddress: AddressData
}

interface UseAddressReviewDataResult {
  employeeData: EmployeeData | null
  catalogMap: Record<string, CatalogEntry>
  docNameMap: Record<string, string>
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
    entries: CatalogEntry(where: {id: {_in: $ids}}) {
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

const GET_EMPLOYEE_DOCUMENT = `
  query GetEmployeeDocument($id: uuid!) {
    doc: EmployeeDocumentByPk(id: $id) {
      id
      name
    }
  }
`

export const useAddressReviewData = ({
  accessToken,
  employeeId,
  newAddress,
  oldAddress
}: UseAddressReviewDataProps): UseAddressReviewDataResult => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [catalogMap, setCatalogMap] = useState<Record<string, CatalogEntry>>({})
  const [docNameMap, setDocNameMap] = useState<Record<string, string>>({})
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

      // Collect catalog IDs to fetch (country and region refs)
      const catalogIds = Array.from(
        new Set(
          [newAddress?.countryRef, oldAddress?.countryRef, newAddress?.regionRef, oldAddress?.regionRef]
            .filter(Boolean)
            .map(String)
        )
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

      // Fetch employee document names if IDs provided
      const docIds = Array.from(
        new Set(
          [String(oldAddress?.employeeDocument ?? ''), String(newAddress?.employeeDocument ?? '')]
            .map(s => s?.trim())
            .filter(Boolean)
        )
      )

      if (docIds.length > 0) {
        try {
          const results = await Promise.all(
            docIds.map(id =>
              graphqlClient
                .request<{ doc: { id: string; name?: string | null } | null }>(GET_EMPLOYEE_DOCUMENT, { id })
                .then(res => ({ id, name: res?.doc?.name || '' }))
                .catch(() => ({ id, name: '' }))
            )
          )
          const map: Record<string, string> = {}
          for (const r of results) {
            map[r.id] = r.name
          }
          setDocNameMap(map)
        } catch (err) {
          console.error('Error fetching document data:', err)
          // Don't fail completely
        }
      }
    } catch (err) {
      console.error('Error in useAddressReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load address review data')
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient, newAddress, oldAddress])

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, fetchData])

  return {
    employeeData,
    catalogMap,
    docNameMap,
    loading,
    error,
    refetch: fetchData
  }
}
