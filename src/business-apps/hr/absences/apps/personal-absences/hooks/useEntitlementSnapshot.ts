import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ENTITLEMENTS_SNAPSHOT_FOR_YEAR } from '../queries/graphql'

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

    const year = dayjs().year()
    const yearStart = dayjs(`${year}-01-01`).format('YYYY-MM-DD')
    const yearEnd = dayjs(`${year}-12-31`).format('YYYY-MM-DD')

    client
      .request<any>(GET_ENTITLEMENTS_SNAPSHOT_FOR_YEAR, {
        employeeId,
        yearStart,
        yearEnd
      })
      .then(res => {
        const rows: any[] = res?.EntitlementUsageSnapshotView || res?.entitlement_usage_snapshot_view || []
        const byType: Record<string, { total: number; usedApproved: number; usedPending: number; remaining: number }> =
          Object.create(null)
        rows.forEach((r: any) => {
          const code = r?.typeRef ?? r?.type_ref
          if (!code || code === '__proto__' || code === 'constructor' || code === 'prototype') return
          const acc = byType[code] || { total: 0, usedApproved: 0, usedPending: 0, remaining: 0 }
          acc.total += Number(r?.totalEntitlement ?? r?.total_entitlement) || 0
          acc.usedApproved += Number(r?.usedApproved ?? r?.used_approved) || 0
          acc.usedPending += Number(r?.usedPending ?? r?.used_pending) || 0
          byType[code] = acc
        })
        Object.keys(byType).forEach(k => {
          if (!Object.prototype.hasOwnProperty.call(byType, k)) return
          const v = byType[k]
          v.remaining = Math.max(0, v.total - v.usedApproved - v.usedPending)
        })

        const mappedEntitlements: SnapshotEntitlement[] = Object.keys(byType).map(code => {
          const v = byType[code]
          const mapped = mapType ? mapType(code) : undefined
          return {
            type: mapped?.label || code,
            color: mapped?.color,
            used: v.usedApproved,
            total: v.total,
            pending: v.usedPending,
            available: v.remaining
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
  }, [client, employeeId, mapType])

  return useMemo(() => ({ entitlements, stats, loading, error }), [entitlements, stats, loading, error])
}
