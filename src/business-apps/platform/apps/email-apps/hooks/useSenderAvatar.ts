/**
 * useSenderAvatar - Fetches employee avatar for an email sender.
 * Looks up internal employees by their email (via Employee.communication) and returns
 * pictureThumbnail for display in the email header.
 */

import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const GET_EMPLOYEE_BY_EMAIL = `
  query GetEmployeeByEmail($email: String!) {
    Employee(
      where: {
        isDeleted: { _eq: false }
        communication: { value: { _ilike: $email } }
      }
      limit: 1
    ) {
      id
      pictureThumbnail
    }
  }
`

function toAvatarUrl(pictureThumbnail?: string | null): string | undefined {
  if (!pictureThumbnail) return undefined
  if (pictureThumbnail.startsWith('data:')) return pictureThumbnail
  return `data:image/png;base64,${pictureThumbnail}`
}

export function useSenderAvatar(senderEmail: string | undefined, accessToken: string | undefined): string | undefined {
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!senderEmail?.trim() || !accessToken) {
      setAvatarUrl(undefined)
      return
    }

    let cancelled = false
    setAvatarUrl(undefined)

    graphqlClient
      .request<{ Employee: Array<{ pictureThumbnail?: string | null }> }>(GET_EMPLOYEE_BY_EMAIL, {
        email: senderEmail.trim()
      })
      .then(result => {
        if (cancelled) return
        const emp = result?.Employee?.[0]
        if (emp?.pictureThumbnail) {
          setAvatarUrl(toAvatarUrl(emp.pictureThumbnail))
        }
      })
      .catch(() => {
        if (!cancelled) setAvatarUrl(undefined)
      })

    return () => {
      cancelled = true
    }
  }, [senderEmail, accessToken, graphqlClient])

  return avatarUrl
}
