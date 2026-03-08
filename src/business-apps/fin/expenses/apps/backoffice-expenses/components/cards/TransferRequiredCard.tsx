import * as React from 'react'
import { type KpiCardData } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'
import type { KpiCardBaseProps } from './types'
import KpiStateCard from './KpiStateCard'

export interface TransferRequiredCardProps extends KpiCardBaseProps {
  transferRequired: number
}

const TransferRequiredCard: React.FC<TransferRequiredCardProps> = ({ loading, error, transferRequired }) => {
  const kpiCardData: KpiCardData = {
    id: 'transfer-required',
    title: 'Transfer Required',
    value: transferRequired.toString(),
    suffix: 'USD',
    decimalPlaces: 2,
    footer: 'Approved expenses awaiting payment',
    icon: 'dollar-sign',
    iconColor: getExpenseIconColor.transferRequired()
  }

  return (
    <KpiStateCard
      loading={loading}
      error={error}
      errorTitle="Transfer Required"
      loadingTestId="transfer-required-loading"
      errorTestId="transfer-required-error"
      cardTestId="transfer-required-card"
      kpiTestId="transfer-required-kpi-cards"
      kpiCardData={kpiCardData}
    />
  )
}

export default TransferRequiredCard
