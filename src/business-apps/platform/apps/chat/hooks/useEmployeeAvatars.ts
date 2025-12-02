import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface EmployeeAvatarData {
  id: string // employeeId for navigation
  userId: string
  pictureThumbnail: string | null
}

interface EmployeeAvatarResponse {
  Employee: EmployeeAvatarData[]
}

export interface EmployeeAvatarInfo {
  avatarUrl?: string
  employeeId?: string
}

const GET_EMPLOYEE_AVATARS = `
  query GetEmployeeAvatars($userIds: [String!]) {
    Employee(where: {userId: {_in: $userIds}}) {
      id
      userId
      pictureThumbnail
    }
  }
`

export const useEmployeeAvatars = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)

  /**
   * Fetch avatars and employee IDs for a list of user IDs
   * Returns a map of userId -> { avatarUrl, employeeId }
   */
  const fetchAvatarsWithEmployeeIds = useCallback(
    async (userIds: string[]): Promise<Map<string, EmployeeAvatarInfo>> => {
      if (!userIds || userIds.length === 0) {
        return new Map()
      }

      try {
        const result = await graphqlClient.request<EmployeeAvatarResponse>(GET_EMPLOYEE_AVATARS, { userIds })

        const employeeInfoMap = new Map<string, EmployeeAvatarInfo>()

        if (result?.Employee) {
          result.Employee.forEach(employee => {
            const info: EmployeeAvatarInfo = {
              employeeId: employee.id
            }
            if (employee.pictureThumbnail) {
              // Convert base64 to data URL
              info.avatarUrl = `data:image/png;base64,${employee.pictureThumbnail}`
            }
            employeeInfoMap.set(employee.userId, info)
          })
        }

        return employeeInfoMap
      } catch (error) {
        console.error('Error fetching employee avatars:', error)
        // Return empty map on error - components will use fallback avatars
        return new Map()
      }
    },
    [graphqlClient]
  )

  /**
   * Legacy function for backward compatibility - returns only avatar URLs
   */
  const fetchAvatars = useCallback(
    async (userIds: string[]): Promise<Map<string, string>> => {
      const employeeInfoMap = await fetchAvatarsWithEmployeeIds(userIds)
      const avatarMap = new Map<string, string>()

      employeeInfoMap.forEach((info, userId) => {
        if (info.avatarUrl) {
          avatarMap.set(userId, info.avatarUrl)
        }
      })

      return avatarMap
    },
    [fetchAvatarsWithEmployeeIds]
  )

  return {
    fetchAvatars,
    fetchAvatarsWithEmployeeIds
  }
}
