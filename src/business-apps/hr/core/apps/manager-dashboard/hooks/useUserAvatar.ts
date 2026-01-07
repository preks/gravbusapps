import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getUserAvatarQuery } from '../queries/userQueries'

// Default avatar to use when GraphQL query fails
const defaultAvatarUrl = 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg'

interface UseUserAvatarProps {
  accessToken: string
  userId: string | undefined
}

/**
 * Custom hook to fetch user avatar from GraphQL API
 */
export const useUserAvatar = ({ accessToken, userId }: UseUserAvatarProps) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [avatar, setAvatar] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!userId || !accessToken) {
        // Use default avatar if userId or accessToken is missing
        setAvatar(defaultAvatarUrl)
        return
      }

      setLoading(true)
      setError(null)

      // During development, use default avatar to avoid API calls
      // TODO: For production, remove this condition and use only the API
      if (process.env.NODE_ENV === 'development') {
        setAvatar(defaultAvatarUrl)
        setLoading(false)
        return
      }

      try {
        const response = await graphqlClient.request(getUserAvatarQuery, { userId })

        if (response?.User && response.User[0] && response.User[0].profilePicture) {
          setAvatar(response.User[0].profilePicture)
        } else {
          // Use default avatar if API returns empty result
          setAvatar(defaultAvatarUrl)
        }
      } catch (err) {
        console.error('Error fetching user avatar:', err)
        // Use default avatar on error
        setAvatar(defaultAvatarUrl)
        setError(null) // Don't show error to user since we're providing a fallback
      } finally {
        setLoading(false)
      }
    }

    fetchUserAvatar()
  }, [accessToken, userId, graphqlClient])

  return { avatar, loading, error }
}
