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

export interface EmployeeData {
  id: string
  userId?: string
  firstName: string
  lastName: string
  displayName?: string
  pictureThumbnail?: string | null
}

export interface EmployeeNoteResponse {
  EmployeeNote: EmployeeNoteData[]
  Employee?: EmployeeData[]
}

export const useGetEmployeeNotes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchEmployeeNotes = useCallback(
    async (variables: EmployeeNoteQueryVariables) => {
      try {
        const notesQuery = `
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

        const notesResult = await graphqlClient.request<{ EmployeeNote: EmployeeNoteData[] }>(notesQuery, variables)

        const createdByUserIds = [...new Set(notesResult.EmployeeNote.map(note => note.createdBy).filter(Boolean))]

        if (createdByUserIds.length === 0) {
          return { EmployeeNote: notesResult.EmployeeNote, Employee: [] }
        }

        const employeesQuery = `
          query GetEmployeesByUserIds($userIds: [String!]!) {
            Employee(where: {userId: {_in: $userIds}, isDeleted: {_eq: false}}) {
              id
              userId
              firstName
              lastName
              displayName
              pictureThumbnail
            }
          }
        `

        const employeesResult = await graphqlClient.request<{ Employee: EmployeeData[] }>(employeesQuery, {
          userIds: createdByUserIds
        })

        return {
          EmployeeNote: notesResult.EmployeeNote,
          Employee: employeesResult.Employee || []
        } as EmployeeNoteResponse
      } catch (error) {
        console.error('=== Error fetching employee notes ===', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchEmployeeNotes }
}
