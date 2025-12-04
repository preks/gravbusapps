import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface BankAccountData {
  countryRef?: string | null
  currencyRef?: string | null
  routingNumberType?: string | null
  employeeAddress?: string | null
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

interface UseBankAccountReviewDataProps {
  accessToken: string
  employeeId?: string
  newBankAccount: BankAccountData
  oldBankAccount: BankAccountData
}

interface UseBankAccountReviewDataResult {
  employeeData: EmployeeData | null
  catalogMap: Record<string, CatalogEntry>
  addressTypeMap: Record<string, string>
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const GET_EMPLOYEE_NAME = `
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

const GET_BANK_REVIEW_AUX = `
  query GetBankReviewAux(
    $ids: [String!],
    $activeUserLocale: String!,
    $oldAddressId: uuid,
    $newAddressId: uuid
  ) {
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
    oldAddress: EmployeeAddress(where: {id: {_eq: $oldAddressId}}, limit: 1) { id version type }
    newAddress: EmployeeAddress(where: {id: {_eq: $newAddressId}}, limit: 1) { id version type }
  }
`

// Helper: Collect catalog IDs from bank account data
const collectBankCatalogIds = (newAccount: BankAccountData, oldAccount: BankAccountData): string[] => {
  return Array.from(
    new Set(
      [
        newAccount?.countryRef,
        oldAccount?.countryRef,
        newAccount?.currencyRef,
        oldAccount?.currencyRef,
        newAccount?.routingNumberType,
        oldAccount?.routingNumberType
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

// Helper: Build address type map from query result
const buildAddressTypeMap = (oldAddress: unknown, newAddress: unknown): Record<string, string> => {
  const addressTypes: Record<string, string> = {}
  const oldEntry = Array.isArray(oldAddress) ? oldAddress[0] : oldAddress
  const newEntry = Array.isArray(newAddress) ? newAddress[0] : newAddress

  if (oldEntry?.id) addressTypes[oldEntry.id] = String(oldEntry.type || '')
  if (newEntry?.id) addressTypes[newEntry.id] = String(newEntry.type || '')

  return addressTypes
}

export const useBankAccountReviewData = ({
  accessToken,
  employeeId,
  newBankAccount,
  oldBankAccount
}: UseBankAccountReviewDataProps): UseBankAccountReviewDataResult => {
  const [employeeData, setEmployeeData] = useState<EmployeeData | null>(null)
  const [catalogMap, setCatalogMap] = useState<Record<string, CatalogEntry>>({})
  const [addressTypeMap, setAddressTypeMap] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEmployeeData = useCallback(async () => {
    if (!employeeId) return
    try {
      const result = await graphqlClient.request<{ employee: EmployeeData }>(GET_EMPLOYEE_NAME, { employeeId })
      setEmployeeData(result.employee)
    } catch (err) {
      console.error('Error fetching employee:', err)
    }
  }, [employeeId, graphqlClient])

  const fetchAuxData = useCallback(async () => {
    const catalogIds = collectBankCatalogIds(newBankAccount, oldBankAccount)
    const oldAddressId = String(oldBankAccount?.employeeAddress || '').trim() || null
    const newAddressId = String(newBankAccount?.employeeAddress || '').trim() || null

    if (catalogIds.length === 0 && !oldAddressId && !newAddressId) return

    try {
      const result = await graphqlClient.request<{
        entries: CatalogEntry[]
        oldAddress: unknown
        newAddress: unknown
      }>(GET_BANK_REVIEW_AUX, {
        ids: catalogIds,
        activeUserLocale: getCurrentActiveUserLocale(),
        oldAddressId,
        newAddressId
      })

      setCatalogMap(buildCatalogMap(result?.entries))

      const addressTypes = buildAddressTypeMap(result?.oldAddress, result?.newAddress)
      if (Object.keys(addressTypes).length > 0) {
        setAddressTypeMap(addressTypes)
      }
    } catch (err) {
      console.error('Error fetching catalog/address data:', err)
    }
  }, [graphqlClient, newBankAccount, oldBankAccount])

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([fetchEmployeeData(), fetchAuxData()])
    } catch (err) {
      console.error('Error in useBankAccountReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bank account review data')
    } finally {
      setLoading(false)
    }
  }, [fetchEmployeeData, fetchAuxData])

  useEffect(() => {
    if (accessToken) {
      fetchData()
    }
  }, [accessToken, fetchData])

  return {
    employeeData,
    catalogMap,
    addressTypeMap,
    loading,
    error,
    refetch: fetchData
  }
}
