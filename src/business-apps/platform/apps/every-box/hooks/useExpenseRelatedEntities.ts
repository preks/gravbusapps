/**
 * Hook to fetch related entities for expense approval
 * Fetches employee, cost center, and project details by their IDs
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface RelatedEntities {
  employee?: {
    id: string
    firstName: string
    lastName: string
    displayName: string
    pictureThumbnail?: string
    avatarUrl?: string
    organizationalUnit?: string
    position?: string
  }
  costCenter?: {
    id: string
    name: string
    code?: string
  }
  project?: {
    id: string
    name: string
  }
}

interface UseExpenseRelatedEntitiesOptions {
  employeeId?: string
  costCenterId?: string
  projectId?: string
  accessToken: string
  structureId?: string
}

// Helper to convert base64 to Object URL (for browser caching)
const base64ToObjectURL = (base64Data: string): string | undefined => {
  try {
    // Skip if data is JSON or invalid
    if (base64Data.startsWith('{')) return undefined

    // Convert base64 to blob
    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: 'image/jpeg' })

    // Create Object URL (this will be cached by the browser!)
    return URL.createObjectURL(blob)
  } catch {
    return undefined
  }
}

export const useExpenseRelatedEntities = ({
  employeeId,
  costCenterId,
  projectId,
  accessToken,
  structureId = '99b1ba64-a4d3-4dd0-8302-b1dc0c4daaaf'
}: UseExpenseRelatedEntitiesOptions) => {
  const [entities, setEntities] = useState<RelatedEntities>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchEntities = useCallback(async () => {
    if (!employeeId && !costCenterId && !projectId) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result: RelatedEntities = {}

      // Fetch employee if ID provided
      if (employeeId) {
        const employeeQuery = `
          query GetEmployee($employeeId: uuid!) {
            Employee(where: { id: { _eq: $employeeId } }, limit: 1) {
              id
              firstName
              lastName
              displayName
              pictureThumbnail
              employeePosition {
                organizationalUnit {
                  name
                }
                jobPosition {
                  name
                }
              }
            }
          }
        `
        const employeeResponse = await graphqlClient.request<{ Employee: any[] }>(employeeQuery, {
          employeeId
        })

        if (employeeResponse.Employee && employeeResponse.Employee.length > 0) {
          const emp = employeeResponse.Employee[0]
          let avatarUrl: string | undefined

          // Convert base64 to Object URL if pictureThumbnail exists
          if (emp.pictureThumbnail) {
            avatarUrl = base64ToObjectURL(emp.pictureThumbnail)
          }

          result.employee = {
            id: emp.id,
            firstName: emp.firstName,
            lastName: emp.lastName,
            displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
            pictureThumbnail: emp.pictureThumbnail,
            avatarUrl,
            organizationalUnit: emp.employeePosition?.organizationalUnit?.name,
            position: emp.employeePosition?.jobPosition?.name
          }
        }
      }

      // Fetch cost center if ID provided
      if (costCenterId) {
        const costCenterQuery = `
          query GetCostCenter($costCenterId: uuid!, $structureId: uuid!) {
            CostCenter(
              where: { 
                id: { _eq: $costCenterId },
                structureId: { _eq: $structureId }
              }, 
              limit: 1
            ) {
              id
              name
              code
            }
          }
        `
        const costCenterResponse = await graphqlClient.request<{ CostCenter: any[] }>(costCenterQuery, {
          costCenterId,
          structureId
        })

        if (costCenterResponse.CostCenter && costCenterResponse.CostCenter.length > 0) {
          result.costCenter = costCenterResponse.CostCenter[0]
        }
      }

      // Fetch project if ID provided
      if (projectId) {
        const projectQuery = `
          query GetProject($projectId: uuid!, $structureId: uuid!) {
            Project(
              where: { 
                id: { _eq: $projectId },
                structureId: { _eq: $structureId }
              }, 
              limit: 1
            ) {
              id
              name
            }
          }
        `
        const projectResponse = await graphqlClient.request<{ Project: any[] }>(projectQuery, {
          projectId,
          structureId
        })

        if (projectResponse.Project && projectResponse.Project.length > 0) {
          result.project = projectResponse.Project[0]
        }
      }

      setEntities(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch related entities')
    } finally {
      setIsLoading(false)
    }
  }, [employeeId, costCenterId, projectId, accessToken, structureId, graphqlClient])

  useEffect(() => {
    if (accessToken) {
      fetchEntities()
    }
  }, [accessToken, fetchEntities])

  return {
    entities,
    isLoading,
    error,
    refetch: fetchEntities
  }
}
