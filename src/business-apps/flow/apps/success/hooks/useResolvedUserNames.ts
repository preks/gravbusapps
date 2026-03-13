import { useEffect, useMemo, useState } from 'react'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'

export const useResolvedUserNames = (accessToken: string, userIds: Array<string | undefined>) => {
  const [userNames, setUserNames] = useState<Record<string, string>>({})

  const normalizedUserIds = useMemo(
    () => [...new Set(userIds.map(id => String(id || '').trim()).filter(Boolean))],
    [userIds]
  )
  const unresolvedUserIds = useMemo(
    () => normalizedUserIds.filter(userId => !userNames[userId]),
    [normalizedUserIds, userNames]
  )

  useEffect(() => {
    if (!accessToken || unresolvedUserIds.length === 0) return

    let cancelled = false
    const orgClient = new OrgDirectoryClient(accessToken)

    Promise.all(
      unresolvedUserIds.map(async userId => {
        const user = await orgClient.getUserById(userId).catch(() => null)
        return { userId, name: user?.name || userId }
      })
    ).then(results => {
      if (cancelled) return

      setUserNames(prev => {
        const next = { ...prev }
        results.forEach(({ userId, name }) => {
          next[userId] = name
        })
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [accessToken, unresolvedUserIds])

  return userNames
}
