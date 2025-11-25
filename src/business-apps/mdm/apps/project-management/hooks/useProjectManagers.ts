import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useCallback } from 'react'

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

export interface ProjectManager {
  id: string
  firstName?: string
  lastName?: string
  fullName?: string
  email?: string
  picture_thumbnail?: string
  [key: string]: any
}

/**
 * Hook for fetching project managers (employees) from the structure endpoint
 */
export const useProjectManagers = (accessToken: string) => {
  const restClient = useRestClient(ORGCHART_BASE_URL)

  /**
   * Get available employees for project manager selection
   * @param params - Search and pagination parameters
   * @returns Promise resolving to array of employees
   */
  const getProjectManagers = useCallback(
    async (params: {
      searchCriteria?: string
      page?: number
      size?: number
      structureId: string
      isPlanningMode?: boolean
    }): Promise<ProjectManager[]> => {
      try {
        const { searchCriteria = '', page = 0, size = 50, structureId, isPlanningMode = false } = params

        const queryParams = new URLSearchParams({
          structureId,
          isPlanningMode: isPlanningMode.toString()
        })

        // Add search criteria if provided
        if (searchCriteria.trim()) {
          queryParams.append('searchCriteria', searchCriteria.trim())
        }

        // Add pagination if needed
        if (page > 0) {
          queryParams.append('page', page.toString())
        }
        if (size !== 50) {
          queryParams.append('size', size.toString())
        }

        const response = await restClient.get<ProjectManager[]>(`/employees/structure?${queryParams.toString()}`, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        return response || []
      } catch (error) {
        console.error('Error fetching project managers:', error)
        throw error
      }
    },
    [restClient, accessToken]
  )

  return {
    getProjectManagers
  }
}
