'use client'

import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

export interface MatrixTeamOption {
  id: string
  name: string
}

/**
 * Custom hook to fetch matrix teams with a search filter and pagination.
 * @param accessToken Access token for authentication.
 * @param searchRegex Search regex string for filtering matrix teams.
 * @param offset Pagination offset
 */
export function useGetMatrixTeams(accessToken: string, searchRegex: string, offset: number = 0) {
  const client = useGraphqlClient(accessToken)
  const [teams, setTeams] = useState<MatrixTeamOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    setLoading(true)
    setError(null)
    async function fetchTeams() {
      try {
        const query = `
          query getMatrixTeams($searchRegex: String!, $offset: Int!) {
            EmployeePosition(
              where: {
                matrixUnitEmployees: {
                  matrixUnit: { 
                    name: { _iregex: $searchRegex },
                    isDeleted: { _eq: false }
                  }
                }
              }
              distinctOn: [id]
              limit: 5
              offset: $offset
            ) {
              matrixUnitEmployees {
                matrixUnit {
                  id
                  name
                }
              }
            }
          }
        `
        const variables = { searchRegex, offset }
        const res = await client.request(query, variables)
        const results = (res as any).EmployeePosition ?? []
        // Extract unique matrix teams from the results
        const matrixTeams: MatrixTeamOption[] = []
        const teamIds = new Set<string>()

        // Helper function to process a matrix unit and add it to the results if unique
        const addUniqueMatrixTeam = (matrixUnit: any) => {
          if (matrixUnit?.id && !teamIds.has(matrixUnit.id)) {
            teamIds.add(matrixUnit.id)
            matrixTeams.push({
              id: matrixUnit.id,
              name: matrixUnit.name ?? 'Unknown Team'
            })
          }
        }

        // Process each result row
        for (const row of results) {
          // Skip if no matrix unit employees
          if (!row.matrixUnitEmployees?.length) continue

          // Process each matrix unit employee
          for (const employee of row.matrixUnitEmployees) {
            addUniqueMatrixTeam(employee.matrixUnit)
          }
        }

        setTeams(matrixTeams)

        // Update hasMore flag based on whether we got less results than requested
        setHasMore(results.length === 5)
        setLoading(false)
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)))
        setLoading(false)
      }
    }

    fetchTeams()
  }, [client, searchRegex, offset])

  return { teams, loading, error, hasMore }
}
