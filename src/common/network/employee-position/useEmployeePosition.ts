import { useMemo } from 'react'
import { useGraphqlClient } from '../graphql/useGraphQLClient'

// Query for employee position
export const employeePositionQuery = `
  query fetchEmployeePosition($employeeId: uuid) {
    EmployeePosition(where: {employeeId: {_eq: $employeeId}}, limit: 1) {
      structureId
      costCenterId
    }
  }
`

export const useEmployeePosition = (accessToken: string, employeeId: string) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchEmployeePosition = useMemo(
    () => async () => {
      try {
        const data = await graphQLClient.request(employeePositionQuery, { employeeId })

        return data
      } catch (error) {
        console.error('Error fetching employee position:', error)
        throw error
      }
    },
    [graphQLClient, employeeId, accessToken]
  )

  return fetchEmployeePosition
}
