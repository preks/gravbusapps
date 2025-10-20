import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface NumberOfEmployeesOption {
  id: string
  name: string
  code: string
}

export interface UseGetNumberOfEmployeesReturn {
  employeeOptions: NumberOfEmployeesOption[]
  isLoading: boolean
  error: Error | null
}

const GET_NUMBER_OF_EMPLOYEES_QUERY = `
  query GetNumberOfEmployees($search: String) {
    CatalogEntry(
      where: {
        catalog: { identifier: { _eq: "EmployeeSize" } }
        _and: [
          { 
            _or: [
              { value: { _ilike: $search } }
              { code: { _ilike: $search } }
            ]
          }
        ]
      }
      orderBy: [{ code: ASC_NULLS_LAST }, { value: ASC_NULLS_LAST }]
      limit: 100
    ) {
      id
      value
      code
    }
  }
`

export const useGetNumberOfEmployees = (
  context: BusinessAppContextProps,
  search: string = ''
): UseGetNumberOfEmployeesReturn => {
  const [employeeOptions, setEmployeeOptions] = useState<NumberOfEmployeesOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchNumberOfEmployees = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchPattern = search ? `%${search}%` : '%'
      const result = await graphqlClient.request(GET_NUMBER_OF_EMPLOYEES_QUERY, {
        search: searchPattern
      })

      if (result?.CatalogEntry) {
        const options = result.CatalogEntry.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || 'Unknown',
          code: entry.code || ''
        }))
        setEmployeeOptions(options)
      } else {
        setEmployeeOptions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch number of employees options'))
      console.error('Error fetching number of employees options:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, graphqlClient])

  useEffect(() => {
    fetchNumberOfEmployees()
  }, [fetchNumberOfEmployees])

  return {
    employeeOptions,
    isLoading,
    error
  }
}
