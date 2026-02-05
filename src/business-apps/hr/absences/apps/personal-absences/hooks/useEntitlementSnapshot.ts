import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ENTITLEMENTS_SNAPSHOT } from '../queries/graphql'

export interface SnapshotEntitlement {
  type: string
  color?: string
  used: number
  total: number
  pending: number
  available: number
}

export interface SnapshotStatItem {
  title: string
  used: number
  total: number
  progress: number
  color?: string
  textColor?: string
  daysLeft: number
}

export function useEntitlementSnapshot(
  accessToken?: string,
  employeeId?: string,
  mapType?: (code: string) => { label?: string; color?: string }
) {
  const client = useGraphQLClient(accessToken)
  const [entitlements, setEntitlements] = useState<SnapshotEntitlement[]>([])
  const [stats, setStats] = useState<SnapshotStatItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeId) return
    setLoading(true)
    setError(null)

    client
      .request<any>(GET_ENTITLEMENTS_SNAPSHOT, {
        employeeId,
        today: dayjs().format('YYYY-MM-DD')
      })
      .then(res => {
        const rows: any[] = res?.EntitlementUsageSnapshotView || res?.entitlement_usage_snapshot_view || []
        const mappedEntitlements: SnapshotEntitlement[] = rows.map(ent => {
          const code = ent.typeRef || ''
          const mapped = mapType ? mapType(code) : undefined
          return {
            type: mapped?.label || code,
            color: mapped?.color,
            used: ent.usedApproved ?? 0,
            total: ent.totalEntitlement ?? 0,
            pending: ent.usedPending ?? 0,
            available: ent.remaining ?? 0
          }
        })
        setEntitlements(mappedEntitlements)
        const mappedStats: SnapshotStatItem[] = mappedEntitlements.map(e => ({
          title: e.type,
          used: e.used,
          total: e.total,
          progress: e.total ? Math.round((e.used / e.total) * 100) : 0,
          color: e.color,
          textColor: e.color,
          daysLeft: e.available
        }))
        setStats(mappedStats)
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [client, employeeId])

  return useMemo(() => ({ entitlements, stats, loading, error }), [entitlements, stats, loading, error])
}
