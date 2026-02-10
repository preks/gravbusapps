import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface CurrentUserProfile {
  id: string
  userId?: string
  firstName: string
  lastName: string
  pictureThumbnail?: string
}

interface UseCurrentUserProfileProps {
  accessToken: string
  employeeId: string
}

export interface UseCurrentUserProfileResult {
  userProfile: CurrentUserProfile | null
  loading: boolean
  error: Error | null
}

/**
 * Hook to fetch current user's profile including profile picture
 * This fills the gap where userInfo.employeeDetails doesn't include pictureThumbnail
 */
export const useCurrentUserProfile = ({
  accessToken,
  employeeId
}: UseCurrentUserProfileProps): UseCurrentUserProfileResult => {
  const [userProfile, setUserProfile] = useState<CurrentUserProfile | null>(null)
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const graphQLClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!employeeId || !accessToken) {
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const userProfileQuery = `
          query GetCurrentUserProfile($employeeId: uuid!) {
            Employee(where: { id: { _eq: $employeeId } }) {
              id
              firstName
              lastName
              pictureThumbnail
              picture
            }
          }
        `

        const response = await graphQLClient.request(userProfileQuery, {
          employeeId
        })

        if (response?.Employee && response.Employee.length > 0) {
          const employee = response.Employee[0]

          // Handle picture data - pictureThumbnail might contain actual base64 or be null
          // picture field contains JSON metadata, not the actual image
          let actualPictureThumbnail = employee.pictureThumbnail

          // If pictureThumbnail is null but picture exists, try to extract from picture JSON
          if (!actualPictureThumbnail && employee.picture) {
            try {
              // The actual image would need to be fetched from the file service using pictureData.fileId
              // For now, we'll set it to null since we can't get the actual image data
              actualPictureThumbnail = null
            } catch {
              // If picture is not JSON, it might be actual base64 data
              actualPictureThumbnail = employee.picture
            }
          }

          setUserProfile({
            id: employee.id,
            userId: employee.userId || employee.id, // Fallback to employee ID if userId doesn't exist
            firstName: employee.firstName,
            lastName: employee.lastName,
            pictureThumbnail: actualPictureThumbnail
          })
        } else {
          setUserProfile(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch user profile'))
        setUserProfile(null)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [employeeId, accessToken, graphQLClient])

  return {
    userProfile,
    loading,
    error
  }
}
