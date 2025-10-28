import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EmployeeNoteQueryVariables {
  employeeId: string
}

export interface EmployeeNoteData {
  id: string
  version: number
  employeeId: string
  notes: string
  createdAt: string
  createdBy: string
  activeFrom?: string
  activeTo?: string
}

export interface EmployeeNoteResponse {
  EmployeeNote: EmployeeNoteData[]
}

export const GET_EMPLOYEE_NOTES = (): string => {
  return `
    query GetEmployeeNotes($employeeId: uuid!) {
      EmployeeNote(where: {employeeId: {_eq: $employeeId}}, orderBy: {createdAt: DESC}) {
        id
        version
        employeeId
        notes
        createdAt
        createdBy
        activeFrom
        activeTo
      }
    }
  `
}

export const useGetEmployeeNotes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEmployeeNotes = useCallback(
    async (variables: EmployeeNoteQueryVariables) => {
      const query = GET_EMPLOYEE_NOTES()
      try {
        const result = await graphqlClient.request<EmployeeNoteResponse>(query, variables)

        return result
      } catch (error) {
        console.error('=== Error fetching employee notes ===', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchEmployeeNotes }
}
