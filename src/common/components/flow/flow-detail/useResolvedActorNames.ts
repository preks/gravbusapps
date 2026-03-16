import { useEffect, useMemo, useState } from 'react'
import { OrgDirectoryClient } from '@/common/network/org-directory/OrgDirectoryClient'

const SYSTEM_ACTOR_IDS = new Set(['system', 'SYSTEM'])

export const useResolvedActorNames = (accessToken: string | undefined, actorIds: Array<string | undefined>) => {
  const [actorNames, setActorNames] = useState<Record<string, string>>({})

  const normalizedActorIds = useMemo(
    () => [...new Set(actorIds.map(id => String(id || '').trim()).filter(Boolean))],
    [actorIds]
  )

  const unresolvedActorIds = useMemo(
    () =>
      normalizedActorIds.filter(actorId => {
        if (actorNames[actorId]) return false
        if (SYSTEM_ACTOR_IDS.has(actorId)) return false
        return true
      }),
    [actorNames, normalizedActorIds]
  )

  useEffect(() => {
    if (!accessToken || unresolvedActorIds.length === 0) return

    let cancelled = false
    const orgClient = new OrgDirectoryClient(accessToken)

    Promise.all(
      unresolvedActorIds.map(async actorId => {
        const user = await orgClient.getUserById(actorId).catch(() => null)
        return { actorId, name: user?.name || actorId }
      })
    ).then(results => {
      if (cancelled) return

      setActorNames(currentNames => {
        const nextNames = { ...currentNames }
        results.forEach(({ actorId, name }) => {
          nextNames[actorId] = name
        })
        return nextNames
      })
    })

    return () => {
      cancelled = true
    }
  }, [accessToken, unresolvedActorIds])

  return actorNames
}
