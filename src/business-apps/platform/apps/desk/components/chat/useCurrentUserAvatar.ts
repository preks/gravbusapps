import { useEffect, useState } from 'react'
import { graphQLClient } from '@/common/network/graphql/GraphQLClient'

function normalizeImageSrc(raw?: string): string | undefined {
  if (!raw) return undefined
  const value = raw.trim()
  if (!value) return undefined
  if (value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) {
    return value
  }
  if (value.startsWith('iVBOR')) return `data:image/png;base64,${value}`
  if (value.startsWith('/9j/')) return `data:image/jpeg;base64,${value}`
  return `data:image/png;base64,${value}`
}

export function useCurrentUserAvatar(accessToken: string, userId: string): string | undefined {
  const [userAvatarSrc, setUserAvatarSrc] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!accessToken || !userId) return

    const query = `
      query GetEmployeeAvatar($userId: String!) {
        Employee(where: { userId: { _eq: $userId }, isDeleted: { _eq: false } }) {
          userId
          pictureThumbnail
        }
      }
    `

    let cancelled = false
    ;(async () => {
      try {
        graphQLClient.setAccessToken(accessToken)
        const res = await graphQLClient.request<{
          Employee: Array<{ userId?: string; pictureThumbnail?: string }>
        }>(query, { userId })

        const thumb = res?.Employee?.[0]?.pictureThumbnail
        const normalized = normalizeImageSrc(thumb)
        if (!cancelled) setUserAvatarSrc(normalized)
      } catch {
        // ignore (avatar is best-effort)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accessToken, userId])

  return userAvatarSrc
}

