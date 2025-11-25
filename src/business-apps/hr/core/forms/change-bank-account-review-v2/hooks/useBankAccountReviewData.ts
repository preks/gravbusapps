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

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // Fetch employee data
      if (employeeId) {
        try {
          const employeeResult = await graphqlClient.request<{ employee: EmployeeData }>(GET_EMPLOYEE_NAME, {
            employeeId
          })
          setEmployeeData(employeeResult.employee)
        } catch (err) {
          console.error('Error fetching employee:', err)
          // Don't fail completely if employee fetch fails
        }
      }

      // Collect catalog IDs to fetch
      const catalogIds = Array.from(
        new Set(
          [
            newBankAccount?.countryRef,
            oldBankAccount?.countryRef,
            newBankAccount?.currencyRef,
            oldBankAccount?.currencyRef,
            newBankAccount?.routingNumberType,
            oldBankAccount?.routingNumberType
          ]
            .filter(Boolean)
            .map(String)
        )
      )

      const oldAddressId = String(oldBankAccount?.employeeAddress || '').trim()
      const newAddressId = String(newBankAccount?.employeeAddress || '').trim()

      // Fetch catalog and address data if needed
      if (catalogIds.length || oldAddressId || newAddressId) {
        try {
          const result = await graphqlClient.request<any>(GET_BANK_REVIEW_AUX, {
            ids: catalogIds,
            activeUserLocale: getCurrentActiveUserLocale(),
            oldAddressId: oldAddressId || null,
            newAddressId: newAddressId || null
          })

          // Build catalog map
          const catalog: Record<string, CatalogEntry> = {}
          for (const entry of result?.entries || []) {
            catalog[String(entry.id)] = entry
          }
          setCatalogMap(catalog)

          // Build address type map
          const addressTypes: Record<string, string> = {}
          const oldEntry = Array.isArray(result?.oldAddress) ? result.oldAddress[0] : result?.oldAddress
          const newEntry = Array.isArray(result?.newAddress) ? result.newAddress[0] : result?.newAddress

          if (oldEntry?.id) addressTypes[oldEntry.id] = String(oldEntry.type || '')
          if (newEntry?.id) addressTypes[newEntry.id] = String(newEntry.type || '')

          if (Object.keys(addressTypes).length) {
            setAddressTypeMap(addressTypes)
          }
        } catch (err) {
          console.error('Error fetching catalog/address data:', err)
          // Don't fail completely if catalog fetch fails
        }
      }
    } catch (err) {
      console.error('Error in useBankAccountReviewData:', err)
      setError(err instanceof Error ? err.message : 'Failed to load bank account review data')
    } finally {
      setLoading(false)
    }
  }, [accessToken, employeeId, graphqlClient, newBankAccount, oldBankAccount])

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
