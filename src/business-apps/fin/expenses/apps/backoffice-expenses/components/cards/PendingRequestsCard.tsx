import React from 'react'
import { SectionKpiCards, KpiCardData, Spinner, Alert } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'

export interface PendingRequestsCardProps {
  loading: boolean
  error: Error | null
  pendingRequestsCount: number
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({ loading, error, pendingRequestsCount }) => {
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-32" data-testid="pending-requests-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="pending-requests-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Pending Requests</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    )
  }

  // Create KPI card data
  const kpiCardData: KpiCardData = {
    id: 'pending-requests',
    title: 'Pending Requests',
    value: pendingRequestsCount.toString(),
    suffix: 'requests',
    footer: 'Expense requests awaiting approval',
    icon: 'clock',
    iconColor: getExpenseIconColor.pendingRequests()
  }

  return (
    <div data-testid="pending-requests-card">
      <SectionKpiCards cards={[kpiCardData]} data-testid="pending-requests-kpi-cards" />
    </div>
  )
}

export default PendingRequestsCard
