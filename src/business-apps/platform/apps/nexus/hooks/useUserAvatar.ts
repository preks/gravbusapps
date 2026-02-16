import { useState, useEffect, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const GET_EMPLOYEE_PICTURE = `
  query GetEmployeePicture($id: uuid) {
    Employee(where: { id: { _eq: $id } }, limit: 1) {
      pictureThumbnail
    }
  }
`

/**
 * Fetches the current user's avatar from their Employee record.
 * Returns a data-URL string ready to use as an <AvatarImage> src.
 */
export function useUserAvatar(employeeId: string | undefined, accessToken: string) {
  const [pictureThumbnail, setPictureThumbnail] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!employeeId || !accessToken) {
      setPictureThumbnail(null)
      return
    }

    graphqlClient
      .request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(GET_EMPLOYEE_PICTURE, {
        id: employeeId
      })
      .then(res => {
        if (res.Employee?.[0]?.pictureThumbnail) {
          setPictureThumbnail(res.Employee[0].pictureThumbnail)
        }
      })
      .catch(() => {
        /* avatar is non-critical */
      })
  }, [employeeId, accessToken, graphqlClient])

  const avatarUrl = useMemo(() => {
    if (!pictureThumbnail) return undefined
    return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
  }, [pictureThumbnail])

  return avatarUrl
}
