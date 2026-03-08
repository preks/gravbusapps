import React from 'react'
import { Alert, SectionKpiCards, Spinner, type KpiCardData } from '@newwork/nw-design-system'

type KpiStateCardProps = {
  loading: boolean
  error: Error | null
  errorTitle: string
  loadingTestId: string
  errorTestId: string
  cardTestId: string
  kpiTestId: string
  kpiCardData: KpiCardData
}

const KpiStateCard: React.FC<KpiStateCardProps> = ({
  loading,
  error,
  errorTitle,
  loadingTestId,
  errorTestId,
  cardTestId,
  kpiTestId,
  kpiCardData
}) => {
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-32" data-testid={loadingTestId}>
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-4" data-testid={errorTestId}>
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">{errorTitle}</h4>
            <p className="gba:text-sm gba:mt-1">Error: {error.message}</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div data-testid={cardTestId}>
      <SectionKpiCards cards={[kpiCardData]} data-testid={kpiTestId} />
    </div>
  )
}

export default KpiStateCard
