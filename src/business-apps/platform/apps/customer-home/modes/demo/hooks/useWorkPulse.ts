import { useMemo } from 'react'
import { usePersonalAbsencesData } from '@/business-apps/hr/absences/apps/personal-absences/hooks/usePersonalAbsencesData'
import { useGetExpenseDashboard } from '@/business-apps/fin/expenses/apps/personal-expenses/hooks/useGetExpenseDashboard'
import { useTeamPerformance } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useTeamPerformance'
import { useOpenJobPositions } from '@/business-apps/hr/core/apps/manager-dashboard/hooks/useOpenJobPositions'
import { useMyRequestsCount } from '@/business-apps/ser/hooks/useMyRequestsCount'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface DisplayEntitlement {
  type: string
  typeRef: string
  typeMatchKeys?: string[]
  color?: string
  labelMode?: string
  used: number
  total: number
  pending: number
  available: number
  display: boolean
}

export interface PulseMetric {
  id: string
  label: string
  value: string
  subtitle?: string
  href?: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}

interface UseWorkPulseProps {
  accessToken: string
  employeeId: string
  hasTeamData: boolean
  context?: BusinessAppContextProps
}

export const useWorkPulse = ({ accessToken, employeeId, hasTeamData, context }: UseWorkPulseProps) => {
  const absenceData = usePersonalAbsencesData(accessToken, employeeId)

  const expenseDashboard = useGetExpenseDashboard(context)

  const teamPerformance = useTeamPerformance({
    accessToken,
    managerId: hasTeamData ? employeeId : ''
  })

  const openPositions = useOpenJobPositions({
    accessToken,
    managerId: hasTeamData ? employeeId : ''
  })

  const serviceRequestsContext: BusinessAppContextProps = context || { accessToken }
  const serviceRequests = useMyRequestsCount(serviceRequestsContext)

  const metrics = useMemo(() => {
    const items: PulseMetric[] = []

    // Vacation Balance — same logic as my-absences BalanceCard:
    // find annual leave (A001) entitlement, show used/total days
    const entitlements = absenceData.displayEntitlements as DisplayEntitlement[] | undefined
    const vacationEntitlement =
      entitlements?.find(e => (e.typeRef || '').toLowerCase().includes('a001')) || entitlements?.[0]
    if (vacationEntitlement) {
      const used = Math.round(vacationEntitlement.used ?? 0)
      const total = Math.round(vacationEntitlement.total ?? 0)
      const available = Math.round(vacationEntitlement.available ?? 0)
      items.push({
        id: 'vacation-balance',
        label: 'pulse-vacation-balance',
        value: total > 0 ? `${used}/${total}` : `${used}`,
        subtitle: total > 0 ? 'pulse-vacation-used-of-total' : 'pulse-vacation-of-total',
        href: '/platform/hr/absences/personal-absences',
        tone: total > 0 && available <= 3 ? 'warning' : 'default'
      })
    }

    if (expenseDashboard.stats) {
      const { pendingItems, pendingPayouts, expenseItemsWithoutReceipts } = expenseDashboard.stats
      const expenseCount = (pendingItems || 0) + (pendingPayouts || 0)
      items.push({
        id: 'expense-status',
        label: 'pulse-expense-status',
        value: `${expenseCount}`,
        subtitle: pendingPayouts ? 'pulse-expense-pending-payout' : 'pulse-expense-pending',
        href: '/platform/fin/expenses/personal-expenses',
        tone: (expenseItemsWithoutReceipts || 0) > 0 ? 'warning' : 'default'
      })
    }

    // My Tasks Due (from EveryBox - already loaded in usePriorities, avoid double fetch)
    // This is shown in Priorities already, so we skip it here

    // Service Requests
    if (serviceRequests.count > 0) {
      items.push({
        id: 'service-requests',
        label: 'pulse-service-requests',
        value: `${serviceRequests.count}`,
        subtitle: 'pulse-service-open',
        href: '/platform/sales-demo/service-launcher?view=myRequests',
        tone: 'default'
      })
    }

    // Manager-specific metrics
    if (hasTeamData) {
      // Team Performance
      if (teamPerformance.totalGoals > 0) {
        const progressPct = Math.round(teamPerformance.averageTeamProgress || 0)
        items.push({
          id: 'team-performance',
          label: 'pulse-team-performance',
          value: `${progressPct}%`,
          subtitle: 'pulse-team-goals-progress',
          href: '/platform/hr/core/apps/manager-dashboard',
          tone: progressPct < 50 ? 'warning' : progressPct >= 80 ? 'success' : 'default'
        })
      }

      // Open Positions
      if (openPositions.openPositions.length > 0) {
        items.push({
          id: 'open-positions',
          label: 'pulse-open-positions',
          value: `${openPositions.openPositions.length}`,
          subtitle: 'pulse-open-roles',
          href: '/platform/hr/workforce-management?view=positions',
          tone: 'default'
        })
      }
    }

    return items
  }, [
    absenceData.displayEntitlements,
    expenseDashboard.stats,
    serviceRequests.count,
    hasTeamData,
    teamPerformance.totalGoals,
    teamPerformance.averageTeamProgress,
    openPositions.openPositions
  ])

  const isLoading =
    absenceData.loading ||
    expenseDashboard.isLoading ||
    serviceRequests.isLoading ||
    (hasTeamData && (teamPerformance.loading || openPositions.loading))

  return { metrics, isLoading }
}
