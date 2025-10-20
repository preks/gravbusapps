import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface DepartmentOption {
  id: string
  name: string
}

export interface UseGetContactDepartmentsReturn {
  departmentOptions: DepartmentOption[]
  isLoading: boolean
  error: Error | null
}

const GET_DEPARTMENTS_QUERY = `
  query GetDepartments($search: String) {
    Contact(
      where: {
        _and: [
          { department: { _isNull: false } }
          { department: { _neq: "" } }
          { department: { _ilike: $search } }
        ]
      }
              distinctOn: [department]
      orderBy: [{ department: ASC_NULLS_LAST }]
      limit: 100
    ) {
      department
    }
  }
`

export const useGetContactDepartments = (
  context: BusinessAppContextProps,
  search: string = ''
): UseGetContactDepartmentsReturn => {
  const [departmentOptions, setDepartmentOptions] = useState<DepartmentOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchDepartments = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchPattern = search ? `%${search}%` : '%'
      const result = await graphqlClient.request(GET_DEPARTMENTS_QUERY, {
        search: searchPattern
      })

      if (result?.Contact) {
        const options = result.Contact.filter((contact: any) => contact.department)
          .map((contact: any, index: number) => ({
            id: `department-${contact.department}-${index}`,
            name: contact.department
          }))
          .sort((a: DepartmentOption, b: DepartmentOption) => a.name.localeCompare(b.name))
        setDepartmentOptions(options)
      } else {
        setDepartmentOptions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch departments'))
      console.error('Error fetching departments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, graphqlClient])

  useEffect(() => {
    fetchDepartments()
  }, [fetchDepartments])

  return {
    departmentOptions,
    isLoading,
    error
  }
}
