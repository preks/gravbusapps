import * as React from 'react'
import type { KpiCardBaseProps } from './types'
import KpiStateCard from './KpiStateCard'
import { getExpenseIconColor } from '../../utils/colorConstants'
import { type KpiCardData } from '@newwork/nw-design-system'

export interface PendingRequestsCardProps extends KpiCardBaseProps {
  pendingRequestsCount: number
}

const PendingRequestsCard: React.FC<PendingRequestsCardProps> = ({ loading, error, pendingRequestsCount }) => {
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
    <KpiStateCard
      loading={loading}
      error={error}
      errorTitle="Pending Requests"
      loadingTestId="pending-requests-loading"
      errorTestId="pending-requests-error"
      cardTestId="pending-requests-card"
      kpiTestId="pending-requests-kpi-cards"
      kpiCardData={kpiCardData}
    />
  )
}

export default PendingRequestsCard
