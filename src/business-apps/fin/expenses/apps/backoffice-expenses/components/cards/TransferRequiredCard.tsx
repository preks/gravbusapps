import React from 'react'
import { SectionKpiCards, KpiCardData, Spinner, Alert } from '@newwork/nw-design-system'
import { getExpenseIconColor } from '../../utils/colorConstants'

export interface TransferRequiredCardProps {
  loading: boolean
  error: Error | null
  transferRequired: number
}

const TransferRequiredCard: React.FC<TransferRequiredCardProps> = ({ loading, error, transferRequired }) => {
  if (loading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-32"
        data-testid="transfer-required-loading"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid="transfer-required-error">
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Transfer Required</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    )
  }

  // Create KPI card data
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
    <div data-testid="transfer-required-card">
      <SectionKpiCards cards={[kpiCardData]} data-testid="transfer-required-kpi-cards" />
    </div>
  )
}

export default TransferRequiredCard
