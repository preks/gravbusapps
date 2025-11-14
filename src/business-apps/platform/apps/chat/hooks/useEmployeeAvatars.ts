import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

interface EmployeeAvatarData {
  userId: string
  pictureThumbnail: string | null
}

interface EmployeeAvatarResponse {
  Employee: EmployeeAvatarData[]
}

const GET_EMPLOYEE_AVATARS = `
  query GetEmployeeAvatars($userIds: [String!]) {
    Employee(where: {userId: {_in: $userIds}}) {
      userId
      pictureThumbnail
    }
  }
`

export const useEmployeeAvatars = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAvatars = useCallback(
    async (userIds: string[]): Promise<Map<string, string>> => {
      if (!userIds || userIds.length === 0) {
        return new Map()
      }

      try {
        const result = await graphqlClient.request<EmployeeAvatarResponse>(GET_EMPLOYEE_AVATARS, { userIds })

        const avatarMap = new Map<string, string>()

        if (result?.Employee) {
          result.Employee.forEach(employee => {
            if (employee.pictureThumbnail) {
              // Convert base64 to data URL
              const dataUrl = `data:image/png;base64,${employee.pictureThumbnail}`
              avatarMap.set(employee.userId, dataUrl)
            }
          })
        }

        return avatarMap
      } catch (error) {
        console.error('Error fetching employee avatars:', error)
        // Return empty map on error - components will use fallback avatars
        return new Map()
      }
    },
    [graphqlClient]
  )

  return {
    fetchAvatars
  }
}
