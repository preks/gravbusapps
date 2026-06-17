/**
 * Billing connection health.
 *
 * Distinguishes the meaningful states of the finance backend connection:
 *  - 'offline'   : no connector lane configured (sample data only)
 *  - 'live'      : backend reachable and the invoice workflow is ready
 *  - 'degraded'  : connector configured but the backend reports problems
 *  - 'unknown'   : still checking
 */
import { useEffect, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { fetchDetailedHealth, financeAdminEnabled } from '../network/financeHealthClient'

export type ConnectionHealthStatus = 'unknown' | 'offline' | 'live' | 'degraded'

interface ConnectionHealthState {
  status: ConnectionHealthStatus
  checks: Record<string, string>
}

export function useBillingConnectionHealth(context: BusinessAppContextProps): ConnectionHealthState {
  const [state, setState] = useState<ConnectionHealthState>({ status: 'unknown', checks: {} })

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!context.accessToken || !financeAdminEnabled()) {
        if (!cancelled) setState({ status: 'offline', checks: {} })
        return
      }
      try {
        const health = await fetchDetailedHealth(context.accessToken)
        if (cancelled) return
        if (!health) {
          setState({ status: 'degraded', checks: {} })
          return
        }
        setState({
          status: health.status === 'UP' ? 'live' : 'degraded',
          checks: health.checks
        })
      } catch {
        if (!cancelled) setState({ status: 'degraded', checks: {} })
      }
    }
    check()
    return () => {
      cancelled = true
    }
  }, [context.accessToken])

  return state
}
