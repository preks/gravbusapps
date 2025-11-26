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

// Helper: Collect catalog IDs from address data
const collectAddressCatalogIds = (newAddr: AddressData, oldAddr: AddressData): string[] => {
  return Array.from(
    new Set(
      [newAddr?.countryRef, oldAddr?.countryRef, newAddr?.regionRef, oldAddr?.regionRef].filter(Boolean).map(String)
    )
  )
}

// Helper: Collect document IDs from address data
const collectDocumentIds = (newAddr: AddressData, oldAddr: AddressData): string[] => {
  return Array.from(
    new Set(
      [String(oldAddr?.employeeDocument ?? ''), String(newAddr?.employeeDocument ?? '')]
        .map(s => s?.trim())
        .filter(Boolean)
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

  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId) return
    try {
      const result = await graphqlClient.request<{ employee: EmployeeData }>(GET_EMPLOYEE_DATA, { employeeId })
      setEmployeeData(result.employee)
    } catch (err) {
      console.error('Error fetching employee:', err)
    }
  }, [employeeId, graphqlClient])

  const fetchCatalogData = useCallback(async () => {
    const catalogIds = collectAddressCatalogIds(newAddress, oldAddress)
    if (catalogIds.length === 0) return
    try {
      const result = await graphqlClient.request<{ entries: CatalogEntry[] }>(GET_CATALOG_ENTRIES, {
        ids: catalogIds,
        activeUserLocale: getCurrentActiveUserLocale()
      })
      setCatalogMap(buildCatalogMap(result?.entries))
    } catch (err) {
      console.error('Error fetching catalog data:', err)
    }
  }, [graphqlClient, newAddress, oldAddress])

  const fetchDocumentData = useCallback(async () => {
    const docIds = collectDocumentIds(newAddress, oldAddress)
    if (docIds.length === 0) return
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
    }
  }, [graphqlClient, newAddress, oldAddress])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchEmployeeData(), fetchCatalogData(), fetchDocumentData()])
    } catch (err) {
      console.error('Error in useAddressReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load address review data')
    } finally {
      setLoading(false)
    }
  }, [fetchEmployeeData, fetchCatalogData, fetchDocumentData])

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
