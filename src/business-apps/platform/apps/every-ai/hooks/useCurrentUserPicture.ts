import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export function useCurrentUserPicture(employeeId: string | undefined, accessToken: string) {
  const [pictureThumbnail, setPictureThumbnail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!employeeId || !accessToken) {
      setPictureThumbnail(null)
      return
    }

    const fetchPicture = async () => {
      setIsLoading(true)
      try {
        const query = `
          query GetEmployeePicture($id: uuid) {
            Employee(where: {id: {_eq: $id}}, limit: 1) {
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(query, {
          id: employeeId
        })

        if (result.Employee && result.Employee.length > 0) {
          const thumbnail = result.Employee[0].pictureThumbnail
          setPictureThumbnail(thumbnail)
        }
      } catch (error) {
        console.error('[useCurrentUserPicture] Failed to fetch user picture:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPicture()
  }, [employeeId, accessToken, graphqlClient])

  return { pictureThumbnail, isLoading }
}
